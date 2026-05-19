import type { ITaskRepository } from "../repositories/ITaskRepository";

export class DeleteTaskUseCase {
  public constructor(private readonly taskRepository: ITaskRepository) {}

  public async execute(taskId: string, childId: string): Promise<void> {
    const normalizedTaskId: string = taskId.trim();
    const normalizedChildId: string = childId.trim();

    if (normalizedTaskId.length === 0) {
      throw new Error("Task id is required.");
    }
    if (normalizedChildId.length === 0) {
      throw new Error("Child id is required.");
    }

    await this.taskRepository.deleteTask(normalizedTaskId, normalizedChildId);
  }
}

