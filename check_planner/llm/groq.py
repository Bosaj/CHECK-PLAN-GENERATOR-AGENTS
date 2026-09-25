import logging
import os
import secrets

from dotenv import load_dotenv
from langchain_groq import ChatGroq

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv(override=True)


def get_llm_groq(
    env_path="./.env",
    model_name="llama-3.3-70b-versatile",
    temperature=0.0,
):
    from dotenv import dotenv_values, load_dotenv

    load_dotenv(env_path, override=False)
    dotenv_dict = dotenv_values(env_path) if os.path.exists(env_path) else {}
    api_keys = [value for key, value in dotenv_dict.items() if key.startswith("GROQ_API_KEY") and value]

    if not api_keys and os.getenv("GROQ_API_KEY"):
        api_keys = [os.getenv("GROQ_API_KEY")]

    logger.info("les apis groq sont: %d", len(api_keys))
    if not api_keys:
        logger.warning("Aucune clé GROQ_API_KEY trouvée dans .env ou variables d'environnement")
        selected_key = os.getenv("GROQ_API_KEY", "")
    else:
        selected_key = secrets.choice(api_keys)
        os.environ["GROQ_API_KEY"] = selected_key

    if not selected_key:
        return None

    try:
        return ChatGroq(
            model=model_name,
            temperature=temperature,
            max_retries=3,
            api_key=selected_key,
        )
    except Exception:
        logger.exception("Erreur lors de l'initialisation de Groq LLM")
        return None


llm_groq = get_llm_groq()
