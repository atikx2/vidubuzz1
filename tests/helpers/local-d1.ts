import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import type { D1Database, D1PreparedStatement, D1Result } from "../../functions/_shared/admin-auth";

class Prepared implements D1PreparedStatement {
  constructor(private db: DatabaseSync, private sql: string, private values: Array<string | number | null> = []) {}
  bind(...values: Array<string | number | null>) { return new Prepared(this.db, this.sql, values); }
  async first<T>() { return (this.db.prepare(this.sql).get(...this.values) ?? null) as T | null; }
  async all<T>() { return { success: true, results: this.db.prepare(this.sql).all(...this.values) as T[] }; }
  async run() { const result = this.db.prepare(this.sql).run(...this.values); return { success: true, meta: { changes: Number(result.changes) } }; }
}

export class LocalD1 implements D1Database {
  sqlite = new DatabaseSync(":memory:");
  constructor(media = false) {
    for (const file of ["0001_admin_analytics.sql", ...(media ? ["0002_r2_media.sql"] : [])]) {
      this.sqlite.exec(readFileSync(new URL(`../../migrations/${file}`, import.meta.url), "utf8"));
    }
  }
  prepare(sql: string) { return new Prepared(this.sqlite, sql); }
  async batch<T>(statements: D1PreparedStatement[]) {
    this.sqlite.exec("BEGIN");
    try {
      const results: D1Result<T>[] = [];
      for (const statement of statements) results.push(await statement.run() as D1Result<T>);
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) { this.sqlite.exec("ROLLBACK"); throw error; }
  }
}
