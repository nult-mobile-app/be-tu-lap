import type { ITaskRepository } from "../repositories/ITaskRepository";

export class AddRewardUseCase {
  public constructor(private readonly taskRepository: ITaskRepository) {}

  public async execute(
    childId: string,
    title: string,
    pointsRequired: number,
    stock: number = 1,
  ): Promise<void> {
    await this.taskRepository.addReward(childId.trim(), title.trim(), pointsRequired, stock);
  }
}

