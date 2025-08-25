from .splitter import PDFSplitter


def split_pdf(pdf_path: str):
    spliter = PDFSplitter()
    pages = spliter.extraire_mots_avec_positions(pdf_path)

    return pages


__ALL__ = ["split_pdf", "PDFSplitter"]
