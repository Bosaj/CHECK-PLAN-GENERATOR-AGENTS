from typing import Dict, List

from .regulation_extractor import RegulationExtractor


# Fonction de commodité pour rétrocompatibilité
# Fonction principale pour utilisation simple
def chunk_page_regulations(texte: str, hierarchie=False) -> List[Dict]:
    """
    Fonction d'entrée principale pour analyser un texte.

    Args:
        texte: Le texte à analyser

    Returns:
        Liste des sections avec titres et contenu
    """
    analyseur = RegulationExtractor()
    sections = analyseur.analyser_structure(texte)

    if hierarchie:
        return (sections, analyseur.construire_hierarchie(sections))
    return sections


__ALL__ = ["chunk_page_regulations", "RegulationExtractor"]
