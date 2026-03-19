/**
 * Tests for the declarative Tambo step configuration API.
 *
 * Covers:
 * - buildTamboConfig: correct tool names, component names, and non-empty prompt per step
 * - createPromptHelpers: toolExample validates against registered tool names
 * - Tool execute functions: parse JSON, filter invalid items, and call the correct api function
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @tambo-ai/react before any imports to prevent browser-only APIs
// (media-encoder-host / Worker) from loading in Node.js test environment.
vi.mock("@tambo-ai/react", () => ({
  defineTool: (def: Record<string, unknown>) => def,
  useTamboThreadInput: () => ({ setValue: vi.fn(), submit: vi.fn() }),
}));

// ── Mock the api module ─────────────────────────────────

vi.mock("../api", () => ({
  saveCharacteristics: vi.fn().mockResolvedValue(undefined),
  saveComponents: vi.fn().mockResolvedValue(undefined),
  saveStyles: vi.fn().mockResolvedValue(undefined),
  createDecision: vi.fn().mockResolvedValue({ id: "decision-1" }),
  saveDiagrams: vi.fn().mockResolvedValue(undefined),
  updateProject: vi.fn().mockResolvedValue(undefined),
  getProject: vi.fn().mockResolvedValue({
    id: "project-1",
    name: "Test",
    description: null,
    currentStep: 1,
    tamboThreadId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    characteristics: [],
    components: [],
    styles: [],
    decisions: [],
    diagrams: [],
  }),
}));

// ── buildTamboConfig ────────────────────────────────────

import { buildTamboConfig, createPromptHelpers } from "./index";
import * as api from "../api";

describe("buildTamboConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([1, 2, 3, 4, 5])("step %i returns a non-empty systemPrompt", (step) => {
    const config = buildTamboConfig("project-1", step);
    expect(config.systemPrompt.length).toBeGreaterThan(0);
    expect(config.systemPrompt).toContain("CURRENT STEP:");
  });

  it.each([1, 2, 3, 4, 5])(
    "step %i includes shared tools: advanceStep and getProjectData",
    (step) => {
      const config = buildTamboConfig("project-1", step);
      const toolNames = config.tools.map((t) => t.name);
      expect(toolNames).toContain("advanceStep");
      expect(toolNames).toContain("getProjectData");
    }
  );

  it.each([1, 2, 3, 4, 5])(
    "step %i includes shared components: StepProgress and MultipleChoiceQuestion",
    (step) => {
      const config = buildTamboConfig("project-1", step);
      const componentNames = config.components.map((c) => c.name);
      expect(componentNames).toContain("StepProgress");
      expect(componentNames).toContain("MultipleChoiceQuestion");
    }
  );

  it("step 1 includes saveCharacteristics tool and CharacteristicsWorksheet component", () => {
    const config = buildTamboConfig("project-1", 1);
    const toolNames = config.tools.map((t) => t.name);
    const componentNames = config.components.map((c) => c.name);
    expect(toolNames).toContain("saveCharacteristics");
    expect(componentNames).toContain("CharacteristicsWorksheet");
    expect(config.systemPrompt).toContain("Identify Architectural Characteristics");
  });

  it("step 2 includes saveLogicalComponents tool and LogicalComponentsMap component", () => {
    const config = buildTamboConfig("project-1", 2);
    const toolNames = config.tools.map((t) => t.name);
    const componentNames = config.components.map((c) => c.name);
    expect(toolNames).toContain("saveLogicalComponents");
    expect(componentNames).toContain("LogicalComponentsMap");
    expect(config.systemPrompt).toContain("Identify Logical Components");
  });

  it("step 3 includes saveArchitectureStyle tool and StyleComparisonChart component", () => {
    const config = buildTamboConfig("project-1", 3);
    const toolNames = config.tools.map((t) => t.name);
    const componentNames = config.components.map((c) => c.name);
    expect(toolNames).toContain("saveArchitectureStyle");
    expect(componentNames).toContain("StyleComparisonChart");
    expect(config.systemPrompt).toContain("Choose Architecture Style");
  });

  it("step 4 includes saveDecision tool and DecisionRecord component", () => {
    const config = buildTamboConfig("project-1", 4);
    const toolNames = config.tools.map((t) => t.name);
    const componentNames = config.components.map((c) => c.name);
    expect(toolNames).toContain("saveDecision");
    expect(componentNames).toContain("DecisionRecord");
    expect(config.systemPrompt).toContain("Document Architecture Decisions");
  });

  it("step 5 includes saveDiagram tool and ArchitectureDiagram component", () => {
    const config = buildTamboConfig("project-1", 5);
    const toolNames = config.tools.map((t) => t.name);
    const componentNames = config.components.map((c) => c.name);
    expect(toolNames).toContain("saveDiagram");
    expect(componentNames).toContain("ArchitectureDiagram");
    expect(config.systemPrompt).toContain("Diagram Architecture");
  });

  it("unknown step falls back to step 1", () => {
    const config = buildTamboConfig("project-1", 99);
    expect(config.systemPrompt).toContain("Identify Architectural Characteristics");
  });

  it("completed project (step 6) falls back to step 1", () => {
    const config = buildTamboConfig("project-1", 6);
    expect(config.systemPrompt).toContain("Identify Architectural Characteristics");
  });

  it("prompt includes the toolExample for the step-specific tool", () => {
    const config1 = buildTamboConfig("project-1", 1);
    expect(config1.systemPrompt).toContain("saveCharacteristics(");

    const config4 = buildTamboConfig("project-1", 4);
    expect(config4.systemPrompt).toContain("saveDecision(");
  });
});

// ── createPromptHelpers ─────────────────────────────────

describe("createPromptHelpers", () => {
  it("toolExample returns a formatted call string for a known tool", () => {
    const helpers = createPromptHelpers(new Set(["myTool"]), "base");
    const result = helpers.toolExample("myTool", { data: "test" });
    expect(result).toBe('myTool({"data":"test"})');
  });

  it("toolExample throws for an unknown tool name", () => {
    const helpers = createPromptHelpers(new Set(["knownTool"]), "base");
    expect(() => helpers.toolExample("unknownTool", {})).toThrow(
      'Prompt references unknown tool "unknownTool"'
    );
  });

  it("basePrompt is accessible on the helpers object", () => {
    const helpers = createPromptHelpers(new Set(), "MY BASE PROMPT");
    expect(helpers.basePrompt).toBe("MY BASE PROMPT");
  });
});

// ── Tool execute functions ──────────────────────────────

describe("saveCharacteristics tool execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls api.saveCharacteristics with valid JSON array input", async () => {
    const { step1 } = await import("./steps/step1-characteristics");
    const saveTool = step1.tools[0];
    const result = await saveTool.execute(
      { data: '[{"name":"Scalability","rating":4,"isTopThree":true}]' },
      "project-1"
    );
    expect(result).toEqual({ success: true, message: "Saved 1 characteristics successfully" });
    expect(api.saveCharacteristics).toHaveBeenCalledWith("project-1", [
      { name: "Scalability", rating: 4, description: undefined, isTopThree: true },
    ]);
  });

  it("filters items without a name field", async () => {
    const { step1 } = await import("./steps/step1-characteristics");
    const saveTool = step1.tools[0];
    const result = await saveTool.execute(
      { data: '[{"rating":3},{"name":"Security","rating":5}]' },
      "project-1"
    );
    expect(result).toEqual({ success: true, message: "Saved 1 characteristics successfully" });
    expect(api.saveCharacteristics).toHaveBeenCalledWith("project-1", [
      { name: "Security", rating: 5, description: undefined, isTopThree: false },
    ]);
  });

  it("returns an error when the JSON array is empty after filtering", async () => {
    const { step1 } = await import("./steps/step1-characteristics");
    const saveTool = step1.tools[0];
    const result = await saveTool.execute({ data: '[{"rating":3}]' }, "project-1");
    expect((result as { success: boolean }).success).toBe(false);
    expect(api.saveCharacteristics).not.toHaveBeenCalled();
  });

  it("returns an error when data is not a JSON array", async () => {
    const { step1 } = await import("./steps/step1-characteristics");
    const saveTool = step1.tools[0];
    const result = await saveTool.execute({ data: '{"name":"Scalability"}' }, "project-1");
    expect((result as { success: boolean }).success).toBe(false);
  });

  it("returns an error on invalid JSON", async () => {
    const { step1 } = await import("./steps/step1-characteristics");
    const saveTool = step1.tools[0];
    const result = await saveTool.execute({ data: "not-json" }, "project-1");
    expect((result as { success: boolean }).success).toBe(false);
  });
});

describe("saveLogicalComponents tool execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls api.saveComponents with valid input", async () => {
    const { step2 } = await import("./steps/step2-components");
    const saveTool = step2.tools[0];
    const result = await saveTool.execute(
      {
        data: '[{"name":"OrderService","responsibility":"Manages orders","namespace":"Core","dependencies":["PaymentService"]}]',
      },
      "project-1"
    );
    expect(result).toEqual({ success: true, message: "Saved 1 components successfully" });
    expect(api.saveComponents).toHaveBeenCalledWith("project-1", [
      {
        name: "OrderService",
        responsibility: "Manages orders",
        namespace: "Core",
        dependencies: ["PaymentService"],
      },
    ]);
  });
});

describe("saveArchitectureStyle tool execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls api.saveStyles with correct mapped format", async () => {
    const { step3 } = await import("./steps/step3-style");
    const saveTool = step3.tools[0];
    const result = await saveTool.execute(
      {
        data: '[{"name":"Microservices","ratings":[{"characteristic":"Scalability","rating":5}],"isSelected":true}]',
      },
      "project-1"
    );
    expect(result).toEqual({ success: true, message: "Saved 1 styles successfully" });
    expect(api.saveStyles).toHaveBeenCalledWith("project-1", [
      { styleName: "Microservices", starRatings: { Scalability: 5 }, isSelected: true },
    ]);
  });
});

describe("saveDecision tool execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls api.createDecision with structured ADR fields", async () => {
    const { step4 } = await import("./steps/step4-decisions");
    const saveTool = step4.tools[0];
    const result = await saveTool.execute(
      {
        title: "Use Microservices",
        status: "accepted",
        context: "Need independent scaling",
        decision: "Adopt microservices",
        consequences: "More complexity",
      },
      "project-1"
    );
    expect(result).toEqual({
      success: true,
      decisionId: "decision-1",
      message: "Decision saved successfully",
    });
    expect(api.createDecision).toHaveBeenCalledWith("project-1", {
      title: "Use Microservices",
      status: "accepted",
      context: "Need independent scaling",
      decision: "Adopt microservices",
      consequences: "More complexity",
    });
  });
});

describe("saveDiagram tool execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls api.saveDiagrams with valid diagram data", async () => {
    const { step5 } = await import("./steps/step5-diagrams");
    const saveTool = step5.tools[0];
    const result = await saveTool.execute(
      {
        data: '[{"title":"C4 Context","mermaidCode":"flowchart TB\\n  A --> B","diagramType":"context"}]',
      },
      "project-1"
    );
    expect(result).toEqual({ success: true, message: "Saved 1 diagrams successfully" });
    expect(api.saveDiagrams).toHaveBeenCalled();
  });

  it("rejects items with invalid diagramType", async () => {
    const { step5 } = await import("./steps/step5-diagrams");
    const saveTool = step5.tools[0];
    const result = await saveTool.execute(
      { data: '[{"title":"Bad","mermaidCode":"flowchart TB\\n  A","diagramType":"invalid"}]' },
      "project-1"
    );
    expect((result as { success: boolean }).success).toBe(false);
    expect(api.saveDiagrams).not.toHaveBeenCalled();
  });
});

describe("advanceStep tool execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls api.updateProject with the nextStep value", async () => {
    const { createSharedToolDecls } = await import("./shared");
    const onStepAdvanced = vi.fn();
    const [advanceTool] = createSharedToolDecls(onStepAdvanced);
    const result = await advanceTool.execute({ nextStep: 2 }, "project-1");
    expect(result).toEqual({ success: true, message: "Advanced to step 2" });
    expect(api.updateProject).toHaveBeenCalledWith("project-1", { currentStep: 2 });
    expect(onStepAdvanced).toHaveBeenCalledOnce();
  });

  it("reports project completion when nextStep is 6", async () => {
    const { createSharedToolDecls } = await import("./shared");
    const [advanceTool] = createSharedToolDecls();
    const result = await advanceTool.execute({ nextStep: 6 }, "project-1");
    expect(result).toEqual({ success: true, message: "Project completed! All steps finished." });
  });
});
