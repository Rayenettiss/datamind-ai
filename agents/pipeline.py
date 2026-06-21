import os 
from dotenv import load_dotenv
import autogen

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

def run_planner(objective:str)->str:
    """Lance l'échange entre le planner et l'executor, et retourne le plan généré par le planner."""
    llm_config=build_llm_config()

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

    chat_result = executor.initiate_chat(
        planner,
        message=objective)
    
    plan_messages = [
        m["content"] for m in chat_result.chat_history if m.get("name") == "Planner"
    ]

    return plan_messages[-1] if plan_messages else ""