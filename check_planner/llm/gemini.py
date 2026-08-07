import logging
import secrets

from langchain_google_genai import ChatGoogleGenerativeAI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
gemini_models = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
]

def get_llm_gemini(env_path=".env", models=gemini_models, temperature=0.0):
    import os

    from dotenv import dotenv_values, load_dotenv

    load_dotenv(env_path, override=False)
    dotenv_dict = dotenv_values(env_path) if os.path.exists(env_path) else {}
    api_keys = [
        value
        for key, value in dotenv_dict.items()
        if key.startswith(("GOOGLE_API_KEY", "GEMINI_API_KEY")) and value
    ]

    if not api_keys and (os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")):
        api_keys = [os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")]

    logger.info("les api gemini sont: %d", len(api_keys))
    if not api_keys:
        logger.warning("Aucune clé GOOGLE_API_KEY trouvée dans .env ou variables d'environnement")
        selected_key = os.getenv("GOOGLE_API_KEY", "")
    else:
        selected_key = secrets.choice(api_keys)
        os.environ["GOOGLE_API_KEY"] = selected_key

    model_name = secrets.choice(models)
    logger.info("Used model: %s", model_name)

    try:
        return ChatGoogleGenerativeAI(
            model=model_name,
            temperature=temperature,
            max_retries=3,
            api_key=selected_key if selected_key else None,
        )
    except Exception:
        logging.exception("Erreur lors de l'initialisation de Gemini LLM")
        return None


llm_gemini = get_llm_gemini()
