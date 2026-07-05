# agents/planner.py
import autogen


def build_planner(llm_config: dict) -> autogen.AssistantAgent:
    return autogen.AssistantAgent(
        name="Planner",
        llm_config=llm_config,
        system_message="""Tu es un agent planificateur.
Décompose la tâche en étapes numérotées simples.
Chaque étape doit inclure : un titre, une description, et les colonnes du fichier concernées.
Tu ne génères jamais de code Python.
Produis un plan structuré, clair, sans détails d'implémentation.
Quand tu as fini, écris TERMINATE.""",
    )