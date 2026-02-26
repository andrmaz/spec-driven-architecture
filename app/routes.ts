import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/dashboard.tsx"),
  route("projects/:id", "routes/project.tsx"),
  route("projects/:id/export", "routes/export.tsx"),
] satisfies RouteConfig;
