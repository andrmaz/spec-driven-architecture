import { createRequestHandler } from "@react-router/express";
import { and, eq } from "drizzle-orm";
import type { PgTable, TableConfig } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import express from "express";
import postgres from "postgres";
import { z } from "zod/v4";
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
Object.assign(db, { $client: client });
app.use((_, __, next) => DatabaseContext.run(db, next));

// ── JSON body parsing for API routes ───────────────────
app.use("/api", express.json());

// ── Helpers ────────────────────────────────────────────

type DrizzleDb = PostgresJsDatabase<typeof schema>;

/**
 * Generic delete-all-then-insert transaction for child rows.
 * Eliminates repeated transactional boilerplate across 4 endpoints.
 */
async function replaceChildRows<T extends PgTable<TableConfig>>(
  db: DrizzleDb,
  table: T,
  projectIdColumn: Parameters<typeof eq>[0],
  projectId: string,
  rows: Record<string, unknown>[]
) {
  await db.transaction(async (tx) => {
    await tx.delete(table).where(eq(projectIdColumn as never, projectId));
    if (rows.length > 0) {
      await tx.insert(table).values(rows.map((r) => ({ ...r, projectId })) as never);
    }
  });
}

// ── Validation Schemas ─────────────────────────────────

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  currentStep: z.number().int().min(1).max(5).optional(),
  tamboThreadId: z.string().max(255).optional(),
});

const CharacteristicSchema = z.object({
  name: z.string().min(1).max(255),
  rating: z.number().int().min(0).max(5),
  description: z.string().optional(),
  isTopThree: z.boolean().default(false),
});

const ComponentSchema = z.object({
  name: z.string().min(1).max(255),
  responsibility: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  namespace: z.string().max(255).optional(),
});

const StyleSchema = z.object({
  styleName: z.string().min(1).max(255),
  rationale: z.string().optional(),
  starRatings: z.record(z.string(), z.number()).optional(),
  isSelected: z.boolean().default(false),
});

const DecisionSchema = z.object({
  title: z.string().min(1).max(500),
  status: z.enum(["proposed", "accepted", "deprecated", "superseded"]).optional(),
  context: z.string().optional(),
  decision: z.string().optional(),
  consequences: z.string().optional(),
});

const DiagramSchema = z.object({
  title: z.string().min(1).max(500),
  mermaidCode: z.string().min(1),
  diagramType: z.enum(["context", "container", "component", "sequence", "flowchart"]),
});

// ── Projects CRUD ──────────────────────────────────────

app.get("/api/projects", async (_req, res) => {
  const db = DatabaseContext.getStore()!;
  const rows = await db.query.projects.findMany({
    orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
  });
  res.json(rows);
});

app.post("/api/projects", async (req, res) => {
  const parsed = CreateProjectSchema.safeParse(req.body);
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
  const parsed = UpdateProjectSchema.safeParse(req.body);
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

app.put("/api/projects/:id/characteristics", async (req, res) => {
  try {
    const parsed = z.object({ characteristics: z.array(CharacteristicSchema) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const db = DatabaseContext.getStore()!;
    const projectId = req.params.id;
    const valid = parsed.data.characteristics.filter((c) => c.name);

    await replaceChildRows(
      db,
      schema.architecturalCharacteristics,
      schema.architecturalCharacteristics.projectId,
      projectId,
      valid
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to save characteristics:", err);
    res.status(500).json({ error: "Failed to save characteristics" });
  }
});

// ── Logical Components ─────────────────────────────────

app.put("/api/projects/:id/components", async (req, res) => {
  try {
    const parsed = z.object({ components: z.array(ComponentSchema) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const db = DatabaseContext.getStore()!;
    const projectId = req.params.id;
    const valid = parsed.data.components.filter((c) => c.name);

    await replaceChildRows(
      db,
      schema.logicalComponents,
      schema.logicalComponents.projectId,
      projectId,
      valid
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to save components:", err);
    res.status(500).json({ error: "Failed to save components" });
  }
});

// ── Architectural Styles ───────────────────────────────

app.put("/api/projects/:id/styles", async (req, res) => {
  try {
    const parsed = z.object({ styles: z.array(StyleSchema) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const db = DatabaseContext.getStore()!;
    const projectId = req.params.id;
    const valid = parsed.data.styles.filter((s) => s.styleName);

    await replaceChildRows(
      db,
      schema.architecturalStyles,
      schema.architecturalStyles.projectId,
      projectId,
      valid
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to save styles:", err);
    res.status(500).json({ error: "Failed to save styles" });
  }
});

// ── Architecture Decisions ─────────────────────────────

app.post("/api/projects/:id/decisions", async (req, res) => {
  try {
    const parsed = DecisionSchema.safeParse(req.body);
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
    const parsed = DecisionSchema.partial().safeParse(req.body);
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

app.put("/api/projects/:id/diagrams", async (req, res) => {
  try {
    const parsed = z.object({ diagrams: z.array(DiagramSchema) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const db = DatabaseContext.getStore()!;
    const projectId = req.params.id;
    const valid = parsed.data.diagrams.filter((d) => d.title && d.mermaidCode);

    await replaceChildRows(
      db,
      schema.architectureDiagrams,
      schema.architectureDiagrams.projectId,
      projectId,
      valid
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to save diagrams:", err);
    res.status(500).json({ error: "Failed to save diagrams" });
  }
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
