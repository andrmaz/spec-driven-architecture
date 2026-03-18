/**
 * Tests for database/entities.ts — the single source of truth for domain types.
 * Validates insert schemas, Tambo schema behavior, and the style shape mapping.
 * No database connection required; all tests operate on Zod schemas in-process.
 */

import { createSelectSchema } from "drizzle-zod";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

import {
  CharacteristicInsert,
  ComponentInsert,
  DecisionInsert,
  DiagramInsert,
  ProjectCreate,
  ProjectUpdate,
  StyleInsert,
  TamboCharacteristic,
  TamboComponent,
  TamboDecision,
  TamboDiagram,
  TamboStyle,
  TamboStyleRating,
  tamboStyleToDb,
} from "./entities";
import * as schema from "./schema";

// ── ProjectCreate ───────────────────────────────────────

describe("ProjectCreate", () => {
  it("accepts a valid payload", () => {
    expect(ProjectCreate.safeParse({ name: "My App", description: "A project" }).success).toBe(
      true
    );
  });

  it("accepts a payload without description", () => {
    expect(ProjectCreate.safeParse({ name: "My App" }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(ProjectCreate.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a name longer than 255 chars", () => {
    expect(ProjectCreate.safeParse({ name: "a".repeat(256) }).success).toBe(false);
  });

  it("does not include id, createdAt, or updatedAt", () => {
    const keys = Object.keys(ProjectCreate.shape);
    expect(keys).not.toContain("id");
    expect(keys).not.toContain("createdAt");
    expect(keys).not.toContain("updatedAt");
  });
});

// ── ProjectUpdate ───────────────────────────────────────

describe("ProjectUpdate", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(ProjectUpdate.safeParse({}).success).toBe(true);
  });

  it("accepts a partial update", () => {
    expect(ProjectUpdate.safeParse({ name: "New Name" }).success).toBe(true);
    expect(ProjectUpdate.safeParse({ currentStep: 3 }).success).toBe(true);
  });

  it("rejects currentStep outside 1-6", () => {
    expect(ProjectUpdate.safeParse({ currentStep: 0 }).success).toBe(false);
    expect(ProjectUpdate.safeParse({ currentStep: 7 }).success).toBe(false);
  });

  it("accepts currentStep at boundaries 1 and 6", () => {
    expect(ProjectUpdate.safeParse({ currentStep: 1 }).success).toBe(true);
    expect(ProjectUpdate.safeParse({ currentStep: 6 }).success).toBe(true);
  });
});

// ── CharacteristicInsert ────────────────────────────────

describe("CharacteristicInsert", () => {
  it("accepts a valid characteristic", () => {
    expect(
      CharacteristicInsert.safeParse({ name: "Scalability", rating: 4 }).success
    ).toBe(true);
  });

  it("accepts optional fields", () => {
    expect(
      CharacteristicInsert.safeParse({
        name: "Scalability",
        rating: 4,
        description: "Must handle 10k users",
        isTopThree: true,
      }).success
    ).toBe(true);
  });

  it("rejects a missing name", () => {
    expect(CharacteristicInsert.safeParse({ rating: 3 }).success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(CharacteristicInsert.safeParse({ name: "", rating: 3 }).success).toBe(false);
  });

  it("rejects a rating above 5", () => {
    expect(CharacteristicInsert.safeParse({ name: "Scalability", rating: 6 }).success).toBe(false);
  });

  it("rejects a rating below 0", () => {
    expect(CharacteristicInsert.safeParse({ name: "Scalability", rating: -1 }).success).toBe(
      false
    );
  });

  it("does not include id or projectId", () => {
    const keys = Object.keys(CharacteristicInsert.shape);
    expect(keys).not.toContain("id");
    expect(keys).not.toContain("projectId");
  });
});

// ── ComponentInsert ─────────────────────────────────────

describe("ComponentInsert", () => {
  it("accepts a minimal valid component", () => {
    expect(ComponentInsert.safeParse({ name: "OrderService" }).success).toBe(true);
  });

  it("accepts all optional fields", () => {
    expect(
      ComponentInsert.safeParse({
        name: "OrderService",
        responsibility: "Manages orders",
        namespace: "Core",
        dependencies: ["UserService", "PaymentService"],
      }).success
    ).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(ComponentInsert.safeParse({ name: "" }).success).toBe(false);
  });

  it("does not include id or projectId", () => {
    const keys = Object.keys(ComponentInsert.shape);
    expect(keys).not.toContain("id");
    expect(keys).not.toContain("projectId");
  });
});

// ── StyleInsert ─────────────────────────────────────────

describe("StyleInsert", () => {
  it("accepts a valid style", () => {
    expect(StyleInsert.safeParse({ styleName: "Microservices", isSelected: false }).success).toBe(
      true
    );
  });

  it("rejects an empty styleName", () => {
    expect(StyleInsert.safeParse({ styleName: "", isSelected: false }).success).toBe(false);
  });

  it("does not include id or projectId", () => {
    const keys = Object.keys(StyleInsert.shape);
    expect(keys).not.toContain("id");
    expect(keys).not.toContain("projectId");
  });
});

// ── DecisionInsert ──────────────────────────────────────

describe("DecisionInsert", () => {
  it("accepts a minimal decision", () => {
    expect(DecisionInsert.safeParse({ title: "Use PostgreSQL" }).success).toBe(true);
  });

  it("accepts a full decision", () => {
    expect(
      DecisionInsert.safeParse({
        title: "Use PostgreSQL",
        status: "accepted",
        context: "We need a relational DB",
        decision: "We chose PostgreSQL",
        consequences: "ACID compliance, good tooling",
      }).success
    ).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(DecisionInsert.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects an invalid status", () => {
    expect(DecisionInsert.safeParse({ title: "Use PostgreSQL", status: "unknown" }).success).toBe(
      false
    );
  });

  it("does not include id, projectId, or createdAt", () => {
    const keys = Object.keys(DecisionInsert.shape);
    expect(keys).not.toContain("id");
    expect(keys).not.toContain("projectId");
    expect(keys).not.toContain("createdAt");
  });
});

// ── DiagramInsert ───────────────────────────────────────

describe("DiagramInsert", () => {
  it("accepts a valid diagram", () => {
    expect(
      DiagramInsert.safeParse({
        title: "Context Diagram",
        mermaidCode: "flowchart TB\n  A --> B",
        diagramType: "context",
      }).success
    ).toBe(true);
  });

  it("rejects an empty mermaidCode", () => {
    expect(
      DiagramInsert.safeParse({ title: "Context", mermaidCode: "", diagramType: "context" }).success
    ).toBe(false);
  });

  it("rejects an invalid diagramType", () => {
    expect(
      DiagramInsert.safeParse({
        title: "Context",
        mermaidCode: "flowchart TB\n A-->B",
        diagramType: "invalid",
      }).success
    ).toBe(false);
  });

  it("does not include id or projectId", () => {
    const keys = Object.keys(DiagramInsert.shape);
    expect(keys).not.toContain("id");
    expect(keys).not.toContain("projectId");
  });
});

// ── Tambo AI schemas ────────────────────────────────────

describe("TamboCharacteristic", () => {
  it("preserves parse behavior from CharacteristicInsert", () => {
    const valid = { name: "Scalability", rating: 4 };
    expect(TamboCharacteristic.safeParse(valid).success).toBe(true);
    expect(TamboCharacteristic.safeParse({ rating: 3 }).success).toBe(false);
  });

  it("adds description metadata to fields", () => {
    expect((TamboCharacteristic.shape.name as z.ZodString).description).toBeTruthy();
    expect((TamboCharacteristic.shape.rating as z.ZodNumber).description).toBeTruthy();
  });
});

describe("TamboComponent", () => {
  it("preserves parse behavior from ComponentInsert", () => {
    expect(TamboComponent.safeParse({ name: "AuthModule" }).success).toBe(true);
    expect(TamboComponent.safeParse({ name: "" }).success).toBe(false);
  });

  it("adds description metadata to fields", () => {
    expect((TamboComponent.shape.name as z.ZodString).description).toBeTruthy();
  });
});

describe("TamboDecision", () => {
  it("preserves parse behavior from DecisionInsert", () => {
    expect(TamboDecision.safeParse({ title: "Use Redis" }).success).toBe(true);
    expect(TamboDecision.safeParse({ title: "" }).success).toBe(false);
  });
});

describe("TamboDiagram", () => {
  it("preserves parse behavior from DiagramInsert", () => {
    expect(
      TamboDiagram.safeParse({
        title: "System Context",
        mermaidCode: "flowchart TB\n  A-->B",
        diagramType: "context",
      }).success
    ).toBe(true);
    expect(
      TamboDiagram.safeParse({ title: "", mermaidCode: "flowchart TB", diagramType: "context" })
        .success
    ).toBe(false);
  });
});

// ── TamboStyle and tamboStyleToDb ───────────────────────

describe("TamboStyleRating", () => {
  it("accepts a valid rating", () => {
    expect(
      TamboStyleRating.safeParse({ characteristic: "Scalability", rating: 4 }).success
    ).toBe(true);
  });

  it("rejects a rating outside 1-5", () => {
    expect(
      TamboStyleRating.safeParse({ characteristic: "Scalability", rating: 0 }).success
    ).toBe(false);
    expect(
      TamboStyleRating.safeParse({ characteristic: "Scalability", rating: 6 }).success
    ).toBe(false);
  });
});

describe("TamboStyle", () => {
  it("accepts a style without ratings", () => {
    expect(TamboStyle.safeParse({ name: "Microservices" }).success).toBe(true);
  });

  it("accepts a style with ratings", () => {
    expect(
      TamboStyle.safeParse({
        name: "Microservices",
        ratings: [{ characteristic: "Scalability", rating: 5 }],
      }).success
    ).toBe(true);
  });

  it("rejects a missing name", () => {
    expect(TamboStyle.safeParse({}).success).toBe(false);
  });
});

describe("tamboStyleToDb", () => {
  it("maps name to styleName", () => {
    const result = tamboStyleToDb({ name: "Microservices" });
    expect(result.styleName).toBe("Microservices");
  });

  it("converts ratings array to starRatings record", () => {
    const result = tamboStyleToDb({
      name: "Microservices",
      ratings: [
        { characteristic: "Scalability", rating: 5 },
        { characteristic: "Simplicity", rating: 2 },
      ],
    });
    expect(result.starRatings).toEqual({ Scalability: 5, Simplicity: 2 });
  });

  it("produces an empty starRatings record when ratings is omitted", () => {
    const result = tamboStyleToDb({ name: "Layered" });
    expect(result.starRatings).toEqual({});
  });

  it("sets isSelected to false by default", () => {
    const result = tamboStyleToDb({ name: "Event-Driven" });
    expect(result.isSelected).toBe(false);
  });

  it("produces output valid against StyleInsert schema", () => {
    const tamboInput = {
      name: "Microservices",
      ratings: [{ characteristic: "Scalability", rating: 4 }],
    };
    const dbShape = tamboStyleToDb(tamboInput);
    expect(StyleInsert.safeParse(dbShape).success).toBe(true);
  });
});

// ── Schema agreement: select types match Drizzle schema ─

describe("Schema agreement — createSelectSchema vs $inferSelect", () => {
  it("projects select schema accepts a valid row", () => {
    const projectSelectSchema = createSelectSchema(schema.projects);
    const fakeRow = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Test Project",
      description: null,
      currentStep: 1,
      tamboThreadId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(projectSelectSchema.safeParse(fakeRow).success).toBe(true);
  });

  it("architecturalCharacteristics select schema accepts a valid row", () => {
    const charSelectSchema = createSelectSchema(schema.architecturalCharacteristics);
    const fakeRow = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Scalability",
      rating: 4,
      description: "Must scale",
      isTopThree: true,
    };
    expect(charSelectSchema.safeParse(fakeRow).success).toBe(true);
  });

  it("logicalComponents select schema accepts a valid row", () => {
    const compSelectSchema = createSelectSchema(schema.logicalComponents);
    const fakeRow = {
      id: "550e8400-e29b-41d4-a716-446655440002",
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      name: "OrderService",
      responsibility: "Handles orders",
      dependencies: ["UserService"],
      namespace: "Core",
    };
    expect(compSelectSchema.safeParse(fakeRow).success).toBe(true);
  });

  it("architecturalStyles select schema accepts a valid row", () => {
    const styleSelectSchema = createSelectSchema(schema.architecturalStyles, {
      starRatings: z.record(z.string(), z.number()).optional().nullable(),
    });
    const fakeRow = {
      id: "550e8400-e29b-41d4-a716-446655440003",
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      styleName: "Microservices",
      rationale: "Best for scale",
      starRatings: { Scalability: 5 },
      isSelected: true,
    };
    expect(styleSelectSchema.safeParse(fakeRow).success).toBe(true);
  });

  it("architectureDecisions select schema accepts a valid row", () => {
    const decisionSelectSchema = createSelectSchema(schema.architectureDecisions);
    const fakeRow = {
      id: "550e8400-e29b-41d4-a716-446655440004",
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Use PostgreSQL",
      status: "accepted" as const,
      context: "We need ACID",
      decision: "Use PostgreSQL",
      consequences: "Good tooling",
      createdAt: new Date(),
    };
    expect(decisionSelectSchema.safeParse(fakeRow).success).toBe(true);
  });

  it("architectureDiagrams select schema accepts a valid row", () => {
    const diagramSelectSchema = createSelectSchema(schema.architectureDiagrams);
    const fakeRow = {
      id: "550e8400-e29b-41d4-a716-446655440005",
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      title: "Context Diagram",
      mermaidCode: "flowchart TB\n  A-->B",
      diagramType: "context" as const,
    };
    expect(diagramSelectSchema.safeParse(fakeRow).success).toBe(true);
  });
});

// ── withDescriptions utility ────────────────────────────

describe("withDescriptions (via TamboCharacteristic)", () => {
  it("produces the same parse result as the base schema for valid data", () => {
    const data = { name: "Availability", rating: 5, isTopThree: true };
    const baseResult = CharacteristicInsert.safeParse(data);
    const tamboResult = TamboCharacteristic.safeParse(data);
    expect(tamboResult.success).toBe(baseResult.success);
    if (tamboResult.success && baseResult.success) {
      expect(tamboResult.data).toEqual(baseResult.data);
    }
  });

  it("produces the same rejection as the base schema for invalid data", () => {
    const data = { name: "", rating: 10 };
    const baseResult = CharacteristicInsert.safeParse(data);
    const tamboResult = TamboCharacteristic.safeParse(data);
    expect(tamboResult.success).toBe(baseResult.success);
    expect(tamboResult.success).toBe(false);
  });

  it("adds .describe() metadata without changing field names", () => {
    const tamboKeys = Object.keys(TamboCharacteristic.shape);
    const baseKeys = Object.keys(CharacteristicInsert.shape);
    expect(tamboKeys.sort()).toEqual(baseKeys.sort());
  });
});

// ── Type compatibility: $inferSelect matches expected shapes ─

describe("$inferSelect type compatibility", () => {
  it("projects $inferSelect matches expected shape", () => {
    type ProjectRow = typeof schema.projects.$inferSelect;
    const check = (row: ProjectRow) => {
      const id: string = row.id;
      const name: string = row.name;
      const step: number = row.currentStep;
      expect(typeof id).toBe("string");
      expect(typeof name).toBe("string");
      expect(typeof step).toBe("number");
    };
    expect(typeof check).toBe("function");
  });

  it("architecturalStyles $inferSelect has styleName and starRatings", () => {
    type StyleRow = typeof schema.architecturalStyles.$inferSelect;
    const check = (row: StyleRow) => {
      const name: string = row.styleName;
      const ratings: Record<string, number> | null | undefined = row.starRatings;
      expect(typeof name).toBe("string");
      expect(ratings === null || ratings === undefined || typeof ratings === "object").toBe(true);
    };
    expect(typeof check).toBe("function");
  });
});

// ── z import validation ─────────────────────────────────

describe("zod v4 compatibility", () => {
  it("z.object() creates a valid schema", () => {
    const s = z.object({ foo: z.string() });
    expect(s.safeParse({ foo: "bar" }).success).toBe(true);
  });
});
