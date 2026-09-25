"""
Unit tests for check_planner Pydantic models and AgentState schema.
"""

from check_planner.agents.models import (
    AgentState,
    ExtractRGName,
    PageChunked,
    RegulationControl,
    Section,
    VerifiedAgentState,
    VerifiedRegulation,
)
from check_planner.models import AgentResult, HelloOutput


def test_agent_state_schema():
    """Test AgentState TypedDict structure."""
    state: AgentState = {
        "rg_path": "reglements/test.pdf",
        "current_page_num": 1,
        "regulation": {"article_objet": "Article 1"},
        "max_pages": 5,
        "rg_num": 2,
        "max_rgs": 3,
        "output_file": "plans/plan_test.xlsx",
    }
    assert state["rg_path"] == "reglements/test.pdf"
    assert state["max_pages"] == 5
    assert state["rg_num"] == 2


def test_verified_agent_state_schema():
    """Test VerifiedAgentState TypedDict structure."""
    state: VerifiedAgentState = {
        "check_path": "plans/plan_test.xlsx",
        "current_rg_num": 1,
        "max_regs": 10,
        "output_file": "plans/plan_verified.xlsx",
    }
    assert state["check_path"] == "plans/plan_test.xlsx"
    assert state["current_rg_num"] == 1


def test_regulation_control_model():
    """Test RegulationControl Pydantic model initialization and defaults."""
    ctrl = RegulationControl(
        article_objet="Article 5 - Ratios",
        objectif="Vérifier l'exposition actions",
        document_reference="Règlement CDG Capital",
        frequence="Mensuel",
        criteres_conformite="Ratio < 15%",
        documents_requis="Rapport mensuel",
        detail_explication="Calculer la somme des positions equity.",
        points_specifiques="Vérifier la liquidité des titres.",
    )
    assert ctrl.article_objet == "Article 5 - Ratios"
    assert ctrl.frequence == "Mensuel"
    assert "15%" in ctrl.criteres_conformite


def test_section_and_page_chunked_model():
    """Test Section and PageChunked Pydantic models."""
    sec1 = Section(title="Section 1", content="Contenu de la section 1")
    sec2 = Section(title="Section 2", content="Contenu de la section 2")
    chunked = PageChunked(sections=[sec1, sec2])

    assert len(chunked.sections) == 2
    assert chunked.sections[0].title == "Section 1"
    assert chunked.sections[1].content == "Contenu de la section 2"


def test_verified_regulation_model():
    """Test VerifiedRegulation model."""
    ver = VerifiedRegulation(is_verified=True)
    assert ver.is_verified is True


def test_extract_rg_name_model():
    """Test ExtractRGName model."""
    name_obj = ExtractRGName(rg_name="FCP NOVUS GREEN PACK")
    assert name_obj.rg_name == "FCP NOVUS GREEN PACK"


def test_api_models():
    """Test HelloOutput and AgentResult response models."""
    hello = HelloOutput(Message="Hello World")
    assert hello.Message == "Hello World"

    res = AgentResult(
        rg_path="reglements/doc.pdf",
        max_pages=10,
        max_rgs=15,
        output_file="plans/result.xlsx",
    )
    assert res.max_pages == 10
    assert res.output_file == "plans/result.xlsx"
