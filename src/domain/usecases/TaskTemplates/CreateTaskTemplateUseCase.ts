import type { ITaskTemplateRepository } from "../../repositories/ITaskTemplateRepository";

export class CreateTaskTemplateUseCase {
  public constructor(private readonly repository: ITaskTemplateRepository) {}

  public async execute(title: string, icon: string, points: number, description: string = ""): Promise<void> {
    const normalizedTitle: string = title.trim();
    const normalizedIcon: string = icon.trim();

    if (normalizedTitle.length === 0) {
      throw new Error("Tên nhiệm vụ mẫu là bắt buộc.");
    }
    if (normalizedIcon.length === 0) {
      throw new Error("Icon nhiệm vụ mẫu là bắt buộc.");
    }
    if (!Number.isFinite(points) || points <= 0) {
      throw new Error("Số sao phải lớn hơn 0.");
    }

    await this.repository.createTemplate(normalizedTitle, normalizedIcon, points, description);
  }
}
