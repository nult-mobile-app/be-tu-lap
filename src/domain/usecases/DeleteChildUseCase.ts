import type { IChildRepository } from "../repositories/IChildRepository";

export class DeleteChildUseCase {
  public constructor(private readonly childRepository: IChildRepository) {}

  public async execute(childId: string): Promise<void> {
    const normalizedChildId: string = childId.trim();
    if (normalizedChildId.length === 0) {
      throw new Error("Child id is required.");
    }

    await this.childRepository.deleteChild(normalizedChildId);
  }
}

