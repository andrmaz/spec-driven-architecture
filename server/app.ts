import { createRequestHandler } from "@react-router/express";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import express from "express";
import postgres from "postgres";
import "react-router";

import { DatabaseContext } from "~/database/context";
import {
  CharacteristicInsert,
  ComponentInsert,
  DecisionInsert,
  DiagramInsert,
  ProjectCreate,
  ProjectUpdate,
  StyleInsert,
} from "~/database/entities";
import * as schema from "~/database/schema";
import { registerReplaceResource } from "./resource-route";

declare module "react-router" {
  interface AppLoadContext {
    VALUE_FROM_EXPRESS: string;
  }
}

export const app = express();

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client, { schema });
Object.assign(db, { $client: client });
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
  const parsed = ProjectCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const db = DatabaseContext.getStore()!;
  const [project] = await db.insert(schema.projects).values(parsed.data).returning();
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
  const parsed = ProjectUpdate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const db = DatabaseContext.getStore()!;
  const updates: Partial<typeof schema.projects.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.currentStep !== undefined) updates.currentStep = parsed.data.currentStep;
  if (parsed.data.tamboThreadId !== undefined) updates.tamboThreadId = parsed.data.tamboThreadId;

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

registerReplaceResource(app, {
  path: "characteristics",
  bodyKey: "characteristics",
  itemSchema: CharacteristicInsert,
  table: schema.architecturalCharacteristics,
  projectIdColumn: schema.architecturalCharacteristics.projectId,
  filter: (c) => !!c.name,
});

// ── Logical Components ─────────────────────────────────

registerReplaceResource(app, {
  path: "components",
  bodyKey: "components",
  itemSchema: ComponentInsert,
  table: schema.logicalComponents,
  projectIdColumn: schema.logicalComponents.projectId,
  filter: (c) => !!c.name,
});

// ── Architectural Styles ───────────────────────────────

registerReplaceResource(app, {
  path: "styles",
  bodyKey: "styles",
  itemSchema: StyleInsert,
  table: schema.architecturalStyles,
  projectIdColumn: schema.architecturalStyles.projectId,
  filter: (s) => !!s.styleName,
});

// ── Architecture Decisions ─────────────────────────────

app.post("/api/projects/:id/decisions", async (req, res) => {
  try {
    const parsed = DecisionInsert.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const db = DatabaseContext.getStore()!;
    const projectId = req.params.id;

    const [row] = await db
      .insert(schema.architectureDecisions)
      .values({ projectId, ...parsed.data })
      .returning();

    res.status(201).json(row);
  } catch (err) {
    console.error("Failed to save decision:", err);
    res.status(500).json({ error: "Failed to save decision" });
  }
});

app.put("/api/projects/:id/decisions/:decisionId", async (req, res) => {
  try {
    const parsed = DecisionInsert.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const db = DatabaseContext.getStore()!;
    const updates: Partial<typeof schema.architectureDecisions.$inferInsert> = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.context !== undefined) updates.context = parsed.data.context;
    if (parsed.data.decision !== undefined) updates.decision = parsed.data.decision;
    if (parsed.data.consequences !== undefined) updates.consequences = parsed.data.consequences;

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
  } catch (err) {
    console.error("Failed to update decision:", err);
    res.status(500).json({ error: "Failed to update decision" });
  }
});

// ── Architecture Diagrams ──────────────────────────────

registerReplaceResource(app, {
  path: "diagrams",
  bodyKey: "diagrams",
  itemSchema: DiagramInsert,
  table: schema.architectureDiagrams,
  projectIdColumn: schema.architectureDiagrams.projectId,
  filter: (d) => !!d.title && !!d.mermaidCode,
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
