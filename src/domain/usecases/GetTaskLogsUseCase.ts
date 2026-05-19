import type { TaskLog } from "../entities/TaskLog";
import type { ITaskRepository } from "../repositories/ITaskRepository";

export class GetTaskLogsUseCase {
  public constructor(private readonly taskRepository: ITaskRepository) {}

  public async execute(childId: string): Promise<TaskLog[]> {
    return this.taskRepository.getTaskLogsByChild(childId.trim());
  }
}

