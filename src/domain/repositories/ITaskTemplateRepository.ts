import type { TaskTemplate } from "../entities/TaskTemplate";

export interface ITaskTemplateRepository {
  getTemplates(): Promise<readonly TaskTemplate[]>;
  createTemplate(title: string, icon: string, points: number, description?: string): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
}
