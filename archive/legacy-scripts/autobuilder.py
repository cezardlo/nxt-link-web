#!/usr/bin/env python3
"""
Local autonomous code builder for NXT LINK using Ollama.

Usage examples:
  python autobuilder.py --prompt "V:\\downloads\\NXT_LINK_MASTER_PROMPT.md"
  python autobuilder.py --prompt MASTER_PROMPT.md --models "qwen2.5-coder:7b,codellama:13b" --commit
"""

from __future__ import annotations

import argparse
import ast
import json
import os
import re
import subprocess
import sys
import textwrap
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


OLLAMA_URL = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")


@dataclass(frozen=True)
class BuildTarget:
    path: str
    instruction: str


DEFAULT_TARGETS = [
    BuildTarget("base.py", "Build the BaseAgent class with logging, caching, metrics, and publish/subscribe helpers."),
    BuildTarget("context.py", "Build AgentContext, Trigger, AgentRun, AgentResult, and PipelineResult models."),
    BuildTarget("bus.py", "Build the Redis-backed AgentBus with publish/subscribe and run history helpers."),
    BuildTarget("tools.py", "Build a typed async tool registry with stubs for DB, embedding, LLM, notifications, and caching."),
    BuildTarget("orchestrator.py", "Build OrchestratorAgent with trigger routing, retries, backoff, and pipeline health tracking."),
    BuildTarget("entity_agent.py", "Build EntityExtractionAgent loop using tool_search_vendors, tool_create_vendor, and review logic."),
    BuildTarget("embedding_agent.py", "Build EmbeddingAgent for vendor/capture/evidence batching with model pinning and fallback behavior."),
    BuildTarget("trend_agent.py", "Build TrendAgent computing 30/90/180 day metrics, states, and clustered emerging signals."),
    BuildTarget("narrative_agent.py", "Build NarrativeAgent with strict schema validation, prompt-injection defenses, caching, and LLM provider waterfall."),
    BuildTarget("ranker_agent.py", "Build RankerAgent nightly LightGBM LambdaMART training with cold-start fallback and model promotion."),
    BuildTarget("alert_agent.py", "Build AlertAgent two-stage keyword plus semantic matching with delivery to email/slack/webhook."),
    BuildTarget("digest_agent.py", "Build DigestAgent weekly personalized brief generation and email delivery."),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Autonomous local file builder using Ollama.")
    parser.add_argument(
        "--prompt",
        dest="prompt_path",
        default=None,
        help="Path to MASTER_PROMPT.md (or similar).",
    )
    parser.add_argument(
        "--base-dir",
        default="intelligence/intel_backend/app/agents",
        help="Directory where agent files are generated.",
    )
    parser.add_argument(
        "--models",
        default=os.getenv("AUTOBUILDER_MODELS", "qwen2.5-coder:7b,codellama:13b"),
        help="Comma-separated Ollama models in fallback order.",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=2,
        help="Retries per file after all models fail.",
    )
    parser.add_argument(
        "--max-existing-chars",
        type=int,
        default=20000,
        help="Max chars of existing file content included in prompt.",
    )
    parser.add_argument(
        "--commit",
        action="store_true",
        help="Auto-commit each changed file.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Generate and print status without writing files.",
    )
    return parser.parse_args()


def discover_prompt_file(explicit: str | None) -> Path:
    if explicit:
        path = Path(explicit).expanduser().resolve()
        if not path.exists():
            raise FileNotFoundError(f"Prompt file not found: {path}")
        return path

    candidates = [
        Path("MASTER_PROMPT.md"),
        Path("NXT_LINK_MASTER_PROMPT.md"),
        Path("NXTLINK_MASTER_PROMPT.md"),
        Path("v:/downloads/NXT_LINK_MASTER_PROMPT.md"),
        Path("v:/downloads/NXTLINK_MASTER_PROMPT.md"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()
    raise FileNotFoundError(
        "No prompt file found. Pass --prompt with your MASTER_PROMPT path."
    )


def read_file(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def call_ollama_chat(model: str, user_prompt: str, timeout_s: int = 180) -> str:
    payload = {
        "model": model,
        "stream": False,
        "messages": [{"role": "user", "content": user_prompt}],
    }
    request = urllib.request.Request(
        f"{OLLAMA_URL}/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout_s) as response:
            raw = response.read().decode("utf-8")
            parsed = json.loads(raw)
            return parsed.get("message", {}).get("content", "")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Ollama HTTP error {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Could not reach Ollama at {OLLAMA_URL}") from exc


def extract_code_only(text: str) -> str:
    content = text.strip()
    fenced = re.findall(r"```(?:python)?\s*(.*?)```", content, flags=re.DOTALL | re.IGNORECASE)
    if fenced:
        content = max(fenced, key=len).strip()
    return content.strip()


def is_likely_valid_python(code: str) -> bool:
    if not code.strip():
        return False
    try:
        ast.parse(code)
        return True
    except SyntaxError:
        return False


def build_prompt(
    spec: str,
    target_path: str,
    instruction: str,
    existing_code: str,
) -> str:
    return textwrap.dedent(
        f"""
        {spec}

        EXISTING CODE IN {target_path}:
        {existing_code}

        TASK: {instruction}

        Write complete, production-ready Python code.
        Output ONLY code. No explanation. No markdown fences.
        """
    ).strip()


def git_commit_file(path: Path, message: str) -> None:
    subprocess.run(["git", "add", str(path)], check=False)
    result = subprocess.run(
        ["git", "commit", "-m", message, "--", str(path)],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        stdout = (result.stdout or "").strip()
        combined = stderr if stderr else stdout
        if "nothing to commit" in combined.lower():
            return
        raise RuntimeError(f"git commit failed for {path}: {combined}")


def iter_models(models_csv: str) -> Iterable[str]:
    for model in (item.strip() for item in models_csv.split(",")):
        if model:
            yield model


def main() -> int:
    args = parse_args()
    prompt_path = discover_prompt_file(args.prompt_path)
    spec = read_file(prompt_path)

    base_dir = Path(args.base_dir).resolve()
    base_dir.mkdir(parents=True, exist_ok=True)

    print(f"Prompt: {prompt_path}")
    print(f"Base dir: {base_dir}")
    print(f"Ollama: {OLLAMA_URL}")
    print(f"Models: {', '.join(iter_models(args.models))}")

    failures: list[str] = []

    for target in DEFAULT_TARGETS:
        target_file = base_dir / target.path
        existing = read_file(target_file) if target_file.exists() else ""
        if len(existing) > args.max_existing_chars:
            existing = existing[-args.max_existing_chars :]

        print(f"\nBuilding {target_file} ...")

        generated: str | None = None
        last_error: str | None = None

        for attempt in range(1, args.retries + 2):
            for model in iter_models(args.models):
                try:
                    prompt = build_prompt(spec, str(target_file), target.instruction, existing)
                    response_text = call_ollama_chat(model=model, user_prompt=prompt)
                    candidate = extract_code_only(response_text)
                    if not is_likely_valid_python(candidate):
                        raise RuntimeError("Model returned invalid Python code.")
                    generated = candidate
                    print(f"  OK via {model} (attempt {attempt})")
                    break
                except Exception as exc:
                    last_error = f"{type(exc).__name__}: {exc}"
                    print(f"  Failed {model} (attempt {attempt}): {last_error}")
                    time.sleep(min(2 * attempt, 6))
            if generated is not None:
                break

        if generated is None:
            failures.append(f"{target_file}: {last_error or 'Unknown error'}")
            print(f"  ERROR: could not generate {target_file}")
            continue

        if args.dry_run:
            print(f"  Dry run: generated {len(generated)} chars, not writing.")
            continue

        target_file.parent.mkdir(parents=True, exist_ok=True)
        old = read_file(target_file) if target_file.exists() else ""
        if old == generated:
            print("  No changes.")
            continue

        target_file.write_text(generated, encoding="utf-8")
        print(f"  Wrote: {target_file}")

        if args.commit:
            git_commit_file(target_file, f"autobuilder: {target_file.as_posix()}")
            print("  Committed.")

    if failures:
        print("\nCompleted with failures:")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print("\nAll targets built successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
