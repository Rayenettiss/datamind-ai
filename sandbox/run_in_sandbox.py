# sandbox/run_in_sandbox.py
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

IMAGE_NAME = "datamind-sandbox"
TIMEOUT_SECONDS = 30
MEMORY_LIMIT = "512m"


def run_in_sandbox(code: str, input_file_path: Optional[str] = None) -> dict:
    """Écrit `code` dans un fichier temporaire, copie éventuellement le fichier
    de données à côté, exécute le tout dans le conteneur Docker avec un timeout
    de 30s et une limite mémoire de 512MB, et retourne stdout/stderr/returncode."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        script_path = tmp_path / "script.py"
        script_path.write_text(code, encoding="utf-8")

        if input_file_path:
            src = Path(input_file_path)
            if src.exists():
                shutil.copy(src, tmp_path / src.name)

        try:
            result = subprocess.run(
                [
                    "docker", "run", "--rm",
                    "--memory", MEMORY_LIMIT,
                    "--memory-swap", MEMORY_LIMIT,  # empêche l'usage de swap au-delà de la limite
                    "-v", f"{tmp_path}:/workspace",
                    "-w", "/workspace",
                    IMAGE_NAME,
                    "python", "script.py",
                ],
                capture_output=True,
                text=True,
                timeout=TIMEOUT_SECONDS,
            )
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode,
            }
        except subprocess.TimeoutExpired:
            return {
                "stdout": "",
                "stderr": f"Le script a dépassé le timeout de {TIMEOUT_SECONDS} secondes et a été arrêté.",
                "returncode": -1,
            }