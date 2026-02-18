// import { database } from "~/database/context";
// import * as schema from "~/database/schema";
import { TamboProvider } from "@tambo-ai/react";
import { components } from "../lib/tambo";
import { MessageThreadPanel } from "@/components/tambo/message-thread-panel";
import type { Route } from "./+types/home";

export function meta() {
  return [
    { title: "Spec-Driven Architecture" },
    { name: "description", content: "Spec-Driven Architecture" },
  ];
}

/* export async function action(args: Route.ActionArgs) {
  console.log(args);
}

export async function loader(args: Route.LoaderArgs) {
  console.log(args);
  return {};
} */

export default function Home(props: Route.ComponentProps) {
  console.log(props);
  return (
    <div>
      <TamboProvider
        apiKey={import.meta.env.VITE_TAMBO_API_KEY}
        userKey="user-1"
        components={components}
      >
        {/* Tambo components */}
        <MessageThreadPanel />
        {/* other Tambo components */}
      </TamboProvider>
    </div>
  );
}
