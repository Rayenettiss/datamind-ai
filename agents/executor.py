# agents/executor.py
import autogen


def build_executor(llm_config: dict) -> autogen.AssistantAgent:
    """L'Executor génère du code Python. L'exécution réelle passe par
    run_in_sandbox() (appelée depuis pipeline.py), pas par AutoGen directement."""
    return autogen.AssistantAgent(
        name="Executor",
        llm_config=llm_config,
        system_message="""Tu es un agent exécuteur.
Tu écris du code Python utilisant uniquement pandas, numpy et matplotlib.
Tu ne dois utiliser aucune autre bibliothèque.
Le fichier de données réel sera présent dans le répertoire de travail sous le nom exact
qui te sera donné dans le message utilisateur (champ "Nom du fichier"). Utilise ce nom
exact avec pd.read_csv() ou pd.read_json() selon l'extension — ne suppose jamais un autre
nom de fichier, et ne crée jamais de données fictives : le fichier existe réellement.
Réponds UNIQUEMENT avec le code Python, dans un bloc ```python ... ```, sans explication.
Si une erreur t'est transmise par le Critic, corrige le script en tenant compte de ses instructions.""",
    )