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

from check_planner.agents.models import (AgentState, RegulationControl,
                                         VerifiedRegulation)
from check_planner.agents.prompts import prompt_system, prompt_verified_rg
from check_planner.llm import (get_llm_gemini, get_llm_groq, llm_gemini,
                               llm_groq)
from check_planner.pdf_splitter import split_pdf
from check_planner.regulation_chunker import chunk_page_regulations


class CheckPlanerAgent:

    def __init__(self, llm: BaseChatModel = llm_groq):
        self.llm_params = {"iteration": 0, "type": "groq", "max": 20, "call": "verify"}
        self.llm_gen = llm.with_structured_output(RegulationControl)
        self.llm_ver = llm.with_structured_output(VerifiedRegulation)
        self.data_pages = []
        self.regulations = []

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
            self.data_pages = pages_data
            return {**state, "max_pages": len(pages_data)}

        except Exception as e:
            logger.error(f"Une erreur est survenue : {e}")
            return {**state, "max_pages": 0}

    def _verification_chunk_reg_node(self, state: AgentState):
        if self.regulations:

            text = self.regulations[state["rg_num"]]

            full_message = prompt_verified_rg.format(text=text)
            self.llm_params["call"] = "verify"
            verified = self._safe_invoke([HumanMessage(content=full_message)])

            return {
                **state,
                "is_verified": verified.is_verified,
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

    def _regulation_line_generation_node(self, state: AgentState):
        if self.regulations:
            regulation_text = self.regulations[state["rg_num"] - 1]
            text = f"(page {state['current_page_num']+1}){regulation_text['numero']} {regulation_text['titre']}\n{regulation_text['contenu']}"
            full_message = prompt_system.format(regulation=text)
            self.llm_params["call"] = "generate"
            regulation = self._safe_invoke([HumanMessage(content=full_message)])

            #
            state["regulation"] = regulation.model_dump()
            logger.info("regulation genere par le llm")
            return {
                **state,
                "regulation": regulation.model_dump(),
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
            return "ocr"

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
            text = pytesseract.image_to_string(img)
            self.data_pages[state["current_page_num"]] = text

            return state

        except pytesseract.TesseractNotFoundError:
            logger.error(f"Error: Tesseract is not installed or not in your PATH.")
            logger.error(f"Please install Tesseract OCR engine.")

            self.data_pages[state["current_page_num"]] = (
                f"Error: Tesseract not found for page {page['number']}"
            )
            return state
        except Exception as e:
            logger.error(f"An error occurred during OCR for page {page['number']}: {e}")
            self.data_pages[state["current_page_num"]] = (
                f"Error during OCR for page {page['number']}: {e}"
            )

            return state

    def _regulation_extractor_node(self, state: AgentState):

        if state["rg_num"] != 0 and len(self.regulations) != (state["rg_num"]):
            return state

        text = self.data_pages[state["current_page_num"]]["content"]
        regulations = chunk_page_regulations(texte=text)
        self.regulations = regulations
        logger.info("le nombre de regulations extraits: %d", len(self.regulations))
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
            ws.row_dimensions[row].height = 30

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

            if "N° de Contrôle" not in df.columns:
                df["N° de Contrôle"] = []

            if df.empty or df["N° de Contrôle"].isnull().all():
                prochain_num = 1
            else:
                prochain_num = int(df["N° de Contrôle"].max()) + 1

            nouvelle_next = {
                "N° de Contrôle": prochain_num,
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

            # Sauvegarder
            df.to_excel(output_file, index=False)
            logger.info(
                f"Ligne ajoutée avec N° {prochain_num} et sauvegardée dans {output_file}"
            )
        except Exception as e:
            logger.error("Exception: %s", e)
        return state

    def _finish_node(self, state: AgentState):
        output = state["output_file"]
        if os.path.exists(output):
            self._excel_formatter(output)

        return state

    def run(self, rg_path: str):
        """
        Agent start flow
        """
        folder = os.path.dirname(rg_path)  # Chemin du dossier
        filename = os.path.basename(rg_path)
        init_state = {
            "rg_path": rg_path,
            "current_page_num": 0,
            "regulation": {},
            "max_pages": 0,
            "rg_num": 0,
            "max_rgs": 0,
            "output_file": f"{folder }/plan_de_controle_{filename.lower().replace('.pdf','.xlsx')}",
        }

        response = self.graph.invoke(init_state, {"recursion_limit": 10000})
        return response

    def _rotate_llm(self):
        if self.llm_params["iteration"] >= self.llm_params["max"]:
            self.llm_params["type"] = (
                "gemini" if self.llm_params["type"] == "groq" else "groq"
            )

        if self.llm_params["type"] == "groq":
            llm = get_llm_groq()
        else:
            llm = get_llm_gemini()

        self.llm_gen = llm.with_structured_output(RegulationControl)
        self.llm_ver = llm.with_structured_output(VerifiedRegulation)

    @backoff.on_exception(
        backoff.expo, (ResourceExhausted, Exception), max_tries=7, jitter=None
    )
    def _safe_invoke(self, full_messages):
        try:
            self.llm_params["iteration"] += 1
            if self.llm_params.get("call") == "verify":
                return self.llm_ver.invoke(full_messages)
            else:
                return self.llm_gen.invoke(full_messages)
        except ResourceExhausted as e:
            logger.warning("[Quota] Clé API dépassée, on change...")
            self._rotate_llm()
            raise e
        except Exception as e:
            logger.error(f"[Erreur] {e}, on essaye un autre LLM...")
            self._rotate_llm()
            raise e
