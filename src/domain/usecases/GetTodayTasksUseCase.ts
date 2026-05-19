import type { Task } from "../entities/Task";
import type { ITaskRepository } from "../repositories/ITaskRepository";

export class GetTodayTasksUseCase {
  public constructor(private readonly taskRepository: ITaskRepository) {}

  public async execute(childId: string, date: Date = new Date()): Promise<Task[]> {
    const normalizedChildId: string = childId.trim();
    if (normalizedChildId.length === 0) {
      throw new Error("Child id is required.");
    }

    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid date value.");
    }

    return this.taskRepository.getTasksByDay(normalizedChildId, date);
  }
}
