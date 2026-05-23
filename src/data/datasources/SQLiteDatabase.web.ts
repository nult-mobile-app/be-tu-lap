type SQLitePrimitive = string | number | null;
export type SQLParams = readonly SQLitePrimitive[];

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

interface WebRows<T> {
  length: number;
  item: (index: number) => T;
}
interface WebResultSet<T = unknown> {
  rows: WebRows<T>;
  rowsAffected: number;
}
interface WebTransaction {
  readonly __type: "web-transaction";
}

const STORAGE_KEY = "smart_kids_diary_web_db_v2";

export class SQLiteDatabase {
  private static instance: SQLiteDatabase | null = null;
  private initialized: boolean = false;
  private state: DatabaseState = {
    children: [],
    tasks: [],
    task_logs: [],
    rewards: [],
    reward_logs: [],
  };

  public static getInstance(): SQLiteDatabase {
    if (SQLiteDatabase.instance === null) {
      SQLiteDatabase.instance = new SQLiteDatabase();
    }
    return SQLiteDatabase.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.loadState();
    this.seed();
    this.persist();
  }

  public async execute(sql: string, params: SQLParams = []): Promise<WebResultSet> {
    const result: WebResultSet = this.run(normalize(sql), params);
    this.persist();
    return result;
  }

  public async query<T>(sql: string, params: SQLParams = []): Promise<readonly T[]> {
    const rs: WebResultSet = await this.execute(sql, params);
    const rows: T[] = [];
    for (let i = 0; i < rs.rows.length; i += 1) {
      rows.push(rs.rows.item(i) as T);
    }
    return rows;
  }

  public async transaction<T>(action: (transaction: WebTransaction) => Promise<T>): Promise<T> {
    const out: T = await action({ __type: "web-transaction" });
    this.persist();
    return out;
  }

  public async executeInTransaction(
    _transaction: WebTransaction,
    sql: string,
    params: SQLParams = [],
  ): Promise<WebResultSet> {
    return this.run(normalize(sql), params);
  }

  private run(sql: string, params: SQLParams): WebResultSet {
    if (sql.startsWith("CREATE TABLE IF NOT EXISTS")) return rs([], 0);
    if (sql.startsWith("SELECT COUNT(1) AS total FROM children")) return rs([{ total: this.state.children.length }], 0);
    if (sql.startsWith("SELECT COUNT(1) AS total FROM tasks")) return rs([{ total: this.state.tasks.length }], 0);

    if (sql.startsWith("SELECT id, name, avatar, total_stars FROM children")) {
      return rs(this.state.children.slice().sort((a, b) => a.name.localeCompare(b.name)), 0);
    }
    if (sql.startsWith("INSERT INTO children")) {
      this.state.children.push({
        id: asString(params[0]),
        name: asString(params[1]),
        avatar: asString(params[2]),
        total_stars: 0,
      });
      return rs([], 1);
    }
    if (sql.startsWith("DELETE FROM children WHERE id = ?")) {
      const id: string = asString(params[0]);
      const before: number = this.state.children.length;
      this.state.children = this.state.children.filter((c) => c.id !== id);
      return rs([], before - this.state.children.length);
    }
    if (sql.startsWith("UPDATE children SET name = ? WHERE id = ?")) {
      const newName: string = asString(params[0]);
      const id: string = asString(params[1]);
      this.state.children = this.state.children.map((c) => (c.id === id ? { ...c, name: newName } : c));
      return rs([], 1);
    }
    if (sql.startsWith("UPDATE children SET total_stars = total_stars + ? WHERE id = ?")) {
      const add: number = asNumber(params[0]);
      const id: string = asString(params[1]);
      this.state.children = this.state.children.map((c) => (c.id === id ? { ...c, total_stars: c.total_stars + add } : c));
      return rs([], 1);
    }
    if (sql.startsWith("UPDATE children SET total_stars = total_stars - ? WHERE id = ?")) {
      const minus: number = asNumber(params[0]);
      const id: string = asString(params[1]);
      this.state.children = this.state.children.map((c) => (c.id === id ? { ...c, total_stars: c.total_stars - minus } : c));
      return rs([], 1);
    }
    if (sql.startsWith("SELECT total_stars FROM children WHERE id = ?")) {
      const id: string = asString(params[0]);
      const found: ChildRecord | undefined = this.state.children.find((c) => c.id === id);
      return rs(found ? [{ total_stars: found.total_stars }] : [], 0);
    }

    if (sql.startsWith("INSERT INTO tasks")) {
      this.state.tasks.push({
        id: asString(params[0]),
        child_id: asString(params[1]),
        title: asString(params[2]),
        icon: asString(params[3]),
        points: asNumber(params[4]),
        description: "",
      });
      return rs([], 1);
    }
    if (sql.startsWith("DELETE FROM tasks WHERE child_id = ?")) {
      const childId: string = asString(params[0]);
      const before: number = this.state.tasks.length;
      this.state.tasks = this.state.tasks.filter((t) => t.child_id !== childId);
      return rs([], before - this.state.tasks.length);
    }
    if (sql.startsWith("DELETE FROM task_logs WHERE child_id = ?")) {
      const childId: string = asString(params[0]);
      const before: number = this.state.task_logs.length;
      this.state.task_logs = this.state.task_logs.filter((l) => l.child_id !== childId);
      return rs([], before - this.state.task_logs.length);
    }
    if (sql.startsWith("DELETE FROM rewards WHERE child_id = ?")) {
      const childId: string = asString(params[0]);
      const before: number = this.state.rewards.length;
      this.state.rewards = this.state.rewards.filter((r) => r.child_id !== childId);
      return rs([], before - this.state.rewards.length);
    }
    if (sql.startsWith("DELETE FROM reward_logs WHERE child_id = ?")) {
      const childId: string = asString(params[0]);
      const before: number = this.state.reward_logs.length;
      this.state.reward_logs = this.state.reward_logs.filter((r) => r.child_id !== childId);
      return rs([], before - this.state.reward_logs.length);
    }
    if (sql.startsWith("DELETE FROM tasks WHERE id = ? AND child_id = ?")) {
      const taskId: string = asString(params[0]);
      const childId: string = asString(params[1]);
      const before: number = this.state.tasks.length;
      this.state.tasks = this.state.tasks.filter((t) => !(t.id === taskId && t.child_id === childId));
      return rs([], before - this.state.tasks.length);
    }
    if (sql.startsWith("SELECT id, points FROM tasks WHERE id = ? AND child_id = ?")) {
      const taskId: string = asString(params[0]);
      const childId: string = asString(params[1]);
      const found: TaskRecord | undefined = this.state.tasks.find((t) => t.id === taskId && t.child_id === childId);
      return rs(found ? [{ id: found.id, points: found.points }] : [], 0);
    }
    if (sql.includes("FROM tasks t LEFT JOIN task_logs tl")) {
      const day: string = asString(params[0]);
      const childId: string = asString(params[1]);
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
            (l) => l.task_id === t.id && l.child_id === t.child_id && l.completed_at === day,
          )
            ? 1
            : 0,
        }));
      return rs(rows, 0);
    }

    if (sql.startsWith("SELECT id FROM task_logs WHERE task_id = ? AND child_id = ? AND completed_at = ?")) {
      const taskId: string = asString(params[0]);
      const childId: string = asString(params[1]);
      const day: string = asString(params[2]);
      const found = this.state.task_logs.find((l) => l.task_id === taskId && l.child_id === childId && l.completed_at === day);
      return rs(found ? [{ id: found.id }] : [], 0);
    }
    if (sql.startsWith("INSERT INTO task_logs")) {
      this.state.task_logs.push({
        id: asString(params[0]),
        task_id: asString(params[1]),
        child_id: asString(params[2]),
        completed_at: asString(params[3]),
      });
      return rs([], 1);
    }
    if (sql.includes("FROM task_logs tl INNER JOIN tasks t")) {
      const childId: string = asString(params[0]);
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
      return rs(rows, 0);
    }

    if (sql.startsWith("INSERT INTO rewards")) {
      this.state.rewards.push({
        id: asString(params[0]),
        child_id: asString(params[1]),
        title: asString(params[2]),
        points_required: asNumber(params[3]),
        stock: asNumber(params[4]),
      });
      return rs([], 1);
    }
    if (sql.startsWith("SELECT id, child_id, title, points_required, stock FROM rewards WHERE child_id = ?")) {
      const childId: string = asString(params[0]);
      const rows = this.state.rewards.filter((r) => r.child_id === childId).sort((a, b) => a.title.localeCompare(b.title));
      return rs(rows, 0);
    }
    if (sql.startsWith("SELECT title, points_required, stock FROM rewards WHERE id = ? AND child_id = ?")) {
      const rewardId: string = asString(params[0]);
      const childId: string = asString(params[1]);
      const found = this.state.rewards.find((r) => r.id === rewardId && r.child_id === childId);
      return rs(found ? [{ title: found.title, points_required: found.points_required, stock: found.stock }] : [], 0);
    }
    if (sql.startsWith("UPDATE rewards SET stock = stock - 1 WHERE id = ? AND child_id = ?")) {
      const rewardId: string = asString(params[0]);
      const childId: string = asString(params[1]);
      this.state.rewards = this.state.rewards.map((r) =>
        r.id === rewardId && r.child_id === childId ? { ...r, stock: Math.max(0, r.stock - 1) } : r,
      );
      return rs([], 1);
    }
    if (sql.startsWith("INSERT INTO reward_logs")) {
      this.state.reward_logs.push({
        id: asString(params[0]),
        child_id: asString(params[1]),
        reward_title: asString(params[2]),
        points_spent: asNumber(params[3]),
        redeemed_at: asString(params[4]),
      });
      return rs([], 1);
    }
    if (sql.startsWith("SELECT id, child_id, reward_title, points_spent, redeemed_at FROM reward_logs WHERE child_id = ?")) {
      const childId: string = asString(params[0]);
      const rows = this.state.reward_logs.filter((l) => l.child_id === childId).sort((a, b) => b.redeemed_at.localeCompare(a.redeemed_at));
      return rs(rows, 0);
    }

    throw new Error(`Unsupported SQL for web datasource: ${sql}`);
  }

  private seed(): void {
    if (this.state.children.length === 0) {
      this.state.children = [
        { id: "child-gia-bao", name: "Bé Gia Bảo", avatar: "🦁", total_stars: 0 },
        { id: "child-tue-lam", name: "Bé Tuệ Lâm", avatar: "🦊", total_stars: 0 },
      ];
    }
    if (this.state.tasks.length === 0) {
      this.state.tasks = [
        { id: "task-gb-1", child_id: "child-gia-bao", title: "Đánh răng buổi sáng", icon: "🪥", points: 10, description: "" },
        { id: "task-gb-2", child_id: "child-gia-bao", title: "Xếp chăn gối", icon: "🛏️", points: 8, description: "" },
        { id: "task-tl-1", child_id: "child-tue-lam", title: "Dọn đồ chơi", icon: "🧸", points: 12, description: "" },
        { id: "task-tl-2", child_id: "child-tue-lam", title: "Rửa tay trước ăn", icon: "🫧", points: 6, description: "" },
      ];
    }
  }

  private loadState(): void {
    if (typeof localStorage === "undefined") return;
    const raw: string | null = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return;
    try {
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

  private persist(): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }
}

function normalize(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}
function rs<T>(rows: T[], rowsAffected: number): WebResultSet<T> {
  return { rows: { length: rows.length, item: (index: number): T => rows[index] }, rowsAffected };
}
function asString(value: SQLitePrimitive | undefined): string {
  if (typeof value !== "string") throw new Error("Expected string param.");
  return value;
}
function asNumber(value: SQLitePrimitive | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) throw new Error("Expected number param.");
  return value;
}
