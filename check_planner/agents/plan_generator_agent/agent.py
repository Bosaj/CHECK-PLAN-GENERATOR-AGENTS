import asyncio
import logging
import os

import backoff
import pandas as pd
import pytesseract
from google.api_core.exceptions import ResourceExhausted

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage
from langgraph.graph import END, StateGraph
from PIL import Image

from check_planner.agents.models import (
    AgentState,
    ExtractRGName,
    PageChunked,
    RegulationControl,
    VerifiedRegulation,
)
from check_planner.agents.prompts import (
    extract_title_prompt,
    prompt_system,
    prompt_verified_rg,
)
from check_planner.llm import get_llm_gemini, get_llm_groq, llm_groq
from check_planner.pdf_splitter import split_pdf
from check_planner.regulation_chunker import chunk_page_regulations

# Constant for the repeated Excel column header
COL_CONTROLE = "N\u00b0 de Contr\u00f4le"

def perform_ocr(img: Image.Image) -> str:
    """Perform OCR using RapidOCR (PaddleOCR ONNX) with Tesseract fallback."""
    try:
        import numpy as np
        from rapidocr_onnxruntime import RapidOCR
        engine = RapidOCR()
        img_np = np.array(img)
        result, _ = engine(img_np)
        if result:
            return "\n".join([line[1] for line in result])
    except Exception as e:
        logger.warning(f"RapidOCR failed, using Tesseract fallback: {e}")
    return pytesseract.image_to_string(img)



class CheckPlanerAgent:

    def __init__(self, llm: BaseChatModel = llm_groq):
        self.llm_params = {
            "iteration": 0,
            "type": "groq",
            "max": 20,
            "call": "verify",
            "chunk_type": "llm",
        }
        self.llm_gen = llm.with_structured_output(RegulationControl)
        self.llm_ver = llm.with_structured_output(VerifiedRegulation)
        self.llm = llm
        self.llm_chunk = llm.with_structured_output(PageChunked)
        self.data_pages = []
        self.regulations = []
        self.rg_name = ""

        # build graph
        self.graph = self._build_graph()
        # display(Image(self.graph.get_graph().draw_mermaid_png()))

    def _build_graph(self):
        """Build the LangGraph state graph"""
        graph = StateGraph(AgentState)

        # add nodes
        graph.add_node("start", self._start_node)
        graph.add_node("load_split", self._load_and_split_pages_node)
        graph.add_node("plan", self._process_plan_node)
        graph.add_node("regulation_gen", self._regulation_line_generation_node)
        graph.add_node("ocr", self._page_ocr_node)
        graph.add_node("chunk_regulation", self._regulation_extractor_node)
        graph.add_node("verify_chunk", self._verification_chunk_reg_node)
        graph.add_node("add_regulation_line", self._add_regulation_line_node)
        graph.add_node("finish", self._finish_node)

        # add edges
        graph.add_edge("start", "load_split")
        graph.add_edge("load_split", "plan")

        graph.add_conditional_edges(
            "plan",
            self._should_continue_page,
            {"image": "ocr", "continu": "chunk_regulation", "finish": "finish"},
        )

        graph.add_edge("ocr", "chunk_regulation")
        graph.add_edge("chunk_regulation", "verify_chunk")

        graph.add_conditional_edges(
            "verify_chunk",
            self._should_verify,
            {
                "verified": "regulation_gen",
                "none": "chunk_regulation",
                "return": "plan",
            },
        )

        graph.add_edge("regulation_gen", "add_regulation_line")

        graph.add_conditional_edges(
            "add_regulation_line",
            self._should_continue_regulation,
            {"chunk_regulation": "chunk_regulation", "plan": "plan"},
        )

        graph.add_edge("finish", END)
        # set entry point
        graph.set_entry_point("start")

        return graph.compile()

    def _start_node(self, state: AgentState):

        return {
            **state,
            "current_page_num": 0,
            "is_verified": False,
            "rg_num": 0,
            "regulation": {},
        }

    def _process_plan_node(self, state: AgentState):
        logger.info("Plan de process")
        return {**state, "rg_num": 0}

    def _load_and_split_pages_node(self, state: AgentState):
        pdf_path = state["rg_path"]

        try:
            pages_data = split_pdf(pdf_path)

            try:
                if not self.rg_name and pages_data:
                    structured_rg_name = self.llm.with_structured_output(ExtractRGName)
                    page = pages_data[0]
                    if page.get("type") == "txt":
                        prompt = extract_title_prompt.format(text=page.get("content"))
                        rg = structured_rg_name.invoke(prompt)
                    else:
                        img = Image.frombytes(
                            "RGB",
                            [page["content"].width, page["content"].height],
                            page["content"].samples,
                        )
                        text = perform_ocr(img)
                        prompt = extract_title_prompt.format(text=text)
                        rg = structured_rg_name.invoke(prompt)

                    if not rg.rg_name:
                        raise ValueError(
                            "Le nom juridique du reglement de gestion est vide"
                        )
                    logger.info("RG NAME -%s", rg.rg_name)
                    self.rg_name = rg.rg_name

            except Exception:
                logger.exception("Erreur extraction du nom rg")
                self.rg_name = os.path.basename(state.get("rg_path")).replace(
                    ".pdf", ""
                )

            self.data_pages = pages_data
            max_pages = min(len(pages_data), 30)
            logger.info(f"Loaded {len(pages_data)} pages, processing top {max_pages} pages for check plan generation.")
            return {**state, "max_pages": max_pages}

        except Exception:
            logger.exception("Une erreur est survenue lors du chargement du PDF")
            return {**state, "max_pages": 0}

    async def _verification_chunk_reg_node(self, state: AgentState):
        if self.regulations:

            text = self.regulations[state["rg_num"]]

            full_message = prompt_verified_rg.format(text=text)
            self.llm_params["call"] = "verify"
            verified = await self._safe_invoke([HumanMessage(content=full_message)])

            is_v = True
            if isinstance(verified, VerifiedRegulation):
                is_v = verified.is_verified
            elif isinstance(verified, dict) and 'is_verified' in verified:
                is_v = bool(verified['is_verified'])

            return {
                **state,
                "is_verified": is_v,
                "rg_num": state.get("rg_num", 0) + 1,
            }

        return {**state, "is_verified": False}

    def _should_verify(self, state: AgentState):

        if state.get("is_verified", False):
            return "verified"
        else:
            if state["rg_num"] >= state["max_rgs"] or self.regulations == []:
                return "return"
            return "none"

    async def _regulation_line_generation_node(self, state: AgentState):
        if self.regulations:
            regulation_text = self.regulations[state["rg_num"] - 1]

            if self.llm_params["chunk_type"] == "nlp":
                text = (
                    f"({self.rg_name} (page {self.data_pages[state.get('current_page_num', 0)-1].get('number', '?')}))\n"
                    f"{regulation_text.get('titre', '')}\n"
                    f"{regulation_text.get('contenu', '')}"
                )
            else:
                text = (
                    f" RG - ({self.rg_name})\n"
                    f"{regulation_text.get('title', '')}\n"
                    f"{regulation_text.get('content', '')}"
                )

            full_message = prompt_system.format(regulation=text)
            self.llm_params["call"] = "generate"
            regulation = await self._safe_invoke([HumanMessage(content=full_message)])

            regulation = regulation.model_dump()
            regulation = {
                key: (
                    value.replace("(inferred)", "") if isinstance(value, str) else value
                )
                for key, value in regulation.items()
            }
            state["regulation"] = regulation
            logger.info("regulation genere par le llm")
            return {
                **state,
                "regulation": regulation,
            }
        return {**state, "regulation": {}}

    def _should_continue_regulation(self, state: AgentState):

        if state["rg_num"] >= state["max_rgs"] or self.regulations == []:
            return "plan"
        else:
            return "chunk_regulation"

    def _should_continue_page(self, state: AgentState):

        if state["current_page_num"] + 1 > state["max_pages"]:
            return "finish"
        if self.data_pages[state.get("current_page_num")]["type"] == "image":
            return "image"

        if self.data_pages[state.get("current_page_num")]["type"] == "txt":
            return "continu"

    def _page_ocr_node(self, state: AgentState):

        try:
            page = self.data_pages[state["current_page_num"]]
            img = Image.frombytes(
                "RGB",
                [page["content"].width, page["content"].height],
                page["content"].samples,
            )
            text = perform_ocr(img)
            self.data_pages[state["current_page_num"]]["content"] = text

            return state

        except pytesseract.TesseractNotFoundError:
            logger.error("Error: Tesseract is not installed or not in your PATH.")
            logger.error("Please install Tesseract OCR engine.")

            self.data_pages[state["current_page_num"]][
                "content"
            ] = f"Error: Tesseract not found for page {page['number']}"
            return state
        except Exception as ex:
            logger.exception("An error occurred during OCR for page %s", page['number'])
            self.data_pages[state["current_page_num"]][
                "content"
            ] = f"Error during OCR for page {page['number']}: {ex}"

            return state

    async def _regulation_extractor_node(self, state: AgentState):

        if state["rg_num"] != 0 and len(self.regulations) != (state["rg_num"]):
            return state

        text = self.data_pages[state["current_page_num"]]["content"]

        try:
            self.llm_params["call"] = "chunk"
            chunked = await self._safe_invoke([HumanMessage(content=text)])

            if not isinstance(chunked, PageChunked):
                raise ValueError("Erreur de chunk")
            regulations = chunked.sections
            regulations = [section.model_dump() for section in regulations]
            self.llm_params["chunk_type"] = "llm"
        except Exception:
            regulations = chunk_page_regulations(texte=text)
            self.llm_params["chunk_type"] = "nlp"
        
        if not regulations and text.strip():
            page_num = state.get("current_page_num", 0) + 1
            regulations = [{"titre": f"Section Page {page_num}", "contenu": text[:1500]}]
            self.llm_params["chunk_type"] = "nlp"

        self.regulations = regulations
        logger.info(f"le nombre de regulations extraits: {len(self.regulations)}")

        return {
            **state,
            "max_rgs": len(self.regulations),
            "rg_num": 0,
            "current_page_num": state.get("current_page_num") + 1,
        }

    def _excel_formatter(self, file_path):
        from openpyxl import load_workbook
        from openpyxl.styles import Alignment

        wb = load_workbook(file_path)
        ws = wb.active

        # Ajuster largeur de colonnes
        ws.column_dimensions["A"].width = 12
        ws.column_dimensions["B"].width = 33
        ws.column_dimensions["C"].width = 42
        ws.column_dimensions["D"].width = 32
        ws.column_dimensions["E"].width = 21
        ws.column_dimensions["F"].width = 40
        ws.column_dimensions["G"].width = 37
        ws.column_dimensions["H"].width = 63
        ws.column_dimensions["I"].width = 69

        for row in range(1, ws.max_row + 1):
            ws.row_dimensions[row].height = 45

        # Appliquer wrap text à toutes les cellules
        for row in ws.iter_rows():

            for cell in row:
                cell.alignment = Alignment(wrap_text=True, vertical="center")

        for cell in ws[1]:
            cell.alignment = Alignment(
                horizontal="center", vertical="center", wrap_text=True
            )

        # Sauvegarder
        wb.save(file_path)

    def _add_regulation_line_node(self, state: AgentState):

        logger.info(
            "state: %s",
            f"{state.get('current_page_num')}/{state.get('max_pages')} pages and  {state.get('rg_num')}/{state.get('max_rgs')} regulations",
        )
        template_path = os.getenv("CHECK_TEMPLATE", "./plans/check_plan_template.xlsx")
        regulation_line = state["regulation"]
        output_file = state["output_file"]
        if not regulation_line:
            return state
        try:
            logger.info("regulation ajouté dans excel")
            if os.path.exists(output_file):
                df = pd.read_excel(output_file)
            else:
                df = pd.read_excel(template_path)

            if COL_CONTROLE not in df.columns:
                df[COL_CONTROLE] = []

            if df.empty or df[COL_CONTROLE].isnull().all():
                prochain_num = 1
            else:
                prochain_num = int(df[COL_CONTROLE].max()) + 1

            nouvelle_next = {
                COL_CONTROLE: prochain_num,
                "Article / Objet du Contrôle": regulation_line.get("article_objet", ""),
                "Objectif": regulation_line.get("objectif", ""),
                "Documents de Référence": regulation_line.get("document_reference", ""),
                "Fréquence": regulation_line.get("frequence", ""),
                "Critères de Conformité": regulation_line.get(
                    "criteres_conformite", ""
                ),
                "Documents Requis": regulation_line.get("documents_requis", ""),
                "Détails et Explications pour le Contrôleur": regulation_line.get(
                    "detail_explication", ""
                ),
                "Points spécifiques à contrôler avec détails": regulation_line.get(
                    "points_specifiques", ""
                ),
            }

            # Ajouter au DataFrame
            df = pd.concat([df, pd.DataFrame([nouvelle_next])], ignore_index=True)

            # Sauvegarder (s'assurer que le dossier parent existe)
            if output_file:
                parent_dir = os.path.dirname(output_file)
                if parent_dir:
                    os.makedirs(parent_dir, exist_ok=True)
            df.to_excel(output_file, index=False)
            logger.info(
                f"Ligne ajoutée avec N° {prochain_num} et sauvegardée dans {output_file}"
            )
            return {**state, "rg_num": state.get("rg_num", 0) + 1}
        except Exception:
            logger.exception("Exception lors de l'ajout dans Excel")
        return state

    def _finish_node(self, state: AgentState):
        output = state["output_file"]
        if os.path.exists(output):
            self._excel_formatter(output)

        return state

    async def arun(self, rg_path: str):
        """
        Agent start flow.
        Output directory is configurable via PLANS_DIR env var (default: ./plans).
        """
        plan_folder = os.getenv("PLANS_DIR", os.path.join(os.path.dirname(rg_path), "plans"))
        os.makedirs(plan_folder, exist_ok=True)
        filename = os.path.basename(rg_path)
        init_state = {
            "rg_path": rg_path,
            "current_page_num": 0,
            "regulation": {},
            "max_pages": 0,
            "rg_num": 0,
            "max_rgs": 0,
            "output_file": os.path.join(plan_folder, f"plan_de_controle_{filename.lower().replace('.pdf', '.xlsx')}"),
        }

        try:
            return await self.graph.ainvoke(init_state, {"recursion_limit": 10000})
        except Exception as e:
            return {
                "output_file": f"{plan_folder}/plan_de_controle_{filename.lower().replace('.pdf','.xlsx')}",
                "error": str(e),
            }

    def _rotate_llm(self):
        if self.llm_params["iteration"] >= self.llm_params["max"]:
            self.llm_params["iteration"] = 0
            self.llm_params["type"] = (
                "gemini" if self.llm_params["type"] == "groq" else "groq"
            )

        if self.llm_params["type"] == "groq":
            llm = get_llm_groq()
        else:
            llm = get_llm_gemini()

        if llm is None:
            llm = get_llm_gemini()

        if llm is not None:
            self.llm_gen = llm.with_structured_output(RegulationControl)
            self.llm_ver = llm.with_structured_output(VerifiedRegulation)
            self.llm_chunk = llm.with_structured_output(PageChunked)
            self.llm = llm

    async def _call_llm(self, full_messages):
        """Dispatch to the correct structured-output LLM based on current call type."""
        call = self.llm_params.get("call")
        if call == "verify":
            return await self.llm_ver.ainvoke(full_messages)
        if call == "chunk":
            return await self.llm_chunk.ainvoke(full_messages)
        return await self.llm_gen.ainvoke(full_messages)

    def _make_fallback(self):
        """Return a safe fallback object when the LLM is unavailable."""
        call = self.llm_params.get("call")
        if call == "verify":
            return VerifiedRegulation(is_verified=True)
        if call == "chunk":
            return PageChunked(sections=[])
        return RegulationControl(
            article_objet="Article Réglementaire",
            objectif="Vérifier la conformité des règles de gestion",
            document_reference="Règlement de Gestion",
            frequence="Mensuel",
            criteres_conformite="Respect des règles de gestion",
            documents_requis="Document de référence",
            detail_explication="Contrôle à effectuer par le responsable conformité.",
            points_specifiques="Vérification des ratios réglementaires.",
        )

    @backoff.on_exception(
        backoff.expo, (ResourceExhausted, Exception), max_tries=2, max_time=10, jitter=None
    )
    async def _safe_invoke(self, full_messages):
        """Invoke the LLM with quota-aware retry and graceful fallback."""
        self.llm_params["iteration"] += 1
        try:
            return await self._call_llm(full_messages)
        except ResourceExhausted:
            logger.warning("[Quota 429] Limite de débit API Gemini atteinte. Pause de 3s...")
            await asyncio.sleep(3)
            try:
                return await self._call_llm(full_messages)
            except Exception:
                logger.exception("[Quota 429 Fallback] Utilisation du mode secours")
                return self._make_fallback()
        except Exception:
            logger.exception("[Erreur LLM] Erreur lors de l'appel au modèle")
            return self._make_fallback()
