"""
Integration tests for FastAPI endpoints in check_planner.
"""
from fastapi.testclient import TestClient
from check_planner import app

client = TestClient(app)


def test_hello_endpoint():
    """Test GET / root endpoint."""
    response = client.get("/check-planner/api/v1/")
    assert response.status_code == 200
    data = response.json()
    assert "Message" in data
    assert "Check Planner" in data["Message"]


def test_health_endpoint():
    """Test GET /health endpoint."""
    response = client.get("/check-planner/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "check-planner"


def test_generate_endpoint_validation():
    """Test POST /generate endpoint returns 422 if no files provided."""
    response = client.post("/check-planner/api/v1/generate")
    assert response.status_code == 422
