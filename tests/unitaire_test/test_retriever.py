import asyncio

import pytest

from check_planner.retriever import retrieve_regulation


def test_retrieve_regulation():
    result = asyncio.run(
        retrieve_regulation("Article 30:  la mise en œuvre par la société gest")
    )
    assert result
    assert "Article 30" in result[0][0]
