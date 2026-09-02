"""Project-level entry point for model training."""

from pathlib import Path
import runpy


if __name__ == "__main__":
  runpy.run_path(
    str(Path(__file__).resolve().parent / "model" / "train.py"),
    run_name="__main__",
  )
