# -*- coding: utf-8 -*-
import re
from typing import Dict, List, Optional, Tuple

# spaCy optionnel
try:
    import spacy

    nlp = spacy.load("fr_core_news_sm")
except Exception:
    nlp = None


class RegulationExtractor:

    def __init__(self):

        self.patterns: Dict[str, re.Pattern] = {
            # 1. Titre, 1) Titre, 1- Titre, 15. Titre, 3 Titre
            "numerique": re.compile(
                r"^\s*(?P<num>\d+(?:\.\d+)*[\.\)\-]?|\d+)\s+(?P<title>.+?)\s*$"
            ),
            # 1.1. Titre, 2.3.4) Titre, 1.2.3.4- Titre (min 2 niveaux)
            "numerique_hierarchique": re.compile(
                r"^\s*(?P<num>\d+(?:\.\d+){1,})[\.\)\-]?\s+(?P<title>.+?)\s*$"
            ),
            # A. Titre, a) Titre, B- Titre
            "alphabetique": re.compile(
                r"^\s*(?P<num>[A-Za-z])[\.\)\-]?\s+(?P<title>.+?)\s*$"
            ),
            # AA. Titre, BB- Titre (deux lettres majuscules)
            "alphabetique_double": re.compile(
                r"^\s*(?P<num>[A-Z]{2})[\.\)\-]?\s+(?P<title>.+?)\s*$"
            ),
            # A1. Titre, B2) Titre, A1.1- Titre (alph-num simple ou hiérarchique)
            "mixte_alpha_num": re.compile(
                r"^\s*(?P<num>[A-Z]\d+(?:\.\d+)?)[\.\)\-]?\s+(?P<title>.+?)\s*$"
            ),
            # Romains : I. Titre, II) Titre, IV- Titre (majuscules uniquement)
            "romain": re.compile(
                r"^\s*"
                r"(?P<num>M{0,4}(CM|CD|D?C{0,3})?"
                r"(XC|XL|L?X{0,3})?"
                r"(IX|IV|V?I{0,3}))"
                r"[\.\)\-\s]+"
                r"(?P<title>.+?)\s*$"
            ),
            # Mots-clés institutionnels : ARTICLE 2. Titre / SECTION 1 - Titre / CHAPITRE I : Titre
            "structure_fr": re.compile(
                r"^\s*(?P<kw>(ARTICLE|SECTION|CHAPITRE|TITRE|PARTIE|LIVRE))\s+"
                r"(?P<num>(?:\d+(?:\.\d+)*)|[IVXLCM]+|[A-Za-z]+)"
                r"[\.\:\-\)]?\s+(?P<title>.+?)\s*$",
                re.IGNORECASE,
            ),
            # Puces : • Titre, - Titre, → Titre, ► Titre
            "puces": re.compile(r"^\s*(?:[•▪▫‣⁃◦▸▹►‎\*\-→►])\s+(?P<title>.+?)\s*$"),
            # --- Titres sans numérotation (délicat) ---
            # 1) Mots-clés usuels, très spécifiques (faible faux-positif)
            "titre_keywords": re.compile(
                r"^\s*(?P<title>("
                r"INTRODUCTION|CONCLUSION|R[ÉE]SUM[ÉE]|ABSTRACT|BIBLIOGRAPHIE|"
                r"R[ÉE]F[ÉE]RENCES|ANNEXE(?:S)?|APPENDICE(?:S)?|PR[ÉE]FACE|"
                r"AVANT[\-\s]?PROPOS|PROLOGUE|REMERCIEMENTS|GLOSSAIRE|SOMMAIRE|"
                r"TABLE\s+DES\s+MATI[ÈE]RES"
                r"))\s*[:：]?\s*$",
                re.IGNORECASE,
            ),
            # 2) Forme générique courte en TitreCase/MAJUSCULES (≤6 mots), fin sans ponctuation forte
            "titre_sans_numeration": re.compile(
                r"^\s*(?P<title>("
                r"(?:[A-ZÀ-ÖØ-Þ]{2,}|[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ0-9’\'\-]+)"
                r"(?:\s+(?:[A-ZÀ-ÖØ-Þ]{2,}|[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ0-9’\'\-]+)){0,7}"
                r"))\s*(?:[:：])?\s*(?<![\.!?…])$"
            ),
        }

        self.patterns_exclusion = {
            "code_block": re.compile(r"^\s*```"),
            "markdown_list": re.compile(r"^\s*[-*+]\s+"),  # listes markdown
            "horizontal_rule": re.compile(r"^\s*[-*_]{3,}\s*$"),
            "table_separator": re.compile(r"^\s*\|?:-+:?\|"),  # ---:--- etc.
            "image_link": re.compile(r"!\[.*?\]\(.*?\)"),
        }

        # Indicateurs (heuristiques)
        self.indicateurs_titre = [
            lambda l: l.isupper() and len(l) > 5,  # beaucoup de MAJ
            lambda l: l.endswith(":") and len(l) > 5,
            lambda l: l.count(" ") <= 6 and len(l) > 5,  # court
            lambda l: bool(re.search(r"\*\*.+\*\*", l)),  # **gras**
            lambda l: bool(re.search(r"^#{1,6}\s+", l)),  # # markdown
            lambda l: self._upper_ratio(l) >= 0.7,  # ratio MAJ élevé
        ]

        self.indicateurs_tableau = {
            "mots_cles": ["tableau", "figure", "annexe"],
            "patterns_ligne": [re.compile(r"\|.*\|"), re.compile(r"\t.*\t")],
        }

    @staticmethod
    def _upper_ratio(s: str) -> float:
        s2 = "".join(ch for ch in s if ch.isalpha())
        if not s2:
            return 0.0
        upp = sum(1 for ch in s2 if ch.isupper())
        return upp / len(s2)

    @staticmethod
    def _normalize_line(l: str) -> str:
        return re.sub(r"\s+", " ", l.strip())

    def est_ligne_tableau(
        self, ligne: str, contexte: Optional[List[str]] = None
    ) -> bool:
        """Heuristiques pour ignorer le contenu de type tableau / décoratif."""
        l = ligne.strip()

        # Exclusions directes (règles markdown, images, code)
        for p in self.patterns_exclusion.values():
            if p.match(l):
                return True

        # Séparateurs ou structures tabulaires visibles
        if re.search(r"[\t|]{2,}", l):
            return True

        # Beaucoup de chiffres / % / colonnes
        nb_chiffres = len(re.findall(r"\d", l))
        nb_lettres = len(re.findall(r"[A-Za-z]", l))
        if nb_chiffres > 0 and nb_chiffres >= max(1, nb_lettres) * 0.7:
            return True

        if re.search(r"-?\d+(?:[.,]\d+)?\s*%.*-?\d+(?:[.,]\d+)?\s*%", l):
            return True

        # Contexte
        if contexte:
            ctx = " ".join(contexte).lower()
            if any(k in ctx for k in self.indicateurs_tableau["mots_cles"]):
                return True
            if any(p.search(ctx) for p in self.indicateurs_tableau["patterns_ligne"]):
                return True

        return False

    def detecter_titre_avec_contexte(
        self, ligne: str, index: int, lignes: List[str]
    ) -> Tuple[bool, Optional[str], Optional[str], Optional[str]]:
        """
        Retourne: (est_titre, type_pattern, numero, titre)
        """
        raw = ligne
        ligne = self._normalize_line(ligne)
        if len(ligne) < 3:
            return False, None, None, None

        # Contexte
        start = max(0, index - 3)
        end = min(len(lignes), index + 4)
        contexte = [
            self._normalize_line(lignes[i]) for i in range(start, end) if i != index
        ]

        # Écarter les lignes de tableau
        if self.est_ligne_tableau(ligne, contexte):
            return False, None, None, None

        # Patterns nommés
        for type_nom, pat in self.patterns.items():
            m = pat.match(ligne)
            if not m:
                continue

            # Pour "puces", il n'y a pas toujours de numéro
            if type_nom == "puces":
                return True, type_nom, None, m.group("title").strip()

            # Cas "structure_fr": num = "ARTICLE 2" (on reconcatène)
            if type_nom == "structure_fr":
                kw = m.group("kw").upper()
                num = m.group("num")
                title = m.group("title").strip()
                return True, type_nom, f"{kw} {num}", title

            # Cas génériques avec (?P<num>) et (?P<title>)
            num = m.groupdict().get("num")
            title = m.groupdict().get("title")
            title = title.strip() if title else None

            # Filtre anti-faux positifs: si le "title" ressemble à une ligne de tableau -> ignorer
            if title and self.est_ligne_tableau(title, contexte):
                continue

            return True, type_nom, num, title

        # Heuristiques typographiques (fallback)
        score = sum(1 for f in self.indicateurs_titre if f(ligne))
        if score >= 2 and not self.est_ligne_tableau(ligne, contexte):
            return True, "heuristique", None, ligne

        return False, None, None, None

    def detecter_titre(self, ligne: str) -> Tuple[bool, Optional[str], Optional[str]]:
        ok, _, num, title = self.detecter_titre_avec_contexte(ligne, 0, [ligne])
        return ok, num, title

    def _niveau_depuis_numero(
        self, type_nom: Optional[str], numero: Optional[str]
    ) -> int:
        """
        Estime un niveau hiérarchique à partir du type de pattern et du numéro détecté.
        - numerique_hierarchique: profondeur du nombre de points (1.2.3 -> niveau 3)
        - structure_fr / romain / alphabetiques / numerique: niveau 1 par défaut
        - mixte_alpha_num: niveau 2 si contient un point (A1.1), sinon 1
        - puces / heuristique: 1
        """
        if not numero:
            return 1
        if type_nom == "numerique_hierarchique":
            return len(numero.split("."))
        if type_nom == "mixte_alpha_num":
            return 2 if "." in numero else 1
        return 1

    def analyser_structure(self, texte: str) -> List[Dict]:
        """
        Retourne une liste de sections à plat (ordre d'apparition) :
        [{numero, titre, contenu, nb_paragraphes, nb_mots, type, niveau}]
        """
        if not texte or not texte.strip():
            return []

        lignes = [l for l in (texte.splitlines())]
        sections: List[Dict] = []
        cur_titre = None
        cur_num = None
        cur_type = None
        cur_niveau = 1
        buf: List[str] = []

        for i, l in enumerate(lignes):
            ok, type_nom, numero, titre = self.detecter_titre_avec_contexte(
                l, i, lignes
            )

            if ok and titre:
                # Sauver la section courante
                if cur_titre is not None:
                    contenu = self._normalize_block("\n".join(buf))
                    sections.append(
                        {
                            "type": cur_type,
                            "numero": cur_num,
                            "titre": cur_titre,
                            "contenu": contenu,
                            "nb_paragraphes": len(
                                [p for p in contenu.split("\n") if p.strip()]
                            ),
                            "nb_mots": len(contenu.split()),
                            "niveau": cur_niveau,
                        }
                    )
                # Nouvelle section
                cur_titre = titre
                cur_num = numero
                cur_type = type_nom
                cur_niveau = self._niveau_depuis_numero(type_nom, numero)
                buf = []
            else:
                # Contenu
                buf.append(self._normalize_line(l))

        # Dernière section
        if cur_titre is not None:
            contenu = self._normalize_block("\n".join(buf))
            sections.append(
                {
                    "type": cur_type,
                    "numero": cur_num,
                    "titre": cur_titre,
                    "contenu": contenu,
                    "nb_paragraphes": len(
                        [p for p in contenu.split("\n") if p.strip()]
                    ),
                    "nb_mots": len(contenu.split()),
                    "niveau": cur_niveau,
                }
            )

        # Déduplication simple (titres consécutifs identiques)
        sections = self._dedupe_sections(sections)
        return sections

    @staticmethod
    def _normalize_block(text: str) -> str:
        lines = [re.sub(r"\s+", " ", l).strip() for l in text.splitlines()]
        lines = [l for l in lines if l]
        return "\n".join(lines)

    @staticmethod
    def _dedupe_sections(sections: List[Dict]) -> List[Dict]:
        out: List[Dict] = []
        prev_key = None
        for s in sections:
            key = (s.get("numero"), s.get("titre"))
            if key != prev_key:
                out.append(s)
                prev_key = key
        return out

    def construire_hierarchie(self, sections: List[Dict]) -> Dict:
        """
        Construit un arbre hiérarchique à partir des sections à plat.
        Format :
        {
          "children": [
             { "titre":..., "numero":..., "niveau":1, "contenu":..., "children":[ ... ] },
             ...
          ]
        }
        """
        root = {"children": []}
        stack = [root]  # pile de niveaux

        for s in sections:
            node = {
                "titre": s.get("titre"),
                "numero": s.get("numero"),
                "type": s.get("type"),
                "niveau": s.get("niveau", 1),
                "contenu": s.get("contenu", ""),
                "children": [],
            }
            lvl = max(1, int(s.get("niveau", 1)))

            # Ajuster la pile au bon niveau
            while len(stack) > lvl:
                stack.pop()
            while len(stack) < lvl:
                # créer des placeholders si besoin
                stack.append({"children": []})

            stack[-1]["children"].append(node)
            stack.append(node)

        return root

    def analyser_avec_spacy(self, sections: List[Dict]) -> List[Dict]:
        if not nlp:
            return sections

        for s in sections:
            contenu = s.get("contenu", "")
            if not contenu:
                continue
            doc = nlp(contenu)
            s["entites"] = [(e.text, e.label_) for e in doc.ents]
            mots_cles = [
                t.lemma_.lower()
                for t in doc
                if t.pos_ in ("NOUN", "ADJ") and not t.is_stop
            ]
            # Top 10 distincts
            seen = set()
            uniq = []
            for w in mots_cles:
                if w not in seen:
                    seen.add(w)
                    uniq.append(w)
                if len(uniq) >= 10:
                    break
            s["mots_cles"] = uniq
        return sections
