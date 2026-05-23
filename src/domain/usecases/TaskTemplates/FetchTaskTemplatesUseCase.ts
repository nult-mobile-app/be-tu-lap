import type { TaskTemplate } from "../../entities/TaskTemplate";
import type { ITaskTemplateRepository } from "../../repositories/ITaskTemplateRepository";

export class FetchTaskTemplatesUseCase {
  public constructor(private readonly repository: ITaskTemplateRepository) {}

  public async execute(): Promise<readonly TaskTemplate[]> {
    return this.repository.getTemplates();
  }
}
