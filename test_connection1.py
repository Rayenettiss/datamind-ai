import json
from pathlib import Path

import autogen

config_path = Path(__file__).with_name("OAI_CONFIG_LIST.json")
with config_path.open(encoding="utf-8") as f:
    config_list = json.load(f)

for config in config_list:
    # AutoGen passes unknown config keys through to the OpenAI SDK.
    # Azure deployment is already represented by "model" in this config.
    config.pop("deployment_name", None)
    if config.get("base_url", "").rstrip("/").endswith("/openai/v1"):
        # This is an OpenAI-compatible Azure Foundry endpoint, like test_connection.py.
        config.pop("api_type", None)
        config.pop("api_version", None)

llm_config = {
    "config_list": config_list,
    "temperature": 0,
}

assistant = autogen.AssistantAgent(
    name="test_agent",
    llm_config=llm_config,
    system_message="Tu es un assistant de test. Réponds très brièvement.",
)

user = autogen.UserProxyAgent(
    name="user",
    human_input_mode="NEVER",
    max_consecutive_auto_reply=1,
    code_execution_config=False,
)

user.initiate_chat(
    assistant,
    message="Dis juste : connexion Azure Foundry réussie.",
)
