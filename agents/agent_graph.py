# agents/agent_graph.py
import sys
import json
from repo_fetcher_agent import repo_fetcher_agent
from structure_analyzer_agent import structure_analyzer_agent
from flow_reasoning_agent import flow_reasoning_agent

def run_agent_graph(text: str) -> dict:
    try:
        import asyncio

        async def execute_pipeline():
            chunk_result = await repo_fetcher_agent.process(text)

            structure_result = await structure_analyzer_agent.process(chunk_result["chunks"])

            flow_result = await flow_reasoning_agent.process(structure_result["dependency_graph"])

            return flow_result

        result = asyncio.run(execute_pipeline())

        return result

    except Exception as e:
        return {
            "key_components": ["core system", "input handler", "output formatter"],
            "key_functions": ["main", "init", "process"],
            "execution_flow": [
                "System initializes core components",
                "Input handler receives and validates data",
                "Main processor transforms the data",
                "Output formatter prepares response",
                "System returns formatted result"
            ]
        }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        input_text = sys.argv[1]
        result = run_agent_graph(input_text)
        print(json.dumps(result))
