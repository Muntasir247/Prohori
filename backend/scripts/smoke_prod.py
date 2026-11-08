"""Production smoke test script for Prohori (Phase 14).

Verifies the live loop end-to-end against a local or production backend:
1. Health check: GET /api/v1/health (DB reachable, status ok)
2. Sample message check: POST /api/v1/check-message (Bangla scam text -> High risk)
3. Case report: POST /api/v1/checks/{id}/report (generates PRO-XXXXXX case)
4. Reviewer login: POST /api/v1/auth/login (retrieves session cookie)
5. Reviewer decision: POST /api/v1/cases/{id}/decision (confirms scam, updates state)

Usage:
    python backend/scripts/smoke_prod.py --base-url https://prohori-backend.onrender.com
    python backend/scripts/smoke_prod.py --base-url http://localhost:8000
    PROD_URL=https://prohori.app/api python backend/scripts/smoke_prod.py

Requirements:
    Standard library only (urllib), no external dependencies required.
    Zero secrets printed: passwords and session tokens are masked.
"""

from __future__ import annotations

import argparse
import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

# Color constants for terminal output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


class SmokeTestRunner:
    def __init__(self, base_url: str, reviewer_password: str | None = None) -> None:
        self.base_url = base_url.rstrip("/")
        # If url doesn't end in /api/v1, adjust prefix
        self.api_prefix = (
            "/api/v1" if not self.base_url.endswith("/api/v1") else ""
        )
        self.reviewer_password = (
            reviewer_password
            or os.environ.get("SEED_REVIEWER_PASSWORD")
            or "ReviewerPass123!Secure"
        )
        self.cookie_jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cookie_jar)
        )
        self.results: list[dict[str, Any]] = []

    def _request(
        self,
        method: str,
        path: str,
        data: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> tuple[int, dict[str, Any], float]:
        url = f"{self.base_url}{self.api_prefix}{path}"
        req_headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Prohori-SmokeTest/1.0",
            "X-Requested-With": "XMLHttpRequest",
        }
        if headers:
            req_headers.update(headers)

        payload_bytes = json.dumps(data).encode("utf-8") if data is not None else None
        req = urllib.request.Request(url, data=payload_bytes, headers=req_headers, method=method)

        start_time = time.perf_counter()
        try:
            with self.opener.open(req, timeout=30) as resp:
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                status_code = resp.status
                body_raw = resp.read().decode("utf-8")
                body_json = json.loads(body_raw) if body_raw else {}
                return status_code, body_json, elapsed_ms
        except urllib.error.HTTPError as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            error_raw = e.read().decode("utf-8")
            try:
                error_json = json.loads(error_raw)
            except Exception:
                error_json = {"error": error_raw}
            return e.code, error_json, elapsed_ms
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return 599, {"error": str(e)}, elapsed_ms

    def log_step(self, step_no: int, title: str, passed: bool, latency: float, details: str) -> None:
        icon = f"{GREEN}✓ PASS{RESET}" if passed else f"{RED}✗ FAIL{RESET}"
        print(f"[{BOLD}Step {step_no}{RESET}] {title.ljust(40)} {icon} ({latency:.1f}ms)")
        if details:
            print(f"         {CYAN}{details}{RESET}")
        self.results.append({
            "step": step_no,
            "title": title,
            "passed": passed,
            "latency_ms": latency,
            "details": details,
        })

    def run(self) -> bool:
        print(f"\n{BOLD}{'=' * 75}{RESET}")
        print(f"{BOLD} PROHORI PRODUCTION SMOKE TEST (PHASE 14){RESET}")
        print(f" Target URL: {self.base_url}")
        print(f"{BOLD}{'=' * 75}{RESET}\n")

        all_passed = True

        # --- Step 1: Health Check ---
        status, body, lat = self._request("GET", "/health")
        passed = (status == 200 and body.get("status") == "ok" and body.get("database") == "up")
        details = f"HTTP {status} | status={body.get('status')} | db={body.get('database')} | v={body.get('version')}"
        self.log_step(1, "GET /health (Liveness & DB ping)", passed, lat, details)
        if not passed:
            all_passed = False

        # --- Step 2: Sample Check Message ---
        sample_scam_text = (
            "জরুরি নোটিশ: আপনার বিকাশ অ্যাকাউন্ট বন্ধ হয়ে যাবে। "
            "অ্যাকাউন্ট সচল রাখতে আপনার গোপন পিন (PIN) কোড এবং ওটিপি ১২৩৪ দিন।"
        )
        check_payload = {"text": sample_scam_text, "source": "smoke_test"}
        status, body, lat = self._request("POST", "/check-message", data=check_payload)
        check_id = body.get("id") or body.get("check_id")
        final_level = body.get("risk_level") or body.get("final_level")
        reasons = body.get("reasons", [])
        passed = (status == 200 and check_id is not None and final_level == "High")
        details = (
            f"HTTP {status} | Check ID: {check_id} | Risk: {final_level} | "
            f"Reasons: {len(reasons)} | Safe Actions: {len(body.get('safe_actions', []))}"
        )
        self.log_step(2, "POST /check-message (Bangla Scam Check)", passed, lat, details)
        if not passed:
            all_passed = False

        # --- Step 3: Report Check (Create Case) ---
        case_id = None
        case_ref = None
        if check_id:
            report_payload = {
                "consent": True,
                "user_note": "Smoke test verification: scam PIN harvesting message reported by victim",
            }
            status, body, lat = self._request("POST", f"/checks/{check_id}/report", data=report_payload)
            case_ref = body.get("case_reference") or body.get("reference")
            case_id = body.get("case_id") or body.get("id")
            passed = (status in (200, 201) and case_ref is not None)
            details = f"HTTP {status} | Case Reference: {case_ref} | Case ID: {case_id}"
            self.log_step(3, "POST /checks/{id}/report (Victim Report)", passed, lat, details)
            if not passed:
                all_passed = False
        else:
            self.log_step(3, "POST /checks/{id}/report (Victim Report)", False, 0.0, "Skipped due to check failure")
            all_passed = False

        # --- Step 4: Reviewer Login ---
        login_payload = {
            "email": "reviewer@prohori.test",
            "password": self.reviewer_password,
        }
        status, body, lat = self._request("POST", "/auth/login", data=login_payload)
        user_info = body.get("user", {})
        role = user_info.get("role")
        has_session_cookie = any("prohori" in c.name for c in self.cookie_jar)
        passed = (status == 200 and role in ("reviewer", "admin") and has_session_cookie)
        details = (
            f"HTTP {status} | Authenticated as: {user_info.get('email')} | Role: {role} | "
            f"Session Cookie: [REDACTED/ACTIVE]"
        )
        self.log_step(4, "POST /auth/login (Reviewer Login)", passed, lat, details)
        if not passed:
            all_passed = False

        # --- Step 5: Reviewer Decision on Case ---
        target_case_id = case_id
        if not target_case_id:
            # Query queue for a new case
            q_status, q_body, _ = self._request("GET", "/cases?status=new&limit=1")
            items = q_body.get("items", []) if isinstance(q_body, dict) else q_body
            if items and len(items) > 0:
                target_case_id = items[0].get("id")

        if target_case_id:
            decision_payload = {
                "status": "confirmed_scam",
                "decision_reason": "Smoke test audit: verified phishing attempt impersonating official wallet support.",
                "scam_type_id": 1,
                "version": 1,
            }
            status, body, lat = self._request("POST", f"/cases/{target_case_id}/decision", data=decision_payload)
            new_status = body.get("status")
            passed = (status == 200 and new_status == "confirmed_scam")
            details = f"HTTP {status} | Decided Case: {target_case_id} | Final Status: {new_status}"
            self.log_step(5, "POST /cases/{id}/decision (Reviewer Decision)", passed, lat, details)
            if not passed:
                all_passed = False
        else:
            self.log_step(5, "POST /cases/{id}/decision (Reviewer Decision)", False, 0.0, "No target case available")
            all_passed = False

        # --- Summary ---
        print(f"\n{BOLD}{'=' * 75}{RESET}")
        total_lat = sum(r["latency_ms"] for r in self.results)
        passed_count = sum(1 for r in self.results if r["passed"])
        total_count = len(self.results)
        if all_passed:
            print(f"{GREEN}{BOLD}✓ ALL {total_count}/{total_count} SMOKE CHECKS PASSED SUCCESSFULLY{RESET}")
            print(f" Total round-trip latency: {total_lat:.1f}ms")
            print(f"{BOLD}{'=' * 75}{RESET}\n")
            return True
        else:
            print(f"{RED}{BOLD}✗ SMOKE TEST FAILED: {passed_count}/{total_count} passed{RESET}")
            print(f"{BOLD}{'=' * 75}{RESET}\n")
            return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Prohori Production Smoke Test Runner")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("PROD_URL") or os.environ.get("API_BASE_URL") or "http://localhost:8000",
        help="Base URL of Prohori backend (e.g. https://prohori-backend.onrender.com)",
    )
    parser.add_argument(
        "--reviewer-password",
        default=None,
        help="Reviewer password (defaults to SEED_REVIEWER_PASSWORD env var)",
    )
    args = parser.parse_args()

    runner = SmokeTestRunner(base_url=args.base_url, reviewer_password=args.reviewer_password)
    success = runner.run()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

