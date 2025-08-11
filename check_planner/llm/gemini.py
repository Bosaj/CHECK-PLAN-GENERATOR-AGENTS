import logging

from langchain_google_genai import ChatGoogleGenerativeAI


def get_llm_gemini(env_path=".env", model_name="gemini-2.5-flash", temperature=0.0):
    import os
    from random import choice

    from dotenv import dotenv_values

    api_keys = [
        value
        for key, value in dotenv_values(env_path).items()
        if key.startswith("GOOGLE_API_KEY")
    ]
    print("les api gemini sont: ", len(api_keys))
    if not api_keys:
        raise ValueError("Aucune clé GOOGLE_API_KEY trouvée dans le fichier .env")

    while True:
        selected_key = choice(api_keys)
        if os.getenv("GOOGLE_API_KEY", "") != selected_key:
            os.environ["GOOGLE_API_KEY"] = selected_key
            break

    try:
        return ChatGoogleGenerativeAI(
            model=model_name,
            temperature=temperature,
            max_retries=3,
            api_key=selected_key,
        )
    except Exception as e:
        logging.error(f"Erreur lors de l'initialisation de Gemini LLM : {e}")
        return object()


llm_gemini = get_llm_gemini()
