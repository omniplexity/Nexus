# Nexus Guides

Welcome to the Nexus development guides. These documents provide practical guidance for developers working on the Nexus project.

## Overview

Nexus is a cognitive operating system for AI orchestration, built with a layered architecture and contract-first development approach. These guides help you understand how to develop, test, and maintain Nexus effectively.

## Available Guides

### Getting Started

| Guide | Description |
|-------|-------------|
| [GETTING_STARTED](GETTING_STARTED.md) | Quick start guide for new developers - clone, install, and run your first task |
| [DEVELOPMENT](DEVELOPMENT.md) | Development environment setup, workflow, and coding standards |

### Core Development

| Guide | Description |
|-------|-------------|
| [CONTRACT_DEVELOPMENT](CONTRACT_DEVELOPMENT.md) | How to create new contracts using the contract-first methodology |
| [TESTING](TESTING.md) | Testing patterns, conventions, and best practices |
| [CONTEXT](CONTEXT.md) | Using the Context Engine for context preparation and compression |
| [MEMORY](MEMORY.md) | Using the Memory System for storage and retrieval |

### Workflow & Maintenance

| Guide | Description |
|-------|-------------|
| [COMMIT_GUIDE](COMMIT_GUIDE.md) | Commit message conventions and guidelines |
| [TROUBLESHOOTING](TROUBLESHOOTING.md) | Common issues and their solutions |

## Related Documentation

- [Architecture Overview](../architecture/OVERVIEW.md) - High-level system architecture
- [API Reference](../api/INDEX.md) - API documentation
- [Architecture Decisions](../decisions/INDEX.md) - ADRs explaining key decisions
- [GLOSSARY](../../GLOSSARY.md) - Technical terms and definitions
- [STYLEGUIDE](../../STYLEGUIDE.md) - Coding conventions
- [CONTRIBUTING](../../CONTRIBUTING.md) - Contribution guidelines

## Key Concepts

Before diving into the guides, familiarize yourself with these core concepts:

- **DAG (Directed Acyclic Graph)** - The execution model for tasks
- **Contract-First Development** - Defining interfaces before implementation
- **Layered Architecture** - Clean separation of concerns
- **Multi-Provider Model Abstraction** - Support for various LLM providers

See the [GLOSSARY](../../GLOSSARY.md) for more detailed definitions.

## Prerequisites

All guides assume:

- Node.js >= 20.0.0
- npm >= 10.0.0
- Git
- TypeScript familiarity
- Understanding of async/await patterns

## Quick Commands

```bash
# Install dependencies
npm install

# Run development
npm run dev

# Run tests
npm run test

# Type check
npm run typecheck

# Format code
npm run format

# Lint code
npm run lint
```

## Getting Help

- **Issues** - Report bugs or request features via GitHub Issues
- **Discussions** - Ask questions in GitHub Discussions
- **Documentation** - Check the docs/ directory for detailed information

---

*Last updated: March 2024*
