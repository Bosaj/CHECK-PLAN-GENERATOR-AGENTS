import logging

import fitz  # PyMuPDF

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PDFSplitter:
    def __init__(self):
        pass

    def extraire_mots_avec_positions(self, pdf_path):
        """
        Extrait tous les mots d'un PDF avec leurs positions géométriques exactes
        et retourne le texte complet reconstruit en respectant les tableaux

        Args:
            chemin_pdf (str): Chemin vers le fichier PDF

        Returns:
            list:  data_pages
        """
        data_pages = []
        # Ouvrir le document PDF
        try:
            doc = fitz.open(pdf_path)

            # Parcourir chaque page
            for num_page in range(doc.page_count):
                page = doc.load_page(num_page)
                text = page.get_text().strip()

                if text:
                    # Extraire les mots avec leurs positions
                    mots = page.get_text("words")

                    # Créer les informations détaillées pour chaque mot
                    mots_info = []
                    for mot in mots:
                        info_mot = {
                            "page": num_page + 1,
                            "texte": mot[4],
                            "x0": mot[0],
                            "y0": mot[1],
                            "x1": mot[2],
                            "y1": mot[3],
                            "largeur": mot[2] - mot[0],
                            "hauteur": mot[3] - mot[1],
                            "centre_x": (mot[0] + mot[2]) / 2,
                            "centre_y": (mot[1] + mot[3]) / 2,
                        }
                        mots_info.append(info_mot)

                    # Reconstruction du texte en respectant les tableaux
                    texte_page = self.reconstruire_texte_avec_tableaux(mots_info)

                    data_pages.append({"type": "txt", "content": texte_page, "number": num_page + 1})
                else:
                    pixmap = page.get_pixmap()
                    data_pages.append({"type": "image", "content": pixmap, "number": num_page + 1})

            # Fermer le document
            doc.close()

            return data_pages
        except fitz.FileNotFoundError:
            logger.error(f"Erreur : fichier PDF introuvable à {pdf_path}")
            return data_pages

        except Exception as e:  # noqa: BLE001
            logger.error(f"Une erreur est survenue : {e}")
            return data_pages

    def reconstruire_texte_avec_tableaux(self, mots_info):
        """
        Reconstruit le texte en respectant la structure des tableaux
        """
        if not mots_info:
            return ""

        # Grouper les mots par lignes (tolérance de 5 pixels)
        lignes = []
        tolerance_ligne = 5

        # Trier par position Y d'abord
        mots_tries_y = sorted(mots_info, key=lambda m: m["y0"])

        ligne_courante = []
        y_courant = mots_tries_y[0]["y0"]

        for mot in mots_tries_y:
            if abs(mot["y0"] - y_courant) <= tolerance_ligne:
                ligne_courante.append(mot)
            else:
                if ligne_courante:
                    # Trier la ligne par position X
                    ligne_courante.sort(key=lambda m: m["x0"])
                    lignes.append(ligne_courante)
                ligne_courante = [mot]
                y_courant = mot["y0"]

        # Ajouter la dernière ligne
        if ligne_courante:
            ligne_courante.sort(key=lambda m: m["x0"])
            lignes.append(ligne_courante)

        # Reconstruire le texte ligne par ligne
        texte_reconstruit = ""

        for i, ligne in enumerate(lignes):
            if not ligne:
                continue

            # Détecter si c'est probablement un tableau
            if self.detecter_tableau(ligne, lignes, i):
                texte_ligne = self.reconstruire_ligne_tableau(ligne)
            else:
                texte_ligne = self.reconstruire_ligne_normale(ligne)

            texte_reconstruit += texte_ligne
            if i < len(lignes) - 1:
                texte_reconstruit += "\n"

        return texte_reconstruit

    def detecter_tableau(self, ligne_courante, toutes_lignes, index_ligne):
        """
        Détecte si une ligne fait probablement partie d'un tableau
        """
        # Critères simples pour détecter un tableau :
        # 1. Plus de 3 mots sur la ligne avec des espaces réguliers
        # 2. Alignement vertical avec d'autres lignes

        if len(ligne_courante) < 3:
            return False

        # Vérifier l'espacement régulier entre les mots
        espaces = []
        for i in range(len(ligne_courante) - 1):
            espace = ligne_courante[i + 1]["x0"] - ligne_courante[i]["x1"]
            espaces.append(espace)

        # Si les espaces sont relativement importants (> 20 pixels), c'est probablement un tableau
        espaces_importants = [e for e in espaces if e > 20]
        return len(espaces_importants) >= 2

    def reconstruire_ligne_tableau(self, ligne):
        """
        Reconstruit une ligne de tableau avec des tabulations pour préserver l'alignement
        """
        texte = ""
        for i, mot in enumerate(ligne):
            if i == 0:
                texte += mot["texte"]
            else:
                # Calculer l'espace entre les mots
                espace_precedent = mot["x0"] - ligne[i - 1]["x1"]

                if espace_precedent > 40:  # Grand espace = nouvelle colonne
                    texte += "|" + mot["texte"]  # \t\t
                elif espace_precedent > 20:  # Espace moyen = une tabulation
                    texte += "|" + mot["texte"]  # \t
                else:  # Petit espace = espace normal
                    texte += " " + mot["texte"]

        return texte

    def reconstruire_ligne_normale(self, ligne):
        """
        Reconstruit une ligne normale avec des espaces
        """
        texte = ""
        for i, mot in enumerate(ligne):
            if i == 0:
                texte += mot["texte"]
            else:
                texte += " " + mot["texte"]

        return texte
