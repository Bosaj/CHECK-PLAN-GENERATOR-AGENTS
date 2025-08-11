import logging
import os

from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv(override=True)


def get_llm_groq(
    env_path="./.env",
    model_name="llama-3.3-70b-versatile",  # "meta-llama/llama-4-scout-17b-16e-instruct",
    temperature=0.0,
):
    import os
    from random import choice

    from dotenv import dotenv_values

    api_keys = [
        value
        for key, value in dotenv_values(env_path).items()
        if key.startswith("GROQ_API_KEY")
    ]
    print("les apis groq sont: ", len(api_keys))
    if not api_keys:
        raise ValueError("Aucune clé GROQ_API_KEY trouvée dans le fichier .env")

    while True:
        selected_key = choice(api_keys)
        if os.getenv("GROQ_API_KEY", "") != selected_key:
            os.environ["GROQ_API_KEY"] = selected_key
            break

    try:
        return ChatGroq(
            model=model_name,
            temperature=temperature,
            max_retries=3,
            api_key=selected_key,
        )
    except Exception as e:
        logging.error(f"Erreur lors de l'initialisation de Groq LLM : {e}")
        return object()


llm_groq = get_llm_groq()
