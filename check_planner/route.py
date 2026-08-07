import logging
import os
import sys
from typing import List

import aiofiles

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from fastapi import APIRouter, File, HTTPException, UploadFile

from check_planner.agents import (create_check_plan_generator_agent,
                                  create_verifier_agent)
from check_planner.llm import llm_gemini, llm_groq
from check_planner.models import AgentResult, HelloOutput

try:
    agent = create_check_plan_generator_agent(llm=llm_gemini)
    verifier_agent = create_verifier_agent(llm=llm_gemini)
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


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "check-planner"}



@router.post("/generate", response_model=AgentResult)
async def check_plan_generator(reglements: List[UploadFile] = File(...)) -> AgentResult:

    # gestion de fichiers (reglements)
    os.makedirs("reglements", exist_ok=True)
    os.makedirs("reglements/plans", exist_ok=True)
    try:

        if not reglements:
            raise HTTPException(status_code=400, detail="Aucun règlement remis")

        reglements_file = []
        for reglement in reglements:
            reglement_path = f"reglements/{reglement.filename}"
            async with aiofiles.open(reglement_path, "wb") as f:
                content = await reglement.read()
                await f.write(content)
            reglements_file.append(reglement_path)

        result = await agent.arun(reglements_file[0])
        verifier_result = await verifier_agent.arun(result["output_file"])
        result_final = {
            **result,
            "output_file": verifier_result.get("output_file", result["output_file"]),
        }
        return AgentResult(**result_final)

    except Exception as e:
        logging.exception("Erreur pendant l'exécution de l'agent")
        raise HTTPException(status_code=500, detail=f"Erreur agent: {e}")
