# DataMind AI

Assistant Autonome d'Ingénierie de Données — AutoGen + Azure OpenAI + Next.js  
Projet de stage SMARTOVATE LTD — Juin–Juillet 2026

---

## Stack technique

| Couche | Technologies |
|---|---|
| Agents IA | Microsoft AutoGen + Azure OpenAI GPT-4o |
| Backend | FastAPI + Celery + Redis |
| Base de données | PostgreSQL + pgvector |
| Stockage | Azure Blob Storage |
| Frontend | Next.js 14 + TailwindCSS |
| Rapports | WeasyPrint (PDF) |
| Exécution sécurisée | Docker sandbox |

---

## Prérequis

- Python 3.11 (obligatoire — 3.14 non compatible)
- Git
- Docker Desktop (ajouté en semaine 2–3)
- Compte Azure avec accès Azure OpenAI

---

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/ton-username/datamind-ai.git
cd datamind-ai
```

### 2. Créer l'environnement virtuel Python 3.11

```bash
# Windows
py -3.11 -m venv venv
venv\Scripts\activate

# macOS / Linux
python3.11 -m venv venv
source venv/bin/activate
```

### 3. Installer les dépendances

```bash
pip install -r requirements.txt
```

### 4. Configurer les variables d'environnement

Copie le fichier exemple et remplis tes clés :

```bash
cp .env.example .env
```

Contenu à remplir dans `.env` :

```env
AZURE_OPENAI_API_KEY=ta_clé_ici
AZURE_OPENAI_ENDPOINT=https://ton-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-02-01
```

### 5. Tester la connexion Azure OpenAI

```bash
python test_connection.py
```

Résultat attendu :
```
Connexion réussie.
Modèle utilisé : gpt-4o
```

---

## Structure du projet

```
datamind-ai/
├── agents/                  # Les 4 agents AutoGen (ajouté semaine 2)
│   ├── planner.py
│   ├── executor.py
│   ├── critic.py
│   └── reporter.py
├── api/                     # FastAPI + Celery (ajouté semaine 6)
│   ├── main.py
│   └── tasks.py
├── frontend/                # Next.js 14 (ajouté semaine 7)
├── sandbox/                 # Dockerfile pour exécution sécurisée (ajouté semaine 3)
│   └── Dockerfile
├── .env                     # Variables sensibles — jamais committé
├── .env.example             # Template sans valeurs réelles
├── .gitignore
├── requirements.txt
├── test_connection.py       # Script de validation connexion Azure OpenAI
└── README.md
```

---

## Avancement

- [x] Environnement Python 3.11 configuré
- [x] Dépendances installées
- [x] Connexion Azure OpenAI validée
- [x] POC 2 agents (Planner ↔ Executor)
- [ ] 4 agents complets avec prompts
- [ ] Docker sandbox
- [ ] Cas d'usage 1 : Analyse CSV
- [ ] Cas d'usage 2 : Debugging automatique
- [ ] Cas d'usage 3 : Génération rapport PDF
- [ ] Mémoire 3 niveaux (session, PostgreSQL, pgvector)
- [ ] API FastAPI + Celery + Redis
- [ ] Frontend Next.js 14
- [ ] Tests bout en bout
- [ ] Documentation finale

---

## Variables d'environnement

| Variable | Description |
|---|---|
| `AZURE_OPENAI_API_KEY` | Clé API Azure OpenAI |
| `AZURE_OPENAI_ENDPOINT` | URL du resource Azure OpenAI |
| `AZURE_OPENAI_DEPLOYMENT` | Nom du déploiement (ex: gpt-4o) |
| `AZURE_OPENAI_API_VERSION` | Version de l'API (ex: 2024-02-01) |

---

## Auteur

Abdelkhalek Bakkari — CEO & Founder, SMARTOVATE LTD