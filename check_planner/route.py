import logging
import os
import re
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

# ── Upload directory (Docker-compatible) ────────────────────────────────────
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "reglements")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "plans"), exist_ok=True)

try:
    agent = create_check_plan_generator_agent(llm=llm_gemini)
    verifier_agent = create_verifier_agent(llm=llm_gemini)
except Exception as e:
    logging.critical("Erreur d'instanciation d'agent: %s", e)
    sys.exit(1)

router = APIRouter()


def _sanitize_filename(filename: str) -> str:
    """Remove path traversal characters and limit to safe filename."""
    name = os.path.basename(filename)
    name = re.sub(r"[^\w\.\-]", "_", name)
    return name[:255] or "upload.pdf"


@router.get("/")
async def hello() -> HelloOutput:
    return HelloOutput(
        **{
            "Message": "Hello - You are on Check Planner, LLM Agent for finance regulations check plan"
        }
    )


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "check-planner", "version": "1.0.0"}


@router.post("/generate", response_model=AgentResult)
async def check_plan_generator(reglements: List[UploadFile] = File(...)) -> AgentResult:

    if not reglements:
        raise HTTPException(status_code=400, detail="Aucun règlement remis")

    try:
        reglements_file = []
        for reglement in reglements:
            safe_name = _sanitize_filename(reglement.filename or "upload.pdf")
            reglement_path = os.path.join(UPLOAD_DIR, safe_name)
            async with aiofiles.open(reglement_path, "wb") as f:
                content = await reglement.read()
                await f.write(content)
            reglements_file.append(reglement_path)

        result = await agent.arun(reglements_file[0])
        return AgentResult(**result)

    except HTTPException:
        raise
    except Exception:
        logging.exception("Erreur pendant l'exécution de l'agent")
        raise HTTPException(status_code=500, detail="Erreur interne de l'agent")
