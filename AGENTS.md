# AGENTS.md — Nexus Autonomous Development Protocol

---

# 0. PURPOSE

This document defines the **operational rules, constraints, and execution methodology** for any LLM agent contributing to the Nexus codebase.

The agent must function as:

* A **deterministic system builder**
* A **strict architectural enforcer**
* A **low-hallucination executor**

---

# 1. PRIMARY DIRECTIVE

> Build Nexus incrementally, correctly, and verifiably — never assume, never skip structure, never break system integrity.

---

# 2. GLOBAL RULES (NON-NEGOTIABLE)

## 2.1 No Hallucination Policy

The agent MUST:

* Never invent files, APIs, or behaviors
* Never assume undocumented structure
* Never fabricate dependencies

If uncertain:

* STOP
* State uncertainty explicitly
* Request clarification or define a minimal placeholder

---

## 2.2 Structure First Policy

Before writing ANY code:

1. Ensure directory exists
2. Ensure correct domain placement
3. Ensure alignment with architecture

---

## 2.3 Contract-First Development

All systems must begin with:

* Interfaces
* Type definitions
* Input/output schemas

No implementation before contracts.

---

## 2.4 Single Responsibility Enforcement

Each file/module must:

* Do one thing only
* Be independently testable
* Avoid side effects unless explicitly required

---

## 2.5 No Cross-Layer Violations

Strict dependency direction:

```
apps → interfaces → systems → core
                ↓
             modules
                ↓
              data
                ↓
             runtime
```

Violations are not allowed.

---

# 3. EXECUTION METHODOLOGY

---

# 3.1 PHASE-BASED DEVELOPMENT

The agent MUST operate in discrete phases.

---

## Phase 0 — Structure Initialization

### Tasks

* Create full directory tree
* Validate structure matches specification
* Do NOT create logic files

### Output

* Directory snapshot
* Confirmation of structure integrity

---

## Phase 1 — Core Contracts

### Tasks

Define interfaces in `/core/contracts`:

* Orchestrator
* Node
* Tool
* Memory
* Model Provider

### Requirements

* Typed
* Minimal
* Extensible

---

## Phase 2 — Minimal Vertical Slice

### Goal

Working system with minimal capability.

### Path

```
apps → interfaces → orchestration → models
```

### Constraints

* No memory
* No tools
* No advanced UI

---

## Phase 3 — Graph Execution Engine

### Tasks

* DAG structure
* Node execution logic
* Scheduler

---

## Phase 4 — Context Engine

### Tasks

* Memory abstraction
* Retrieval system
* Context compression (basic)

---

## Phase 5 — Capability Fabric

### Tasks

* Tool interface implementation
* Tool registry
* Execution chaining

---

## Phase 6 — UI Control Surface

### Tasks

* Workspace layout
* Execution visualization

---

## Phase 7 — Optimization Layer

### Tasks

* Caching
* Token reduction
* Parallel execution tuning

---

# 4. TASK EXECUTION FORMAT

For EVERY task, the agent MUST output:

---

## 4.1 FILE TREE (CHANGES ONLY)

```bash
/path/to/file
```

---

## 4.2 FILE CONTENTS

* Full file content OR
* Minimal diff (preferred when updating)

---

## 4.3 RATIONALE

* Why this change exists
* What system it supports

---

## 4.4 VALIDATION

* How to test
* Expected behavior

---

## 4.5 EDGE CASES

* Failure modes
* Constraints

---

# 5. CODING STANDARDS

---

## 5.1 General

* Explicit over implicit
* No magic values
* No hidden state
* No side-effect-heavy logic

---

## 5.2 Interfaces

* Must be versionable
* Must not depend on implementation

---

## 5.3 Error Handling

All systems must:

* Return structured errors
* Avoid throwing unhandled exceptions

---

## 5.4 Logging

Every critical system must include:

* Input logging
* Output logging
* Error logging

---

# 6. SYSTEM-SPECIFIC RULES

---

## 6.1 Orchestration

* Must be deterministic
* No hidden execution paths
* All steps traceable

---

## 6.2 Context Engine

* Never inject full memory blindly
* Always filter + prioritize
* Minimize token usage

---

## 6.3 Tool System

* Tools must be pure where possible
* Must define strict schemas
* Must fail safely

---

## 6.4 Model Layer

* No direct model calls outside provider layer
* Must support multiple providers

---

# 7. VALIDATION FRAMEWORK

---

## 7.1 Before Completing Any Task

Agent MUST verify:

* [ ] Structure is correct
* [ ] No dependency violations
* [ ] Contracts are respected
* [ ] System compiles (if applicable)

---

## 7.2 Continuous Validation

Each phase must:

* Run independently
* Be testable
* Be observable

---

# 8. FAILURE HANDLING

---

## 8.1 If Blocked

Agent must:

1. Stop execution
2. Output blocking issue
3. Propose minimal resolution

---

## 8.2 If Ambiguous

Agent must:

* Choose the simplest valid interpretation
* Clearly document assumption

---

# 9. ANTI-PATTERNS

---

Agent MUST NOT:

* Create monolithic files
* Mix concerns across systems
* Skip contracts
* Implement before planning
* Over-engineer prematurely

---

# 10. PROGRESSION RULE

> Do not move to the next phase until the current phase is:

* Complete
* Functional
* Validated

---

# 11. OUTPUT DISCIPLINE

Agent responses must be:

* Structured
* Minimal but complete
* Free of speculation
* Directly actionable

---

# 12. SUCCESS CRITERIA

The agent is successful when:

* The system builds incrementally
* No rewrites are required
* Each subsystem is independently valid
* Architecture remains intact over time

---

# 13. FINAL PRINCIPLE

> Build the system as if it must scale forever,
> but validate it as if it must work immediately.

---

**END OF AGENTS.md**
