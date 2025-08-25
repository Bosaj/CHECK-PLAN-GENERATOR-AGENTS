import chainlit as cl
import pandas as pd


@cl.on_chat_start
async def start():
    # Cacher la zone de texte
    await cl.ChatSettings(hide_input=True).send()

    df = pd.read_excel(
        "./../../reglements/plan de controle - ext-di-cdg-premium-immo_vf.xlsx"
    )
    elements = [cl.Dataframe(data=df, display="inline", name="Plan de contrôle")]
    await cl.Message(
        content="Voici le tableau des réglements :", elements=elements
    ).send()
