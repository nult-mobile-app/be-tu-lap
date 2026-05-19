import type { Child } from "../entities/Child";

export interface IChildRepository {
  getChildren(): Promise<Child[]>;
  addChild(name: string, avatar: string): Promise<void>;
  deleteChild(childId: string): Promise<void>;
  updateChildName(childId: string, newName: string): Promise<void>;
}
