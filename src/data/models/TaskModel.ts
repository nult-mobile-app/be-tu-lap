import type { Task } from "../../domain/entities/Task";

export interface TaskRow {
  id: string;
  child_id: string;
  title: string;
  icon: string;
  points: number;
  description: string;
  is_completed: number;
}

export class TaskModel {
  public static toDomain(row: TaskRow): Task {
    return {
      id: row.id,
      childId: row.child_id,
      title: row.title,
      icon: row.icon,
      points: row.points,
      description: row.description,
      isCompleted: row.is_completed === 1,
    };
  }
}
