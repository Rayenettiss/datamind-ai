import os
from dotenv import load_dotenv
import autogen

load_dotenv()

llm_config = {
    "config_list": [
        {
            "model": os.getenv("AZURE_OPENAI_DEPLOYMENT"),
            "api_key": os.getenv("AZURE_OPENAI_API_KEY"),
            "base_url": os.getenv("AZURE_OPENAI_ENDPOINT"),
            "api_type": "openai",
        }
    ],
    "temperature": 0,
}

planner = autogen.AssistantAgent(
    name="Planner",
    llm_config=llm_config,
    system_message="""Tu es un agent planificateur.
    Décompose la tâche en étapes numérotées simples.
    Tu ne génères jamais de code Python.
    Quand tu as fini, écris TERMINATE.""",
)

executor = autogen.UserProxyAgent(
    name="Executor",
    human_input_mode="NEVER",
    max_consecutive_auto_reply=1,
    code_execution_config=False,
    is_termination_msg=lambda x: "TERMINATE" in x.get("content", ""),  # ← détecte TERMINATE proprement
)

executor.initiate_chat(
    planner,
    message="Analyse un fichier CSV de ventes : colonnes date, produit, quantité, prix. Donne-moi un plan.",
)