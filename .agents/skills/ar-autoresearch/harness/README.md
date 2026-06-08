# Autoresearch Reference Harness (Optional)

The original Karpathy `autoresearch` ships a small PyTorch training loop (`prepare.py` + `train.py`) plus a Jupyter analysis notebook. They are bundled here as a working reference so you can run a real autoresearch loop end-to-end in <15 minutes on a single NVIDIA GPU.

## When to use this harness

- You want to validate the autoresearch loop on a real metric, end-to-end, before adapting it to your own project.
- You're training a small LLM-style model and want a 5-minute iteration cycle.
- You want a concrete "this is what a complete setup looks like" reference.

**You don't need this harness to use the `ar-autoresearch` skill.** The skill's loop applies unchanged to any project with one editable file, one fixed metric, and a runnable command. Drop in your own training script / config / benchmark / lint target and the skill's instructions still work.

## What's here

| File             | Purpose                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `prepare.py`     | One-time data download + BPE tokenizer training + fixed eval harness. Read-only. |
| `train.py`       | The single file the agent edits. GPT model + Muon/AdamW + training loop. |
| `analysis.ipynb` | Jupyter notebook for post-hoc analysis of `results.tsv` (kept-discarded-kept plot, summary stats). |

## Quick start

```bash
# Requires: single NVIDIA GPU, Python 3.10+, uv
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync                                # install dependencies
uv run prepare.py                      # one-time: download data + train tokenizer (~2 min)
uv run train.py                        # baseline run (~5 min)
```

Then start the agent loop. The agent's edit target is `train.py`. The agent must not modify `prepare.py`. See the parent `SKILL.md` for the loop rules.

## Smaller platforms

The defaults are tuned for an H100. On Macbooks / smaller GPUs:

- Lower `vocab_size` (e.g. 4096, 2048, 1024, or byte-level 256).
- Lower `MAX_SEQ_LEN` (in `prepare.py`) to 256 or 512.
- Decrease `EVAL_TOKENS` so validation runs faster.
- Lower `DEPTH` (in `train.py`) to 4 or 6.
- Use `WINDOW_PATTERN = "L"` (full attention) instead of `"SSSL"`.
- Lower `TOTAL_BATCH_SIZE` but keep it a power of 2.

## License

MIT (inherited from JZKK720/autoresearch).
