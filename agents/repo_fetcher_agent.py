# agents/repo_fetcher_agent.py
from uagents import Agent, Context, Model
from typing import List, Dict
import hashlib
import numpy as np

class ChunkRequest(Model):
    text: str

class ChunkResponse(Model):
    chunks: List[str]
    embeddings: List[List[float]]

class RepoFetcherAgent(Agent):
    def __init__(self):
        super().__init__(name="repo_fetcher", seed="repo_fetcher_seed")

    def chunk_text(self, text: str, chunk_size: int = 1000) -> List[str]:
        words = text.split()
        chunks = []
        current_chunk = []
        current_size = 0

        for word in words:
            current_chunk.append(word)
            current_size += len(word) + 1
            if current_size >= chunk_size:
                chunks.append(" ".join(current_chunk))
                current_chunk = []
                current_size = 0

        if current_chunk:
            chunks.append(" ".join(current_chunk))

        return chunks

    def simple_embedding(self, text: str) -> List[float]:
        hash_obj = hashlib.md5(text.encode())
        hash_bytes = hash_obj.digest()
        embedding = [float(b) / 255.0 for b in hash_bytes[:128]]
        return embedding

    async def process(self, text: str) -> Dict:
        chunks = self.chunk_text(text)
        embeddings = [self.simple_embedding(chunk) for chunk in chunks]

        return {
            "chunks": chunks,
            "embeddings": embeddings
        }

repo_fetcher_agent = RepoFetcherAgent()
