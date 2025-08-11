from typing import Dict, List

from .regulation_extractor import RegulationExtractor


# Fonction de commodité pour rétrocompatibilité
def chunk_page_regulations(text: str, use_nlp: bool = False) -> List[Dict]:
    """
    Version rétrocompatible de la fonction originale

    Args:
        text: Texte à analyser
        use_nlp: Si True, utilise l'analyse spaCy avancée

    Returns:
        Liste de dictionnaires représentant les sections
    """
    extractor = RegulationExtractor()

    if use_nlp:
        sections = extractor.extract_sections_with_nlp(text)
    else:
        sections = extractor.extract_sections(text)

    # Convertit en format dictionnaire pour compatibilité
    result = []
    for section in sections:
        result.append(
            {
                "number": section.number,
                "title": section.title,
                "paragraphs": section.paragraphs,
                "level": section.level,
                "full_number": section.full_number,
            }
        )

    return result


__ALL__ = ["chunk_page_regulations", "RegulationExtractor"]
