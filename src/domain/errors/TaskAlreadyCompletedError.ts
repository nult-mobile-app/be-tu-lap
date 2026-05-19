import { DomainError } from "./DomainError";

export class TaskAlreadyCompletedError extends DomainError {
  public constructor(taskId: string) {
    super(`Task with id "${taskId}" is already completed for today.`);
    this.name = "TaskAlreadyCompletedError";
  }
}

