import type { Child } from "../../domain/entities/Child";
import type { IChildRepository } from "../../domain/repositories/IChildRepository";
import { SQLiteDatabase } from "../datasources/SQLiteDatabase";

interface ChildRow {
  id: string;
  name: string;
  avatar: string;
  total_stars: number;
}

export class ChildRepositoryImpl implements IChildRepository {
  public constructor(private readonly database: SQLiteDatabase) {}

  public async getChildren(): Promise<Child[]> {
    await this.database.initialize();
    const rows: readonly ChildRow[] = await this.database.query<ChildRow>(
      "SELECT id, name, avatar, total_stars FROM children ORDER BY name ASC;",
    );

    const safeRows = Array.isArray(rows) ? rows : [];
    return safeRows
      .filter((row): row is ChildRow => row !== null && row !== undefined)
      .map((row: ChildRow) => ({
        id: row.id,
        name: row.name,
        avatar: row.avatar,
        totalStars: row.total_stars,
      }));
  }

  public async addChild(name: string, avatar: string): Promise<void> {
    await this.database.initialize();
    const childId: string = `child-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    await this.database.execute(
      "INSERT INTO children (id, name, avatar, total_stars) VALUES (?, ?, ?, 0);",
      [childId, name, avatar],
    );
  }

  public async deleteChild(childId: string): Promise<void> {
    await this.database.initialize();

    await this.database.transaction<void>(async (transaction) => {
      await this.database.executeInTransaction(
        transaction,
        "DELETE FROM tasks WHERE child_id = ?;",
        [childId],
      );
      await this.database.executeInTransaction(
        transaction,
        "DELETE FROM task_logs WHERE child_id = ?;",
        [childId],
      );
      await this.database.executeInTransaction(
        transaction,
        "DELETE FROM rewards WHERE child_id = ?;",
        [childId],
      );
      await this.database.executeInTransaction(
        transaction,
        "DELETE FROM reward_logs WHERE child_id = ?;",
        [childId],
      );

      await this.database.executeInTransaction(
        transaction,
        "DELETE FROM children WHERE id = ?;",
        [childId],
      );
    });
  }

  public async updateChildName(childId: string, newName: string): Promise<void> {
    await this.database.initialize();
    await this.database.execute("UPDATE children SET name = ? WHERE id = ?;", [newName, childId]);
  }
}
