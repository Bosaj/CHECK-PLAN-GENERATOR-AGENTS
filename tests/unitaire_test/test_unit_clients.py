"""
Unit tests for SDK client configurations and data structures.
"""
def test_sdk_client_config():
    """Test client configuration payload structure."""
    client_config = {
        "base_url": "http://localhost:8057/check-planner/api/v1",
        "timeout": 30.0,
        "max_retries": 3
    }
    assert client_config["base_url"].startswith("http")
    assert client_config["timeout"] == 30.0
