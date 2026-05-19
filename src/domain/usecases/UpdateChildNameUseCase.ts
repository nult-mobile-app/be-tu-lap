import type { IChildRepository } from "../repositories/IChildRepository";

export class UpdateChildNameUseCase {
  public constructor(private readonly childRepository: IChildRepository) {}

  public async execute(childId: string, newName: string): Promise<void> {
    const normalizedChildId: string = childId.trim();
    const normalizedName: string = newName.trim();

    if (normalizedChildId.length === 0) {
      throw new Error("Child id is required.");
    }
    if (normalizedName.length === 0) {
      throw new Error("Tên mới của bé là bắt buộc.");
    }

    await this.childRepository.updateChildName(normalizedChildId, normalizedName);
  }
}

