import logging
import os
import sys
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile

from check_planner.agents import create_check_plan_generator_agent
from check_planner.llm import llm_gemini, llm_groq
from check_planner.models import AgentResult, HelloOutput

try:
    agent = create_check_plan_generator_agent(llm=llm_gemini)
except Exception as e:
    logging.critical(f"Erreur d'instanciation d'agent: {e}")
    sys.exit(1)

router = APIRouter()


@router.get("/")
async def hello() -> HelloOutput:
    return HelloOutput(
        **{
            "Message": "Hello - You are on Check Planner, LLM Agent for finance regulations check plan"
        }
    )


@router.post("/generate", response_model=AgentResult)
async def Check_Plan_Generator(reglements: List[UploadFile] = File(...)) -> AgentResult:

    # gestion de fichiers (reglements)
    os.makedirs("reglements", exist_ok=True)
    try:

        if not reglements:
            raise HTTPException(status_code=400, detail="Aucun règlement remis")

        reglements_file = []
        for reglement in reglements:
            reglement_path = f"reglements/{reglement.filename}"
            with open(reglement_path, "wb") as f:
                f.write(await reglement.read())
            reglements_file.append(reglement_path)

        result = agent.run(reglements_file[0])
        result = {**result}
        return AgentResult(**result)

    except Exception as e:
        logging.exception("Erreur pendant l'exécution de l'agent")
        raise HTTPException(status_code=500, detail=f"Erreur agent: {e}")
