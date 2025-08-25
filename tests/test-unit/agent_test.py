import pytest
from check_planner.agents import VerifierAgent
from check_planner.llm import llm_gemini, llm_groq

def test_placeholder():
    assert True
    # TODO: Implement real tests
    def test_verifier_agent():
        agent = VerifierAgent(llm=llm_gemini)
        assert True

def test_verifier_agent():
    agent = VerifierAgent(llm=llm_gemini)
    assert True
