# Contributing to Nexus

Thank you for your interest in contributing to Nexus!

## Development Philosophy

Nexus follows these core principles (see [`AGENTS.md`](AGENTS.md) for full details):

- **Structure First** — Always ensure directory structure exists before writing code
- **Contract-First** — Define interfaces before implementation
- **Single Responsibility** — Each file/module does one thing
- **No Cross-Layer Violations** — Follow dependency flow: `apps → interfaces → systems → core`

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/omniplexity/nexus.git
cd nexus

# Install dependencies
npm install

# Verify TypeScript compiles
npm run typecheck
```

## Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow the coding standards**
   - Run `npm run lint` before committing
   - Run `npm run format` to format code

3. **Test your changes**
   ```bash
   npm run test
   ```

4. **Commit with descriptive messages**
   ```bash
   git commit -m 'feat: add new tool implementation'
   ```

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation changes
- `style` — formatting, no code change
- `refactor` — code restructuring
- `test` — adding tests
- `chore` — maintenance

## Project Structure

See [`README.md`](README.md) for the full project structure. Key directories:

- `core/` — System kernel (types, contracts, errors)
- `systems/` — Primary systems (orchestration, context, cognitive)
- `modules/` — Pluggable extensions (tools, agents)
- `apps/` — Entry point applications

## Questions?

- Open an issue for bugs or feature requests
- Discussion forum for general questions
