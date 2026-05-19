import type { IChildRepository } from "../repositories/IChildRepository";

export class AddChildUseCase {
  public constructor(private readonly childRepository: IChildRepository) {}

  public async execute(name: string, avatar: string): Promise<void> {
    const normalizedName: string = name.trim();
    const normalizedAvatar: string = avatar.trim();

    if (normalizedName.length === 0) {
      throw new Error("Tên bé là bắt buộc.");
    }

    if (normalizedAvatar.length === 0) {
      throw new Error("Avatar là bắt buộc.");
    }

    await this.childRepository.addChild(normalizedName, normalizedAvatar);
  }
}

