import type { ITaskRepository } from "../repositories/ITaskRepository";

export class AddRewardUseCase {
  public constructor(private readonly taskRepository: ITaskRepository) {}

  public async execute(
    title: string,
    pointsRequired: number,
    stock: number = 1,
  ): Promise<void> {
    await this.taskRepository.addReward(title.trim(), pointsRequired, stock);
  }
}

