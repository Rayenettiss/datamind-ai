# backend/sandbox/run_in_sandbox.py
import subprocess
import tempfile
from pathlib import Path

IMAGE_NAME = "datamind-sandbox"


def run_in_sandbox(code: str) -> dict:
    """Écrit `code` dans un fichier temporaire, l'exécute dans le conteneur Docker,
    et retourne stdout/stderr/returncode."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        script_path = tmp_path / "script.py"
        script_path.write_text(code, encoding="utf-8")

        result = subprocess.run(
            [
                "docker", "run", "--rm",
                "-v", f"{tmp_path}:/workspace",
                "-w", "/workspace",
                IMAGE_NAME,
                "python", "script.py",
            ],
            capture_output=True,
            text=True,
        )

        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
        }


if __name__ == "__main__":
    test_code = """
import pandas as pd

df = pd.DataFrame({"produit": ["A", "B", "C"], "quantite": [10, 20, 15]})
print(df.sum(numeric_only=True))
print("Sandbox OK")
"""
    output = run_in_sandbox(test_code)
    print("STDOUT:", output["stdout"])
    print("STDERR:", output["stderr"])
    print("RETURN CODE:", output["returncode"])