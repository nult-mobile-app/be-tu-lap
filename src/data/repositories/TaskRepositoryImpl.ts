import type { Reward } from "../../domain/entities/Reward";
import type { RewardLog } from "../../domain/entities/RewardLog";
import type { Task } from "../../domain/entities/Task";
import type { TaskLog } from "../../domain/entities/TaskLog";
import { TaskAlreadyCompletedError } from "../../domain/errors/TaskAlreadyCompletedError";
import { TaskNotFoundError } from "../../domain/errors/TaskNotFoundError";
import type { ITaskRepository } from "../../domain/repositories/ITaskRepository";
import { SQLiteDatabase } from "../datasources/SQLiteDatabase";
import { TaskModel, type TaskRow } from "../models/TaskModel";

interface TaskLookupRow {
  id: string;
  points: number;
}

interface ChildStarsRow {
  total_stars: number;
}

export class TaskRepositoryImpl implements ITaskRepository {
  public constructor(private readonly database: SQLiteDatabase) {}

  public async getTasksByDay(childId: string, date: Date): Promise<Task[]> {
    await this.database.initialize();
    this.assertDate(date);
    const dateKey: string = this.toDateKey(date);

    const rows: readonly TaskRow[] = await this.database.query<TaskRow>(
      `
      SELECT
        t.id,
        t.child_id,
        t.title,
        t.icon,
        t.points,
        t.description,
        CASE WHEN tl.id IS NULL THEN 0 ELSE 1 END AS is_completed
      FROM tasks t
      LEFT JOIN task_logs tl
        ON tl.task_id = t.id
       AND tl.child_id = t.child_id
       AND tl.completed_at = ?
      WHERE t.child_id = ?
      ORDER BY t.title ASC;
      `,
      [dateKey, childId],
    );

    return rows.map((row: TaskRow) => TaskModel.toDomain(row));
  }

  public async completeTask(taskId: string, childId: string): Promise<void> {
    await this.database.initialize();
    const today: string = this.toDateKey(new Date());

    await this.database.transaction<void>(async (transaction) => {
      const taskResult = await this.database.executeInTransaction(
        transaction,
        "SELECT id, points FROM tasks WHERE id = ? AND child_id = ? LIMIT 1;",
        [taskId, childId],
      );
      if (taskResult.rows.length === 0) {
        throw new TaskNotFoundError(taskId);
      }

      const existingResult = await this.database.executeInTransaction(
        transaction,
        "SELECT id FROM task_logs WHERE task_id = ? AND child_id = ? AND completed_at = ? LIMIT 1;",
        [taskId, childId, today],
      );
      if (existingResult.rows.length > 0) {
        throw new TaskAlreadyCompletedError(taskId);
      }

      const taskRow: TaskLookupRow = taskResult.rows.item(0) as TaskLookupRow;
      await this.database.executeInTransaction(
        transaction,
        "INSERT INTO task_logs (id, task_id, child_id, completed_at) VALUES (?, ?, ?, ?);",
        [this.makeId("tlog"), taskId, childId, today],
      );
      await this.database.executeInTransaction(
        transaction,
        "UPDATE children SET total_stars = total_stars + ? WHERE id = ?;",
        [taskRow.points, childId],
      );
    });
  }

  public async createNewTask(
    childId: string,
    title: string,
    icon: string,
    points: number,
  ): Promise<void> {
    await this.database.initialize();
    await this.database.execute(
      "INSERT INTO tasks (id, child_id, title, icon, points, description) VALUES (?, ?, ?, ?, ?, '');",
      [this.makeId("task"), childId, title, icon, points],
    );
  }

  public async deleteTask(taskId: string, childId: string): Promise<void> {
    await this.database.initialize();
    await this.database.execute("DELETE FROM tasks WHERE id = ? AND child_id = ?;", [
      taskId,
      childId,
    ]);
  }

  public async getTaskLogsByChild(childId: string): Promise<TaskLog[]> {
    await this.database.initialize();
    const rows = await this.database.query<{
      id: string;
      task_id: string;
      child_id: string;
      completed_at: string;
      task_title: string;
    }>(
      `
      SELECT tl.id, tl.task_id, tl.child_id, tl.completed_at, t.title AS task_title
      FROM task_logs tl
      INNER JOIN tasks t ON t.id = tl.task_id
      WHERE tl.child_id = ?
      ORDER BY tl.completed_at DESC;
      `,
      [childId],
    );
    return rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      childId: row.child_id,
      taskTitle: row.task_title,
      completedAt: row.completed_at,
    }));
  }

  public async addReward(
    childId: string,
    title: string,
    pointsRequired: number,
    stock: number,
  ): Promise<void> {
    await this.database.initialize();
    await this.database.execute(
      "INSERT INTO rewards (id, child_id, title, points_required, stock) VALUES (?, ?, ?, ?, ?);",
      [this.makeId("reward"), childId, title, pointsRequired, stock],
    );
  }

  public async getRewardsByChild(childId: string): Promise<Reward[]> {
    await this.database.initialize();
    const rows = await this.database.query<{
      id: string;
      child_id: string;
      title: string;
      points_required: number;
      stock: number;
    }>(
      "SELECT id, child_id, title, points_required, stock FROM rewards WHERE child_id = ? ORDER BY title ASC;",
      [childId],
    );
    return rows.map((row) => ({
      id: row.id,
      childId: row.child_id,
      title: row.title,
      pointsRequired: row.points_required,
      stock: row.stock,
    }));
  }

  public async redeemReward(childId: string, rewardId: string): Promise<void> {
    await this.database.initialize();
    const today: string = this.toDateKey(new Date());

    await this.database.transaction<void>(async (transaction) => {
      const rewardResult = await this.database.executeInTransaction(
        transaction,
        "SELECT title, points_required, stock FROM rewards WHERE id = ? AND child_id = ? LIMIT 1;",
        [rewardId, childId],
      );
      if (rewardResult.rows.length === 0) {
        throw new Error("Không tìm thấy phần thưởng.");
      }
      const reward = rewardResult.rows.item(0) as {
        title: string;
        points_required: number;
        stock: number;
      };
      if (reward.stock <= 0) {
        throw new Error("Phần thưởng đã hết lượt đổi.");
      }

      const childResult = await this.database.executeInTransaction(
        transaction,
        "SELECT total_stars FROM children WHERE id = ? LIMIT 1;",
        [childId],
      );
      const child: ChildStarsRow = childResult.rows.item(0) as ChildStarsRow;
      if (child.total_stars < reward.points_required) {
        throw new Error("Bé chưa đủ sao để đổi quà.");
      }

      await this.database.executeInTransaction(
        transaction,
        "UPDATE children SET total_stars = total_stars - ? WHERE id = ?;",
        [reward.points_required, childId],
      );
      await this.database.executeInTransaction(
        transaction,
        "UPDATE rewards SET stock = stock - 1 WHERE id = ? AND child_id = ?;",
        [rewardId, childId],
      );
      await this.database.executeInTransaction(
        transaction,
        "INSERT INTO reward_logs (id, child_id, reward_title, points_spent, redeemed_at) VALUES (?, ?, ?, ?, ?);",
        [this.makeId("rlog"), childId, reward.title, reward.points_required, today],
      );
    });
  }

  public async getRewardLogsByChild(childId: string): Promise<RewardLog[]> {
    await this.database.initialize();
    const rows = await this.database.query<{
      id: string;
      child_id: string;
      reward_title: string;
      points_spent: number;
      redeemed_at: string;
    }>(
      "SELECT id, child_id, reward_title, points_spent, redeemed_at FROM reward_logs WHERE child_id = ? ORDER BY redeemed_at DESC;",
      [childId],
    );
    return rows.map((row) => ({
      id: row.id,
      childId: row.child_id,
      rewardTitle: row.reward_title,
      pointsSpent: row.points_spent,
      redeemedAt: row.redeemed_at,
    }));
  }

  private assertDate(date: Date): void {
    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid date value.");
    }
  }

  private toDateKey(date: Date): string {
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
  }

  private makeId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }
}

