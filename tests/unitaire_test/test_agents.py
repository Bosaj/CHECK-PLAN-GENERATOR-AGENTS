"""
Unit tests for CheckPlanerAgent and VerifierAgent graph state logic.
"""
from check_planner.agents import create_check_plan_generator_agent, create_verifier_agent
from check_planner.agents.plan_generator_agent.agent import CheckPlanerAgent
from check_planner.agents.verifier_agent.agent import VerifierAgent


def test_agent_instantiation():
    """Test agents can be instantiated with default LLM model configuration."""
    generator = create_check_plan_generator_agent()
    assert isinstance(generator, CheckPlanerAgent)

    verifier = create_verifier_agent()
    assert isinstance(verifier, VerifierAgent)


def test_generator_agent_internal_state():
    """Test initial attributes of CheckPlanerAgent."""
    agent = CheckPlanerAgent()
    assert agent.llm_params["iteration"] == 0
    assert agent.llm_params["type"] == "groq"
    assert agent.graph is not None
