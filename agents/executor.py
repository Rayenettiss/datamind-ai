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
Le script doit toujours afficher (print) les résultats finaux dans la console, en plus
de les sauvegarder dans un fichier si nécessaire. Ne te contente jamais de sauvegarder
sans rien afficher.

Règle stricte concernant les erreurs — à respecter impérativement :
N'entoure jamais ton code de try/except pour capturer, masquer ou reformuler une erreur.
Si une erreur peut survenir, laisse-la se propager normalement (le script doit se terminer
avec un code de retour non nul) — c'est le seul moyen pour le Critic de la diagnostiquer.
Ne corrige jamais toi-même un bug que tu identifies avant même d'exécuter le code une
première fois : exécute exactement ce qui t'est demandé, tel quel, au premier essai,
même si tu penses voir une erreur. Tu ne dois corriger le script qu'après avoir reçu
un diagnostic du Critic suite à un échec réel, jamais de manière préventive.

Réponds UNIQUEMENT avec le code Python, dans un bloc ```python ... ```, sans explication.
Si une erreur t'est transmise par le Critic, corrige le script en tenant compte de ses instructions.""",
    )