"""Builds the Neo4j graph for one KnowledgeExtraction version.

Pure and I/O-free: produces a list of `GraphOperation` (Cypher + params)
that a `GraphRepository` executes inside a single write transaction. Kept
separate from any driver/session so it is trivially unit-testable and can be
called from either the async API path or a sync Celery task.

Versioning model: the `Paper` node is a shared identity anchor keyed by
`paper_id` (a paper is one thing across extraction versions). Every other
node is created fresh per extraction version - keyed by
`{extraction_id}:{type}:{natural_key}` - so re-running extraction never
mutates a prior version's snapshot; relationships also carry
`extraction_id`/`version` properties so a version's full snapshot can be
queried in isolation.
"""

from dataclasses import dataclass, field

from app.agents.schemas import ExtractedKnowledge

_LOWER_IS_BETTER_HINTS = ("loss", "error", "perplexity", "wer", "fid", "latency", "time")


@dataclass
class GraphOperation:
    cypher: str
    params: dict = field(default_factory=dict)


def _merge_node(label: str, key: str, props: dict) -> GraphOperation:
    """MERGE-by-key, then patch in the rest of the properties (idempotent)."""
    clean_props = {k: v for k, v in props.items() if v is not None}
    clean_props["key"] = key
    return GraphOperation(
        f"MERGE (n:{label} {{key: $key}}) SET n += $props",
        {"key": key, "props": clean_props},
    )


def _relate(
    start_label: str,
    start_key: str,
    rel_type: str,
    end_label: str,
    end_key: str,
    rel_props: dict | None = None,
) -> GraphOperation:
    clean_props = {k: v for k, v in (rel_props or {}).items() if v is not None}
    return GraphOperation(
        f"MATCH (a:{start_label} {{key: $start_key}}), (b:{end_label} {{key: $end_key}}) "
        f"MERGE (a)-[r:{rel_type}]->(b) SET r += $rel_props",
        {"start_key": start_key, "end_key": end_key, "rel_props": clean_props},
    )


def _is_lower_better(metric_name: str) -> bool:
    lowered = metric_name.lower()
    return any(hint in lowered for hint in _LOWER_IS_BETTER_HINTS)


def _try_parse_number(value: str) -> float | None:
    try:
        return float(value.strip().rstrip("%"))
    except (ValueError, AttributeError):
        return None


def build_graph_operations(
    paper_id: str,
    extraction_id: str,
    version: int,
    extracted: ExtractedKnowledge,
) -> list[GraphOperation]:
    ex = extraction_id
    rel_props = {"extraction_id": ex, "version": version}
    ops: list[GraphOperation] = [_merge_node("Paper", paper_id, {"paper_id": paper_id})]

    if extracted.metadata:
        m = extracted.metadata
        ops.append(
            GraphOperation(
                "MATCH (p:Paper {key: $key}) SET p += $props",
                {
                    "key": paper_id,
                    "props": {
                        k: v
                        for k, v in {
                            "title": m.title,
                            "authors": m.authors,
                            "publication_year": m.publication_year,
                            "venue": m.venue,
                            "arxiv_id": m.arxiv_id,
                            "doi": m.doi,
                        }.items()
                        if v is not None
                    },
                },
            )
        )

    if extracted.task_domain:
        td = extracted.task_domain
        task_key = f"{ex}:task:{td.task}"
        domain_key = f"{ex}:domain:{td.domain}"
        ops.append(_merge_node("Task", task_key, {"name": td.task, "confidence": td.confidence}))
        ops.append(_relate("Paper", paper_id, "HAS_TASK", "Task", task_key, rel_props))
        ops.append(_merge_node("Domain", domain_key, {"name": td.domain, "confidence": td.confidence}))
        ops.append(_relate("Paper", paper_id, "IN_DOMAIN", "Domain", domain_key, rel_props))

    dataset_keys_by_name: dict[str, str] = {}
    for i, dataset in enumerate(extracted.datasets):
        key = f"{ex}:dataset:{i}"
        dataset_keys_by_name[dataset.name.strip().lower()] = key
        ops.append(
            _merge_node(
                "Dataset",
                key,
                {
                    "name": dataset.name,
                    "description": dataset.description,
                    "size": dataset.size,
                    "url": dataset.url,
                    "split_info": dataset.split_info,
                    "confidence": dataset.confidence,
                },
            )
        )
        ops.append(_relate("Paper", paper_id, "USES_DATASET", "Dataset", key, rel_props))

    model_key: str | None = None
    if extracted.model_architecture:
        arch = extracted.model_architecture
        model_key = f"{ex}:model:0"
        ops.append(
            _merge_node(
                "Model",
                model_key,
                {
                    "name": arch.name,
                    "family": arch.family,
                    "description": arch.description,
                    "num_parameters": arch.num_parameters,
                    "confidence": arch.confidence,
                },
            )
        )
        ops.append(_relate("Paper", paper_id, "PROPOSES", "Model", model_key, rel_props))

        for i, layer in enumerate(arch.layers):
            layer_key = f"{ex}:layer:{i}"
            ops.append(
                _merge_node(
                    "Layer",
                    layer_key,
                    {
                        "name": layer.name,
                        "layer_type": layer.layer_type,
                        "description": layer.description,
                        "confidence": layer.confidence,
                    },
                )
            )
            ops.append(
                _relate("Model", model_key, "HAS_LAYER", "Layer", layer_key, {**rel_props, "order": i})
            )

    if extracted.optimizer:
        opt = extracted.optimizer
        opt_key = f"{ex}:optimizer:0"
        ops.append(
            _merge_node(
                "Optimizer",
                opt_key,
                {
                    "name": opt.name,
                    "learning_rate": opt.learning_rate,
                    "weight_decay": opt.weight_decay,
                    "confidence": opt.confidence,
                },
            )
        )
        if model_key:
            ops.append(_relate("Model", model_key, "TRAINS_WITH", "Optimizer", opt_key, rel_props))
            ops.append(_relate("Optimizer", opt_key, "OPTIMIZES", "Model", model_key, rel_props))

    if extracted.scheduler and model_key:
        sch = extracted.scheduler
        sch_key = f"{ex}:scheduler:0"
        ops.append(
            _merge_node(
                "Scheduler", sch_key, {"name": sch.name, "description": sch.description, "confidence": sch.confidence}
            )
        )
        ops.append(_relate("Model", model_key, "USES_SCHEDULER", "Scheduler", sch_key, rel_props))

    for i, loss in enumerate(extracted.loss_functions):
        loss_key = f"{ex}:loss:{i}"
        ops.append(
            _merge_node(
                "LossFunction",
                loss_key,
                {"name": loss.name, "description": loss.description, "confidence": loss.confidence},
            )
        )
        if model_key:
            ops.append(_relate("Model", model_key, "USES_LOSS", "LossFunction", loss_key, rel_props))

    metric_keys_by_name: dict[str, str] = {}
    for i, metric in enumerate(extracted.evaluation_metrics):
        metric_key = f"{ex}:metric:{i}"
        metric_keys_by_name[metric.name.strip().lower()] = metric_key
        ops.append(
            _merge_node(
                "Metric",
                metric_key,
                {"name": metric.name, "description": metric.description, "confidence": metric.confidence},
            )
        )
        if model_key:
            ops.append(_relate("Model", model_key, "EVALUATED_BY", "Metric", metric_key, rel_props))

    for i, hw in enumerate(extracted.hardware_requirements):
        hw_key = f"{ex}:hardware:{i}"
        ops.append(
            _merge_node(
                "Hardware",
                hw_key,
                {
                    "device_type": hw.device_type,
                    "model_name": hw.model_name,
                    "count": hw.count,
                    "memory": hw.memory,
                    "confidence": hw.confidence,
                },
            )
        )
        ops.append(_relate("Paper", paper_id, "REQUIRES_HARDWARE", "Hardware", hw_key, rel_props))

    for i, limitation in enumerate(extracted.limitations):
        lim_key = f"{ex}:limitation:{i}"
        ops.append(
            _merge_node("Limitation", lim_key, {"description": limitation.description, "confidence": limitation.confidence})
        )
        ops.append(_relate("Paper", paper_id, "HAS_LIMITATION", "Limitation", lim_key, rel_props))

    for i, future_work in enumerate(extracted.future_work):
        fw_key = f"{ex}:future_work:{i}"
        ops.append(
            _merge_node(
                "FutureWork", fw_key, {"description": future_work.description, "confidence": future_work.confidence}
            )
        )
        ops.append(_relate("Paper", paper_id, "SUGGESTS_FUTURE_WORK", "FutureWork", fw_key, rel_props))

    for i, resource in enumerate(extracted.external_resources):
        repo_key = f"{ex}:external_repository:{i}"
        ops.append(
            _merge_node(
                "ExternalRepository",
                repo_key,
                {
                    "name": resource.name,
                    "resource_type": resource.resource_type,
                    "url": resource.url,
                    "description": resource.description,
                    "confidence": resource.confidence,
                },
            )
        )
        source_label, source_key = ("Model", model_key) if model_key else ("Paper", paper_id)
        ops.append(_relate(source_label, source_key, "BASED_ON", "ExternalRepository", repo_key, rel_props))

    result_keys: list[tuple[str, str, str, float | None]] = []  # (key, metric_lower, dataset_lower, numeric_value)
    for i, result in enumerate(extracted.reported_results):
        result_key = f"{ex}:result:{i}"
        ops.append(
            _merge_node(
                "Result",
                result_key,
                {
                    "metric_name": result.metric_name,
                    "value": result.value,
                    "dataset": result.dataset,
                    "split": result.split,
                    "notes": result.notes,
                    "confidence": result.confidence,
                },
            )
        )
        ops.append(_relate("Paper", paper_id, "REPORTS_RESULT", "Result", result_key, rel_props))

        metric_lower = result.metric_name.strip().lower()
        metric_key = metric_keys_by_name.get(metric_lower)
        if metric_key is None:
            # No matching entry in evaluation_metrics; still give the result
            # a Metric node to attach to, keyed the same way for consistency.
            metric_key = f"{ex}:metric:result:{metric_lower}"
            ops.append(_merge_node("Metric", metric_key, {"name": result.metric_name}))
        ops.append(_relate("Result", result_key, "MEASURES", "Metric", metric_key, rel_props))

        if result.dataset:
            dataset_key = dataset_keys_by_name.get(result.dataset.strip().lower())
            if dataset_key:
                ops.append(_relate("Result", result_key, "ON_DATASET", "Dataset", dataset_key, rel_props))

        result_keys.append((result_key, metric_lower, (result.dataset or "").strip().lower(), _try_parse_number(result.value)))

    # OUTPERFORMS: compare this paper's own results that share a metric+dataset,
    # using a lower-is-better heuristic based on the metric's name. Best-effort
    # only - skipped when values aren't numeric.
    grouped: dict[tuple[str, str], list[tuple[str, float]]] = {}
    for key, metric_lower, dataset_lower, numeric_value in result_keys:
        if numeric_value is None:
            continue
        grouped.setdefault((metric_lower, dataset_lower), []).append((key, numeric_value))

    for (metric_lower, _dataset_lower), entries in grouped.items():
        if len(entries) < 2:
            continue
        lower_is_better = _is_lower_better(metric_lower)
        ordered = sorted(entries, key=lambda e: e[1], reverse=not lower_is_better)
        best_key = ordered[0][0]
        for other_key, _ in ordered[1:]:
            ops.append(_relate("Result", best_key, "OUTPERFORMS", "Result", other_key, rel_props))

    return ops
