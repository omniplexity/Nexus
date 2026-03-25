# AGENTS.md v2 — Nexus Cognitive Operating System

## Purpose

This document defines the **operational contract** for any LLM/agent contributing to the Nexus codebase. It enforces:

- Deterministic execution
- Low hallucination behavior
- Strict architectural compliance
- Incremental, verifiable progress

Agents MUST treat this document as **binding**.

---

# 1. Core Principles

## 1.1 Contract-First Development
- NEVER implement before defining interfaces
- ALL systems must have explicit TypeScript contracts
- Contracts live in `/interfaces`

## 1.2 DAG-First Execution
- ALL execution must compile into DAGs
- NO direct tool/model execution outside orchestrator
- Orchestrator is the single execution authority

## 1.3 Determinism Over Intelligence
- Prefer predictable systems over "smart" ones
- Avoid hidden reasoning paths
- Ensure replayability of all executions

## 1.4 Strict Layer Separation

```
apps → interfaces → systems → core
```

Rules:
- apps: no business logic
- interfaces: types only
- systems: implementation
- core: primitives/utilities only

---

# 2. Agent Operating Rules

## 2.1 Execution Protocol (MANDATORY)

For EVERY task, agents MUST:

### Phase A — Scope
- Identify system being modified
- List affected files
- Define objective in 1–2 sentences

### Phase B — Contracts
- Define or update interfaces FIRST
- Validate compatibility with existing systems

### Phase C — Implementation
- Implement minimal viable logic
- Follow existing patterns exactly

### Phase D — Validation
- Add/adjust tests if applicable
- Verify type safety
- Check for edge cases

### Phase E — Output
Agents MUST output:

1. File tree (touched files only)
2. Full file contents OR minimal diffs
3. Commands to run/test

---

## 2.2 Forbidden Behaviors

Agents MUST NOT:

- Invent APIs or functions not defined in contracts
- Bypass orchestrator (no direct tool/model calls)
- Introduce global state
- Use `any` unless explicitly justified
- Modify unrelated files
- Perform large, multi-system refactors in one step

---

## 2.3 Incremental Development

- Each change must be **small and reversible**
- Max scope: one system or sub-system
- If complexity grows → split into phases

---

# 3. System-Specific Rules

## 3.1 Orchestrator

- Only system allowed to execute DAGs
- Must support:
  - Parallel execution
  - Retry strategies
  - Error propagation

Agents MUST NOT:
- Embed business logic in nodes

---

## 3.2 Agents System

Agents are NOT executors.

They MUST:
- Produce `ExecutionPlan`
- Compile into DAG
- Delegate execution to orchestrator

---

## 3.3 Context Engine

- All context must pass through:
  - prioritizer
  - compressor
  - router

Agents MUST NOT:
- Inject raw context into model calls

---

## 3.4 Tool System

- All tools must:
  - Be registered
  - Be policy-validated
  - Be observable

No direct tool invocation allowed.

---

## 3.5 Memory System

- Must support:
  - indexing
  - retrieval
  - TTL

Future compatibility:
- persistence layer abstraction REQUIRED

---

## 3.6 Integration Layer

- Adapters must be stateless
- Authentication must be externalized

---

# 4. Coding Standards

## 4.1 TypeScript

- Strict mode ON
- No implicit any
- Explicit return types required

## 4.2 File Structure

Each system:

```
system/
  index.ts
  *.ts (modular files)
  __tests__/
```

---

## 4.3 Error Handling

- Use centralized error system
- No raw `throw new Error()`
- Always include error codes

---

## 4.4 Logging

- Structured logs only
- No console.log in production code

---

# 5. Testing Requirements

Agents MUST:

- Add tests for new logic
- Avoid brittle tests
- Test:
  - edge cases
  - failure paths
  - concurrency (if applicable)

---

# 6. Performance Constraints

Agents MUST consider:

- DAG execution cost
- memory usage
- caching opportunities

Avoid:
- redundant model calls
- unbounded loops

---

# 7. Security Constraints

- All tools require policy validation
- No execution of arbitrary code without sandbox
- No credential storage in code

---

# 8. Cognitive Layer Rules (Future-Proofing)

When implementing cognitive systems:

- Intent must be structured
- Planner must output deterministic plans
- Strategy must be explicit and selectable

---

# 9. Output Format (STRICT)

Agents MUST always output in this structure:

```
## Phase X — <Name>

### Files
- path/to/file.ts

### Code
```ts
// code here
```

### Run
npm test
```

---

# 10. Failure Handling

If uncertain:

Agents MUST:
- Choose minimal safe implementation
- Document assumptions

Agents MUST NOT:
- Guess complex logic

---

# 11. Definition of Done

A task is complete ONLY if:

- Types compile
- Tests pass
- No architectural violations
- Output format followed

---

# 12. Priority Order

When making decisions:

1. Architecture integrity
2. Determinism
3. Type safety
4. Performance
5. Developer convenience

---

# 13. Anti-Hallucination Enforcement

Agents MUST:

- Only use known files
- Only use defined contracts
- Avoid speculative implementations

If missing dependency:
- Create minimal contract FIRST

---

# 14. Execution Philosophy

Nexus is NOT:
- a chatbot
- a thin wrapper over LLMs

Nexus IS:
- a deterministic cognitive execution system

Agents must reinforce this direction in all implementations.

---

# END OF FILE

