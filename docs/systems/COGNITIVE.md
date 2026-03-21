# Cognitive Systems

The cognitive systems provide higher-order reasoning capabilities including intent recognition, planning, strategy formulation, and constraint handling.

## Overview

The cognitive systems provide:

- **Intent recognition** - Understanding user goals and requests
- **Planning** - Creating execution plans for complex tasks
- **Strategy** - Selecting optimal approaches based on context
- **Constraints** - Handling resource and policy constraints

## Subsystems

The cognitive system is organized into four main subsystems in `systems/cognitive/`:

```
systems/cognitive/
├── constraints/    # Constraint handling and validation
├── intent/        # Intent recognition and classification
├── planner/       # Task planning and decomposition
└── strategy/     # Strategy selection and optimization
```

### Constraints (`constraints/`)

Handles various constraint types for task execution:

- **Resource constraints** - Token limits, timeouts, budget
- **Capability constraints** - Tool availability, permissions
- **Policy constraints** - Safety, compliance, business rules
- **Contextual constraints** - Session state, user preferences

**Planned Interfaces:**

```typescript
interface Constraint {
  type: ConstraintType;
  evaluate(context: ExecutionContext): ConstraintResult;
}

enum ConstraintType {
  TOKEN_LIMIT = 'token_limit',
  TIME_LIMIT = 'time_limit',
  BUDGET = 'budget',
  CAPABILITY = 'capability',
  POLICY = 'policy'
}

interface ConstraintResult {
  satisfied: boolean;
  violations?: string[];
  remaining?: Record<string, number>;
}
```

### Intent (`intent/`)

Recognizes and classifies user intent:

- **Intent classification** - Categorize user requests
- **Entity extraction** - Extract key entities and parameters
- **Sentiment analysis** - Understand emotional context
- **Context awareness** - Consider conversation history

**Planned Interfaces:**

```typescript
interface Intent {
  type: IntentType;
  confidence: number;
  entities: Entity[];
  parameters: Record<string, unknown>;
}

enum IntentType {
  QUESTION = 'question',
  TASK = 'task',
  CLARIFICATION = 'clarification',
  FEEDBACK = 'feedback'
}

interface Entity {
  type: string;
  value: string;
  confidence: number;
}
```

### Planner (`planner/`)

Creates and manages task execution plans:

- **Task decomposition** - Break complex tasks into steps
- **Dependency analysis** - Identify execution order
- **Plan optimization** - Minimize cost/latency
- **Plan adaptation** - Adjust plans based on feedback

**Planned Interfaces:**

```typescript
interface Plan {
  id: string;
  steps: PlanStep[];
  estimatedCost: number;
  estimatedLatency: number;
}

interface PlanStep {
  id: string;
  action: Action;
  dependencies: string[];
  constraints?: StepConstraints;
}

type Action = 
  | { type: 'reasoning'; model: string; prompt: string }
  | { type: 'tool'; toolId: string; input: unknown }
  | { type: 'branch'; condition: string; trueBranch: Plan; falseBranch: Plan };
```

### Strategy (`strategy/`)

Selects optimal approaches for task execution:

- **Model selection** - Choose appropriate model
- **Tool selection** - Choose appropriate tools
- **Execution strategy** - Sequential vs. parallel
- **Fallback planning** - Plan for failure

**Planned Interfaces:**

```typescript
interface Strategy {
  approach: Approach;
  modelSelection: ModelSelection;
  toolSelection: string[];
  executionMode: 'sequential' | 'parallel' | 'hybrid';
  fallbackPlan?: Plan;
}

enum Approach {
  MINIMAL = 'minimal',
  BALANCED = 'balanced',
  THOROUGH = 'thorough',
  CREATIVE = 'creative'
}
```

## Architecture

### Intent Recognition Pipeline

```
User Input → Preprocessing → Intent Classification 
           → Entity Extraction → Context Integration
           → Intent Result
```

### Planning Pipeline

```
Intent → Task Decomposition → Dependency Analysis 
      → Plan Generation → Plan Optimization
      → Execution Plan
```

### Strategy Selection Pipeline

```
Plan + Context → Model Selection → Tool Selection 
              → Execution Mode → Strategy Selection
```

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Contracts | 🔄 Future | Not yet defined |
| Intent Recognition | 🔄 Future | Phase 5+ |
| Task Planner | 🔄 Future | Phase 5+ |
| Strategy Selection | 🔄 Future | Phase 5+ |
| Constraint System | 🔄 Future | Phase 5+ |

## Relationship to Other Systems

The cognitive systems interact with:

- **Orchestration** - Provides plans for execution
- **Models** - Uses models for reasoning
- **Capabilities** - Uses tools for execution
- **Memory** - Accesses context and history
- **Context** - Manages information flow

## Usage

### Intent Recognition (Future)

```typescript
const intentRecognizer = createIntentRecognizer();

const result = await intentRecognizer.recognize(
  'Can you analyze the sales data and create a report?'
);

console.log(result.type);       // 'task'
console.log(result.confidence); // 0.95
console.log(result.entities);    // [{ type: 'data', value: 'sales' }]
```

### Planning (Future)

```typescript
const planner = createPlanner();

const plan = await planner.createPlan({
  intent: taskIntent,
  constraints: tokenBudget,
  context: currentContext
});

console.log(plan.steps.length);  // 5
console.log(plan.estimatedCost);  // 0.02
```

### Strategy Selection (Future)

```typescript
const strategist = createStrategist();

const strategy = await strategist.selectStrategy({
  plan,
  availableModels,
  availableTools,
  constraints
});

console.log(strategy.approach);      // 'balanced'
console.log(strategy.executionMode);  // 'parallel'
```

## Related Files

- [Architecture Overview](../architecture/OVERVIEW.md)
- [Data Flow](../architecture/DATA_FLOW.md)
- [Component Map](../architecture/COMPONENT_MAP.md)
