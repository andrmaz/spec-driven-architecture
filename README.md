# Spec-Driven Architecture

[![Test](https://github.com/andrmaz/spec-driven-architecture/actions/workflows/ci.yml/badge.svg?event=push)](https://github.com/andrmaz/spec-driven-architecture/actions/workflows/ci.yml)
[![Build](https://github.com/andrmaz/spec-driven-architecture/actions/workflows/ci.yml/badge.svg?event=push)](https://github.com/andrmaz/spec-driven-architecture/actions/workflows/ci.yml)
[![CodeQL](https://github.com/andrmaz/spec-driven-architecture/actions/workflows/ci.yml/badge.svg?event=push)](https://github.com/andrmaz/spec-driven-architecture/actions/workflows/ci.yml)

An AI-guided assistant that walks you through a structured, five-step process for defining and documenting your software architecture — from quality attributes to exportable diagrams.

## Why

Architecture decisions are too often undocumented, scattered across Slack threads, or locked in one engineer's head. This tool brings structure to the process by combining an interactive AI chat with rich, purpose-built UI components — so you produce real, exportable architecture documentation as a natural by-product of the conversation.

The five-step workflow is inspired by Mark Richards' [Fundamentals of Software Architecture](https://www.developertoarchitect.com/), adapted into an interactive format.

## The Five-Step Workflow

Each project progresses through a guided sequence. The AI assistant drives the conversation while persisting all artifacts to a PostgreSQL database.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. Identify     │────▶│  2. Map Logical  │────▶│  3. Choose      │
│  Characteristics │     │  Components      │     │  Architecture   │
│                  │     │                  │     │  Style          │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌─────────────────┐     ┌────────▼────────┐
                        │  5. Diagram      │◀────│  4. Document    │
                        │  Architecture    │     │  Decisions      │
                        └─────────────────┘     └─────────────────┘
```

| Step                      | What you do                                        | What the AI produces                                                                                                          |
| ------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **1. Characteristics**    | Describe your system's requirements and priorities | A rated worksheet of architectural quality attributes (scalability, availability, security, etc.) with your top-3 highlighted |
| **2. Components**         | Discuss the major functional areas of your system  | A logical component map grouped by namespace, showing responsibilities and dependencies                                       |
| **3. Architecture Style** | Evaluate trade-offs between candidate styles       | A comparison chart rating styles (Microservices, Layered, Event-Driven, etc.) against your top characteristics                |
| **4. Decisions**          | Review and refine key architecture choices         | Formal Architecture Decision Records (ADRs) following the Nygard template                                                     |
| **5. Diagrams**           | Approve and iterate on visual representations      | Mermaid.js diagrams — C4 context, component, sequence, and flowchart views                                                    |

## Features

- **AI-guided workflow** — Conversational assistant powered by [Tambo AI](https://tambo.co) walks you through each step, asking clarifying questions and generating structured output
- **Rich generative UI** — Purpose-built React components (worksheets, component maps, comparison charts, ADR cards, Mermaid diagrams) rendered directly in the chat
- **Persistent projects** — All architecture artifacts are saved to PostgreSQL via Drizzle ORM and can be revisited or updated at any time
- **Export to Markdown** — One-click export generates a complete documentation package (README, characteristics, components, style rationale, ADRs, diagrams) as a downloadable ZIP
- **Step-by-step progress** — Visual sidebar tracks your position through the five-step process with step locking to enforce the intended sequence
- **Dark mode support** — Full light/dark theme support via Tailwind CSS v4

## Tech Stack

| Layer     | Technology                                                                           |
| --------- | ------------------------------------------------------------------------------------ |
| Framework | [React Router v7](https://reactrouter.com/) (framework mode)                         |
| Server    | [Express 5](https://expressjs.com/)                                                  |
| Database  | [PostgreSQL](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/) |
| AI        | [Tambo AI](https://tambo.co) (generative UI + tool calling)                          |
| Styling   | [Tailwind CSS v4](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)  |
| Rich Text | [Tiptap](https://tiptap.dev/) editor for chat input                                  |
| Diagrams  | [Mermaid.js](https://mermaid.js.org/) for architecture diagrams                      |
| Build     | [Vite](https://vite.dev/)                                                            |
| Language  | TypeScript throughout                                                                |

## Project Structure

```
├── app/
│   ├── routes/              # React Router route modules
│   │   ├── dashboard.tsx    # Project listing (index route)
│   │   ├── project.tsx      # AI workspace for a single project
│   │   └── export.tsx       # Markdown export & preview
│   ├── components/
│   │   ├── architecture/    # Step-specific UI (worksheets, charts, diagrams)
│   │   ├── dashboard/       # Project cards, empty state, create dialog
│   │   ├── project/         # Step sidebar navigation
│   │   └── tambo/           # Chat UI (messages, input, thread panel)
│   └── lib/
│       ├── api.ts           # Client-side fetch layer for Express API
│       ├── tambo.ts         # Tambo component & tool registration
│       └── utils.ts         # Shared utilities
├── server/
│   └── app.ts               # Express server with REST API endpoints
├── database/
│   ├── schema.ts            # Drizzle schema (projects, characteristics, etc.)
│   └── context.ts           # AsyncLocalStorage-based DB context
└── drizzle/                  # Migration files
```

## Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9
- **PostgreSQL** >= 15
- A [Tambo AI](https://tambo.co) API key

### Installation

```bash
pnpm install
```

### Environment Setup

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/spec_driven_arch
VITE_TAMBO_API_KEY=your_tambo_api_key
```

### Database Setup

Run the Drizzle migrations to create the schema:

```bash
pnpm run db:migrate
```

### Development

Start the development server with HMR:

```bash
pnpm run dev
```

The application will be available at `http://localhost:5173`.

## Available Scripts

| Command             | Description                    |
| ------------------- | ------------------------------ |
| `pnpm dev`          | Start dev server with HMR      |
| `pnpm build`        | Create production build        |
| `pnpm start`        | Run production server          |
| `pnpm db:generate`  | Generate new Drizzle migration |
| `pnpm db:migrate`   | Apply database migrations      |
| `pnpm typecheck`    | Run TypeScript type checking   |
| `pnpm lint`         | Run ESLint                     |
| `pnpm lint:fix`     | Auto-fix lint issues           |
| `pnpm format`       | Format code with Prettier      |
| `pnpm format:check` | Check formatting               |

## Database Schema

The data model captures the full architecture documentation lifecycle:

```
projects
 ├── architectural_characteristics   (quality attributes with ratings)
 ├── logical_components              (system components with namespaces)
 ├── architectural_styles            (candidate styles with star ratings)
 ├── architecture_decisions          (ADRs with status tracking)
 └── architecture_diagrams           (Mermaid diagrams by type)
```

All child tables cascade-delete with their parent project.

## Deployment

### Docker

```bash
docker build -t spec-driven-architecture .
docker run -p 3000:3000 -e DATABASE_URL=... -e VITE_TAMBO_API_KEY=... spec-driven-architecture
```

### Manual

Build and run the production server:

```bash
pnpm build
pnpm start
```

Deploy the following artifacts:

```
├── package.json
├── pnpm-lock.yaml
├── server.js
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

Compatible with any Node.js hosting platform (AWS ECS, Google Cloud Run, Fly.io, Railway, etc.).

## Contributing

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject
```

Examples: `feat(export): add PDF output`, `fix(diagram): handle empty mermaid code`

Commit messages are validated by [commitlint](https://commitlint.js.org/) via a Husky pre-commit hook.

## License

See [LICENSE](LICENSE) for details.
