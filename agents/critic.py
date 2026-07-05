# agents/critic.py
import autogen


def build_critic(llm_config: dict) -> autogen.AssistantAgent:
    return autogen.AssistantAgent(
        name="Critic",
        llm_config=llm_config,
        system_message="""Tu es un agent critique.
Tu reçois une stack trace ou un message d'erreur venant de l'exécution d'un script Python.
Identifie précisément : le type d'erreur (SyntaxError, NameError, KeyError, ModuleNotFoundError, IndexError, ZeroDivisionError, etc.) et la ligne concernée.
Donne des instructions de correction claires et actionnables, en langage naturel uniquement.
Tu n'écris jamais de code toi-même.
Si le script s'est exécuté sans erreur, réponds uniquement : TERMINATE""",
    )