import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────

export const decisionStatusEnum = pgEnum("decision_status", [
  "proposed",
  "accepted",
  "deprecated",
  "superseded",
]);

export const diagramTypeEnum = pgEnum("diagram_type", [
  "context",
  "container",
  "component",
  "sequence",
  "flowchart",
]);

// ── Projects ───────────────────────────────────────────

export const projects = pgTable("projects", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  currentStep: integer("current_step").notNull().default(1),
  tamboThreadId: varchar("tambo_thread_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectsRelations = relations(projects, ({ many }) => ({
  characteristics: many(architecturalCharacteristics),
  components: many(logicalComponents),
  styles: many(architecturalStyles),
  decisions: many(architectureDecisions),
  diagrams: many(architectureDiagrams),
}));

// ── Architectural Characteristics ──────────────────────

export const architecturalCharacteristics = pgTable("architectural_characteristics", {
  id: uuid().defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar({ length: 255 }).notNull(),
  rating: integer().notNull().default(0),
  description: text(),
  isTopThree: boolean("is_top_three").notNull().default(false),
});

export const characteristicsRelations = relations(architecturalCharacteristics, ({ one }) => ({
  project: one(projects, {
    fields: [architecturalCharacteristics.projectId],
    references: [projects.id],
  }),
}));

// ── Logical Components ─────────────────────────────────

export const logicalComponents = pgTable("logical_components", {
  id: uuid().defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar({ length: 255 }).notNull(),
  responsibility: text(),
  dependencies: text("dependencies").array(),
  namespace: varchar({ length: 255 }),
});

export const componentsRelations = relations(logicalComponents, ({ one }) => ({
  project: one(projects, {
    fields: [logicalComponents.projectId],
    references: [projects.id],
  }),
}));

// ── Architectural Styles ───────────────────────────────

export const architecturalStyles = pgTable("architectural_styles", {
  id: uuid().defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  styleName: varchar("style_name", { length: 255 }).notNull(),
  rationale: text(),
  starRatings: jsonb("star_ratings").$type<Record<string, number>>(),
  isSelected: boolean("is_selected").notNull().default(false),
});

export const stylesRelations = relations(architecturalStyles, ({ one }) => ({
  project: one(projects, {
    fields: [architecturalStyles.projectId],
    references: [projects.id],
  }),
}));

// ── Architecture Decisions (ADRs) ──────────────────────

export const architectureDecisions = pgTable("architecture_decisions", {
  id: uuid().defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: varchar({ length: 500 }).notNull(),
  status: decisionStatusEnum().notNull().default("proposed"),
  context: text(),
  decision: text(),
  consequences: text(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const decisionsRelations = relations(architectureDecisions, ({ one }) => ({
  project: one(projects, {
    fields: [architectureDecisions.projectId],
    references: [projects.id],
  }),
}));

// ── Architecture Diagrams ──────────────────────────────

export const architectureDiagrams = pgTable("architecture_diagrams", {
  id: uuid().defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: varchar({ length: 500 }).notNull(),
  mermaidCode: text("mermaid_code").notNull(),
  diagramType: diagramTypeEnum("diagram_type").notNull(),
});

export const diagramsRelations = relations(architectureDiagrams, ({ one }) => ({
  project: one(projects, {
    fields: [architectureDiagrams.projectId],
    references: [projects.id],
  }),
}));
