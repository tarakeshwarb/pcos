"""
Registration (Step 0) real-backend-table tests. Ishi's explicit call: this
data must actually be persisted to this project's own database now, not just
kept in the browser -- while still never leaving this project (no AI vendor,
no third party). These tests hit the real FastAPI app + a real Postgres
table via TestClient.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)


def test_registration_with_dob_persists_and_returns_id():
    resp = client.post("/api/registration", json={
        "full_name": "Ananya Sharma",
        "email": "ananya@example.com",
        "dob": "2003-05-14",
        "demographics": {"living_environment": "Urban - Polluted"},
        "region_preference": "South Indian",
        "diet_type": "Eggetarian",
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["full_name"] == "Ananya Sharma"
    assert body["id"]

    fetched = client.get(f"/api/registration/{body['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["email"] == "ananya@example.com"


def test_registration_with_age_instead_of_dob():
    # Usability fix: DOB is optional -- a direct age entry must persist fine
    # with no dob at all.
    resp = client.post("/api/registration", json={
        "full_name": "Priya Nair",
        "email": "priya@example.com",
        "age": 27,
        "region_preference": "Bengali",
        "diet_type": "Non-Vegetarian",
    })
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Priya Nair"


def test_registration_missing_required_field_rejected():
    resp = client.post("/api/registration", json={"email": "no-name@example.com"})
    assert resp.status_code == 422


def test_registration_not_found():
    resp = client.get("/api/registration/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404
