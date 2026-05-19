import type { Reward } from "../entities/Reward";
import type { ITaskRepository } from "../repositories/ITaskRepository";

export class GetRewardsUseCase {
  public constructor(private readonly taskRepository: ITaskRepository) {}

  public async execute(childId: string): Promise<Reward[]> {
    return this.taskRepository.getRewardsByChild(childId.trim());
  }
}

