# params.py
try:
    import sys

    import pysqlite3  # noqa: F401

    sys.modules["sqlite3"] = sys.modules["pysqlite3"]
except ImportError:
    pass

import os
import warnings

from chromadb import PersistentClient
from chromadb.config import DEFAULT_DATABASE, DEFAULT_TENANT, Settings
from sentence_transformers import CrossEncoder, SentenceTransformer

warnings.filterwarnings("ignore")
os.environ["CHROMA_TELEMETRY_DISABLED"] = "true"

PERSIST_DIR = "rag/chroma-database"

os.makedirs(PERSIST_DIR, exist_ok=True)

bi_encoder = SentenceTransformer("intfloat/multilingual-e5-large")
cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

client = PersistentClient(
    path=PERSIST_DIR,
    settings=Settings(),
    tenant=DEFAULT_TENANT,
    database=DEFAULT_DATABASE,
)
collection = client.get_or_create_collection(name="ammc_recueil")
