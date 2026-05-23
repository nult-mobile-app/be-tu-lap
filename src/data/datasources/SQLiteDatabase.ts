import { NativeModules } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---------------------------------------------------------------------------
// Type aliases shared between native and mock paths
// ---------------------------------------------------------------------------
type SQLitePrimitive = string | number | null;
export type SQLParams = readonly SQLitePrimitive[];

// ---------------------------------------------------------------------------
// Lightweight result-set types used by mock path (mirror the native ResultSet
// shape so the rest of the app never needs to care which path is active).
// ---------------------------------------------------------------------------
interface MockRows<T = unknown> {
  length: number;
  item: (index: number) => T;
}
interface MockResultSet<T = unknown> {
  rows: MockRows<T>;
  rowsAffected: number;
}
interface MockTransaction {
  readonly __type: "mock-transaction";
}

// ---------------------------------------------------------------------------
// In-memory state types (identical to the web datasource)
// ---------------------------------------------------------------------------
interface ChildRecord {
  id: string;
  name: string;
  avatar: string;
  total_stars: number;
}
interface TaskRecord {
  id: string;
  child_id: string;
  title: string;
  icon: string;
  points: number;
  description: string;
}
interface TaskLogRecord {
  id: string;
  task_id: string;
  child_id: string;
  completed_at: string;
}
interface RewardRecord {
  id: string;
  child_id: string;
  title: string;
  points_required: number;
  stock: number;
}
interface RewardLogRecord {
  id: string;
  child_id: string;
  reward_title: string;
  points_spent: number;
  redeemed_at: string;
}
interface DatabaseState {
  children: ChildRecord[];
  tasks: TaskRecord[];
  task_logs: TaskLogRecord[];
  rewards: RewardRecord[];
  reward_logs: RewardLogRecord[];
}

// ---------------------------------------------------------------------------
// Detect whether the native SQLite module is available at runtime.
// In Expo Go the native module is missing → we fall back to mock.
// ---------------------------------------------------------------------------
let SQLiteNative: any = null;
let nativeAvailable = false;
try {
  // NativeModules.SQLite is the bridge object installed by react-native-sqlite-storage.
  // When it is null / undefined (Expo Go), we must NOT require the JS wrapper
  // because it immediately tries to call into the native side and throws.
  if (NativeModules && NativeModules["SQLite"]) {
    // Only require the JS wrapper when we *know* native is present.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    SQLiteNative = require("react-native-sqlite-storage");
    nativeAvailable = true;
  }
} catch {
  nativeAvailable = false;
}

const MOCK_STORAGE_KEY = "smart_kids_diary_mock_db_v2";

// ---------------------------------------------------------------------------
// Helper functions for mock path
// ---------------------------------------------------------------------------
function normalize(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}
function mockRs<T>(rows: T[], rowsAffected: number): MockResultSet<T> {
  return {
    rows: { length: rows.length, item: (index: number): T => rows[index] },
    rowsAffected,
  };
}
function asString(value: SQLitePrimitive | undefined): string {
  if (typeof value !== "string") throw new Error("Expected string param.");
  return value;
}
function asNumber(value: SQLitePrimitive | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) throw new Error("Expected number param.");
  return value;
}

// ---------------------------------------------------------------------------
// Unified SQLiteDatabase class
// ---------------------------------------------------------------------------
export class SQLiteDatabase {
  private static instance: SQLiteDatabase | null = null;

  // Native path state
  private db: any = null;

  // Mock path state
  private useMock: boolean = !nativeAvailable;
  private mockInitialized: boolean = false;
  private state: DatabaseState = {
    children: [],
    tasks: [],
    task_logs: [],
    rewards: [],
    reward_logs: [],
  };

  // -----------------------------------------------------------------------
  // Constructor – only call enablePromise when native is really available
  // -----------------------------------------------------------------------
  private constructor() {
    if (nativeAvailable && SQLiteNative) {
      try {
        SQLiteNative.enablePromise(false);
      } catch {
        // If enablePromise itself throws, native is broken → switch to mock.
        this.useMock = true;
      }
    }
  }

  public static getInstance(): SQLiteDatabase {
    if (SQLiteDatabase.instance === null) {
      SQLiteDatabase.instance = new SQLiteDatabase();
    }
    return SQLiteDatabase.instance;
  }

  // =======================================================================
  // PUBLIC API
  // =======================================================================

  public async initialize(): Promise<void> {
    if (this.useMock) {
      if (this.mockInitialized) return;
      this.mockInitialized = true;
      await this.loadMockState();
      this.seedMock();
      await this.persistMock();
      return;
    }

    // Native path
    if (this.db !== null) return;
    try {
      this.db = await this.openNativeConnection();
      await this.runMigrations();
      await this.seedNativeData();
      await this.ensureSeeded();
    } catch {
      // Native init failed – fall back to mock on the fly.
      console.warn("[SQLiteDatabase] Native init failed – switching to in-memory mock.");
      this.useMock = true;
      this.mockInitialized = true;
      await this.loadMockState();
      this.seedMock();
      await this.persistMock();
    }
  }

  public async execute(sql: string, params: SQLParams = []): Promise<any> {
    if (this.useMock) {
      const result = this.runMock(normalize(sql), params);
      await this.persistMock();
      return result;
    }
    return this.executeNative(sql, params);
  }

  public async query<T>(sql: string, params: SQLParams = []): Promise<readonly T[]> {
    const result = await this.execute(sql, params);
    const items: T[] = [];
    if (result && result.rows && typeof result.rows.length === "number") {
      for (let index = 0; index < result.rows.length; index += 1) {
        const item = result.rows.item(index);
        if (item !== null && item !== undefined) {
          items.push(item as T);
        }
      }
    }
    return items;
  }

  public async transaction<T>(action: (transaction: any) => Promise<T>): Promise<T> {
    if (this.useMock) {
      const out: T = await action({ __type: "mock-transaction" } as MockTransaction);
      await this.persistMock();
      return out;
    }
    return this.transactionNative(action);
  }

  public async executeInTransaction(
    transaction: any,
    sql: string,
    params: SQLParams = [],
  ): Promise<any> {
    if (this.useMock) {
      return this.runMock(normalize(sql), params);
    }
    return this.executeInTransactionNative(transaction, sql, params);
  }

  // =======================================================================
  // NATIVE PATH – original SQLite logic
  // =======================================================================

  private async executeNative(sql: string, params: SQLParams): Promise<any> {
    const database = this.requireDb();
    return new Promise<any>((resolve, reject) => {
      database.executeSql(
        sql,
        [...params],
        (_transaction: any, resultSet: any) => resolve(resultSet),
        (_transaction: any, error: any) => {
          reject(error);
          return false;
        },
      );
    });
  }

  private async transactionNative<T>(action: (transaction: any) => Promise<T>): Promise<T> {
    const database = this.requireDb();
    return new Promise<T>((resolve, reject) => {
      database.transaction(
        (transaction: any) => {
          action(transaction).then(resolve).catch(reject);
        },
        (error: any) => reject(error),
      );
    });
  }

  private async executeInTransactionNative(
    transaction: any,
    sql: string,
    params: SQLParams,
  ): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      transaction.executeSql(
        sql,
        [...params],
        (_transaction: any, resultSet: any) => resolve(resultSet),
        (_transaction: any, error: any) => {
          reject(error);
          return false;
        },
      );
    });
  }

  private async openNativeConnection(): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      SQLiteNative.openDatabase(
        { name: "smart_kids_diary.db", location: "default" },
        (database: any) => resolve(database),
        (error: any) => reject(error),
      );
    });
  }

  private async runMigrations(): Promise<void> {
    await this.executeNative(
      `CREATE TABLE IF NOT EXISTS children (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        total_stars INTEGER NOT NULL DEFAULT 0 CHECK(total_stars >= 0)
      );`,
      [],
    );
    await this.executeNative(
      `CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        child_id TEXT NOT NULL,
        title TEXT NOT NULL,
        icon TEXT NOT NULL,
        points INTEGER NOT NULL CHECK(points > 0),
        description TEXT NOT NULL DEFAULT '',
        FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE
      );`,
      [],
    );
    await this.executeNative(
      `CREATE TABLE IF NOT EXISTS task_logs (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL,
        child_id TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE,
        UNIQUE(task_id, child_id, completed_at)
      );`,
      [],
    );
    await this.executeNative(
      `CREATE TABLE IF NOT EXISTS rewards (
        id TEXT PRIMARY KEY NOT NULL,
        child_id TEXT NOT NULL,
        title TEXT NOT NULL,
        points_required INTEGER NOT NULL CHECK(points_required > 0),
        stock INTEGER NOT NULL DEFAULT 1 CHECK(stock >= 0),
        FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE
      );`,
      [],
    );
    await this.executeNative(
      `CREATE TABLE IF NOT EXISTS reward_logs (
        id TEXT PRIMARY KEY NOT NULL,
        child_id TEXT NOT NULL,
        reward_title TEXT NOT NULL,
        points_spent INTEGER NOT NULL CHECK(points_spent > 0),
        redeemed_at TEXT NOT NULL,
        FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE
      );`,
      [],
    );
  }

  private async seedNativeData(): Promise<void> {
    await this.executeNative(
      `INSERT OR IGNORE INTO children (id, name, avatar, total_stars) VALUES
        ('child-gia-bao', 'Bé Gia Bảo', '🦁', 0),
        ('child-tue-lam', 'Bé Tuệ Lâm', '🦊', 0);`,
      [],
    );
    await this.executeNative(
      `INSERT OR IGNORE INTO tasks (id, child_id, title, icon, points, description) VALUES
        ('task-gb-1', 'child-gia-bao', 'Đánh răng buổi sáng', '🪥', 10, 'Đánh răng sạch sẽ sau khi thức dậy.'),
        ('task-gb-2', 'child-gia-bao', 'Xếp chăn gối', '🛏️', 8, 'Tự xếp chăn gối gọn gàng.'),
        ('task-tl-1', 'child-tue-lam', 'Dọn đồ chơi', '🧸', 12, 'Cất đồ chơi vào hộp sau khi chơi.'),
        ('task-tl-2', 'child-tue-lam', 'Rửa tay trước ăn', '🫧', 6, 'Rửa tay bằng xà phòng trước bữa ăn.');`,
      [],
    );
  }

  private async ensureSeeded(): Promise<void> {
    try {
      const result = await this.executeNative("SELECT COUNT(1) AS total FROM children;", []);
      if (result && result.rows && result.rows.length > 0) {
        const firstItem = result.rows.item(0);
        const total: number = Number(firstItem ? (firstItem.total ?? 0) : 0);
        if (total > 0) return;
      }
    } catch {
      // If count query fails, fall back to re-seeding.
    }
    await this.seedNativeData();
  }

  private requireDb(): any {
    if (this.db === null) {
      throw new Error("SQLiteDatabase is not initialized. Call initialize() first.");
    }
    return this.db;
  }

  // =======================================================================
  // MOCK PATH – in-memory database with AsyncStorage persistence
  // =======================================================================

  private runMock(sql: string, params: SQLParams): MockResultSet {
    if (sql.startsWith("CREATE TABLE IF NOT EXISTS")) return mockRs([], 0);
    if (sql.startsWith("SELECT COUNT(1) AS total FROM children"))
      return mockRs([{ total: this.state.children.length }], 0);
    if (sql.startsWith("SELECT COUNT(1) AS total FROM tasks"))
      return mockRs([{ total: this.state.tasks.length }], 0);

    // --- children ---
    if (sql.startsWith("SELECT id, name, avatar, total_stars FROM children")) {
      return mockRs(
        this.state.children.slice().sort((a, b) => a.name.localeCompare(b.name)),
        0,
      );
    }
    if (sql.startsWith("INSERT INTO children")) {
      this.state.children.push({
        id: asString(params[0]),
        name: asString(params[1]),
        avatar: asString(params[2]),
        total_stars: 0,
      });
      return mockRs([], 1);
    }
    if (sql.startsWith("DELETE FROM children WHERE id = ?")) {
      const id = asString(params[0]);
      const before = this.state.children.length;
      this.state.children = this.state.children.filter((c) => c.id !== id);
      return mockRs([], before - this.state.children.length);
    }
    if (sql.startsWith("UPDATE children SET name = ? WHERE id = ?")) {
      const newName = asString(params[0]);
      const id = asString(params[1]);
      this.state.children = this.state.children.map((c) =>
        c.id === id ? { ...c, name: newName } : c,
      );
      return mockRs([], 1);
    }
    if (sql.startsWith("UPDATE children SET total_stars = total_stars + ? WHERE id = ?")) {
      const add = asNumber(params[0]);
      const id = asString(params[1]);
      this.state.children = this.state.children.map((c) =>
        c.id === id ? { ...c, total_stars: c.total_stars + add } : c,
      );
      return mockRs([], 1);
    }
    if (sql.startsWith("UPDATE children SET total_stars = total_stars - ? WHERE id = ?")) {
      const minus = asNumber(params[0]);
      const id = asString(params[1]);
      this.state.children = this.state.children.map((c) =>
        c.id === id ? { ...c, total_stars: c.total_stars - minus } : c,
      );
      return mockRs([], 1);
    }
    if (sql.startsWith("SELECT total_stars FROM children WHERE id = ?")) {
      const id = asString(params[0]);
      const found = this.state.children.find((c) => c.id === id);
      return mockRs(found ? [{ total_stars: found.total_stars }] : [], 0);
    }

    // --- tasks ---
    if (sql.startsWith("INSERT INTO tasks")) {
      this.state.tasks.push({
        id: asString(params[0]),
        child_id: asString(params[1]),
        title: asString(params[2]),
        icon: asString(params[3]),
        points: asNumber(params[4]),
        description: "",
      });
      return mockRs([], 1);
    }
    if (sql.startsWith("DELETE FROM tasks WHERE child_id = ?")) {
      const childId = asString(params[0]);
      const before = this.state.tasks.length;
      this.state.tasks = this.state.tasks.filter((t) => t.child_id !== childId);
      return mockRs([], before - this.state.tasks.length);
    }
    if (sql.startsWith("DELETE FROM task_logs WHERE child_id = ?")) {
      const childId = asString(params[0]);
      const before = this.state.task_logs.length;
      this.state.task_logs = this.state.task_logs.filter((l) => l.child_id !== childId);
      return mockRs([], before - this.state.task_logs.length);
    }
    if (sql.startsWith("DELETE FROM rewards WHERE child_id = ?")) {
      const childId = asString(params[0]);
      const before = this.state.rewards.length;
      this.state.rewards = this.state.rewards.filter((r) => r.child_id !== childId);
      return mockRs([], before - this.state.rewards.length);
    }
    if (sql.startsWith("DELETE FROM reward_logs WHERE child_id = ?")) {
      const childId = asString(params[0]);
      const before = this.state.reward_logs.length;
      this.state.reward_logs = this.state.reward_logs.filter((r) => r.child_id !== childId);
      return mockRs([], before - this.state.reward_logs.length);
    }
    if (sql.startsWith("DELETE FROM tasks WHERE id = ? AND child_id = ?")) {
      const taskId = asString(params[0]);
      const childId = asString(params[1]);
      const before = this.state.tasks.length;
      this.state.tasks = this.state.tasks.filter(
        (t) => !(t.id === taskId && t.child_id === childId),
      );
      return mockRs([], before - this.state.tasks.length);
    }
    if (sql.startsWith("SELECT id, points FROM tasks WHERE id = ? AND child_id = ?")) {
      const taskId = asString(params[0]);
      const childId = asString(params[1]);
      const found = this.state.tasks.find(
        (t) => t.id === taskId && t.child_id === childId,
      );
      return mockRs(found ? [{ id: found.id, points: found.points }] : [], 0);
    }
    if (sql.includes("FROM tasks t LEFT JOIN task_logs tl")) {
      const day = asString(params[0]);
      const childId = asString(params[1]);
      const rows = this.state.tasks
        .filter((t) => t.child_id === childId)
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((t) => ({
          id: t.id,
          child_id: t.child_id,
          title: t.title,
          icon: t.icon,
          points: t.points,
          description: t.description,
          is_completed: this.state.task_logs.some(
            (l) =>
              l.task_id === t.id && l.child_id === t.child_id && l.completed_at === day,
          )
            ? 1
            : 0,
        }));
      return mockRs(rows, 0);
    }

    // --- task_logs ---
    if (
      sql.startsWith(
        "SELECT id FROM task_logs WHERE task_id = ? AND child_id = ? AND completed_at = ?",
      )
    ) {
      const taskId = asString(params[0]);
      const childId = asString(params[1]);
      const day = asString(params[2]);
      const found = this.state.task_logs.find(
        (l) => l.task_id === taskId && l.child_id === childId && l.completed_at === day,
      );
      return mockRs(found ? [{ id: found.id }] : [], 0);
    }
    if (sql.startsWith("INSERT INTO task_logs")) {
      this.state.task_logs.push({
        id: asString(params[0]),
        task_id: asString(params[1]),
        child_id: asString(params[2]),
        completed_at: asString(params[3]),
      });
      return mockRs([], 1);
    }
    if (sql.includes("FROM task_logs tl INNER JOIN tasks t")) {
      const childId = asString(params[0]);
      const rows = this.state.task_logs
        .filter((l) => l.child_id === childId)
        .sort((a, b) => b.completed_at.localeCompare(a.completed_at))
        .map((l) => ({
          id: l.id,
          task_id: l.task_id,
          child_id: l.child_id,
          completed_at: l.completed_at,
          task_title: this.state.tasks.find((t) => t.id === l.task_id)?.title ?? "",
        }));
      return mockRs(rows, 0);
    }

    // --- rewards ---
    if (sql.startsWith("INSERT INTO rewards")) {
      this.state.rewards.push({
        id: asString(params[0]),
        child_id: asString(params[1]),
        title: asString(params[2]),
        points_required: asNumber(params[3]),
        stock: asNumber(params[4]),
      });
      return mockRs([], 1);
    }
    if (
      sql.startsWith(
        "SELECT id, child_id, title, points_required, stock FROM rewards WHERE child_id = ?",
      )
    ) {
      const childId = asString(params[0]);
      const rows = this.state.rewards
        .filter((r) => r.child_id === childId)
        .sort((a, b) => a.title.localeCompare(b.title));
      return mockRs(rows, 0);
    }
    if (
      sql.startsWith(
        "SELECT title, points_required, stock FROM rewards WHERE id = ? AND child_id = ?",
      )
    ) {
      const rewardId = asString(params[0]);
      const childId = asString(params[1]);
      const found = this.state.rewards.find(
        (r) => r.id === rewardId && r.child_id === childId,
      );
      return mockRs(
        found
          ? [
              {
                title: found.title,
                points_required: found.points_required,
                stock: found.stock,
              },
            ]
          : [],
        0,
      );
    }
    if (sql.startsWith("UPDATE rewards SET stock = stock - 1 WHERE id = ? AND child_id = ?")) {
      const rewardId = asString(params[0]);
      const childId = asString(params[1]);
      this.state.rewards = this.state.rewards.map((r) =>
        r.id === rewardId && r.child_id === childId
          ? { ...r, stock: Math.max(0, r.stock - 1) }
          : r,
      );
      return mockRs([], 1);
    }

    // --- reward_logs ---
    if (sql.startsWith("INSERT INTO reward_logs")) {
      this.state.reward_logs.push({
        id: asString(params[0]),
        child_id: asString(params[1]),
        reward_title: asString(params[2]),
        points_spent: asNumber(params[3]),
        redeemed_at: asString(params[4]),
      });
      return mockRs([], 1);
    }
    if (
      sql.startsWith(
        "SELECT id, child_id, reward_title, points_spent, redeemed_at FROM reward_logs WHERE child_id = ?",
      )
    ) {
      const childId = asString(params[0]);
      const rows = this.state.reward_logs
        .filter((l) => l.child_id === childId)
        .sort((a, b) => b.redeemed_at.localeCompare(a.redeemed_at));
      return mockRs(rows, 0);
    }

    // Catch-all for INSERT OR IGNORE (seed statements)
    if (sql.startsWith("INSERT OR IGNORE")) return mockRs([], 0);

    console.warn(`[SQLiteDatabase Mock] Unsupported SQL: ${sql}`);
    return mockRs([], 0);
  }

  private seedMock(): void {
    if (this.state.children.length === 0) {
      this.state.children = [
        { id: "child-gia-bao", name: "Bé Gia Bảo", avatar: "🦁", total_stars: 0 },
        { id: "child-tue-lam", name: "Bé Tuệ Lâm", avatar: "🦊", total_stars: 0 },
      ];
    }
    if (this.state.tasks.length === 0) {
      this.state.tasks = [
        {
          id: "task-gb-1",
          child_id: "child-gia-bao",
          title: "Đánh răng buổi sáng",
          icon: "🪥",
          points: 10,
          description: "",
        },
        {
          id: "task-gb-2",
          child_id: "child-gia-bao",
          title: "Xếp chăn gối",
          icon: "🛏️",
          points: 8,
          description: "",
        },
        {
          id: "task-tl-1",
          child_id: "child-tue-lam",
          title: "Dọn đồ chơi",
          icon: "🧸",
          points: 12,
          description: "",
        },
        {
          id: "task-tl-2",
          child_id: "child-tue-lam",
          title: "Rửa tay trước ăn",
          icon: "🫧",
          points: 6,
          description: "",
        },
      ];
    }
  }

  private async loadMockState(): Promise<void> {
    try {
      const raw: string | null = await AsyncStorage.getItem(MOCK_STORAGE_KEY);
      if (raw === null) return;
      const parsed: any = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        this.state = {
          children: Array.isArray(parsed.children) ? parsed.children : [],
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
          task_logs: Array.isArray(parsed.task_logs) ? parsed.task_logs : [],
          rewards: Array.isArray(parsed.rewards) ? parsed.rewards : [],
          reward_logs: Array.isArray(parsed.reward_logs) ? parsed.reward_logs : [],
        };
      }
    } catch {
      this.state = { children: [], tasks: [], task_logs: [], rewards: [], reward_logs: [] };
    }
  }

  private async persistMock(): Promise<void> {
    try {
      await AsyncStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Silently ignore persistence errors – data still exists in memory for the session.
    }
  }
}
