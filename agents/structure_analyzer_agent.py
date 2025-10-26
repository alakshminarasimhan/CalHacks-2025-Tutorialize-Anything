# agents/structure_analyzer_agent.py
from uagents import Agent, Context, Model
from typing import List, Dict, Set, Tuple
import re
import networkx as nx

class StructureRequest(Model):
    chunks: List[str]

class StructureResponse(Model):
    dependency_graph: Dict

class StructureAnalyzerAgent(Agent):
    def __init__(self):
        super().__init__(name="structure_analyzer", seed="structure_analyzer_seed")

    def extract_entities(self, chunks: List[str]) -> Set[str]:
        entities = set()
        patterns = [
            r'\bclass\s+(\w+)',
            r'\bfunction\s+(\w+)',
            r'\bdef\s+(\w+)',
            r'\bconst\s+(\w+)',
            r'\blet\s+(\w+)',
            r'\bvar\s+(\w+)',
            r'\binterface\s+(\w+)',
            r'\btype\s+(\w+)',
            r'\bcomponent\s+(\w+)',
            r'\bAPI\s+(\w+)',
            r'\bendpoint\s+(\w+)',
            r'\bservice\s+(\w+)',
            r'\bmodule\s+(\w+)',
        ]

        for chunk in chunks:
            for pattern in patterns:
                matches = re.findall(pattern, chunk, re.IGNORECASE)
                entities.update(matches)

        return entities

    def find_dependencies(self, chunks: List[str], entities: Set[str]) -> List[Tuple[str, str]]:
        dependencies = []

        for chunk in chunks:
            chunk_lower = chunk.lower()
            found_entities = [e for e in entities if e.lower() in chunk_lower]

            for i, entity1 in enumerate(found_entities):
                for entity2 in found_entities[i+1:]:
                    if entity1 != entity2:
                        dependencies.append((entity1, entity2))

        return dependencies

    async def process(self, chunks: List[str]) -> Dict:
        entities = self.extract_entities(chunks)
        dependencies = self.find_dependencies(chunks, entities)

        G = nx.DiGraph()
        for entity in entities:
            G.add_node(entity)
        for source, target in dependencies:
            G.add_edge(source, target)

        graph_data = {
            "nodes": list(G.nodes()),
            "edges": [(u, v) for u, v in G.edges()],
            "components": list(nx.weakly_connected_components(G)) if G.nodes() else []
        }

        return {
            "dependency_graph": graph_data
        }

structure_analyzer_agent = StructureAnalyzerAgent()
