import { createRequestHandler } from "@react-router/express";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import express from "express";
import postgres from "postgres";
import "react-router";

import { DatabaseContext } from "~/database/context";
import * as schema from "~/database/schema";

declare module "react-router" {
  interface AppLoadContext {
    VALUE_FROM_EXPRESS: string;
  }
}

export const app = express();

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client, { schema });
app.use((_, __, next) => DatabaseContext.run(db, next));

// ── JSON body parsing for API routes ───────────────────
app.use("/api", express.json());

// ── Projects CRUD ──────────────────────────────────────

app.get("/api/projects", async (_req, res) => {
  const db = DatabaseContext.getStore()!;
  const rows = await db.query.projects.findMany({
    orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
  });
  res.json(rows);
});

app.post("/api/projects", async (req, res) => {
  const db = DatabaseContext.getStore()!;
  const { name, description } = req.body;
  const [project] = await db.insert(schema.projects).values({ name, description }).returning();
  res.status(201).json(project);
});

app.get("/api/projects/:id", async (req, res) => {
  const db = DatabaseContext.getStore()!;
  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, req.params.id),
    with: {
      characteristics: true,
      components: true,
      styles: true,
      decisions: { orderBy: (d, { asc }) => [asc(d.createdAt)] },
      diagrams: true,
    },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

app.put("/api/projects/:id", async (req, res) => {
  const db = DatabaseContext.getStore()!;
  const { name, description, currentStep, tamboThreadId } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (currentStep !== undefined) updates.currentStep = currentStep;
  if (tamboThreadId !== undefined) updates.tamboThreadId = tamboThreadId;

  const [project] = await db
    .update(schema.projects)
    .set(updates)
    .where(eq(schema.projects.id, req.params.id))
    .returning();
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

app.delete("/api/projects/:id", async (req, res) => {
  const db = DatabaseContext.getStore()!;
  const [deleted] = await db
    .delete(schema.projects)
    .where(eq(schema.projects.id, req.params.id))
    .returning();
  if (!deleted) return res.status(404).json({ error: "Project not found" });
  res.json({ ok: true });
});

// ── Architectural Characteristics ──────────────────────

app.put("/api/projects/:id/characteristics", async (req, res) => {
  const db = DatabaseContext.getStore()!;
  const projectId = req.params.id;
  const { characteristics } = req.body as {
    characteristics: {
      name: string;
      rating: number;
      description?: string;
      isTopThree: boolean;
    }[];
  };

  // Filter out entries with missing required fields
  const valid = characteristics.filter((c) => c.name);

  // Delete existing then insert new
  await db
    .delete(schema.architecturalCharacteristics)
    .where(eq(schema.architecturalCharacteristics.projectId, projectId));

  if (valid.length > 0) {
    await db
      .insert(schema.architecturalCharacteristics)
      .values(valid.map((c) => ({ ...c, projectId })));
  }

  res.json({ ok: true });
});

// ── Logical Components ─────────────────────────────────

app.put("/api/projects/:id/components", async (req, res) => {
  const db = DatabaseContext.getStore()!;
  const projectId = req.params.id;
  const { components } = req.body as {
    components: {
      name: string;
      responsibility?: string;
      dependencies?: string[];
      namespace?: string;
    }[];
  };

  const valid = components.filter((c) => c.name);

  await db
    .delete(schema.logicalComponents)
    .where(eq(schema.logicalComponents.projectId, projectId));

  if (valid.length > 0) {
    await db.insert(schema.logicalComponents).values(valid.map((c) => ({ ...c, projectId })));
  }

  res.json({ ok: true });
});

// ── Architectural Styles ───────────────────────────────

app.put("/api/projects/:id/styles", async (req, res) => {
  const db = DatabaseContext.getStore()!;
  const projectId = req.params.id;
  const { styles } = req.body as {
    styles: {
      styleName: string;
      rationale?: string;
      starRatings?: Record<string, number>;
      isSelected: boolean;
    }[];
  };

  const valid = styles.filter((s) => s.styleName);

  await db
    .delete(schema.architecturalStyles)
    .where(eq(schema.architecturalStyles.projectId, projectId));

  if (valid.length > 0) {
    await db.insert(schema.architecturalStyles).values(valid.map((s) => ({ ...s, projectId })));
  }

  res.json({ ok: true });
});

// ── Architecture Decisions ─────────────────────────────

app.post("/api/projects/:id/decisions", async (req, res) => {
  const db = DatabaseContext.getStore()!;
  const projectId = req.params.id;
  const { title, status, context, decision, consequences } = req.body;

  const [row] = await db
    .insert(schema.architectureDecisions)
    .values({ projectId, title, status, context, decision, consequences })
    .returning();

  res.status(201).json(row);
});

app.put("/api/projects/:id/decisions/:decisionId", async (req, res) => {
  const db = DatabaseContext.getStore()!;
  const { title, status, context, decision, consequences } = req.body;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (status !== undefined) updates.status = status;
  if (context !== undefined) updates.context = context;
  if (decision !== undefined) updates.decision = decision;
  if (consequences !== undefined) updates.consequences = consequences;

  const [row] = await db
    .update(schema.architectureDecisions)
    .set(updates)
    .where(
      and(
        eq(schema.architectureDecisions.id, req.params.decisionId),
        eq(schema.architectureDecisions.projectId, req.params.id)
      )
    )
    .returning();
  if (!row) return res.status(404).json({ error: "Decision not found" });
  res.json(row);
});

// ── Architecture Diagrams ──────────────────────────────

app.put("/api/projects/:id/diagrams", async (req, res) => {
  const db = DatabaseContext.getStore()!;
  const projectId = req.params.id;
  const { diagrams } = req.body as {
    diagrams: {
      title: string;
      mermaidCode: string;
      diagramType: "context" | "container" | "component" | "sequence" | "flowchart";
    }[];
  };

  await db
    .delete(schema.architectureDiagrams)
    .where(eq(schema.architectureDiagrams.projectId, projectId));

  if (diagrams.length > 0) {
    await db.insert(schema.architectureDiagrams).values(diagrams.map((d) => ({ ...d, projectId })));
  }

  res.json({ ok: true });
});

// ── Export (full project data) ─────────────────────────

app.get("/api/projects/:id/export", async (req, res) => {
  const db = DatabaseContext.getStore()!;
  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, req.params.id),
    with: {
      characteristics: true,
      components: true,
      styles: true,
      decisions: { orderBy: (d, { asc }) => [asc(d.createdAt)] },
      diagrams: true,
    },
  });
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

// ── React Router catch-all ─────────────────────────────

app.use(
  createRequestHandler({
    build: () => import("virtual:react-router/server-build"),
    getLoadContext() {
      return {
        VALUE_FROM_EXPRESS: "Hello from Express",
      };
    },
  })
);
