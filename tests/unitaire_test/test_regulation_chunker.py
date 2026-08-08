"""
Unit tests for text regulation chunker and section extraction regex.
"""
from check_planner.regulation_chunker import chunk_page_regulations
from check_planner.regulation_chunker.regulation_extractor import RegulationExtractor


def test_chunk_page_regulations_basic():
    """Test chunk_page_regulations with structured French text."""
    sample_text = """
    REGLEMENT DE GESTION DU FONDS
    
    Article 1: Objet du Fonds
    Le fonds a pour objet d'investir dans les titres de créances négociables.
    
    Article 2: Politiques d'investissement
    L'exposition globale du fonds aux marchés d'actions ne peut excéder 10%.
    
    Article 3: Fréquence des contrôles
    Les contrôles de conformité sont effectués de manière hebdomadaire par le dépositaire.
    """
    sections = chunk_page_regulations(sample_text)
    assert isinstance(sections, list)
    assert len(sections) > 0
    first = sections[0]
    assert "titre" in first
    assert "contenu" in first


def test_regulation_extractor_class():
    """Test RegulationExtractor methods directly."""
    extractor = RegulationExtractor()
    sample_line = "Article 15 - Modalités de souscription et de rachat"
    
    est_titre, pattern_name, num, titre = extractor.detecter_titre_avec_contexte(
        sample_line, index=0, lignes=[sample_line]
    )
    assert est_titre is True
    assert titre is not None


def test_table_line_detection_heuristic():
    """Test est_ligne_tableau heuristic."""
    extractor = RegulationExtractor()
    table_line = "| Code ISIN | Libellé Titre | Quantité | Valeur Liquidative |"
    assert extractor.est_ligne_tableau(table_line) is True
