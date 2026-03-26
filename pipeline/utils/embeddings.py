"""Sentence-transformer embedding wrapper — lazy-loaded, cached."""

import numpy as np

_model = None


def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed_texts(texts: list[str]) -> np.ndarray:
    """Encode a list of texts into embeddings. Returns (N, 384) float32 array."""
    if not texts:
        return np.array([])
    model = get_model()
    return model.encode(texts, show_progress_bar=False, convert_to_numpy=True)


def cosine_similarity_matrix(a: np.ndarray, b: np.ndarray | None = None) -> np.ndarray:
    """Compute pairwise cosine similarity. If b is None, compute self-similarity."""
    if b is None:
        b = a
    a_norm = a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-8)
    b_norm = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-8)
    return a_norm @ b_norm.T
