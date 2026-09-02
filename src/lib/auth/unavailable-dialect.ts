/**
 * Kysely dialect that never opens PGLite or Postgres.
 * Used on Vercel when DATABASE_URL is missing so Better Auth can construct
 * without touching `/var/task/pglite.data`. Queries throw a clear error.
 */
import {
  type DatabaseConnection,
  type DatabaseIntrospector,
  type Dialect,
  type Driver,
  type Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  type QueryCompiler,
  type QueryResult,
} from "kysely";

export const AUTH_DB_REQUIRED =
  "Production sign-in requires DATABASE_URL (Postgres). PGLite is disabled on Vercel.";

class UnavailableConnection implements DatabaseConnection {
  async executeQuery<O>(): Promise<QueryResult<O>> {
    throw new Error(AUTH_DB_REQUIRED);
  }
  async *streamQuery<O>(): AsyncIterableIterator<QueryResult<O>> {
    throw new Error(AUTH_DB_REQUIRED);
  }
}

class UnavailableDriver implements Driver {
  async init(): Promise<void> {}
  async acquireConnection(): Promise<DatabaseConnection> {
    return new UnavailableConnection();
  }
  async releaseConnection(): Promise<void> {}
  async beginTransaction(): Promise<void> {
    throw new Error(AUTH_DB_REQUIRED);
  }
  async commitTransaction(): Promise<void> {
    throw new Error(AUTH_DB_REQUIRED);
  }
  async rollbackTransaction(): Promise<void> {}
  async destroy(): Promise<void> {}
}

export function unavailableDialect(): Dialect {
  return {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => new UnavailableDriver(),
    createQueryCompiler: (): QueryCompiler => new PostgresQueryCompiler(),
    createIntrospector: (db: Kysely<unknown>): DatabaseIntrospector =>
      new PostgresIntrospector(db),
  };
}
