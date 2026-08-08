"""
Unit tests for pdf_splitter and OCR integration functions.
"""
from PIL import Image
from check_planner.agents.plan_generator_agent.agent import perform_ocr
from check_planner.pdf_splitter.splitter import is_probable_tableau


def test_perform_ocr_fallback():
    """Test perform_ocr executes without crashing on a simple dummy image."""
    img = Image.new("RGB", (100, 30), color=(255, 255, 255))
    result = perform_ocr(img)
    assert isinstance(result, str)


def test_is_probable_tableau_detector():
    """Test is_probable_tableau helper heuristic."""
    line1 = "Tableau des Ratios d'Investissement et Limites d'Exposition"
    assert is_probable_tableau(line1) is True

    line2 = "Texte explicatif général sur la gestion du fonds."
    assert is_probable_tableau(line2) is False
