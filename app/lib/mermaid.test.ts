import { describe, it, expect } from "vitest";
import { sanitizeMermaidCode } from "./mermaid";

describe("sanitizeMermaidCode", () => {
  describe("passthrough", () => {
    it("returns valid flowchart code unchanged", () => {
      const code = "flowchart TD\n  A --> B";
      expect(sanitizeMermaidCode(code)).toBe(code);
    });

    it("returns empty string unchanged", () => {
      expect(sanitizeMermaidCode("")).toBe("");
    });

    it("trims leading and trailing whitespace", () => {
      expect(sanitizeMermaidCode("  flowchart TD\n  A --> B  ")).toBe("flowchart TD\n  A --> B");
    });
  });

  describe("graph → flowchart conversion", () => {
    it('converts "graph TD" to "flowchart TD"', () => {
      const input = "graph TD\n  A --> B";
      expect(sanitizeMermaidCode(input)).toBe("flowchart TD\n  A --> B");
    });

    it('converts "graph TB" to "flowchart TB"', () => {
      const input = "graph TB\n  A --> B";
      expect(sanitizeMermaidCode(input)).toBe("flowchart TB\n  A --> B");
    });

    it('converts "graph LR" to "flowchart LR"', () => {
      const input = "graph LR\n  A --> B";
      expect(sanitizeMermaidCode(input)).toBe("flowchart LR\n  A --> B");
    });

    it('converts "graph RL" to "flowchart RL"', () => {
      const input = "graph RL\n  A --> B";
      expect(sanitizeMermaidCode(input)).toBe("flowchart RL\n  A --> B");
    });

    it('converts "graph BT" to "flowchart BT"', () => {
      const input = "graph BT\n  A --> B";
      expect(sanitizeMermaidCode(input)).toBe("flowchart BT\n  A --> B");
    });
  });

  describe("trailing semicolons", () => {
    it("removes semicolons at end of lines", () => {
      const input = "flowchart TD;\n  A --> B;";
      expect(sanitizeMermaidCode(input)).toBe("flowchart TD\n  A --> B");
    });

    it("removes semicolons followed by whitespace", () => {
      const input = "flowchart TD\n  A --> B;   ";
      expect(sanitizeMermaidCode(input)).toBe("flowchart TD\n  A --> B");
    });
  });

  describe("parenthesis label fix", () => {
    it('converts A(Some Label) to A["Some Label"]', () => {
      const input = "flowchart TD\nA(Some Label)";
      expect(sanitizeMermaidCode(input)).toBe('flowchart TD\nA["Some Label"]');
    });

    it("preserves indentation when fixing parenthesis labels", () => {
      const input = "flowchart TD\n  A(My Node)";
      expect(sanitizeMermaidCode(input)).toBe('flowchart TD\n  A["My Node"]');
    });
  });

  describe("reserved keyword replacement", () => {
    it('prefixes "end" used as a node ID with "_"', () => {
      const input = "flowchart TD\n  end --> B";
      expect(sanitizeMermaidCode(input)).toBe("flowchart TD\n  _end --> B");
    });

    it('prefixes "default" used as a node ID with "_"', () => {
      const input = "flowchart TD\n  default --> B";
      expect(sanitizeMermaidCode(input)).toBe("flowchart TD\n  _default --> B");
    });

    it('prefixes "graph" used as a node ID with "_"', () => {
      const input = "flowchart TD\n  A --> graph";
      expect(sanitizeMermaidCode(input)).toBe("flowchart TD\n  A --> _graph");
    });

    it('does NOT prefix "end" on a standalone directive line', () => {
      const input = "flowchart TD\n  subgraph foo\n    A --> B\n  end";
      const result = sanitizeMermaidCode(input);
      expect(result).toContain("  end");
    });

    it('does NOT prefix "subgraph" directive keyword', () => {
      const input = "flowchart TD\n  subgraph myGroup\n    A --> B\n  end";
      const result = sanitizeMermaidCode(input);
      expect(result).toContain("  subgraph myGroup");
    });

    it('does NOT prefix "flowchart" directive keyword', () => {
      const input = "flowchart TD\n  A --> B";
      const result = sanitizeMermaidCode(input);
      expect(result.startsWith("flowchart TD")).toBe(true);
    });
  });

  describe("subgraph bracket fix", () => {
    it('converts subgraph id[["Label"]] to subgraph id["Label"]', () => {
      const input = 'flowchart TD\n  subgraph myGroup[["My Group"]]\n    A --> B\n  end';
      const result = sanitizeMermaidCode(input);
      expect(result).toContain('  subgraph myGroup["My Group"]');
    });

    it('converts subgraph id[[Label]] (unquoted) to subgraph id["Label"]', () => {
      const input = "flowchart TD\n  subgraph myGroup[[My Group]]\n    A --> B\n  end";
      const result = sanitizeMermaidCode(input);
      expect(result).toContain('  subgraph myGroup["My Group"]');
    });
  });

  describe("combined fixes", () => {
    it("applies multiple fixes to a single code block", () => {
      const input = "graph TD;\n  A(Start Node);\n  end --> B;";
      const result = sanitizeMermaidCode(input);
      expect(result).toContain("flowchart TD");
      expect(result).not.toContain(";");
      expect(result).toContain('A["Start Node"]');
      expect(result).toContain("_end --> B");
    });

    it("handles code with no issues at all", () => {
      const code = 'flowchart LR\n  A["Start"] --> B["End"]';
      expect(sanitizeMermaidCode(code)).toBe(code);
    });
  });
});
