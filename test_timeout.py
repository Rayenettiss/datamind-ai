# test_timeout.py — run this directly, not through the pipeline
from sandbox.run_in_sandbox import run_in_sandbox

code = """
import time
while True:
    time.sleep(1)
"""

result = run_in_sandbox(code)
print(result)