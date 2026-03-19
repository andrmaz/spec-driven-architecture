/**
 * Sanitize AI-generated Mermaid code to fix common syntax issues.
 * Handles: deprecated graph syntax, trailing semicolons, unquoted labels,
 * reserved keyword node IDs, and subgraph bracket syntax.
 */
export function sanitizeMermaidCode(code: string): string {
  let sanitized = code.trim();

  // Replace deprecated "graph TD/TB/LR/RL" with "flowchart" equivalent
  sanitized = sanitized.replace(/^graph\s+(TD|TB|LR|RL|BT)\b/m, (_, dir) => `flowchart ${dir}`);

  // Remove semicolons at end of lines (valid in old syntax, can confuse new parser)
  sanitized = sanitized.replace(/;\s*$/gm, "");

  // Fix unquoted labels that contain parentheses — wrap in double quotes
  // e.g. A(Some Label) → A["Some Label"]
  sanitized = sanitized.replace(
    /^(\s*\w+)\(([^)]*)\)\s*$/gm,
    (_, id, label) => `${id}["${label}"]`
  );

  // Rename reserved Mermaid keywords used as node IDs.
  // Words like "graph", "end", "subgraph", "default", "click", "style", "linkStyle",
  // "classDef", "class", "direction" cause parse errors when used as identifiers.
  sanitized = sanitized
    .split("\n")
    .map((line) => {
      // Skip directive lines (flowchart, classDef, class, style, etc.)
      const trimmed = line.trimStart();
      if (
        /^(flowchart|graph|sequenceDiagram|classDef|class |style |linkStyle|click |subgraph |end$|direction)/i.test(
          trimmed
        )
      ) {
        return line;
      }
      // In definition and edge lines, replace reserved-word IDs with a safe prefix
      return line.replace(
        /(?<=^|[\s,>|&])(?:graph|end|subgraph|default|click|style|linkStyle|classDef|class|direction)(?=[\s"[({|>-]|$)/gi,
        (match) => `_${match}`
      );
    })
    .join("\n");

  // Fix subgraph with subroutine brackets [["..."]] → ["..."]
  // Mermaid subgraphs only support ["Label"], not [["Label"]]
  sanitized = sanitized.replace(
    /^(\s*subgraph\s+\w+)\[\["([^"]*)"]\]/gm,
    (_, prefix, label) => `${prefix}["${label}"]`
  );
  // Also handle the unquoted variant: subgraph id[[Label]] → subgraph id["Label"]
  sanitized = sanitized.replace(
    /^(\s*subgraph\s+\w+)\[\[([^\]]*)]\]/gm,
    (_, prefix, label) => `${prefix}["${label}"]`
  );

  return sanitized;
}
