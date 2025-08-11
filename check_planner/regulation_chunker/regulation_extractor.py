import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import spacy


@dataclass
class RegulationSection:
    """Structure pour représenter une section de réglementation"""

    number: str
    title: str
    paragraphs: List[str]
    level: int  # Niveau hiérarchique (1, 2, 3...)
    full_number: str  # Numéro complet (ex: "1.2.3")


class RegulationExtractor:
    def __init__(self, model_name: str = "fr_core_news_sm"):
        """
        Initialise l'extracteur avec le modèle spaCy

        Args:
            model_name: Nom du modèle spaCy à utiliser
        """
        try:
            self.nlp = spacy.load(model_name)
        except OSError:
            print(
                f"Modèle {model_name} non trouvé. Installez-le avec: python -m spacy download {model_name}"
            )
            raise

        # Patterns regex pour différents formats de numérotation
        self.section_patterns = [
            # Format: "1.2.3. Titre" ou "1. Titre"
            re.compile(r"^(\d+(?:\.\d+)*)\.\s*(.+)$"),
            # Format: "Article 1.2.3 - Titre" ou "Art. 1 - Titre"
            re.compile(
                r"^(?:Article|Art\.?)\s+(\d+(?:\.\d+)*)\s*[-–—]\s*(.+)$", re.IGNORECASE
            ),
            # Format: "Section 1.2 : Titre"
            re.compile(r"^Section\s+(\d+(?:\.\d+)*)\s*[:]\s*(.+)$", re.IGNORECASE),
            # Format: "1.2.3 - Titre" (sans point final)
            re.compile(r"^(\d+(?:\.\d+)*)\s*[-–—]\s*(.+)$"),
            # Format: "Titre - 1.2.3" (titre avant numéro)
            re.compile(r"^(.+?)\s*[-–—]\s*(\d+(?:\.\d+)*)$"),
            # Format: "I. Titre" ou "II.1. Titre" (numérotation romaine)
            re.compile(r"^([IVX]+(?:\.\d+)*)\.\s*(.+)$"),
        ]

    def _calculate_section_level(self, number: str) -> int:
        """
        Calcule le niveau hiérarchique basé sur le nombre de points

        Args:
            number: Numéro de section (ex: "1.2.3")

        Returns:
            Niveau hiérarchique (1, 2, 3, etc.)
        """
        if re.match(r"^[IVX]+", number):  # Numérotation romaine
            return number.count(".") + 1
        return number.count(".") + 1

    def _is_section_header(self, line: str) -> Optional[Tuple[str, str, bool]]:
        """
        Détermine si une ligne est un en-tête de section

        Args:
            line: Ligne de texte à analyser

        Returns:
            Tuple (numéro, titre, titre_avant_numero) ou None
        """
        line = line.strip()

        for i, pattern in enumerate(self.section_patterns):
            match = pattern.match(line)
            if match:
                if i == 4:  # Pattern "Titre - Numéro"
                    return match.group(2), match.group(1), True
                else:
                    return match.group(1), match.group(2), False

        return None

    def _clean_paragraph(self, paragraph: str) -> str:
        """
        Nettoie un paragraphe en supprimant les espaces superflus

        Args:
            paragraph: Paragraphe à nettoyer

        Returns:
            Paragraphe nettoyé
        """
        # Supprime les espaces en début/fin et normalise les espaces
        cleaned = re.sub(r"\s+", " ", paragraph.strip())
        return cleaned

    def _merge_continued_paragraphs(self, paragraphs: List[str]) -> List[str]:
        """
        Fusionne les paragraphes qui semblent être la continuation d'un précédent

        Args:
            paragraphs: Liste des paragraphes

        Returns:
            Liste des paragraphes fusionnés
        """
        if not paragraphs:
            return []

        merged = []
        current_paragraph = paragraphs[0]

        for i in range(1, len(paragraphs)):
            paragraph = paragraphs[i]

            # Si le paragraphe précédent ne finit pas par un point et
            # que le suivant ne commence pas par une majuscule, on fusionne
            if (
                not current_paragraph.endswith(".")
                and not current_paragraph.endswith(":")
                and not current_paragraph.endswith(";")
                and paragraph
                and not paragraph[0].isupper()
            ):
                current_paragraph += " " + paragraph
            else:
                merged.append(current_paragraph)
                current_paragraph = paragraph

        merged.append(current_paragraph)
        return merged

    def extract_sections(
        self, text: str, merge_paragraphs: bool = True
    ) -> List[RegulationSection]:
        """
        Extrait les sections numérotées avec leurs titres et paragraphes

        Args:
            text: Texte à analyser
            merge_paragraphs: Si True, fusionne les paragraphes continuels

        Returns:
            Liste des sections extraites
        """
        sections = []
        current_section = None
        lines = text.splitlines()

        for line in lines:
            line = line.strip()

            # Ignore les lignes vides
            if not line:
                continue

            # Vérifie si c'est un en-tête de section
            section_info = self._is_section_header(line)

            if section_info:
                number, title, title_first = section_info

                # Sauvegarde la section précédente
                if current_section:
                    if merge_paragraphs and current_section.paragraphs:
                        current_section.paragraphs = self._merge_continued_paragraphs(
                            current_section.paragraphs
                        )
                    sections.append(current_section)

                # Crée une nouvelle section
                level = self._calculate_section_level(number)
                current_section = RegulationSection(
                    number=number,
                    title=title.strip(),
                    paragraphs=[],
                    level=level,
                    full_number=number,
                )

            elif current_section:
                # Ajoute la ligne comme paragraphe
                cleaned_line = self._clean_paragraph(line)
                if cleaned_line:  # Ignore les lignes vides après nettoyage
                    current_section.paragraphs.append(cleaned_line)

        # Ajoute la dernière section
        if current_section:
            if merge_paragraphs and current_section.paragraphs:
                current_section.paragraphs = self._merge_continued_paragraphs(
                    current_section.paragraphs
                )
            sections.append(current_section)

        return sections

    def extract_sections_with_nlp(self, text: str) -> List[RegulationSection]:
        """
        Version avancée utilisant spaCy pour une meilleure analyse

        Args:
            text: Texte à analyser

        Returns:
            Liste des sections extraites
        """
        doc = self.nlp(text)
        sections = []
        current_section = None

        # Traite chaque phrase
        for sent in doc.sents:
            sent_text = sent.text.strip()

            if not sent_text:
                continue

            # Vérifie si c'est un en-tête de section
            section_info = self._is_section_header(sent_text)

            if section_info:
                number, title, title_first = section_info

                # Sauvegarde la section précédente
                if current_section:
                    sections.append(current_section)

                # Crée une nouvelle section
                level = self._calculate_section_level(number)
                current_section = RegulationSection(
                    number=number,
                    title=title.strip(),
                    paragraphs=[],
                    level=level,
                    full_number=number,
                )

            elif current_section:
                # Analyse plus fine avec spaCy
                cleaned_sent = self._clean_paragraph(sent_text)
                if cleaned_sent:
                    current_section.paragraphs.append(cleaned_sent)

        # Ajoute la dernière section
        if current_section:
            sections.append(current_section)

        return sections

    def print_sections(
        self, sections: List[RegulationSection], max_paragraph_length: int = 200
    ):
        """
        Affiche les sections extraites de manière formatée

        Args:
            sections: Liste des sections à afficher
            max_paragraph_length: Longueur maximale d'affichage par paragraphe
        """
        for section in sections:
            indent = "  " * (section.level - 1)
            print(f"{indent}Section {section.number}: {section.title}")

            for i, paragraph in enumerate(section.paragraphs, 1):
                truncated = paragraph[:max_paragraph_length]
                if len(paragraph) > max_paragraph_length:
                    truncated += "..."
                print(f"{indent}  Paragraphe {i}: {truncated}")
            print()
