# agents/pipeline.py
import os
import re
from dotenv import load_dotenv

from agents.planner import build_planner
from agents.executor import build_executor
from agents.critic import build_critic
from agents.reporter import build_reporter
from sandbox.run_in_sandbox import run_in_sandbox

load_dotenv()


def build_llm_config():
    return {
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


def extract_code(message: str) -> str:
    """Extrait le code Python d'un bloc ```python ... ``` renvoyé par l'Executor."""
    match = re.search(r"```python\s*(.*?)```", message, re.DOTALL)
    if match:
        return match.group(1).strip()
    return message.strip()


def run_pipeline(objective: str, file_path: str, filename: str, max_retries: int = 5) -> dict:
    """Orchestration complète : Planner -> (Executor <-> Critic, jusqu'à 5 essais) -> Reporter.
    `file_path` est le chemin réel du fichier uploadé sur le host, `filename` son nom
    d'origine — les deux sont nécessaires pour que l'Executor sache quoi lire et que
    le sandbox sache quoi copier."""
    llm_config = build_llm_config()

    planner = build_planner(llm_config)
    executor = build_executor(llm_config)
    critic = build_critic(llm_config)
    reporter = build_reporter(llm_config)

    # 1. Planner produit un plan
    plan_response = planner.generate_reply(
        messages=[{"role": "user", "content": objective}]
    )
    plan = plan_response if isinstance(plan_response, str) else plan_response.get("content", "")

    # 2. Executor écrit un premier script à partir du plan
    executor_prompt = (
        f"Objectif : {objective}\n\n"
        f"Nom du fichier : {filename}\n\n"
        f"Plan :\n{plan}\n\n"
        f"Écris le script Python correspondant."
    )
    executor_reply = executor.generate_reply(
        messages=[{"role": "user", "content": executor_prompt}]
    )
    code = extract_code(
        executor_reply if isinstance(executor_reply, str) else executor_reply.get("content", "")
    )

    sandbox_result = None
    attempt = 0

    # 3. Boucle Executor <-> Critic
    while attempt < max_retries:
        sandbox_result = run_in_sandbox(code, input_file_path=file_path)

        if sandbox_result["returncode"] == 0:
            break  # succès, on sort de la boucle

        attempt += 1
        critic_prompt = f"Le script suivant a échoué :\n\n{code}\n\nErreur :\n{sandbox_result['stderr']}"
        critic_reply = critic.generate_reply(
            messages=[{"role": "user", "content": critic_prompt}]
        )
        critic_feedback = (
            critic_reply if isinstance(critic_reply, str) else critic_reply.get("content", "")
        )

        if "TERMINATE" in critic_feedback:
            break

        fix_prompt = (
            f"Voici le feedback du Critic :\n{critic_feedback}\n\n"
            f"Rappel : le fichier de données s'appelle exactement '{filename}' "
            f"et est déjà présent dans le répertoire de travail.\n\n"
            f"Corrige le script :\n{code}"
        )
        executor_reply = executor.generate_reply(
            messages=[{"role": "user", "content": fix_prompt}]
        )
        code = extract_code(
            executor_reply if isinstance(executor_reply, str) else executor_reply.get("content", "")
        )

    # 4. Reporter résume les résultats
    reporter_prompt = f"""Objectif : {objective}
Plan : {plan}
Résultat de l'exécution (stdout) : {sandbox_result['stdout'] if sandbox_result else 'Aucune exécution réussie'}
Erreurs éventuelles : {sandbox_result['stderr'] if sandbox_result else ''}
Nombre de tentatives : {attempt}
"""
    reporter_reply = reporter.generate_reply(
        messages=[{"role": "user", "content": reporter_prompt}]
    )
    summary = reporter_reply if isinstance(reporter_reply, str) else reporter_reply.get("content", "")

    return {
        "plan": plan,
        "code": code,
        "sandbox_result": sandbox_result,
        "attempts": attempt,
        "summary": summary,
    }