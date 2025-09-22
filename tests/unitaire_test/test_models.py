import pytest
from pydantic import ValidationError

from check_planner.agents.models import (AgentState, ControlPlanOutput,
                                         ExtractRGName, PageChunked,
                                         RegulationDetails, VerifiedAgentState,
                                         VerifiedRegulation)


def test_agent_state_validation():
    agentState = AgentState(
        check_path="path/to/check",
        current_rg_num=1,
        max_regs=10,
        output_file="output.json",
    )
    assert isinstance(agentState, AgentState)
