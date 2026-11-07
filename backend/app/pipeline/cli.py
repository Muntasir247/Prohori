"""Command-line interface for the Prohori check pipeline.

Usage:
    python -m app.pipeline.cli "Suspicious message text here"
    python -m app.pipeline.cli "message" --json
"""

from __future__ import annotations

import argparse
import json
import sys

from app.pipeline.orchestrator import PipelineOrchestrator


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run Prohori fraud check on a message",
    )
    parser.add_argument(
        "text",
        type=str,
        help="Suspicious message or payment description to check",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw JSON result",
    )
    args = parser.parse_args()

    orchestrator = PipelineOrchestrator()
    try:
        result = orchestrator.run_check(args.text)
    except Exception as exc:
        print(f"Error during check execution: {exc}", file=sys.stderr)
        sys.exit(1)

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    risk_level = result["risk_level"] or "UNAVAILABLE (FALLBACK)"
    telem = result.get("telemetry", {})
    route = telem.get("route", "unknown")
    latency = telem.get("latency_ms", 0.0)

    print("=" * 60)
    print(f" PROHORI SCAM CHECK RESULT: [{risk_level.upper()}]")
    print("=" * 60)
    print(f"Route:       {route}")
    print(f"Latency:     {latency:.1f} ms")
    if telem.get("input_tokens") or telem.get("output_tokens"):
        print(
            f"Tokens:      input={telem.get('input_tokens')}, "
            f"output={telem.get('output_tokens')}, "
            f"cache_read={telem.get('cache_read_tokens')}"
        )
    print(f"Reused:      {result.get('reused', False)}")
    print(f"Trimmed:     {result.get('trimmed', False)}")
    print("-" * 60)
    print("Masked Text:")
    print(f"  {result['masked_text']}")
    print("-" * 60)
    print("Reasons:")
    for r in result.get("reasons", []):
        print(f"  • {r}")
    print("-" * 60)
    red_flags = result.get("red_flags", [])
    if red_flags:
        print("Red Flags:")
        for rf in red_flags:
            flag = rf.get("flag")
            quote = rf.get("quote")
            if quote:
                print(f'  ⚠ {flag} (Quote: "{quote}")')
            else:
                print(f"  ⚠ {flag}")
        print("-" * 60)
    print("Recommended Actions:")
    for act in result.get("safe_actions", []):
        print(f"  [✓] {act.get('label')}")
        if act.get("body"):
            print(f"      {act.get('body')}")
    print("-" * 60)
    print("Caution:")
    print(f"  ℹ {result.get('caution')}")
    print("=" * 60)


if __name__ == "__main__":
    main()
