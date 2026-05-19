import type { RewardLog } from "../entities/RewardLog";
import type { ITaskRepository } from "../repositories/ITaskRepository";

export class GetRewardLogsUseCase {
  public constructor(private readonly taskRepository: ITaskRepository) {}

  public async execute(childId: string): Promise<RewardLog[]> {
    return this.taskRepository.getRewardLogsByChild(childId.trim());
  }
}

