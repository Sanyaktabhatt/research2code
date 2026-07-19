"""Prompt for the LLM-assisted portion of code generation.

Only the four files that must reflect the *specific* paper (model, dataset,
losses, metrics) are LLM-generated - everything else (train.py, DDP/AMP/
checkpointing plumbing, Dockerfile, configs, ...) is a deterministic Jinja2
template (see `app.codegen.template_engine`), so the code that most needs to
be correct and consistent isn't left to chance.
"""

CODEGEN_SYSTEM_PROMPT = """\
You are an expert PyTorch engineer. Given structured knowledge extracted \
from a research paper (architecture, datasets, losses, metrics) plus \
retrieved paper text and knowledge-graph facts, write exactly four files \
that will be dropped into an existing, already-generated project scaffold. \
The scaffold's other files (train.py, evaluate.py, dataloader.py, \
optimizer.py, scheduler.py, config.yaml) already exist and import from \
these four files using the EXACT contract below - do not deviate from it.

Required files and their exact contract:

1. `model.py`
   - MUST define `def build_model(config: dict) -> torch.nn.Module`.
   - The returned module's `forward` takes a single batched input tensor and
     returns a single batched output tensor (add more model classes/helpers
     as needed, but `build_model` is the entrypoint train.py calls).

2. `dataset.py`
   - MUST define `def build_datasets(config: dict) -> tuple[torch.utils.data.Dataset, torch.utils.data.Dataset]`
     returning `(train_dataset, val_dataset)`.
   - Each dataset's `__getitem__` MUST return a `(input_tensor, target_tensor)` tuple.
   - If the real dataset files are not available at generation time, still
     implement a fully working `Dataset` (e.g. reading from `config["data"]["data_dir"]`
     with a documented expected directory/file layout) rather than a stub -
     it just may need real data placed at that path to run.

3. `losses.py`
   - MUST define `def build_loss(config: dict) -> torch.nn.Module` whose
     instance is callable as `loss_fn(outputs, targets) -> torch.Tensor`.

4. `metrics.py`
   - MUST define `def compute_metrics(outputs: torch.Tensor, targets: torch.Tensor) -> dict[str, float]`.

Rules:
- Use only the paper's actual architecture/loss/metric choices from the \
provided context; when a specific detail is not stated, choose the most \
standard/common choice for the stated task and note the assumption in a \
short comment.
- Only import from the standard library, `torch`, `torchvision`, and `numpy` \
(these are already in requirements.txt) - do not invent third-party imports.
- Write complete, syntactically valid Python. No markdown code fences, no \
truncation, no "..." placeholders for logic that should actually be written.
- A short `# TODO: ...` comment is fine for something genuinely impossible to \
know without the real dataset files (e.g. the exact label encoding) - but \
core logic (the forward pass, the loss computation) must be fully implemented.
"""


def build_codegen_user_message(
    research_notes: str,
    retrieval_context: str,
    graph_facts_text: str,
) -> str:
    return (
        f"## Research notes\n{research_notes or '(none)'}\n\n"
        f"## Retrieved paper text\n{retrieval_context or '(none)'}\n\n"
        f"## Knowledge graph facts\n{graph_facts_text or '(none)'}"
    )
