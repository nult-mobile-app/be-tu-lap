import type { ITaskRepository } from "../repositories/ITaskRepository";

export class RedeemRewardUseCase {
  public constructor(private readonly taskRepository: ITaskRepository) {}

  public async execute(childId: string, rewardId: string): Promise<void> {
    await this.taskRepository.redeemReward(childId.trim(), rewardId.trim());
  }
}

