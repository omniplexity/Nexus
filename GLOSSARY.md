# Glossary

This document defines technical terms used throughout the Nexus project.

## Core Concepts

### DAG (Directed Acyclic Graph)

A graph data structure where nodes are connected by directed edges with no cycles. Nexus uses DAGs to represent task execution flows, enabling parallel processing of independent nodes.

### Node

A single unit of work within a DAG. Nodes receive inputs, process data, and produce outputs. See [Node Types](#node-types).

### Orchestrator

The central component that manages task execution, schedules nodes, and coordinates the overall workflow within Nexus.

### Execution Context

The runtime environment passed to each node during execution, containing memory, constraints, and metadata.

## Node Types

| Type | Description |
|------|-------------|
| **Reasoning Node** | Executes LLM calls with structured prompts |
| **Tool Node** | Executes external/internal tool functions |
| **Memory Node** | Performs memory retrieval or storage |
| **Control Node** | Handles branching, loops, and retry logic |
| **Aggregator Node** | Merges multiple inputs (concat, merge, override) |
| **Transform Node** | Applies data transformations (map, filter, reduce) |
| **Conditional Node** | Routes execution based on conditions |

## Memory Types

| Type | Description |
|------|-------------|
| **Ephemeral** | Short-lived, single request context |
| **Session** | Per-session context that persists during a user session |
| **Persistent** | Long-term storage across sessions |
| **Derived** | Computed or derived information from other memory types |

## Model Abstraction

### Model Roles

| Role | Purpose |
|------|---------|
| **Fast Model** | Quick, lightweight responses for simple tasks |
| **Reasoning Model** | Deep reasoning for complex problem-solving |
| **Specialized Model** | Domain-specific tasks (code, math, etc.) |

### Model Provider

An abstraction layer that allows Nexus to work with different LLM providers (OpenAI, Anthropic, local models via LM Studio).

## Task States

| Status | Description |
|--------|-------------|
| **PENDING** | Task created, waiting to be scheduled |
| **RUNNING** | Task is actively executing |
| **PAUSED** | Task execution is paused |
| **COMPLETED** | Task completed successfully |
| **FAILED** | Task failed with an error |
| **CANCELLED** | Task was cancelled |

## Architecture Layers

| Layer | Description |
|-------|-------------|
| **Experience Layer** | UI/Command surface |
| **Cognitive Control Layer** | Intent compilation, task decomposition |
| **Orchestration Graph Layer** | DAG-based execution engine |
| **Capability Fabric Layer** | Tool and capability system |
| **Context Engine Layer** | Memory, routing, compression |
| **Model Abstraction Layer** | Multi-model orchestration |
| **Runtime & Infrastructure Layer** | Execution environment |

## Systems

### Context Engine

Manages context injection, compression, and prioritization. Includes:
- **Router** — Determines which memory to inject
- **Compressor** — Reduces context size
- **Prioritizer** — Orders context by relevance

### Cognitive Architecture

Handles high-level reasoning:
- **Intent Compiler** — Converts user input to structured tasks
- **Task Decomposer** — Breaks tasks into subtasks
- **Strategy Selector** — Chooses execution strategy
- **Constraint Engine** — Enforces execution constraints

### Capability Fabric

Provides extensibility through:
- **Cognitive Capabilities** — Summarization, planning, analysis
- **Operational Capabilities** — File operations, code execution
- **External Capabilities** — API calls, web search

## Development Terms

### Contract

An interface definition that specifies how components interact. Nexus uses contract-first development.

### Phase

A development milestone. See the [Roadmap](README.md#development-roadmap):
- Phase 0: Kernel
- Phase 1: Core Contracts
- Phase 2: Minimal Vertical Slice
- Phase 3: Graph Engine
- Phase 4: Context Engine
- Phase 5: Capability Fabric
- Phase 6: UI Surface
- Phase 7: Optimization

See the [Roadmap](../meta/roadmap/ROADMAP.md) for full details.

### ADR (Architecture Decision Record)

A document that captures an important architectural decision, including context, decision, and consequences.

## Performance Terms

### Token Efficiency

Strategies to minimize token usage:
- Context slicing
- Selective memory injection
- Compression

### Latency

Time from task submission to completion. Target: < 500ms for simple tasks.

---

*Last updated: March 2026*
