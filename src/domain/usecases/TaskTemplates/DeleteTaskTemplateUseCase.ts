import type { ITaskTemplateRepository } from "../../repositories/ITaskTemplateRepository";

export class DeleteTaskTemplateUseCase {
  public constructor(private readonly repository: ITaskTemplateRepository) {}

  public async execute(id: string): Promise<void> {
    await this.repository.deleteTemplate(id);
  }
}
