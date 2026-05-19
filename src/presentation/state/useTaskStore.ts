import { create } from "zustand";
import type { Child } from "../../domain/entities/Child";
import type { Reward } from "../../domain/entities/Reward";
import type { RewardLog } from "../../domain/entities/RewardLog";
import type { Task } from "../../domain/entities/Task";
import type { TaskLog } from "../../domain/entities/TaskLog";
import { TaskAlreadyCompletedError } from "../../domain/errors/TaskAlreadyCompletedError";
import { TaskNotFoundError } from "../../domain/errors/TaskNotFoundError";
import { AddChildUseCase } from "../../domain/usecases/AddChildUseCase";
import { AddRewardUseCase } from "../../domain/usecases/AddRewardUseCase";
import { CompleteTaskUseCase } from "../../domain/usecases/CompleteTaskUseCase";
import { CreateNewTaskUseCase } from "../../domain/usecases/CreateNewTaskUseCase";
import { DeleteChildUseCase } from "../../domain/usecases/DeleteChildUseCase";
import { DeleteTaskUseCase } from "../../domain/usecases/DeleteTaskUseCase";
import { GetChildrenUseCase } from "../../domain/usecases/GetChildrenUseCase";
import { GetRewardLogsUseCase } from "../../domain/usecases/GetRewardLogsUseCase";
import { GetRewardsUseCase } from "../../domain/usecases/GetRewardsUseCase";
import { GetTaskLogsUseCase } from "../../domain/usecases/GetTaskLogsUseCase";
import { GetTodayTasksUseCase } from "../../domain/usecases/GetTodayTasksUseCase";
import { RedeemRewardUseCase } from "../../domain/usecases/RedeemRewardUseCase";
import { UpdateChildNameUseCase } from "../../domain/usecases/UpdateChildNameUseCase";
import { SQLiteDatabase } from "../../data/datasources/SQLiteDatabase";
import { ChildRepositoryImpl } from "../../data/repositories/ChildRepositoryImpl";
import { TaskRepositoryImpl } from "../../data/repositories/TaskRepositoryImpl";

interface TaskState {
  children: Child[];
  selectedChildId: string | null;
  tasks: Task[];
  adminTasks: Task[];
  taskLogs: TaskLog[];
  rewards: Reward[];
  rewardLogs: RewardLog[];
  totalStars: number;
  isLoading: boolean;
  errorMessage: string | null;
  fetchChildren: () => Promise<void>;
  selectChild: (childId: string) => Promise<void>;
  fetchTasks: () => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  addChild: (name: string, avatar: string) => Promise<void>;
  deleteChild: (childId: string) => Promise<void>;
  createTask: (childId: string, title: string, icon: string, points: number) => Promise<void>;
  updateChildName: (childId: string, newName: string) => Promise<void>;
  fetchTasksForChild: (childId: string) => Promise<void>;
  deleteTask: (taskId: string, childId: string) => Promise<void>;
  loadHistoryAndRewards: (childId: string) => Promise<void>;
  addReward: (childId: string, title: string, pointsRequired: number) => Promise<void>;
  redeemReward: (childId: string, rewardId: string) => Promise<void>;
  clearError: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  children: [],
  selectedChildId: null,
  tasks: [],
  adminTasks: [],
  taskLogs: [],
  rewards: [],
  rewardLogs: [],
  totalStars: 0,
  isLoading: false,
  errorMessage: null,

  fetchChildren: async (): Promise<void> => {
    set({ isLoading: true, errorMessage: null });
    try {
      const getChildrenUseCase: GetChildrenUseCase = createGetChildrenUseCase();
      const children: Child[] = await getChildrenUseCase.execute();
      const selectedChildId: string | null =
        get().selectedChildId ?? (children.length > 0 ? children[0].id : null);

      set({
        children,
        selectedChildId,
        totalStars: getTotalStarsFromChildren(children, selectedChildId),
        isLoading: false,
      });

      if (selectedChildId !== null) {
        await get().fetchTasks();
      }
    } catch (error: unknown) {
      set({
        isLoading: false,
        errorMessage: toReadableError(error),
      });
    }
  },

  selectChild: async (childId: string): Promise<void> => {
    const normalizedChildId: string = childId.trim();
    if (normalizedChildId.length === 0) {
      return;
    }

    set((state) => ({
      selectedChildId: normalizedChildId,
      totalStars: getTotalStarsFromChildren(state.children, normalizedChildId),
      errorMessage: null,
    }));

    await get().fetchTasks();
  },

  fetchTasks: async (): Promise<void> => {
    const selectedChildId: string | null = get().selectedChildId;
    if (selectedChildId === null) {
      set({ tasks: [], adminTasks: [], totalStars: 0, isLoading: false, errorMessage: null });
      return;
    }

    set({ isLoading: true, errorMessage: null });

    try {
      const getTodayTasksUseCase: GetTodayTasksUseCase = createGetTodayTasksUseCase();
      const tasks: Task[] = await getTodayTasksUseCase.execute(selectedChildId);
      const children: Child[] = get().children;

      set({
        tasks,
        adminTasks: tasks,
        taskLogs: get().taskLogs,
        totalStars: getTotalStarsFromChildren(children, selectedChildId),
        isLoading: false,
      });
    } catch (error: unknown) {
      set({
        isLoading: false,
        errorMessage: toReadableError(error),
      });
    }
  },

  completeTask: async (taskId: string): Promise<void> => {
    const selectedChildId: string | null = get().selectedChildId;
    if (selectedChildId === null) {
      set({ errorMessage: "Vui lòng chọn hồ sơ của bé trước." });
      return;
    }

    set({ isLoading: true, errorMessage: null });

    try {
      const completeTaskUseCase: CompleteTaskUseCase = createCompleteTaskUseCase();
      await completeTaskUseCase.execute(taskId, selectedChildId);

      const updatedTasks: Task[] = get().tasks.map((task: Task) =>
        task.id === taskId ? { ...task, isCompleted: true } : task,
      );
      const completedTask: Task | undefined = updatedTasks.find((task) => task.id === taskId);
      const starsToAdd: number = completedTask !== undefined ? completedTask.points : 0;
      const updatedChildren: Child[] = get().children.map((child: Child) =>
        child.id === selectedChildId
          ? { ...child, totalStars: child.totalStars + starsToAdd }
          : child,
      );

      set({
        children: updatedChildren,
        tasks: updatedTasks,
        adminTasks: updatedTasks,
        taskLogs: [
          {
            id: `local-${Date.now()}`,
            taskId,
            childId: selectedChildId,
            taskTitle: completedTask?.title ?? "",
            completedAt: toDateKey(new Date()),
          },
          ...get().taskLogs,
        ],
        totalStars: getTotalStarsFromChildren(updatedChildren, selectedChildId),
        isLoading: false,
      });
    } catch (error: unknown) {
      set({
        isLoading: false,
        errorMessage: toReadableError(error),
      });
    }
  },

  addChild: async (name: string, avatar: string): Promise<void> => {
    set({ isLoading: true, errorMessage: null });
    try {
      const addChildUseCase: AddChildUseCase = createAddChildUseCase();
      await addChildUseCase.execute(name, avatar);
      await get().fetchChildren();
      set({ isLoading: false });
    } catch (error: unknown) {
      set({ isLoading: false, errorMessage: toReadableError(error) });
    }
  },

  deleteChild: async (childId: string): Promise<void> => {
    set({ isLoading: true, errorMessage: null });
    try {
      const deleteChildUseCase: DeleteChildUseCase = createDeleteChildUseCase();
      await deleteChildUseCase.execute(childId);

      const currentSelectedId: string | null = get().selectedChildId;
      const nextSelectedId: string | null =
        currentSelectedId === childId ? null : currentSelectedId;
      set({ selectedChildId: nextSelectedId });

      await get().fetchChildren();
      set({ isLoading: false });
    } catch (error: unknown) {
      set({ isLoading: false, errorMessage: toReadableError(error) });
    }
  },

  createTask: async (
    childId: string,
    title: string,
    icon: string,
    points: number,
  ): Promise<void> => {
    set({ isLoading: true, errorMessage: null });
    try {
      const createTaskUseCase: CreateNewTaskUseCase = createNewTaskUseCase();
      await createTaskUseCase.execute(childId, title, icon, points);

      const selectedChildId: string | null = get().selectedChildId;
      if (selectedChildId === childId) {
        await get().fetchTasks();
      } else {
        await get().fetchTasksForChild(childId);
        set({ isLoading: false });
      }
    } catch (error: unknown) {
      set({ isLoading: false, errorMessage: toReadableError(error) });
    }
  },

  updateChildName: async (childId: string, newName: string): Promise<void> => {
    set({ isLoading: true, errorMessage: null });
    try {
      const updateChildNameUseCase: UpdateChildNameUseCase = createUpdateChildNameUseCase();
      await updateChildNameUseCase.execute(childId, newName);
      await get().fetchChildren();
      set({ isLoading: false });
    } catch (error: unknown) {
      set({ isLoading: false, errorMessage: toReadableError(error) });
    }
  },

  fetchTasksForChild: async (childId: string): Promise<void> => {
    const normalizedChildId: string = childId.trim();
    if (normalizedChildId.length === 0) {
      set({ adminTasks: [] });
      return;
    }

    set({ isLoading: true, errorMessage: null });
    try {
      const getTodayTasksUseCase: GetTodayTasksUseCase = createGetTodayTasksUseCase();
      const tasks: Task[] = await getTodayTasksUseCase.execute(normalizedChildId);
      set({ adminTasks: tasks, isLoading: false });
    } catch (error: unknown) {
      set({ isLoading: false, errorMessage: toReadableError(error) });
    }
  },

  deleteTask: async (taskId: string, childId: string): Promise<void> => {
    set({ isLoading: true, errorMessage: null });
    try {
      const deleteTaskUseCase: DeleteTaskUseCase = createDeleteTaskUseCase();
      await deleteTaskUseCase.execute(taskId, childId);

      const selectedChildId: string | null = get().selectedChildId;
      const nextAdminTasks: Task[] = get().adminTasks.filter((task) => task.id !== taskId);
      if (selectedChildId === childId) {
        const nextTasks: Task[] = get().tasks.filter((task) => task.id !== taskId);
        set({
          tasks: nextTasks,
          adminTasks: nextAdminTasks,
          isLoading: false,
        });
      } else {
        set({ adminTasks: nextAdminTasks, isLoading: false });
      }
    } catch (error: unknown) {
      set({ isLoading: false, errorMessage: toReadableError(error) });
    }
  },

  loadHistoryAndRewards: async (childId: string): Promise<void> => {
    const normalizedChildId: string = childId.trim();
    if (normalizedChildId.length === 0) {
      set({ taskLogs: [], rewards: [], rewardLogs: [] });
      return;
    }
    set({ isLoading: true, errorMessage: null });
    try {
      const getTaskLogsUseCase: GetTaskLogsUseCase = createGetTaskLogsUseCase();
      const getRewardsUseCase: GetRewardsUseCase = createGetRewardsUseCase();
      const getRewardLogsUseCase: GetRewardLogsUseCase = createGetRewardLogsUseCase();
      const [taskLogs, rewards, rewardLogs] = await Promise.all([
        getTaskLogsUseCase.execute(normalizedChildId),
        getRewardsUseCase.execute(normalizedChildId),
        getRewardLogsUseCase.execute(normalizedChildId),
      ]);
      set({ taskLogs, rewards, rewardLogs, isLoading: false });
    } catch (error: unknown) {
      set({ isLoading: false, errorMessage: toReadableError(error) });
    }
  },

  addReward: async (childId: string, title: string, pointsRequired: number): Promise<void> => {
    set({ isLoading: true, errorMessage: null });
    try {
      const addRewardUseCase: AddRewardUseCase = createAddRewardUseCase();
      await addRewardUseCase.execute(childId, title, pointsRequired, 1);
      await get().loadHistoryAndRewards(childId);
      set({ isLoading: false });
    } catch (error: unknown) {
      set({ isLoading: false, errorMessage: toReadableError(error) });
    }
  },

  redeemReward: async (childId: string, rewardId: string): Promise<void> => {
    set({ isLoading: true, errorMessage: null });
    try {
      const redeemRewardUseCase: RedeemRewardUseCase = createRedeemRewardUseCase();
      await redeemRewardUseCase.execute(childId, rewardId);
      await get().fetchChildren();
      await get().loadHistoryAndRewards(childId);
      set({ isLoading: false });
    } catch (error: unknown) {
      set({ isLoading: false, errorMessage: toReadableError(error) });
    }
  },

  clearError: (): void => {
    set({ errorMessage: null });
  },
}));

function toReadableError(error: unknown): string {
  if (error instanceof TaskAlreadyCompletedError) {
    return "Nhiệm vụ này đã được hoàn thành hôm nay.";
  }

  if (error instanceof TaskNotFoundError) {
    return "Không tìm thấy nhiệm vụ.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Đã xảy ra lỗi không xác định.";
}

function createTaskRepository(): TaskRepositoryImpl {
  const database: SQLiteDatabase = SQLiteDatabase.getInstance();

  if (database === null || database === undefined) {
    throw new Error("Không thể khởi tạo database instance.");
  }

  return new TaskRepositoryImpl(database);
}

function createChildRepository(): ChildRepositoryImpl {
  const database: SQLiteDatabase = SQLiteDatabase.getInstance();
  if (database === null || database === undefined) {
    throw new Error("Không thể khởi tạo database instance.");
  }
  return new ChildRepositoryImpl(database);
}

function createGetTodayTasksUseCase(): GetTodayTasksUseCase {
  return new GetTodayTasksUseCase(createTaskRepository());
}

function createCompleteTaskUseCase(): CompleteTaskUseCase {
  return new CompleteTaskUseCase(createTaskRepository());
}

function createGetChildrenUseCase(): GetChildrenUseCase {
  return new GetChildrenUseCase(createChildRepository());
}

function createAddChildUseCase(): AddChildUseCase {
  return new AddChildUseCase(createChildRepository());
}

function createDeleteChildUseCase(): DeleteChildUseCase {
  return new DeleteChildUseCase(createChildRepository());
}

function createNewTaskUseCase(): CreateNewTaskUseCase {
  return new CreateNewTaskUseCase(createTaskRepository());
}

function createUpdateChildNameUseCase(): UpdateChildNameUseCase {
  return new UpdateChildNameUseCase(createChildRepository());
}

function createDeleteTaskUseCase(): DeleteTaskUseCase {
  return new DeleteTaskUseCase(createTaskRepository());
}

function createGetTaskLogsUseCase(): GetTaskLogsUseCase {
  return new GetTaskLogsUseCase(createTaskRepository());
}

function createGetRewardsUseCase(): GetRewardsUseCase {
  return new GetRewardsUseCase(createTaskRepository());
}

function createGetRewardLogsUseCase(): GetRewardLogsUseCase {
  return new GetRewardLogsUseCase(createTaskRepository());
}

function createAddRewardUseCase(): AddRewardUseCase {
  return new AddRewardUseCase(createTaskRepository());
}

function createRedeemRewardUseCase(): RedeemRewardUseCase {
  return new RedeemRewardUseCase(createTaskRepository());
}

function getTotalStarsFromChildren(children: Child[], selectedChildId: string | null): number {
  if (selectedChildId === null) {
    return 0;
  }

  const child: Child | undefined = children.find((item) => item.id === selectedChildId);
  return child?.totalStars ?? 0;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}
