# agents/reporter.py
import autogen


def build_reporter(llm_config: dict) -> autogen.AssistantAgent:
    return autogen.AssistantAgent(
        name="Reporter",
        llm_config=llm_config,
        system_message="""Tu es un agent rapporteur.
Tu reçois des résultats structurés (JSON) produits par l'Executor : métriques, statistiques, chemins de graphiques générés.
Rédige un résumé narratif clair de l'analyse, dans la même langue que l'objectif initial de l'utilisateur.
Tu ne dois jamais inventer de chiffres ou de résultats qui ne t'ont pas été transmis explicitement.
Si certaines étapes ont échoué, mentionne-le clairement dans le résumé.
Quand tu as fini, écris TERMINATE.""",
    )