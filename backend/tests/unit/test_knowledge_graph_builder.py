from app.agents.schemas import Dataset, ExtractedKnowledge, ModelArchitecture
from app.services.knowledge_graph_builder import build_graph_operations


def test_build_graph_operations_always_includes_paper_node() -> None:
    ops = build_graph_operations("paper-1", "extraction-1", 1, ExtractedKnowledge())

    assert len(ops) == 1
    assert "MERGE (n:Paper" in ops[0].cypher
    assert ops[0].params["key"] == "paper-1"


def test_build_graph_operations_includes_dataset_and_model_nodes() -> None:
    extracted = ExtractedKnowledge(
        datasets=[Dataset(name="ImageNet", confidence=0.9)],
        model_architecture=ModelArchitecture(name="ResNet-50", confidence=0.95),
    )

    ops = build_graph_operations("paper-1", "extraction-1", 2, extracted)
    cypher_blob = " ".join(op.cypher for op in ops)

    assert "Dataset" in cypher_blob
    assert "Model" in cypher_blob
    # Every relationship tied to this version should carry the extraction id
    # and version so a snapshot query can isolate it.
    assert any(
        "extraction_id" in op.params.get("rel_props", {}) for op in ops if "rel_props" in op.params
    )


def test_build_graph_operations_is_deterministic_for_same_input() -> None:
    extracted = ExtractedKnowledge(datasets=[Dataset(name="COCO", confidence=0.8)])

    first = build_graph_operations("paper-1", "extraction-1", 1, extracted)
    second = build_graph_operations("paper-1", "extraction-1", 1, extracted)

    assert [op.cypher for op in first] == [op.cypher for op in second]
    assert [op.params for op in first] == [op.params for op in second]
