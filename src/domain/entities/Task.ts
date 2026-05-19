export interface Task {
  id: string;
  childId: string;
  title: string;
  icon: string;
  points: number;
  isCompleted: boolean;
  description: string;
}
