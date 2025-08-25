import logging
import os

import backoff
import pandas as pd
from dotenv import load_dotenv
from google.api_core.exceptions import ResourceExhausted
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langgraph.graph import END, StateGraph

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from check_planner.agents.models import RegulationControl, VerifiedAgentState
from check_planner.llm import (get_llm_gemini, get_llm_groq, llm_gemini,
                               llm_groq)


class VerifierAgent:

    def __init__(self, llm: BaseChatModel = llm_groq):
        self.llm_params = {"iteration": 0, "type": "groq", "max": 20, "call": "verify"}
        self.llm_gen = llm.with_structured_output(RegulationControl)
        self.regulations = []

        # build graph
        self.graph = self._build_graph()

        # display(Image(self.graph.get_graph().draw_mermaid_png()))

    def _build_graph(self):
        """Build the LangGraph state graph"""
        graph = StateGraph(VerifiedAgentState)

        # add nodes
        graph.add_node("start", self._start_node)
        graph.add_node("load_check", self._load_check_plan_node)
        graph.add_node("plan", self._process_plan_node)
        graph.add_node("correction", self._line_correction_node)
        graph.add_node("stock", self._stock_data_node)
        graph.add_node("finish", self._finish_node)

        # add edges
        graph.add_edge("start", "load_check")
        graph.add_edge("load_check", "plan")

        graph.add_conditional_edges(
            "plan",
            self._should_regulation_continu,
            {"correction": "correction", "plan": "plan", "stock": "stock"},
        )

        graph.add_edge("correction", "plan")
        graph.add_edge("stock", "finish")

        graph.add_edge("finish", END)
        # set entry point
        graph.set_entry_point("start")

        return graph.compile()

    def _start_node(self, state: VerifiedAgentState):

        return {**state, "current_rg_num": 0, "regulation": {}}

    def _load_check_plan_node(self, state: VerifiedAgentState):
        logger.info("Chargement du plan de vérification...")
        check_file = state["check_path"]

        if os.path.exists(check_file):

            df_data = pd.read_excel(check_file)

            data = df_data.fillna("").to_dict(orient="records")

            self.regulations = data

            return {**state, "current_rg_num": 0, "max_regs": len(data)}

        return {**state}

    def _process_plan_node(self, state: VerifiedAgentState):
        logger.info("Plan de process")

        return {**state, "current_rg_num": state.get("current_rg_num") + 1}

    def _line_correction_node(self, state: VerifiedAgentState):
        logger.info("correction...")

        self.regulations[state["current_rg_num"] - 1] = {}

        return state

    def _should_regulation_continu(self, state: VerifiedAgentState):

        if state["current_rg_num"] >= state["max_regs"]:
            return "stock"

        if all(self.regulations[state["current_rg_num"] - 1].values()):
            return "plan"

        return "correction"

    def _stock_data_node(self, state: VerifiedAgentState):
        logger.info("stockage...")
        output = state["output_file"]

        if self.regulations:
            try:

                data = [
                    {**line, "N° de Contrôle": idx + 1}
                    for idx, line in enumerate(self.regulations)
                    if line
                ]
                df = pd.DataFrame(data)

                # Exporter en Excel
                df.to_excel(output, index=False)

                return state
            except Exception as e:
                print(f"Erreur au niveau de stockage: {e}")
        return state

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

    def _finish_node(self, state: VerifiedAgentState):
        logger.info("Fin du process...")
        output = state["output_file"]

        if os.path.exists(output):
            self._excel_formatter(output)

        return state

    def run(self, check_path: str):
        """
        Agent start flow
        """
        folder = os.path.dirname(check_path)  # Chemin du dossier
        filename = os.path.basename(check_path)
        init_state = {
            "check_path": check_path,
            "current_rg_num": 0,
            "regulation": {},
            "max_regs": 0,
            "output_file": f"{folder }/plan_de_controle_final_{filename.lower()}",
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

    @backoff.on_exception(
        backoff.expo, (ResourceExhausted, Exception), max_tries=7, jitter=None
    )
    def _safe_invoke(self, full_messages):
        try:
            self.llm_params["iteration"] += 1
            if self.llm_params.get("call") == "verify":
                pass
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
