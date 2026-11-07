"""5-scenario smoke check script across Bangla, English, and Banglish.

Executes 5 checks and displays risk level, route, tokens, and latency.
"""

from __future__ import annotations

from typing import Any

from app.pipeline.orchestrator import PipelineOrchestrator

TEST_SCENARIOS = [
    {
        "id": "1",
        "lang": "Bangla",
        "type": "Hard Rule (OTP/PIN)",
        "text": "আপনার বিকাশ পিন কোড এবং ওটিপি ১২৩৪ পাঠান এখনই",
    },
    {
        "id": "2",
        "lang": "Bangla",
        "type": "Prize / Cashback lure",
        "text": (
            "অভিনন্দন! আপনি জিতেছেন ৫০,০০০ টাকা লটারি। পুরস্কারের টাকা পেতে "
            "৫০০ টাকা প্রসেসিং ফি পাঠান এই নম্বরে: 01712345678"
        ),
    },
    {
        "id": "3",
        "lang": "Banglish",
        "type": "Wrong-number refund trap",
        "text": (
            "bhai vul kore apnar bkash e 2500 taka send hoye geche, "
            "plz ei number e taka ta ferot pathan: 01812345678"
        ),
    },
    {
        "id": "4",
        "lang": "English",
        "type": "Suspicious staff / Phishing link",
        "text": (
            "Dear customer, your account is suspended due to suspicious activity. "
            "Click here to verify: https://bkash-verify-acc.com or call 01912345678"
        ),
    },
    {
        "id": "5",
        "lang": "English",
        "type": "Routine transaction notice (Genuine)",
        "text": (
            "You received Tk 1,200.00 from 01712345678. "
            "Balance Tk 5,430.50. TrxID 9KL4M82."
        ),
    },
]


def run_smoke_checks() -> list[dict[str, Any]]:
    orchestrator = PipelineOrchestrator()
    results = []

    print("=" * 80)
    print(" PROHORI PHASE 06: 5 SMOKE CHECKS (BANGLA, EN, BANGLISH)")
    print("=" * 80)

    for sc in TEST_SCENARIOS:
        res = orchestrator.run_check(sc["text"])
        telem = res.get("telemetry", {})
        risk_level = res["risk_level"] or "UNAVAILABLE (FALLBACK)"
        route = telem.get("route", "unknown")
        latency = telem.get("latency_ms", 0.0)
        tokens = (
            f"in={telem.get('input_tokens', 0)}, "
            f"out={telem.get('output_tokens', 0)}, "
            f"cache={telem.get('cache_read_tokens', 0)}"
        )

        item = {
            "id": sc["id"],
            "lang": sc["lang"],
            "type": sc["type"],
            "level": risk_level,
            "route": route,
            "tokens": tokens,
            "latency_ms": latency,
        }
        results.append(item)

        print(f"[{sc['id']}] {sc['lang']} | {sc['type']}")
        print(f"    Level:   {risk_level}")
        print(f"    Route:   {route}")
        print(f"    Tokens:  {tokens}")
        print(f"    Latency: {latency:.1f} ms")
        print(f"    Reasons: {res.get('reasons', [])[:2]}")
        print("-" * 80)

    return results


if __name__ == "__main__":
    run_smoke_checks()
