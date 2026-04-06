from __future__ import annotations

import os
import sys

import httpx


BASE_URL = os.getenv("INTEL_BACKEND_URL", "http://127.0.0.1:8100").rstrip("/")


def assert_ok(response: httpx.Response, name: str) -> None:
    if response.status_code >= 400:
        raise RuntimeError(f"{name} failed [{response.status_code}]: {response.text}")


def main() -> None:
    with httpx.Client(timeout=30) as client:
        health = client.get(f"{BASE_URL}/health")
        assert_ok(health, "health")

        layers = client.get(f"{BASE_URL}/api/map/layers", params={"timeRange": 90})
        assert_ok(layers, "map_layers")

        search = client.get(
            f"{BASE_URL}/api/vendors/search",
            params={"q": "route optimization logistics", "limit": 5},
        )
        assert_ok(search, "vendors_search")
        search_json = search.json()
        vendor_rows = search_json.get("results", [])

        mission = client.post(
            f"{BASE_URL}/api/mission/analyze",
            json={
                "mission": "Reduce cross-border logistics delays",
                "mode": "operator",
                "timeRange": 90,
                "layers": ["vendors", "momentum", "risk"],
            },
        )
        assert_ok(mission, "mission_analyze")

        if vendor_rows:
            vendor_id = vendor_rows[0]["truth_card_id"] if "truth_card_id" in vendor_rows[0] else vendor_rows[0]["id"]
            vendor = client.get(f"{BASE_URL}/api/vendors/{vendor_id}")
            assert_ok(vendor, "vendor_detail")
            feedback = client.post(
                f"{BASE_URL}/api/feedback",
                json={"truth_card_id": vendor_id, "action": "click"},
            )
            assert_ok(feedback, "feedback")

        print("Smoke test passed.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        print(str(exc))
        sys.exit(1)

