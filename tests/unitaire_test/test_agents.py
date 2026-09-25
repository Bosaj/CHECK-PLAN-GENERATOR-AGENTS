"""
Unit tests for CheckPlanerAgent and VerifierAgent graph state logic.
"""

from unittest.mock import MagicMock

from check_planner.agents.plan_generator_agent.agent import CheckPlanerAgent
from check_planner.agents.verifier_agent.agent import VerifierAgent


def test_agent_instantiation():
    """Test agents can be instantiated with mock LLM model configuration."""
    mock_llm = MagicMock()
    mock_llm.with_structured_output.return_value = mock_llm

    generator = CheckPlanerAgent(llm=mock_llm)
    assert isinstance(generator, CheckPlanerAgent)

    verifier = VerifierAgent(llm=mock_llm)
    assert isinstance(verifier, VerifierAgent)


def test_generator_agent_internal_state():
    """Test initial attributes of CheckPlanerAgent."""
    mock_llm = MagicMock()
    mock_llm.with_structured_output.return_value = mock_llm

    agent = CheckPlanerAgent(llm=mock_llm)
    assert agent.llm_params["iteration"] == 0
    assert agent.graph is not None
