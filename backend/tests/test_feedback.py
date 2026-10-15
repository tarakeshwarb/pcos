import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)


def test_feedback_persists():
    resp = client.post("/api/feedback", json={
        "rating": 5,
        "comments": "The results page is really clear, thank you!",
        "context": "results",
    })
    assert resp.status_code == 200
    assert resp.json()["id"]


def test_feedback_requires_comments():
    resp = client.post("/api/feedback", json={"rating": 4})
    assert resp.status_code == 422
