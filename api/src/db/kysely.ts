import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

interface Yield {
  id: string;
  name: string;
  value: number;
  createdAt: Date;
}

interface DB {
  Yield: Yield;
}

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new Pool({ connectionString: process.env.DATABASE_URL }),
  }),
});
