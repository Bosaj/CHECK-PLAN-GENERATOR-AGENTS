from typing import Any, Dict, List, Optional, TypedDict

from pydantic import BaseModel, Field


class AgentState(TypedDict):
    rg_path: str
    current_page_num: int = 0
    max_pages: int
    rg_num: int = 0
    is_verified: bool
    max_rgs: int
    regulation: dict
    output_file: str


class RegulationControl(BaseModel):
    article_objet: str = Field(
        ...,
        description=(
            "Titre exact de l’article ou de la section du règlement "
            "(ex: 'Article 1 : Formation'). Reformuler si possible, utiliser "
            "le libellé tel qu’il apparaît dans le texte sans numerotation du début (corrige s'il y'a faute orthographe)."
        ),
    )
    objectif: str = Field(
        ...,
        description=(
            "Objectif du contrôle commençant obligatoirement par un verbe "
            "à l’infinitif suivi du reste de la phrase (ex: 'Vérifier la présence...')."
        ),
    )
    document_reference: str = Field(
        ...,
        description=(
            "Référence exacte du document indiquée dans la réglementation donnée, nom du present document(page n°) "
            "(ex: 'RG NAMA FUND (Article 2), RG NAMA Reglement(page 12) ,Circulaire AMMC n°XX/XX', 'Directive BCE n°XXX', ). "
            "Ne pas inventer."
        ),
    )
    frequence: str = Field(
        ...,
        description="Fréquence précise du contrôle (ex: quotidien, mensuel, annuel).",
    )
    criteres_conformite: str = Field(
        ...,
        description="Liste claire et opérationnelle des critères de conformité à respecter mentionné dans le texte.",
    )
    documents_requis: str = Field(
        ...,
        description="Documents ou références explicitement requis par la réglementation. "
        "Si le texte mentionne un document, il doit être repris ici.",
    )
    detail_explication: str = Field(
        ..., description="Explications détaillées pour guider le contrôleur pas à pas."
    )
    points_specifiques: str = Field(
        ...,
        description="Points spécifiques et précis à vérifier, extraits ou déduits du texte.",
    )


class VerifiedRegulation(BaseModel):
    is_verified: bool = Field(
        ...,
        description="True si le text est un element à controler par le controleur. Sinon False",
    )


class VerifiedAgentState(TypedDict):
    check_path: str
    current_rg_num: int = 0
    max_regs: int
    is_verified: bool
    regulation: dict
    output_file: str


class ExtractRGName(BaseModel):
    rg_name: Optional[str] = Field(
        ...,
        description=(
            "The official legal name of the management regulation as displayed in the page title. "
            "If the name is very long, provide a shortened acronym (e.g., 'NAMA I - FPCC-RFA'). "
            "⚠️ If no valid name is detected, return `null` and do not invent any value."
        ),
    )


class Section(BaseModel):
    title: str = Field(..., description="Titre exact de la section")
    content: str = Field(..., description="Texte continu correspondant à la section")


class PageChunked(BaseModel):
    sections: List[Section] = Field(
        ..., description="Liste des sections extraites de la page"
    )
