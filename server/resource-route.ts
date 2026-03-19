import { eq } from "drizzle-orm";
import type { PgColumn, PgTableWithColumns } from "drizzle-orm/pg-core";
import type { Express } from "express";
import { z } from "zod/v4";

import { DatabaseContext } from "~/database/context";

export interface ReplaceResourceConfig<TSchema extends z.ZodType> {
  /** URL segment appended to /api/projects/:id/ */
  path: string;
  /** Property name expected in the request body */
  bodyKey: string;
  /** Zod schema for a single item (without id / projectId) */
  itemSchema: TSchema;
  /** Drizzle table to delete from and insert into */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: PgTableWithColumns<any>;
  /** The projectId column on the table (used in the WHERE clause) */
  projectIdColumn: PgColumn;
  /** Optional predicate — items that return false are excluded from insertion */
  filter?: (item: z.infer<TSchema>) => boolean;
}

/**
 * Registers a PUT /api/projects/:id/<path> route that replaces all rows for a
 * project in a single delete-then-insert transaction.
 *
 * The handler owns: Zod validation + 400 response, transaction lifecycle,
 * delete-before-insert ordering, the empty-array guard, and error logging.
 */
export function registerReplaceResource<TSchema extends z.ZodType>(
  app: Express,
  config: ReplaceResourceConfig<TSchema>
): void {
  const { path, bodyKey, itemSchema, table, projectIdColumn, filter } = config;

  app.put(`/api/projects/:id/${path}`, async (req, res) => {
    try {
      const bodySchema = z.object({ [bodyKey]: z.array(itemSchema) });
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

      const db = DatabaseContext.getStore()!;
      const projectId = req.params.id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = (parsed.data as Record<string, any[]>)[bodyKey] as z.infer<TSchema>[];
      const valid = filter ? items.filter(filter) : items;

      await db.transaction(async (tx) => {
        await tx.delete(table).where(eq(projectIdColumn, projectId));
        if (valid.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (tx.insert(table) as any).values(
            valid.map((r) => ({ ...(r as Record<string, unknown>), projectId }))
          );
        }
      });

      res.json({ ok: true });
    } catch (err) {
      console.error(`Failed to save ${path}:`, err);
      res.status(500).json({ error: `Failed to save ${path}` });
    }
  });
}
