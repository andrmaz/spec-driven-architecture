import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod/v4";

import { DatabaseContext } from "~/database/context";
import { CharacteristicInsert } from "~/database/entities";
import * as schema from "~/database/schema";
import { registerReplaceResource } from "./resource-route";

// ── Schema DDL for the in-memory test database ─────────
const DDL = `
  CREATE TYPE "decision_status" AS ENUM('proposed', 'accepted', 'deprecated', 'superseded');
  CREATE TYPE "diagram_type" AS ENUM('context', 'container', 'component', 'sequence', 'flowchart');

  CREATE TABLE "projects" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar(255) NOT NULL,
    "description" text,
    "current_step" integer DEFAULT 1 NOT NULL,
    "tambo_thread_id" varchar(255),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  );

  CREATE TABLE "architectural_characteristics" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "name" varchar(255) NOT NULL,
    "rating" integer DEFAULT 0 NOT NULL,
    "description" text,
    "is_top_three" boolean DEFAULT false NOT NULL
  );

  CREATE TABLE "logical_components" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "name" varchar(255) NOT NULL,
    "responsibility" text,
    "dependencies" text[],
    "namespace" varchar(255)
  );

  CREATE TABLE "architectural_styles" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "style_name" varchar(255) NOT NULL,
    "rationale" text,
    "star_ratings" jsonb,
    "is_selected" boolean DEFAULT false NOT NULL
  );

  CREATE TABLE "architecture_decisions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "title" varchar(500) NOT NULL,
    "status" "decision_status" DEFAULT 'proposed' NOT NULL,
    "context" text,
    "decision" text,
    "consequences" text,
    "created_at" timestamp DEFAULT now() NOT NULL
  );

  CREATE TABLE "architecture_diagrams" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "title" varchar(500) NOT NULL,
    "mermaid_code" text NOT NULL,
    "diagram_type" "diagram_type" NOT NULL
  );
`;

// ── Test helpers ────────────────────────────────────────

async function createTestDb() {
  const client = new PGlite();
  await client.waitReady;
  await client.exec(DDL);
  const db = drizzle(client, { schema });
  return { client, db };
}

function createTestApp(db: PgliteDatabase<typeof schema>) {
  const testApp = express();
  testApp.use("/api", express.json());
  // Inject the PGlite database into the async context used by route handlers
  testApp.use((_, __, next) => {
    DatabaseContext.run(db as unknown as PostgresJsDatabase<typeof schema>, next);
  });

  registerReplaceResource(testApp, {
    path: "characteristics",
    bodyKey: "characteristics",
    itemSchema: CharacteristicInsert,
    table: schema.architecturalCharacteristics,
    projectIdColumn: schema.architecturalCharacteristics.projectId,
    filter: (c) => !!c.name,
  });

  return testApp;
}

// ── Tests ───────────────────────────────────────────────

describe("registerReplaceResource", () => {
  let db: PgliteDatabase<typeof schema>;
  let projectId: string;
  let app: ReturnType<typeof createTestApp>;

  beforeEach(async () => {
    const setup = await createTestDb();
    db = setup.db;

    // Insert a project to satisfy FK constraints
    const [project] = await db.insert(schema.projects).values({ name: "Test Project" }).returning();
    projectId = project.id;

    app = createTestApp(db);
  });

  describe("valid payload", () => {
    it("returns 200 { ok: true } and persists rows", async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId}/characteristics`)
        .send({
          characteristics: [
            { name: "Scalability", rating: 4 },
            { name: "Availability", rating: 5 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });

      const rows = await db.query.architecturalCharacteristics.findMany({
        where: (t, { eq }) => eq(t.projectId, projectId),
      });
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.name).sort()).toEqual(["Availability", "Scalability"]);
    });

    it("replaces all existing rows on the second call", async () => {
      // First PUT
      await request(app)
        .put(`/api/projects/${projectId}/characteristics`)
        .send({ characteristics: [{ name: "Scalability", rating: 3 }] });

      // Second PUT with different data
      const res = await request(app)
        .put(`/api/projects/${projectId}/characteristics`)
        .send({ characteristics: [{ name: "Security", rating: 5 }] });

      expect(res.status).toBe(200);

      const rows = await db.query.architecturalCharacteristics.findMany({
        where: (t, { eq }) => eq(t.projectId, projectId),
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe("Security");
    });
  });

  describe("empty array", () => {
    it("deletes all existing rows when an empty array is sent", async () => {
      // Pre-populate rows
      await db.insert(schema.architecturalCharacteristics).values([
        { projectId, name: "Scalability", rating: 3 },
        { projectId, name: "Reliability", rating: 4 },
      ]);

      const res = await request(app)
        .put(`/api/projects/${projectId}/characteristics`)
        .send({ characteristics: [] });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });

      const rows = await db.query.architecturalCharacteristics.findMany({
        where: (t, { eq }) => eq(t.projectId, projectId),
      });
      expect(rows).toHaveLength(0);
    });
  });

  describe("invalid payload", () => {
    it("returns 400 when the body key is missing", async () => {
      const res = await request(app).put(`/api/projects/${projectId}/characteristics`).send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    it("returns 400 when an item fails schema validation", async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId}/characteristics`)
        .send({
          characteristics: [
            { name: "Scalability", rating: 99 }, // rating max is 5
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("filter predicate", () => {
    it("excludes items that do not pass the filter from insertion", async () => {
      // Use a custom looser schema (no min(1)) so that items with empty names pass
      // Zod validation but are still dropped by the filter predicate.
      const looseCharSchema = CharacteristicInsert.extend({ name: z.string() });

      const filteredApp = express();
      filteredApp.use("/api", express.json());
      filteredApp.use((_, __, next) => {
        DatabaseContext.run(db as unknown as PostgresJsDatabase<typeof schema>, next);
      });
      registerReplaceResource(filteredApp, {
        path: "characteristics",
        bodyKey: "characteristics",
        itemSchema: looseCharSchema,
        table: schema.architecturalCharacteristics,
        projectIdColumn: schema.architecturalCharacteristics.projectId,
        filter: (c) => !!c.name, // drops items with empty names
      });

      const res = await request(filteredApp)
        .put(`/api/projects/${projectId}/characteristics`)
        .send({
          characteristics: [
            { name: "Scalability", rating: 4 },
            { name: "", rating: 2 }, // passes schema validation but fails filter
          ],
        });

      expect(res.status).toBe(200);

      const rows = await db.query.architecturalCharacteristics.findMany({
        where: (t, { eq }) => eq(t.projectId, projectId),
      });
      // Only the item that passed the filter should be present
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe("Scalability");
    });
  });

  afterEach(async () => {
    // PGlite instances are in-memory — nothing to clean up between tests
    // since each beforeEach creates a fresh PGlite instance.
  });
});
