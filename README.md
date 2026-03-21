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

## 📋 Overview

Nexus is not a chatbot. It is a **Cognitive Operating System (COS)** that orchestrates reasoning, amplifies user cognition, and executes structured work — running entirely on your local machine. The system replaces the traditional linear prompt→response loop with a Directed Acyclic Graph (DAG)-based execution architecture, enabling parallel tool execution, deterministic orchestration, and reusable execution graphs.

---

## ✨ Key Features

| Feature Category | Components |
|-----------------|------------|
| **🧠 Cognitive Architecture** | Intent Compiler · Task Decomposer · Strategy Selector · Constraint Engine |
| **📦 Context Engine** | Context Router · Compressor · Prioritizer · Cache · Memory (Ephemeral/Session/Persistent/Derived) |
| **🧵 Capability Fabric** | Cognitive (summarization, planning, analysis) · Operational (file, code) · External (APIs, web) |
| **🤖 Model Abstraction** | Fast Model · Reasoning Model · Specialized Model · Smart Routing |
| **⚡ Performance** | Token Efficiency · Latency Reduction · Compute Optimization |
| **💻 Local-First** | Node.js + Express · Electron + React · LM Studio · Sandboxed Execution |

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           NEXUS ARCHITECTURE LAYERS                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ╭─────────────────────╮                                                    │
│   │   🎨 EXPERIENCE      │  Command Surface • Execution Timeline            │
│   │      LAYER           │  Workspace Grid • State Surface                  │
│   ╰──────────┬──────────╯                                                    │
│              │                                                                │
│              ▼                                                                │
│   ╭─────────────────────╮                                                    │
│   │   🧠 COGNITIVE       │  Intent Compiler → Task Decomposer               │
│   │   CONTROL            │  Strategy Selector → Constraint Engine            │
│   │      LAYER           │                                                    │
│   ╰──────────┬──────────╯                                                    │
│              │                                                                │
│              ▼                                                                │
│   ╭─────────────────────╮                                                    │
│   │   🔀 ORCHESTRATION   │  DAG-Based Execution Engine                      │
│   │      GRAPH           │  Parallel Node Execution • Dependency Resolution│
│   │      LAYER           │                                                    │
│   ╰──────────┬──────────╯                                                    │
│              │                                                                │
│              ▼                                                                │
│   ╭─────────────────────╮                                                    │
│   │   🧵 CAPABILITY      │  Cognitive • Operational • External             │
│   │      FABRIC          │  Analyze → Retrieve → Transform → Execute       │
│   │      LAYER           │                                                    │
│   ╰──────────┬──────────╯                                                    │
│              │                                                                │
│              ▼                                                                │
│   ╭─────────────────────╮                                                    │
│   │   📦 CONTEXT         │  Router • Compressor • Prioritizer              │
│   │      ENGINE          │  Cache • Memory Types                           │
│   │      LAYER           │                                                    │
│   ╰──────────┬──────────╯                                                    │
│              │                                                                │
│              ▼                                                                │
│   ╭─────────────────────╮                                                    │
│   │   🤖 MODEL           │  Model-Agnostic • Hot-Swappable                  │
│   │   ABSTRACTION        │  Multi-Model Orchestration                       │
│   │      LAYER           │                                                    │
│   ╰──────────┬──────────╯                                                    │
│              │                                                                │
│              ▼                                                                │
│   ╭─────────────────────╮                                                    │
│   │   ⚙️ RUNTIME         │  Electron + Express + Local LLM                │
│   │   & INFRASTRUCTURE   │  SQLite → PostgreSQL • Vector DB                │
│   ╰─────────────────────╯                                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Execution Model

Nexus replaces linear pipelines with **Directed Acyclic Graphs (DAGs)**:

```
                           ┌──────────────┐
                           │    Task      │
                           └──────┬───────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
   ┌───────────┐            ┌───────────┐            ┌───────────┐
   │  Node A  │            │  Node B   │            │  Node C   │
   │   (LLM)  │            │  (Tool)   │            │ (Memory)  │
   └─────┬─────┘            └─────┬─────┘            └─────┬─────┘
         │                        │                        │
         │                        └────────┬───────────────┘
         │                                 │
         │                                 ▼
         │                         ┌───────────────┐
         │                         │   Node D      │
         │                         │  (Aggregation)│
         │                         └───────┬───────┘
         │                                 │
         └─────────────────────────────────┼───────┐
                                           │       │
                                           ▼       ▼
                                     ┌───────────┐ ┌───────────┐
                                     │  Node E   │ │  Node F   │
                                     │(Transform) │ │(Validation│
                                     └───────────┘ └───────────┘
```

| Node Type | Description |
|-----------|-------------|
| 🧠 **Reasoning Node** | LLM call with structured prompt execution |
| 🔧 **Tool Node** | External/internal function execution |
| 💾 **Memory Node** | Retrieval or storage operations |
| 🔀 **Control Node** | Conditional branching, looping, retry logic |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|:-----:|------------|---------|
| 🖥️ **Frontend** | React 18 · TypeScript · Vite · Tailwind CSS · Zustand | UI Framework & State Management |
| ⚙️ **Backend** | Node.js 20 · Express · TypeScript · PostgreSQL | API Server & Business Logic |
| 🤖 **AI Runtime** | LM Studio · Model-agnostic | Local LLM Execution |
| 📱 **Runtime** | Electron · Web UI | Desktop Application |
| 🗄️ **Database** | SQLite → PostgreSQL · Vector DB | Data & Embeddings Storage |

---

## 📁 Project Structure

### Directory Layout

 | Path | Layer | Description |
 |------|-------|-------------|
 | `apps/` | 🎨 | Entrypoint applications (desktop, web, cli) |
 | `core/` | ⚙️ | System kernel (types, contracts, errors, config, utils) |
 | `systems/cognitive/` | 🧠 | Intent Compiler, Task Decomposer, Strategy Selector, Constraint Engine |
 | `systems/orchestration/` | 🔀 | DAG Engine, Node Types (Reasoning/Tool/Memory/Control), Executor |
 | `systems/context/` | 📦 | Router, Compressor, Prioritizer, Cache, Memory Types |
 | `systems/capabilities/` | 🧵 | Cognitive, Operational, External Capabilities |
 | `systems/models/` | 🤖 | Model Adapters, Router, Multi-model Pool |
 | `systems/memory/` | 💾 | Memory abstraction, retrieval, storage |
 | `systems/execution/` | ⚡ | Execution runtime, parallel processing |
 | `modules/tools/` | 🔧 | Tool implementations (filesystem, http, code-exec, vector-search) |
 | `modules/agents/` | 🤖 | Agent definitions and behaviors |
 | `modules/workflows/` | 📋 | Reusable workflow templates |
 | `modules/integrations/` | 🔌 | External service integrations |
 | `runtime/` | ⚙️ | Process management, IPC, scheduling, sandbox |
 | `data/` | 🗄️ | Storage abstraction (schemas, repositories, migrations) |
 | `interfaces/` | 🌐 | External boundaries (api, events, cli, websocket) |
 | `infra/` | 🏗️ | Infrastructure (local, docker, ci, monitoring) |
 | `dev/` | 🔧 | Development tooling (scripts, generators, benchmarks) |
 | `docs/` | 📚 | Documentation (architecture, systems, guides, api) |
 | `meta/` | 📋 | Project governance (roadmap, standards, conventions) |

### Dependency Flow

```
apps → interfaces → systems → core
                ↓
             modules
                ↓
              data
                ↓
             runtime
```

---

## 🗺️ Development Roadmap

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                            NEXUS DEVELOPMENT PHASES                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  PHASE 0  ══════════════════════════════════════════════════════════════►   ║
║  ┌─────────────┐     Kernel: Minimal orchestrator, Direct LLM call         ║
║  │   KERNEL    │                                                          ║
║  └─────────────┘                                                          ║
║                                                                              ║
║  PHASE 1  ══════════════════════════════════════════════════════════════►   ║
║  ┌─────────────┐     Core Contracts: Define interfaces (Orchestrator,     ║
║  │   CONTRACTS │     Node, Tool, Memory, Model Provider)                 ║
║  └─────────────┘                                                          ║
║                                                                              ║
║  PHASE 2  ══════════════════════════════════════════════════════════════►   ║
║  ┌─────────────┐     Vertical Slice: Working system from                 ║
║  │  MINIMAL     │     apps → interfaces → orchestration → models         ║
║  │    SLICE    │                                                          ║
║  └─────────────┘                                                          ║
║                                                                              ║
║  PHASE 3  ══════════════════════════════════════════════════════════════►   ║
║  ┌─────────────┐     Graph Engine: DAG execution with parallel nodes       ║
║  │GRAPH ENGINE │                                                          ║
║  └─────────────┘                                                          ║
║                                                                              ║
║  PHASE 4  ══════════════════════════════════════════════════════════════►   ║
║  ┌─────────────┐     Context Engine: Memory + retrieval, hybrid indexing  ║
║  │CONTEXT      │                                                          ║
║  │   ENGINE    │                                                          ║
║  └─────────────┘                                                          ║
║                                                                              ║
║  PHASE 5  ══════════════════════════════════════════════════════════════►   ║
║  ┌─────────────┐     Capability Fabric: Tool system, plugin architecture   ║
║  │CAPABILITY   │                                                          ║
║  │   FABRIC    │                                                          ║
║  └─────────────┘                                                          ║
║                                                                              ║
║  PHASE 6  ══════════════════════════════════════════════════════════════►   ║
║  ┌─────────────┐     UI Control Surface: Workspace with timeline, panels  ║
║  │    UI       │                                                          ║
║  │   SURFACE   │                                                          ║
║  └─────────────┘                                                          ║
║                                                                              ║
║  PHASE 7  ══════════════════════════════════════════════════════════════►   ║
║  ┌─────────────┐     Optimization: Caching, compression, latency tuning    ║
║  │ OPTIMIZATION│                                                          ║
║  │    LAYER    │                                                          ║
║  └─────────────┘                                                          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

> **Each phase must be runnable, testable, and measurable.**

---

## 🎯 Design Principles

| Principle | Description |
|-----------|-------------|
| 🔄 **Replace, Don't Augment** | The system replaces the model as the primary orchestrator |
| 💻 **Local-First** | All processing occurs on your machine |
| 📊 **Deterministic Orchestration** | Predictable execution through DAG-based flows |
| 🧩 **Composable Capabilities** | Reusable, chainable execution units |
| 🎯 **Token Efficiency** | Context compression and selective memory injection |
| 🔌 **Model Agnostic** | Hot-swappable model adapters |

---

## ⚡ Performance Goals

```
╭──────────────────────────────────────────────────────────────────────────────╮
│                         🚀 PERFORMANCE TARGETS                               │
├──────────────────────────────────┬───────────────────┬───────────────────────┤
│            METRIC                │      TARGET       │      TECHNIQUE       │
├──────────────────────────────────┼───────────────────┼───────────────────────┤
│  ⏱️  Latency                     │     < 500ms       │ Parallel DAG + precom │
│  🪙  Token Usage                 │   40-60% reduction│ Context slicing      │
│  💾  Memory                      │    < 2GB base     │ Incremental compute   │
│  📴  Local Execution             │   100% offline    │ LM Studio integration │
╰──────────────────────────────────┴───────────────────┴───────────────────────╯
```

---

## 📊 Observability

Nexus provides comprehensive observability for debugging and optimization:

| Feature | Description |
|---------|-------------|
| 📈 **Execution Graph Traces** | Full DAG visualization with node-level inspection |
| 🪙 **Token Usage Metrics** | Per-node and cumulative token consumption |
| ⏱️ **Latency Tracking** | Time per node with bottlenecks identified |
| ❌ **Failure Rates** | Node-level success/failure tracking |
| 🔁 **Replay System** | Ability to replay and analyze past executions |
| 🔍 **Debug Mode** | Inspect internal state at any execution point |

---

## 🔒 Security

```
╭──────────────────────────────────────────────────────────────────────────────╮
│                         🛡️ SECURITY LAYERS                                   │
├──────────────────────────────────┬────────────────────────────────────────────┤
│           FEATURE                │              IMPLEMENTATION              │
├──────────────────────────────────┼────────────────────────────────────────────┤
│  🏠 Local Security               │  Sandboxed tool execution, file access   │
│  🌐 API Security                 │  Strict CORS, rate limiting, validation   │
│  🔑 Authentication               │  JWT tokens with HTTP-only cookies       │
│  🔐 Password Storage             │  bcrypt with salt rounds                  │
│  ⚠️ Error Handling               │  Safe messages, no stack traces           │
│  🔄 Circuit Breaker              │  Prevents cascade from external services   │
╰──────────────────────────────────┴────────────────────────────────────────────╯
```

---

## 🚀 Getting Started (Planned)

> 📋 Detailed setup instructions coming in Phase 4+

### Prerequisites

| Tool | Version |
|------|---------|
| 🟢 Node.js | 20.x+ |
| 🐳 Docker | 24.x+ |
| 🤖 LM Studio | Latest |
| 🐘 PostgreSQL | 15+ |

### Quick Setup

```bash
# Clone repository
git clone https://github.com/yourusername/nexus.git
cd nexus

# Configure environment
cp infra/local/.env.example infra/local/.env

# Start with Docker
docker-compose up -d
```

---

## 🤝 Contribution Guidelines

We welcome contributions! Please follow these steps:

1. **🍴 Fork** the repository
2. **🌿 Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **💾 Commit** your changes (`git commit -m 'Add amazing-feature'`)
4. **📤 Push** to the branch (`git push origin feature/amazing-feature`)
5. **🔖 Open** a Pull Request

For detailed guidelines, see [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## 💡 Vision

Nexus is a **cognitive amplifier**, a **task execution engine**, a **multi-model orchestrator**, and a **local-first AI OS**. Using Nexus should feel like high-speed, precise, controlled, and powerful cognition augmentation.

The system makes models powerful — not by relying on larger models, but by orchestrating them within an intelligent architecture that minimizes token usage, maximizes parallel execution, and keeps all processing local.

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 📌 Status

<div align="center">

**🏗️ Early Architecture Phase**

</div>

---

> *"The model is not the system. Nexus is the system that makes models powerful."*

<!-- markdownlint-enable MD033 MD041 -->
