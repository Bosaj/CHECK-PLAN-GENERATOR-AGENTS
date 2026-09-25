from .regulation_extractor import RegulationExtractor


# Fonction de commodité pour rétrocompatibilité
# Fonction principale pour utilisation simple
def chunk_page_regulations(texte: str, hierarchie: bool = False) -> list[dict] | tuple[list[dict], dict]:
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


__all__ = ["RegulationExtractor", "chunk_page_regulations"]
