import type { Child } from "../entities/Child";
import type { IChildRepository } from "../repositories/IChildRepository";

export class GetChildrenUseCase {
  public constructor(private readonly childRepository: IChildRepository) {}

  public async execute(): Promise<Child[]> {
    return this.childRepository.getChildren();
  }
}

