import type { Reward } from "../entities/Reward";
import type { RewardLog } from "../entities/RewardLog";
import type { Task } from "../entities/Task";
import type { TaskLog } from "../entities/TaskLog";

export interface ITaskRepository {
  getTasksByDay(childId: string, date: Date): Promise<Task[]>;
  completeTask(taskId: string, childId: string): Promise<void>;
  createNewTask(childId: string, title: string, icon: string, points: number): Promise<void>;
  deleteTask(taskId: string, childId: string): Promise<void>;
  getTaskLogsByChild(childId: string): Promise<TaskLog[]>;
  addReward(title: string, pointsRequired: number, stock: number): Promise<void>;
  getAllRewards(): Promise<Reward[]>;
  redeemReward(childId: string, rewardId: string): Promise<void>;
  getRewardLogsByChild(childId: string): Promise<RewardLog[]>;
}
