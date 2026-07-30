# test_embeddings.py
from embeddings import embed_text

vec = embed_text("test objective: calculate total sales by product")
print(f"Embedding length: {len(vec)}")
print(f"First 5 values: {vec[:5]}")