import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

const client =
  globalForDb.pgClient ??
  postgres(process.env.DATABASE_URL!, {
    // Supabase's transaction pooler (port 6543) does not support prepared statements.
    prepare: false,
    // One connection per serverless instance on Vercel, so many instances can't exhaust the pooler.
    max: process.env.VERCEL ? 1 : 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema });
export { schema };
