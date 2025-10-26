# Fetch.ai Agent Graph Integration

This directory contains the Fetch.ai multi-agent reasoning pipeline that analyzes content and produces execution flow data for tutorial generation.

## Architecture

The agent pipeline consists of three specialized agents:

1. **RepoFetcherAgent** (`repo_fetcher_agent.py`)
   - Splits text into manageable chunks
   - Generates embeddings for each chunk
   - Prepares content for structural analysis

2. **StructureAnalyzerAgent** (`structure_analyzer_agent.py`)
   - Extracts entities (classes, functions, components, etc.)
   - Builds dependency graph using NetworkX
   - Identifies relationships between components

3. **FlowReasoningAgent** (`flow_reasoning_agent.py`)
   - Analyzes dependency graph to create execution flow
   - Identifies key components and functions
   - Produces simplified step-by-step explanation

## Installation

Install Python dependencies:

```bash
cd agents
pip install -r requirements.txt
```

Or install globally:

```bash
pip install uagents networkx
```

## Usage

The agent graph is called automatically by the tutorial generation API at `/pages/api/tutorial.ts`.

### Manual Testing

You can test the agent graph manually:

```bash
cd agents
python agent_graph.py "Your content text here"
```

Output format:
```json
{
  "key_components": ["component1", "component2", ...],
  "key_functions": ["function1", "function2", ...],
  "execution_flow": [
    "Initialize component1",
    "Process component2",
    "Return result from component3"
  ]
}
```

## Pipeline Flow

```
User URL
   ↓
BrightData WebMCP (fetch HTML)
   ↓
cleanHtml() → cleaned text
   ↓
runAgentGraph(text) → execution_flow JSON
   ↓
Claude converts execution_flow → analogy storyboard
   ↓
Image & Audio Generation
   ↓
Tutorial Viewer
```

## Configuration

Set the Python path in `.env.local`:

```bash
PYTHON_PATH=python3
```

The API route spawns a Python subprocess to run the agent graph with a 30-second timeout.

## Error Handling

If the agent graph fails or times out, it returns a fallback execution flow:

```json
{
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
```

This ensures the tutorial generation continues even if agent analysis fails.

## Extending the Pipeline

To add a new agent:

1. Create a new agent file (e.g., `new_agent.py`)
2. Import and instantiate the agent in `agent_graph.py`
3. Add the agent to the `execute_pipeline()` async function
4. Update the final result structure as needed

## Dependencies

- **uagents** (>= 0.12.0): Fetch.ai agent framework
- **networkx** (>= 3.0): Graph analysis library for dependency mapping
