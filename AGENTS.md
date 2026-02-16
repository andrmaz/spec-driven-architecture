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
