# Phase 6: UI Control Surface Implementation Plan

## Overview

This document captures the Phase 6 implementation plan for Nexus. Phase 6 delivers the **UI Control Surface**: a workspace-oriented web and desktop experience, real-time execution visibility, and typed transport contracts for live updates.

**Phase 6 Goal**: expose the post-Phase-5 backend through a usable control surface without violating architecture boundaries. The UI layers should consume `interfaces/` contracts and bootstrap data, while `systems/` continue to own orchestration, context, memory, and tools.

---

## Current State Analysis

### What Was Complete Before Phase 6

| Component | Status | Notes |
|-----------|--------|-------|
| Phase 5 Capability Fabric | ✅ Complete | Tool runtime, policies, built-ins, and orchestration integration are implemented and green |
| Core Event Contracts | ✅ Complete | Event namespaces and structured system communication already exist in `core/contracts/events.ts` |
| API Interface Layer | ✅ Complete | `interfaces/api` provides REST endpoints for bootstrap and status data |
| CLI Application | ✅ Complete | `apps/cli` exists and provides command-line access to the system |
| WebSocket Contracts | ⚠️ Partial | `interfaces/contracts/websocket.ts` exists, but there is no live transport implementation yet |
| Web Application | ⚠️ Empty | `apps/web/` exists as a directory but has no implementation files |
| Desktop Application | ⚠️ Empty | `apps/desktop/` exists as a directory but has no implementation files |

### Gaps Addressed by Phase 6

| Gap | Status Before | Phase 6 Action |
|-----|---------------|----------------|
| Workspace UI shell | ❌ Missing | Create shared workspace layout for web and desktop |
| Graph visualization | ❌ Missing | Render orchestration graph state, node status, and execution progress |
| Execution dashboard | ❌ Missing | Add live task monitoring, metrics, and progress views |
| Log viewer | ❌ Missing | Stream structured logs and execution events into the UI |
| Settings panel | ❌ Missing | Surface configuration and environment-aware controls |
| Real-time transport | ❌ Missing | Implement WebSocket live updates and resync support |
| UI bootstrap data | ❌ Missing | Add snapshot endpoints or bootstrap flow for initial client hydration |
| UI-oriented events | ❌ Missing | Extend or bridge event contracts for UI consumption if needed |

---

## Phase 6 Architecture

### UI Control Surface Data Flow

```text
User Input
   ↓
apps/web or apps/desktop
   ↓
interfaces/api (bootstrap/snapshot)
interfaces/websocket (live stream)
   ↓
systems/orchestration + systems/context + systems/memory + modules/tools
   ↓
core/contracts/events.ts
```

- `interfaces/api` provides the initial application snapshot, status, history, and control endpoints.
- `interfaces/websocket` provides live, typed execution updates and resync support.
- `apps/web` and `apps/desktop` render the control surface and do not reach into `systems/` directly.
- `core/contracts/events.ts` remains the canonical source for event semantics; a dedicated UI event namespace should only be added if the transport layer requires it.

### Phase Boundary

```text
apps -> interfaces -> systems -> core
```

Phase 6 must preserve this boundary:

- `apps/` own presentation and user interaction.
- `interfaces/` own transport, serialization, and external protocol adaptation.
- `systems/` continue to own orchestration, memory, context, and tool execution.
- `core/` remains pure contract space.

### Proposed Package Structure

```text
apps/
├── web/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
├── desktop/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
interfaces/
├── websocket/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
└── contracts/
    └── websocket.ts
```

---

## Phase 6 Deliverables

### 6.1 Interface Foundation

- Establish UI-facing snapshot and transport contracts.
- Determine whether `core/contracts/events.ts` needs a `UI` namespace or whether UI events stay within interface-layer contracts.
- Define typed payloads for:
  - execution snapshot
  - graph state
  - node progress
  - logs
  - workspace status
  - user-triggered control actions

### 6.2 WebSocket Live Transport

- Implement a real WebSocket server under `interfaces/websocket/`.
- Stream execution, node, context, and tool events to UI clients.
- Support reconnect and resync so clients can recover from dropped connections.
- Keep the message protocol explicit, versioned, and compatible with the current interface contracts.

### 6.3 Web Application

- Build `apps/web` as the primary workspace control surface.
- Include:
  - workspace navigation
  - graph canvas
  - execution timeline
  - log viewer
  - detail inspector
  - settings/configuration panel

### 6.4 Desktop Application

- Build `apps/desktop` as an optional packaged client.
- Reuse the same shared UI contracts and workspace behavior as the web app.
- Avoid diverging interaction models unless a platform-specific requirement justifies it.

### 6.5 API Expansion

- Extend `interfaces/api` only where needed for bootstrap, snapshot, history, and control actions.
- Keep REST focused on initialization and non-realtime access.
- Use WebSocket for live updates rather than duplicating streaming behavior in REST.

### 6.6 CLI Alignment

- Add CLI commands for UI-adjacent workflows such as:
  - inspect
  - watch
  - tail logs
  - export snapshot
- Keep the CLI useful for headless environments without turning it into a second UI layer.

### 6.7 Documentation Alignment

- Update the root `README.md`.
- Update `docs/architecture/OVERVIEW.md`.
- Update `docs/architecture/LAYERS.md`.
- Update `docs/systems/INDEX.md`.
- Add or update UI-focused system documentation if new interface behavior is introduced.

---

## Implementation Order

| Step | Focus | Result |
|------|-------|--------|
| 1 | UI contracts and transport shape | Typed snapshot and live-update contracts exist |
| 2 | WebSocket infrastructure | A real live update channel is available |
| 3 | Shared workspace shell | Web and desktop share the same control-surface model |
| 4 | API bootstrap endpoints | UI clients can hydrate initial state cleanly |
| 5 | CLI alignment | Headless inspection and monitoring commands are added |
| 6 | Validation and docs | Tests, docs, and repo validation are updated |

---

## File Creation Summary

### New Files

```text
plans/PHASE6_UI_CONTROL_SURFACE.md
interfaces/websocket/*
apps/web/*
apps/desktop/*
```

### Likely Updated Files

```text
core/contracts/events.ts
interfaces/contracts/websocket.ts
interfaces/contracts/api.ts
interfaces/api/*
apps/cli/*
README.md
docs/architecture/OVERVIEW.md
docs/architecture/LAYERS.md
docs/systems/INDEX.md
docs/systems/EXECUTION.md
```

---

## Documentation Updates

| Document | Update |
|----------|--------|
| `README.md` | Phase 6 status, control surface summary, validation surface |
| `docs/architecture/OVERVIEW.md` | Phase roadmap and UI/control-surface status |
| `docs/architecture/LAYERS.md` | UI layer and interface boundary details |
| `docs/systems/INDEX.md` | Systems index updated for UI-facing interfaces |
| `docs/systems/EXECUTION.md` | Runtime and live-visibility behavior |
| `docs/systems/ORCHESTRATION.md` | UI-visible execution details if needed |

---

## Success Criteria

Phase 6 is complete when:

- [ ] `apps/web` provides a usable workspace control surface
- [ ] `apps/desktop` provides a working desktop wrapper or native client
- [ ] `interfaces/websocket` streams live execution updates reliably
- [ ] Bootstrap/snapshot endpoints support UI hydration
- [ ] Graph, logs, execution state, and settings are visible in the UI
- [ ] CLI includes the agreed inspection and monitoring commands
- [ ] Phase 6 tests cover contracts, transport, and UI integration
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] Changes are committed and pushed to `main`

---

## Out of Scope

- New orchestration semantics
- New memory or tool behavior
- Plugin discovery and loading
- Optimization-layer caching and token tuning
- Agent framework expansion
- Distributed collaboration features beyond realtime visibility
- Mobile-specific applications

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| UI drift from core/system contracts | Keep UI contracts in `interfaces/` and rely on `core/` event semantics |
| Duplicate state between REST and WebSocket | Use REST for bootstrap and WebSocket for live state only |
| Over-coupling presentation to orchestration internals | Keep apps dependent on interfaces, not systems |
| Desktop/web divergence | Share common UI models and behavior across both apps |
| Realtime transport instability | Add reconnect, snapshot resync, and integration tests |

---

## Testing Strategy

### Contract Coverage

- WebSocket message schema validation
- UI snapshot and bootstrap payload validation
- Any event namespace changes in `core/contracts/events.ts`

### Transport Coverage

- WebSocket connect, reconnect, and resync flows
- Live event delivery for orchestration, node, tool, and context updates
- Bootstrap endpoint behavior for initial hydration

### UI Coverage

- Workspace layout rendering
- Graph state rendering
- Log viewer and inspector panel behavior
- Settings panel wiring

### CLI Coverage

- inspect/watch/tail/export command paths
- structured output and error handling

### Repo Validation

- `npm run lint`
- `npm run typecheck`
- `npm test`

---

## Notes

1. **Contract-First**: UI transport and snapshot types must be defined before implementation.
2. **Boundary Discipline**: `systems/` remain implementation-owned; `apps/` should not import them directly.
3. **Bootstrap vs Live State**: REST should hydrate, WebSocket should stream.
4. **Reuse First**: Web and desktop should share as much presentation logic as possible.
5. **Minimal Semantics Change**: Phase 6 should surface existing capabilities rather than inventing new orchestration behavior.

---

**Last Updated**: 2026-03-24
**Phase Status**: 📋 Ready for Implementation
