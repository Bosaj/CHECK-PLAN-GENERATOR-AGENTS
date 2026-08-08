import asyncio

from check_planner.retriever import retrieve_regulation


def test_retrieve_regulation():
    """Test retrieve_regulation query handler returns list response."""
    result = asyncio.run(
        retrieve_regulation("Article 30:  la mise en œuvre par la société gest")
    )
    assert isinstance(result, list)
