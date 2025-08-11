from typing import Any, Dict, List, Optional, TypedDict

from pydantic import BaseModel, Field


class AgentState(TypedDict):
    rg_path: str
    current_page_num: int = 0
    max_pages: int
    rg_num: int = 0
    max_rgs: int
    regulation: dict
    output_file: str


class RegulationControl(BaseModel):
    article_objet: str = Field(
        ..., description="Article ou objet du contrôle (ex: Article 1 : Formation)"
    )
    objectif: str = Field(
        ..., description="Objectif commençant par un verbe à l’infinitif"
    )
    document_reference: str = Field(
        ..., description="Document de référence indiqué dans le contexte"
    )
    frequence: str = Field(..., description="Fréquence du contrôle")
    criteres_conformite: str = Field(
        ..., description="Critères de conformité à respecter"
    )
    documents_requis: str = Field(
        ..., description="Liste des documents requis pour le contrôle"
    )
    detail_explication: str = Field(
        ..., description="Détails et explications pour le contrôleur"
    )
    points_specifiques: str = Field(
        ..., description="Points spécifiques à contrôler avec détails"
    )
