<!-- markdownlint-disable MD033 MD041 -->

<div align="center">

# Nexus

> **Cognitive Operating System for AI Orchestration**

A local-first, high-performance AI interface framework that replaces the linear prompt→response loop with a graph-based execution architecture.

[![License: MIT](https://img.shields.io/badge/License-MIT-%23FF6B6B.svg?style=flat-square)](#license)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&style=flat-square)](#)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&style=flat-square)](#)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&style=flat-square)](#)
[![Express](https://img.shields.io/badge/Express-4.x-%23000000?logo=express&style=flat-square)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?logo=postgresql&style=flat-square)](#)
[![Docker](https://img.shields.io/badge/Docker-24+-2496ED?logo=docker&style=flat-square)](#)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?logo=tailwind-css&style=flat-square)](#)

</div>

---

## Overview

Nexus is not a chatbot. It is a **Cognitive Operating System (COS)** that orchestrates reasoning, amplifies user cognition, and executes structured work — running entirely on your local machine. The system replaces the traditional linear prompt→response loop with a Directed Acyclic Graph (DAG)-based execution architecture, enabling parallel tool execution, deterministic orchestration, and reusable execution graphs.

---

## Key Features

### Cognitive Architecture

Acts as the "brain above the model" through four core subsystems:
- **Intent Compiler** — Converts user input into structured task graphs
- **Task Decomposer** — Breaks tasks into atomic operations
- **Strategy Selector** — Chooses optimal model, tools, and execution path
- **Constraint Engine** — Enforces token limits, latency budgets, and resource usage

### Context Engine

Eliminates context window limitations through intelligent memory management:
- **Context Router** — Determines what information is needed
- **Context Compressor** — Reduces token footprint
- **Context Prioritizer** — Orders relevance
- **Context Cache** — Stores reusable fragments
- **Memory Types** — Ephemeral (current task), Session (conversation), Persistent (long-term), Derived (generated summaries)

### Capability Fabric

A unified system of capabilities exposed as composable units:
- **Cognitive Capabilities** — Summarization, planning, analysis
- **Operational Capabilities** — File manipulation, code execution
- **External Capabilities** — APIs, web access
- **Capability Composition** — Analyze → Retrieve → Transform → Execute → Validate

### Model Abstraction

Model-agnostic, hot-swappable architecture supporting multi-model orchestration:
- **Fast Model** — Low latency tasks
- **Reasoning Model** — Complex reasoning tasks
- **Specialized Model** — Domain-specific tasks
- **Routing Strategy** — Based on task complexity, cost constraints, and latency targets

### Performance Optimization

Hyper-efficient architecture targeting minimal latency and token usage:
- **Token Efficiency** — Context compression, selective memory injection, execution-level reasoning
- **Latency Reduction** — Parallel DAG execution, precomputation, cached reasoning artifacts
- **Compute Optimization** — Local model preference, incremental computation, result caching

### Local-First Runtime

All processing occurs on your local machine:
- **Backend** — Node.js with Express
- **Frontend** — Electron + React + Web UI
- **AI Runtime** — Local LLM via LM Studio
- **Isolation** — Separate processes for tools, AI execution, and core logic

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HIGH-LEVEL LAYERS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                    🎨 Experience Layer                               │     │
│  │         Command Surface, Execution Timeline, Workspace Grid        │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                    │                                          │
│                                    ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │               🧠 Cognitive Control Layer                             │     │
│  │      Intent Compiler, Task Decomposer, Strategy Selector           │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                    │                                          │
│                                    ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │              🔀 Orchestration Graph Layer                            │     │
│  │                   DAG-Based Execution Engine                        │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                    │                                          │
│                                    ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                🧵 Capability Fabric Layer                           │     │
│  │        Cognitive, Operational, External Capabilities               │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                    │                                          │
│                                    ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                 📦 Context Engine Layer                              │     │
│  │       Router, Compressor, Prioritizer, Cache, Memory              │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                    │                                          │
│                                    ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │               🤖 Model Abstraction Layer                            │     │
│  │            Model-agnostic, Hot-swappable, Multi-model             │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                    │                                          │
│                                    ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │              ⚙️ Runtime & Infrastructure                             │     │
│  │              Electron + Express + Local LLM                        │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Execution Model

Nexus replaces linear pipelines with Directed Acyclic Graphs (DAGs):

```
Task
 │
 ├── Node A (LLM) ──────────────┐
 │                               │
 ├── Node B (Tool) ────────┐     │
 │                         │     │
 ├── Node C (Memory Fetch)├─────┼──▶ Node D (Aggregation)
 │                         │     │
 ├── Node E (Transform)───┘     │
 │                               │
 └── Node F (Validation)─────────┘
```

**Node Types:**
- **Reasoning Node** — LLM call with structured prompt execution
- **Tool Node** — External/internal function execution
- **Memory Node** — Retrieval or storage operations
- **Control Node** — Conditional branching, looping, retry logic

---

## Tech Stack (Planned)

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Zustand |
| **Backend** | Node.js 20, Express, TypeScript, PostgreSQL |
| **AI Runtime** | LM Studio (Local LLM), Model-agnostic architecture |
| **Runtime** | Electron + Web UI |
| **Database** | SQLite → PostgreSQL, Vector DB for embeddings |

---

## Project Structure

```
nexus/
├── backend/                          # Express.js API server
│   ├── src/
│   │   ├── cognitive-control/        # 🧠 Cognitive Control Layer
│   │   │   ├── intent-compiler/     #   Intent → structured task graph
│   │   │   ├── task-decomposer/     #   Break tasks into atomic operations
│   │   │   ├── strategy-selector/   #   Model/tools/execution path selection
│   │   │   └── constraint-engine/  #   Token limits, latency budgets
│   │   ├── orchestration-graph/     # 🔀 Orchestration Graph Layer
│   │   │   ├── dag-engine/          #   DAG execution system
│   │   │   ├── node-types/          #   Reasoning, Tool, Memory, Control nodes
│   │   │   └── executor/            #   Parallel execution, dependency resolution
│   │   ├── capability-fabric/       # 🧵 Capability Fabric Layer
│   │   │   ├── cognitive/           #   Summarization, planning, analysis
│   │   │   ├── operational/         #   File manipulation, code execution
│   │   │   └── external/            #   APIs, web access
│   │   ├── context-engine/          # 📦 Context Engine Layer
│   │   │   ├── router/              #   Determines needed information
│   │   │   ├── compressor/          #   Reduces token footprint
│   │   │   ├── prioritizer/         #   Orders relevance
│   │   │   ├── cache/               #   Stores reusable fragments
│   │   │   └── memory/              #   Ephemeral, Session, Persistent, Derived
│   │   ├── model-abstraction/       # 🤖 Model Abstraction Layer
│   │   │   ├── adapters/            #   Model-agnostic interfaces
│   │   │   ├── router/              #   Task-based model routing
│   │   │   └── pool/                #   Multi-model orchestration
│   │   ├── experience/              # 🎨 Experience Layer (UI)
│   │   ├── db/                      #   Database layer
│   │   ├── routes/                  #   API endpoints
│   │   └── services/                #   Business logic
│   └── package.json
│
├── frontend/                         # React application
│   ├── src/
│   │   ├── components/              #   UI components
│   │   ├── pages/                   #   Route pages
│   │   ├── services/                #   API client
│   │   └── stores/                  #   Zustand state
│   └── package.json
│
├── docker-compose.yml               # Production compose
├── docker-compose.dev.yml           # Development compose
├── package.json                     # Root workspace config
└── README.md                        # This file
```

---

## Development Roadmap

| Phase | Focus | Deliverables |
|:-----:|-------|--------------|
| **Phase 0** | Kernel | Minimal orchestrator, Direct LLM call |
| **Phase 1** | Graph Engine | DAG execution system with parallel node execution |
| **Phase 2** | Context Engine | Memory + retrieval with hybrid embedding/symbolic indexing |
| **Phase 3** | Capability Fabric | Tool system with plugin architecture |
| **Phase 4** | UI Control Surface | Workspace with command surface, timeline, panels |
| **Phase 5** | Optimization Layer | Caching, compression, latency minimization |

*Each phase must be runnable, testable, and measurable.*

---

## Design Principles

- **Replace, don't augment** — The system replaces the model as the primary orchestrator
- **Local-first** — All processing occurs on your machine
- **Deterministic orchestration** — Predictable execution through DAG-based flows
- **Composable capabilities** — Reusable, chainable execution units
- **Token efficiency** — Context compression and selective memory injection
- **Model agnostic** — Hot-swappable model adapters

---

## Performance Goals

| Metric | Target | Technique |
|--------|--------|-----------|
| **Latency** | < 500ms per node | Parallel DAG execution, precomputation |
| **Token Usage** | 40-60% reduction | Context slicing, prompt templating, memory referencing |
| **Memory** | < 2GB base | Incremental computation, result caching |
| **Local Execution** | 100% offline capable | LM Studio integration |

---

## Observability

Nexus provides comprehensive observability for debugging and optimization:

- **Execution Graph Traces** — Full DAG visualization with node-level inspection
- **Token Usage Metrics** — Per-node and cumulative token consumption
- **Latency Tracking** — Time per node with bottlenecks identified
- **Failure Rates** — Node-level success/failure tracking
- **Replay System** — Ability to replay and analyze past executions
- **Debug Mode** — Inspect internal state at any execution point

---

## Security

Nexus implements multiple layers of security:

| Feature | Implementation |
|---------|----------------|
| **Local Security** | Sandboxed tool execution, file access control |
| **API Security** | Strict CORS, rate limiting, input validation |
| **Authentication** | JWT tokens with HTTP-only cookies |
| **Password Storage** | bcrypt with salt rounds |
| **Error Handling** | Safe error messages, no stack traces in production |
| **Circuit Breaker** | Prevents cascade failures from external services |

---

## Getting Started (Planned)

> 📋 Detailed setup instructions coming in Phase 4+

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20.x+ |
| Docker | 24.x+ |
| LM Studio | Latest |
| PostgreSQL | 15+ |

### Quick Setup

```bash
# Clone repository
git clone https://github.com/yourusername/nexus.git
cd nexus

# Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start with Docker
docker-compose up -d
```

---

## Contribution Guidelines

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

For detailed guidelines, see [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Vision

Nexus is a **cognitive amplifier**, a **task execution engine**, a **multi-model orchestrator**, and a **local-first AI OS**. Using Nexus should feel like high-speed, precise, controlled, and powerful cognition augmentation.

The system makes models powerful — not by relying on larger models, but by orchestrating them within an intelligent architecture that minimizes token usage, maximizes parallel execution, and keeps all processing local.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Status

**Early Architecture Phase**

---

> "The model is not the system. Nexus is the system that makes models powerful."

<!-- markdownlint-enable MD033 MD041 -->
