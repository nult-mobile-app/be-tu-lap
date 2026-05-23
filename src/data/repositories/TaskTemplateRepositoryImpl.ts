import type { TaskTemplate } from "../../domain/entities/TaskTemplate";
import type { ITaskTemplateRepository } from "../../domain/repositories/ITaskTemplateRepository";
import { SQLiteDatabase } from "../datasources/SQLiteDatabase";

export class TaskTemplateRepositoryImpl implements ITaskTemplateRepository {
  public constructor(private readonly database: SQLiteDatabase) {}

  public async getTemplates(): Promise<readonly TaskTemplate[]> {
    await this.database.initialize();
    const rows = await this.database.query<{
      id: string;
      title: string;
      icon: string;
      points: number;
      description: string;
    }>("SELECT id, title, icon, points, description FROM task_templates ORDER BY title ASC;");

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      icon: row.icon,
      points: row.points,
      description: row.description,
    }));
  }

  public async createTemplate(
    title: string,
    icon: string,
    points: number,
    description: string = "",
  ): Promise<void> {
    await this.database.initialize();
    const id = this.makeId("tpl");
    await this.database.execute(
      "INSERT INTO task_templates (id, title, icon, points, description) VALUES (?, ?, ?, ?, ?);",
      [id, title, icon, points, description],
    );
  }

  public async deleteTemplate(id: string): Promise<void> {
    await this.database.initialize();
    await this.database.execute("DELETE FROM task_templates WHERE id = ?;", [id]);
  }

  private makeId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
}
