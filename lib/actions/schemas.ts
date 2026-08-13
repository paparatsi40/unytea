import { z } from "zod";
import type { Prisma } from "@prisma/client";

/**
 * Shared Zod building blocks for action argument tuples.
 */

/** A cuid-shaped identifier. Bounded so an id field cannot carry a payload. */
export const idSchema = z.string().min(1).max(64);

/** A URL-ish string persisted as text. */
export const urlSchema = z.string().max(2000);

/**
 * Any JSON value, typed so it satisfies Prisma's `InputJsonValue`.
 *
 * Used for the schema-less `Json` columns (community theme, section content and
 * settings, notification payloads). This is deliberately not `z.unknown()`:
 * it rejects functions, symbols and `undefined`, which Prisma would throw on at
 * write time, while still accepting arbitrary nested JSON.
 */
export const jsonValueSchema: z.ZodType<Prisma.InputJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
) as z.ZodType<Prisma.InputJsonValue>;
