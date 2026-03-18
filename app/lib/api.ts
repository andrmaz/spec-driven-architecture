/**
 * Client-side API layer for communicating with Express API endpoints.
 * Used by clientLoaders, Tambo tools, and UI components.
 */

// ── Types ──────────────────────────────────────────────

import type {
  ArchitectureDecision,
  Project,
  ProjectWithRelations,
} from "~/database/entities";

export type {
  Project,
  Characteristic,
  LogicalComponent,
  ArchitecturalStyle,
  ArchitectureDecision,
  ArchitectureDiagram,
  ProjectWithRelations,
} from "~/database/entities";

// ── Helpers ────────────────────────────────────────────

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Projects ───────────────────────────────────────────

export function listProjects() {
  return fetchJson<Project[]>("/api/projects");
}

export function createProject(data: { name: string; description?: string }) {
  return fetchJson<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getProject(id: string) {
  return fetchJson<ProjectWithRelations>(`/api/projects/${id}`);
}

export async function updateProject(
  id: string,
  data: Partial<Pick<Project, "name" | "description" | "currentStep" | "tamboThreadId">>
) {
  const result = await fetchJson<Project>(`/api/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  // Notify listeners (e.g. project route) of project changes
  window.dispatchEvent(new CustomEvent("project-updated", { detail: { projectId: id, ...data } }));
  return result;
}

export function deleteProject(id: string) {
  return fetchJson<{ ok: boolean }>(`/api/projects/${id}`, {
    method: "DELETE",
  });
}

// ── Characteristics ────────────────────────────────────

export function saveCharacteristics(
  projectId: string,
  characteristics: {
    name: string;
    rating: number;
    description?: string;
    isTopThree: boolean;
  }[]
) {
  return fetchJson<{ ok: boolean }>(`/api/projects/${projectId}/characteristics`, {
    method: "PUT",
    body: JSON.stringify({ characteristics }),
  });
}

// ── Logical Components ─────────────────────────────────

export function saveComponents(
  projectId: string,
  components: {
    name: string;
    responsibility?: string;
    dependencies?: string[];
    namespace?: string;
  }[]
) {
  return fetchJson<{ ok: boolean }>(`/api/projects/${projectId}/components`, {
    method: "PUT",
    body: JSON.stringify({ components }),
  });
}

// ── Architectural Styles ───────────────────────────────

export function saveStyles(
  projectId: string,
  styles: {
    styleName: string;
    rationale?: string;
    starRatings?: Record<string, number>;
    isSelected: boolean;
  }[]
) {
  return fetchJson<{ ok: boolean }>(`/api/projects/${projectId}/styles`, {
    method: "PUT",
    body: JSON.stringify({ styles }),
  });
}

// ── Architecture Decisions ─────────────────────────────

export function createDecision(
  projectId: string,
  data: {
    title: string;
    status?: "proposed" | "accepted" | "deprecated" | "superseded";
    context?: string;
    decision?: string;
    consequences?: string;
  }
) {
  return fetchJson<ArchitectureDecision>(`/api/projects/${projectId}/decisions`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateDecision(
  projectId: string,
  decisionId: string,
  data: Partial<Omit<ArchitectureDecision, "id" | "projectId" | "createdAt">>
) {
  return fetchJson<ArchitectureDecision>(`/api/projects/${projectId}/decisions/${decisionId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Architecture Diagrams ──────────────────────────────

export function saveDiagrams(
  projectId: string,
  diagrams: {
    title: string;
    mermaidCode: string;
    diagramType: "context" | "container" | "component" | "sequence" | "flowchart";
  }[]
) {
  return fetchJson<{ ok: boolean }>(`/api/projects/${projectId}/diagrams`, {
    method: "PUT",
    body: JSON.stringify({ diagrams }),
  });
}

// ── Export ──────────────────────────────────────────────

export function getProjectExport(id: string) {
  return fetchJson<ProjectWithRelations>(`/api/projects/${id}/export`);
}
