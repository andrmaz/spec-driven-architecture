# Spec-Driven Architecture — Agent Guidelines

> Guidance for AI agents and LLMs working on this codebase. Optimized for automation and consistency.

## Project Stack

- **Framework**: React Router v7 (full-stack)
- **Database**: Drizzle ORM + PostgreSQL
- **Styling**: Tailwind CSS v4
- **Build**: Vite
- **Package manager**: pnpm
- **Node**: 20 (see `.nvmrc`)

## Code Quality

- **ESLint**: Run `pnpm lint` / `pnpm lint:fix`. Config: `eslint.config.js` (flat config).
- **Prettier**: Run `pnpm format` / `pnpm format:check`. Config: `.prettierrc`.
- **Commitlint**: Conventional commits. Run `pnpm commitlint` to validate. Format: `type(scope): subject` (e.g. `feat(auth): add login`).

## Project Structure

- `app/` — React Router routes, components, loaders
- `server/` — Express server
- `database/` — Drizzle schema and context

## Agent Skills

Apply these skills when relevant:

- **`.agents/skills/vercel-react-best-practices/`** — React performance, waterfalls, bundle size, re-renders
- **`.agents/skills/vercel-composition-patterns/`** — React composition patterns

## Conventions

- Use TypeScript strict mode
- Prefer `path` aliases: `~/` for `app/`, `~/database/*` for `database/*`
- Follow existing patterns in `app/` for routes and loaders

<!-- tambo-docs-v1.0 -->

## Tambo AI Framework

This project uses **Tambo AI** for building AI assistants with generative UI and MCP support.

**Documentation**: https://docs.tambo.co/llms.txt

### CLI Commands (Non-Interactive)

The Tambo CLI auto-detects non-interactive environments. Use these commands:

```bash
# Initialize (requires API key from https://console.tambo.co)
npx tambo init --api-key=sk_...

# Add components
npx tambo add <component> --yes

# List available components
npx tambo list --yes

# Create new app
npx tambo create-app <name> --template=standard

# Get help
npx tambo --help
npx tambo <command> --help
```

**Exit codes**: 0=success, 1=error, 2=requires flags (check stderr for exact command)

## Tambo Generative UI

- Props are `undefined` during streaming—always use `?.` and `??`
- Use `useTamboComponentState` for state the assistant needs to see
- Use `useTamboStreamStatus` when you need to control UI behavior based on streaming state
- Common `useTamboStreamStatus` use cases: disabling buttons, showing section-level loading, waiting for required fields before rendering
- String props can render as they stream; structured data like arrays/objects may stream progressively or wait for completion depending on the use case
- Generate array item IDs client-side—React keys must be stable, and AI-generated IDs are unreliable during streaming
- If the item IDs are used to fetch data, use `useTamboStreamStatus` to wait until the array is complete before rendering
- Fetch server data or derive from app state; don't have AI generate what already exists
- Use `.describe()` to guide prop generation
