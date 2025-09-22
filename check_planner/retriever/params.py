# params.py
try:
    import pysqlite3
    import sys

    sys.modules["sqlite3"] = sys.modules["pysqlite3"]
except ImportError:
    pass

import os
import warnings
from chromadb.config import DEFAULT_TENANT, DEFAULT_DATABASE, Settings
from chromadb import PersistentClient
from sentence_transformers import SentenceTransformer, CrossEncoder

warnings.filterwarnings("ignore")
os.environ["CHROMA_TELEMETRY_DISABLED"] = "true"

PERSIST_DIR = "rag/chroma-database"

if not os.path.isdir(PERSIST_DIR):
    raise FileNotFoundError(
        "Le répertoire de la base de données Chroma n'existe pas. "
        "Veuillez voir developper/README.md pour les instructions."
    )

bi_encoder = SentenceTransformer("intfloat/multilingual-e5-large")
cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

client = PersistentClient(
    path=PERSIST_DIR,
    settings=Settings(),
    tenant=DEFAULT_TENANT,
    database=DEFAULT_DATABASE,
)
collection = client.get_or_create_collection(name="ammc_recueil")
