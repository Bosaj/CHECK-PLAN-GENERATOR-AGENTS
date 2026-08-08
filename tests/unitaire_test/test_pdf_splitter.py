"""
Unit tests for pdf_splitter and OCR integration functions.
"""
from PIL import Image
from check_planner.agents.plan_generator_agent.agent import perform_ocr
from check_planner.pdf_splitter.splitter import PDFSplitter


def test_perform_ocr_fallback():
    """Test perform_ocr executes without crashing on a simple dummy image."""
    img = Image.new("RGB", (100, 30), color=(255, 255, 255))
    result = perform_ocr(img)
    assert isinstance(result, str)


def test_pdf_splitter_heuristics():
    """Test PDFSplitter table detection heuristic."""
    splitter = PDFSplitter()
    short_line = [{"x0": 10, "x1": 20, "texte": "word"}]
    assert splitter.detecter_tableau(short_line, [], 0) is False

    table_line = [
        {"x0": 10, "x1": 30, "texte": "Col1"},
        {"x0": 80, "x1": 100, "texte": "Col2"},
        {"x0": 150, "x1": 170, "texte": "Col3"},
    ]
    assert splitter.detecter_tableau(table_line, [], 0) is True

