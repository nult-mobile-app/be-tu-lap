import type { ITaskRepository } from "../repositories/ITaskRepository";

export class CreateNewTaskUseCase {
  public constructor(private readonly taskRepository: ITaskRepository) {}

  public async execute(
    childId: string,
    title: string,
    icon: string,
    points: number,
  ): Promise<void> {
    const normalizedChildId: string = childId.trim();
    const normalizedTitle: string = title.trim();
    const normalizedIcon: string = icon.trim();

    if (normalizedChildId.length === 0) {
      throw new Error("Child id is required.");
    }
    if (normalizedTitle.length === 0) {
      throw new Error("Tên nhiệm vụ là bắt buộc.");
    }
    if (normalizedIcon.length === 0) {
      throw new Error("Icon nhiệm vụ là bắt buộc.");
    }
    if (!Number.isFinite(points) || points <= 0) {
      throw new Error("Số sao phải lớn hơn 0.");
    }

    await this.taskRepository.createNewTask(
      normalizedChildId,
      normalizedTitle,
      normalizedIcon,
      points,
    );
  }
}

