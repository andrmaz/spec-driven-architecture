/**
 * Step 5: Diagram Architecture
 *
 * Co-locates the system prompt, save tool, and UI component for Step 5.
 */

import { z } from "zod/v4";
import type { TamboComponent } from "@tambo-ai/react";

import { ArchitectureDiagram } from "../../../components/architecture/architecture-diagram";
import * as api from "../../api";
import type { StepConfig, ToolDecl } from "../types";

const saveDiagramTool: ToolDecl = {
  name: "saveDiagram",
  description:
    "Save architecture diagrams to the database. Pass the data as a JSON string. " +
    "IMPORTANT: Use 'flowchart TB' or 'flowchart LR' syntax only — never 'graph TD' or native C4 syntax.",
  inputSchema: z.object({
    data: z
      .string()
      .describe(
        'JSON string of an array of diagram objects. Each object must have: "title" (string), "mermaidCode" (string), "diagramType" (one of "context","container","component","sequence","flowchart").'
      ),
  }),
  execute: async (input, projectId) => {
    const { data } = input as { data: string };
    try {
      const parsed: unknown = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        return { success: false, message: "ERROR: data must be a JSON array string." };
      }
      const records = parsed.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === "object" && !Array.isArray(item)
      );
      const validTypes = new Set(["context", "container", "component", "sequence", "flowchart"]);
      const valid = records.filter(
        (d) =>
          typeof d.title === "string" &&
          d.title.length > 0 &&
          typeof d.mermaidCode === "string" &&
          d.mermaidCode.length > 0 &&
          typeof d.diagramType === "string" &&
          validTypes.has(d.diagramType)
      );
      if (valid.length === 0) {
        return {
          success: false,
          message:
            'ERROR: No items had required "title", "mermaidCode", and valid "diagramType" fields.',
        };
      }
      await api.saveDiagrams(projectId, valid as Parameters<typeof api.saveDiagrams>[1]);
      return { success: true, message: `Saved ${valid.length} diagrams successfully` };
    } catch (err) {
      return {
        success: false,
        message: `Failed: ${err instanceof Error ? err.message : String(err)}. Make sure "data" is a valid JSON array string.`,
      };
    }
  },
};

const architectureDiagramComponent: TamboComponent = {
  name: "ArchitectureDiagram",
  component: ArchitectureDiagram,
  description:
    "Renders a Mermaid.js architecture diagram with code toggle. " +
    "Use when generating diagrams in Step 5. Generate valid Mermaid syntax.",
  propsSchema: z.object({
    title: z.string().optional().describe("Title of the diagram"),
    mermaidCode: z
      .string()
      .optional()
      .describe("Valid Mermaid.js diagram code (flowchart, sequence, C4, etc.)"),
    diagramType: z
      .enum(["context", "container", "component", "sequence", "flowchart"])
      .optional()
      .describe("Type of architecture diagram"),
  }),
};

export const step5: StepConfig = {
  step: 5,

  prompt: ({ basePrompt, toolExample }) => `${basePrompt}

CURRENT STEP: Diagram Architecture (Step 5 of 5)

Your goal is to create architecture diagrams using Mermaid.js syntax.

Process:
1. Acknowledge the transition from Step 4 and briefly summarize what was accomplished
2. Load project data using getProjectData for full context
3. Use a MultipleChoiceQuestion to let the user choose which diagram types to generate (e.g., C4 Context, Component, Sequence, Deployment)
4. Generate at least 2 diagrams:
   - A C4 Context diagram showing the system boundary and external actors
   - A Component diagram showing the logical components and their interactions
5. Render each as an ArchitectureDiagram component
6. Call saveDiagram with all diagrams when satisfied
7. After saving, call advanceStep with nextStep: 6 to mark the project as complete
8. Then provide a comprehensive final summary of everything accomplished across all 5 steps:
   - The key characteristics identified
   - The logical components mapped
   - The architecture style chosen and why
   - The decisions documented
   - The diagrams created
   Congratulate the user and let them know they can export their architecture documentation from the export page.

CRITICAL: The save tools accept a SINGLE "data" parameter which is a JSON string (not an object array). You must stringify the array yourself.
Example: ${toolExample("saveDiagram", {
    data: '[{"title":"C4 Context Diagram","mermaidCode":"flowchart TB\\n  user[\\"User\\"]\\n  system[[\\"My System\\"]]\\n  user -->|uses| system","diagramType":"context"},{"title":"Component Diagram","mermaidCode":"flowchart LR\\n  A[\\"Service A\\"] --> B[\\"Service B\\"]","diagramType":"component"}]',
  })}
Do NOT pass an empty string or empty array. Each object in the JSON array MUST have "title", "mermaidCode", and "diagramType" fields.
Valid diagramType values: "context", "container", "component", "sequence", "flowchart".

MERMAID SYNTAX RULES — follow these strictly:
- Always use "flowchart TB" or "flowchart LR" (NEVER "graph TD", NEVER native C4 syntax like C4Context/Person/System).
- Use double-quoted labels for node text: A["Label"] for rectangles, B[["Label"]] for subroutines/systems.
- NEVER use [["..."]] with subgraph. Subgraphs ONLY support ["Label"]: subgraph id["My Label"]. Using [["..."]] causes a parse error.
- Use classDef + class for styling (colors, strokes). Example:
    classDef person fill:#FFE6CC,stroke:#C77700,color:#111;
    classDef sys fill:#E6F2FF,stroke:#1B6CA8,color:#111;
    classDef ext fill:#F2F2F2,stroke:#666,color:#111;
    class userNode person;
    class systemNode sys;
- Use edge labels with |"text"| syntax: A -->|"calls"| B
- Newlines inside labels use \\n: A["Line1\\nLine2"]
- Do NOT use parentheses () in node IDs. Keep IDs short alphanumeric strings.
- Do NOT use Mermaid reserved words as node IDs: graph, end, subgraph, default, click, style, linkStyle, classDef, class, direction. Prefix them instead (e.g. use "socialGraph" not "graph", "frontEnd" not "end").
- Do NOT use special characters like < > & in labels without quoting them.
- For sequence diagrams use: sequenceDiagram\\n  participant A\\n  A->>B: message

EXAMPLE of a correct C4-style context diagram:
flowchart TB
  customer["Customer"]
  admin["Admin"]
  system[["My System\\n(Architecture Style)"]]
  extApi["External API"]
  customer -->|"uses"| system
  admin -->|"manages"| system
  system -->|"calls"| extApi
  classDef person fill:#FFE6CC,stroke:#C77700,color:#111;
  classDef sys fill:#E6F2FF,stroke:#1B6CA8,color:#111;
  classDef ext fill:#F2F2F2,stroke:#666,color:#111;
  class customer,admin person;
  class system sys;
  class extApi ext;`,

  tools: [saveDiagramTool],
  components: [architectureDiagramComponent],
};
