import { DomainError } from "./DomainError";

export class TaskNotFoundError extends DomainError {
  public constructor(taskId: string) {
    super(`Task with id "${taskId}" was not found.`);
    this.name = "TaskNotFoundError";
  }
}

