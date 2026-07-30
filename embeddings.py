# embeddings.py
import os
from openai import AzureOpenAI
from dotenv import load_dotenv

load_dotenv()

# Endpoint classique Azure OpenAI (pas le nouvel endpoint Foundry unifié
# "*.services.ai.azure.com" — confirmé par test manuel que cet endpoint
# ne reconnaît pas ce déploiement). Format : https://<resource>.openai.azure.com
_client = AzureOpenAI(
    azure_endpoint=os.getenv("AZURE_OPENAI_EMBEDDING_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_EMBEDDING_API_KEY", os.getenv("AZURE_OPENAI_API_KEY")),
    api_version=os.getenv("AZURE_OPENAI_EMBEDDING_API_VERSION", "2023-05-15"),
)

EMBEDDING_DEPLOYMENT = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-small")


def embed_text(text: str) -> list[float]:
    """Retourne l'embedding (liste de floats) pour le texte donné,
    via le déploiement Azure OpenAI (endpoint classique) configuré."""
    response = _client.embeddings.create(
        input=text,
        model=EMBEDDING_DEPLOYMENT,
    )
    return response.data[0].embedding