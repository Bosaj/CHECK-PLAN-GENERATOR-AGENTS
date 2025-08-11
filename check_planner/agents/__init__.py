from check_planner.agents.plan_generator_agent import CheckPlanerAgent
from check_planner.llm import llm_gemini, llm_groq


def create_check_plan_generator_agent(llm=llm_gemini):
    return CheckPlanerAgent(llm=llm)


__ALL__ = ["CheckPlanerAgent", "create_check_plan_generator_agent"]
