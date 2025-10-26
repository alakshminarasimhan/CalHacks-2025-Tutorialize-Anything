# agents/flow_reasoning_agent.py
from uagents import Agent, Context, Model
from typing import List, Dict
import networkx as nx

class FlowRequest(Model):
    dependency_graph: Dict

class FlowResponse(Model):
    execution_flow: List[str]
    key_components: List[str]
    key_functions: List[str]

class FlowReasoningAgent(Agent):
    def __init__(self):
        super().__init__(name="flow_reasoner", seed="flow_reasoner_seed")

    def build_execution_flow(self, graph_data: Dict) -> List[str]:
        nodes = graph_data.get("nodes", [])
        edges = graph_data.get("edges", [])

        if not nodes:
            return ["System initializes", "Processes input", "Returns output"]

        G = nx.DiGraph()
        G.add_nodes_from(nodes)
        G.add_edges_from(edges)

        try:
            topological_order = list(nx.topological_sort(G))
        except nx.NetworkXError:
            topological_order = nodes[:10]

        flow_steps = []
        for i, node in enumerate(topological_order[:8]):
            if i == 0:
                flow_steps.append(f"Initialize {node}")
            elif i == len(topological_order) - 1:
                flow_steps.append(f"Return result from {node}")
            else:
                flow_steps.append(f"Process {node}")

        return flow_steps

    def extract_key_components(self, graph_data: Dict) -> List[str]:
        nodes = graph_data.get("nodes", [])
        edges = graph_data.get("edges", [])

        if not nodes:
            return ["core system", "input handler", "output formatter"]

        G = nx.DiGraph()
        G.add_nodes_from(nodes)
        G.add_edges_from(edges)

        centrality = nx.degree_centrality(G)
        sorted_nodes = sorted(centrality.items(), key=lambda x: x[1], reverse=True)

        return [node for node, _ in sorted_nodes[:5]]

    def extract_key_functions(self, graph_data: Dict) -> List[str]:
        nodes = graph_data.get("nodes", [])

        function_keywords = ['handler', 'process', 'create', 'update', 'delete', 'fetch', 'get', 'post', 'put']
        functions = [node for node in nodes if any(kw in node.lower() for kw in function_keywords)]

        return functions[:5] if functions else nodes[:5] if nodes else ["main", "init", "run"]

    async def process(self, dependency_graph: Dict) -> Dict:
        execution_flow = self.build_execution_flow(dependency_graph)
        key_components = self.extract_key_components(dependency_graph)
        key_functions = self.extract_key_functions(dependency_graph)

        return {
            "execution_flow": execution_flow,
            "key_components": key_components,
            "key_functions": key_functions
        }

flow_reasoning_agent = FlowReasoningAgent()
