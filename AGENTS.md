# Spec-Driven Architecture — Agent Guidelines

Full-stack app built with React Router v7, Drizzle ORM + PostgreSQL, Tailwind CSS v4, and Vite.

## Package Manager

Use `pnpm`.

## Project Structure

- `app/` — React Router routes, components, loaders
- `server/` — Express server
- `database/` — Drizzle schema and context

## Path Aliases

- `~/` → `app/`
- `~/database/*` → `database/*`

## Commands

| Task                    | Command                             |
| ----------------------- | ----------------------------------- |
| Lint                    | `pnpm lint` / `pnpm lint:fix`       |
| Format                  | `pnpm format` / `pnpm format:check` |
| Validate commit message | `pnpm commitlint`                   |

Commit format: `type(scope): subject` — e.g. `feat(auth): add login`

## Further Reading

- [Tambo AI framework](docs/agents/tambo.md) — CLI usage, generative UI rules

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.
