# agents/pipeline.py
import os
import re
from dotenv import load_dotenv

from agents.planner import build_planner
from agents.executor import build_executor
from agents.critic import build_critic
from agents.reporter import build_reporter
from sandbox.run_in_sandbox import run_in_sandbox
from events import publish_event
from db import create_run, finish_run, log_agent_message, save_plan_embedding, search_similar_plans
from context_manager import enforce_token_budget
from embeddings import embed_text

SIMILARITY_THRESHOLD = float(os.getenv("PLAN_SIMILARITY_THRESHOLD", "0.75"))

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
    match = re.search(r"```python\s*(.*?)```", message, re.DOTALL)
    if match:
        return match.group(1).strip()
    return message.strip()


def run_pipeline(objective: str, file_path: str, filename: str, job_id: str, max_retries: int = 5) -> dict:

    llm_config = build_llm_config()

    planner = build_planner(llm_config)
    executor = build_executor(llm_config)
    critic = build_critic(llm_config)
    reporter = build_reporter(llm_config)

    publish_event(job_id, {"agent": "PLANNER", "status": "running"})

    similar_plans = []
    try:
        print(f"[DEBUG] pipeline: searching similar plans for objective: {objective[:50]}", flush=True)
        objective_embedding = embed_text(objective)
        print(f"[DEBUG] pipeline: embedding obtained, len={len(objective_embedding)}", flush=True)
        similar_plans = search_similar_plans(
            objective_embedding, top_k=3, similarity_threshold=SIMILARITY_THRESHOLD
        )
        print(f"[DEBUG] pipeline: similar_plans found = {len(similar_plans)}", flush=True)
    except Exception as e:
        print(f"[DEBUG] pipeline: EXCEPTION in similarity search: {e}", flush=True)
        # Un échec de la mémoire long terme ne doit jamais bloquer le Planner —
        # on continue simplement sans few-shot context.
        log_agent_message(job_id, "SYSTEM", "warning", f"pgvector similarity search failed: {e}")

    planner_prompt = objective
    if similar_plans:
        few_shot = "\n\n".join(
            f"Objectif similaire passé : {p['objective']}\n"
            f"Plan utilisé :\n{p['plan_text']}\n"
            f"Résumé du résultat :\n{p['summary_text']}"
            for p in similar_plans
        )
        planner_prompt = (
            f"Voici {len(similar_plans)} run(s) passé(s) sur des objectifs similaires, "
            f"à utiliser comme référence si pertinent (adapte, ne recopie pas aveuglément) :\n\n"
            f"{few_shot}\n\n---\n\nNouvel objectif : {objective}"
        )
        publish_event(job_id, {
            "agent": "PLANNER", "status": "context",
            "content": f"{len(similar_plans)} plan(s) similaire(s) trouvé(s) et injecté(s) en contexte."
        })
        log_agent_message(
            job_id, "PLANNER", "context",
            f"{len(similar_plans)} plan(s) similaire(s) injecté(s) (seuil={SIMILARITY_THRESHOLD})."
        )

    plan_response = planner.generate_reply(
        messages=[{"role": "user", "content": planner_prompt}]
    )
    plan = plan_response if isinstance(plan_response, str) else plan_response.get("content", "")
    publish_event(job_id, {"agent": "PLANNER", "status": "done", "content": plan})
    log_agent_message(job_id, "PLANNER", "done", plan)

    publish_event(job_id, {"agent": "EXECUTOR", "status": "running"})
    executor_prompt = (
        f"Objectif : {objective}\n\n"
        f"Nom du fichier : {filename}\n\n"
        f"Plan :\n{plan}\n\n"
        f"Écris le script Python correspondant."
    )
    executor_prompt, was_truncated = enforce_token_budget(executor_prompt)
    if was_truncated:
        publish_event(job_id, {"agent": "EXECUTOR", "status": "warning", "content": "Prompt truncated — exceeded token budget."})
        log_agent_message(job_id, "EXECUTOR", "warning", "Prompt truncated before sending — exceeded token budget.")

    executor_reply = executor.generate_reply(
        messages=[{"role": "user", "content": executor_prompt}]
    )
    code = extract_code(
        executor_reply if isinstance(executor_reply, str) else executor_reply.get("content", "")
    )

    sandbox_result = None
    attempt = 0

    while attempt < max_retries:
        sandbox_result = run_in_sandbox(code, input_file_path=file_path)

        if sandbox_result["returncode"] == 0:
            publish_event(job_id, {"agent": "EXECUTOR", "status": "done", "content": code, "attempts": attempt})
            log_agent_message(job_id, "EXECUTOR", "done", code)
            if attempt == 0:
                publish_event(job_id, {"agent": "CRITIC", "status": "skipped"})
                log_agent_message(job_id, "CRITIC", "skipped", "Not needed — the script succeeded on the first try.")

            break

        attempt += 1
        publish_event(job_id, {"agent": "CRITIC", "status": "running"})
        critic_prompt = f"Le script suivant a échoué :\n\n{code}\n\nErreur :\n{sandbox_result['stderr']}"
        critic_prompt, was_truncated = enforce_token_budget(critic_prompt)
        if was_truncated:
            publish_event(job_id, {"agent": "CRITIC", "status": "warning", "content": "Prompt truncated — exceeded token budget."})
            log_agent_message(job_id, "CRITIC", "warning", "Prompt truncated before sending — exceeded token budget.")

        critic_reply = critic.generate_reply(
            messages=[{"role": "user", "content": critic_prompt}]
        )
        critic_feedback = (
            critic_reply if isinstance(critic_reply, str) else critic_reply.get("content", "")
        )
        publish_event(job_id, {"agent": "CRITIC", "status": "done", "content": critic_feedback, "attempts": attempt})
        log_agent_message(job_id, "CRITIC", "done", critic_feedback)
        if "TERMINATE" in critic_feedback:
            break

        publish_event(job_id, {"agent": "EXECUTOR", "status": "running"})
        fix_prompt = (
            f"Voici le feedback du Critic :\n{critic_feedback}\n\n"
            f"Rappel : le fichier de données s'appelle exactement '{filename}' "
            f"et est déjà présent dans le répertoire de travail.\n\n"
            f"Corrige le script :\n{code}"
        )
        fix_prompt, was_truncated = enforce_token_budget(fix_prompt)
        if was_truncated:
            publish_event(job_id, {"agent": "EXECUTOR", "status": "warning", "content": "Prompt truncated — exceeded token budget."})
            log_agent_message(job_id, "EXECUTOR", "warning", "Prompt truncated before sending — exceeded token budget.")

        executor_reply = executor.generate_reply(
            messages=[{"role": "user", "content": fix_prompt}]
        )
        code = extract_code(
            executor_reply if isinstance(executor_reply, str) else executor_reply.get("content", "")
        )

    publish_event(job_id, {"agent": "REPORTER", "status": "running"})
    reporter_prompt = f"""Objectif : {objective}
    Plan : {plan}
    Résultat de l'exécution (stdout) : {sandbox_result['stdout'] if sandbox_result else 'Aucune exécution réussie'}
    Erreurs éventuelles : {sandbox_result['stderr'] if sandbox_result else ''}
    Nombre de tentatives : {attempt}
    """
    reporter_prompt, was_truncated = enforce_token_budget(reporter_prompt)
    if was_truncated:
        publish_event(job_id, {"agent": "REPORTER", "status": "warning", "content": "Prompt truncated — exceeded token budget."})
        log_agent_message(job_id, "REPORTER", "warning", "Prompt truncated before sending — exceeded token budget.")

    reporter_reply = reporter.generate_reply(
        messages=[{"role": "user", "content": reporter_prompt}]
    )
    summary = reporter_reply if isinstance(reporter_reply, str) else reporter_reply.get("content", "")
    log_agent_message(job_id, "REPORTER", "done", summary)
    publish_event(job_id, {"agent": "REPORTER", "status": "done", "content": summary})

    result = {
        "plan": plan,
        "code": code,
        "sandbox_result": sandbox_result,
        "attempts": attempt,
        "summary": summary,
    }
    # Mémoire long terme : n'indexer que les runs réellement réussis
    # (sandbox_result présent et returncode == 0), pour ne pas polluer les
    # futures suggestions du Planner avec des plans qui ont échoué.
    if sandbox_result and sandbox_result.get("returncode") == 0:
        try:
            combined_text = f"{plan}\n\n{summary}"
            plan_embedding = embed_text(combined_text)
            save_plan_embedding(job_id, objective, plan, summary, plan_embedding)
        except Exception as e:
            # Un échec d'embedding ne doit jamais faire échouer un run par ailleurs réussi.
            log_agent_message(job_id, "SYSTEM", "warning", f"pgvector embedding failed: {e}")

    publish_event(job_id, {"event": "PIPELINE_DONE", "result": result})
    finish_run(job_id, "DONE", result)
    return result