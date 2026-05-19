import SQLite, {
  type ResultSet,
  type SQLiteDatabase as NativeSQLiteDatabase,
  type Transaction,
} from "react-native-sqlite-storage";

type SQLitePrimitive = string | number | null;
export type SQLParams = readonly SQLitePrimitive[];

export class SQLiteDatabase {
  private static instance: SQLiteDatabase | null = null;
  private db: NativeSQLiteDatabase | null = null;

  private constructor() {
    SQLite.enablePromise(false);
  }

  public static getInstance(): SQLiteDatabase {
    if (SQLiteDatabase.instance === null) {
      SQLiteDatabase.instance = new SQLiteDatabase();
    }
    return SQLiteDatabase.instance;
  }

  public async initialize(): Promise<void> {
    if (this.db !== null) {
      return;
    }

    this.db = await this.openConnection();
    await this.runMigrations();
    await this.seedData();
  }

  public async execute(sql: string, params: SQLParams = []): Promise<ResultSet> {
    const database: NativeSQLiteDatabase = this.requireDb();

    // Wrap callback-style SQLite call into Promise so async/await can safely sequence writes.
    return new Promise<ResultSet>((resolve, reject) => {
      database.executeSql(
        sql,
        [...params],
        (_transaction: Transaction, resultSet: ResultSet) => {
          resolve(resultSet);
        },
        (_transaction: Transaction, error: Error) => {
          reject(error);
          return false;
        },
      );
    });
  }

  public async query<T>(sql: string, params: SQLParams = []): Promise<readonly T[]> {
    const result: ResultSet = await this.execute(sql, params);
    const items: T[] = [];

    for (let index = 0; index < result.rows.length; index += 1) {
      items.push(result.rows.item(index) as T);
    }

    return items;
  }

  public async transaction<T>(
    action: (transaction: Transaction) => Promise<T>,
  ): Promise<T> {
    const database: NativeSQLiteDatabase = this.requireDb();

    // Bridge sqlite transaction callbacks to Promise to preserve rollback/commit flow with await.
    return new Promise<T>((resolve, reject) => {
      database.transaction(
        (transaction: Transaction) => {
          action(transaction).then(resolve).catch(reject);
        },
        (error: Error) => reject(error),
      );
    });
  }

  public async executeInTransaction(
    transaction: Transaction,
    sql: string,
    params: SQLParams = [],
  ): Promise<ResultSet> {
    // Keep every statement callback-based but exposed as Promise for deterministic async control.
    return new Promise<ResultSet>((resolve, reject) => {
      transaction.executeSql(
        sql,
        [...params],
        (_transaction: Transaction, resultSet: ResultSet) => resolve(resultSet),
        (_transaction: Transaction, error: Error) => {
          reject(error);
          return false;
        },
      );
    });
  }

  private async openConnection(): Promise<NativeSQLiteDatabase> {
    return new Promise<NativeSQLiteDatabase>((resolve, reject) => {
      SQLite.openDatabase(
        {
          name: "smart_kids_diary.db",
          location: "default",
        },
        (database: NativeSQLiteDatabase) => resolve(database),
        (error: Error) => reject(error),
      );
    });
  }

  private async runMigrations(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS children (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        total_stars INTEGER NOT NULL DEFAULT 0 CHECK(total_stars >= 0)
      );
    `);

    await this.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        child_id TEXT NOT NULL,
        title TEXT NOT NULL,
        icon TEXT NOT NULL,
        points INTEGER NOT NULL CHECK(points > 0),
        description TEXT NOT NULL DEFAULT '',
        FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE
      );
    `);

    await this.execute(`
      CREATE TABLE IF NOT EXISTS task_logs (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL,
        child_id TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE,
        UNIQUE(task_id, child_id, completed_at)
      );
    `);

    await this.execute(`
      CREATE TABLE IF NOT EXISTS rewards (
        id TEXT PRIMARY KEY NOT NULL,
        child_id TEXT NOT NULL,
        title TEXT NOT NULL,
        points_required INTEGER NOT NULL CHECK(points_required > 0),
        stock INTEGER NOT NULL DEFAULT 1 CHECK(stock >= 0),
        FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE
      );
    `);

    await this.execute(`
      CREATE TABLE IF NOT EXISTS reward_logs (
        id TEXT PRIMARY KEY NOT NULL,
        child_id TEXT NOT NULL,
        reward_title TEXT NOT NULL,
        points_spent INTEGER NOT NULL CHECK(points_spent > 0),
        redeemed_at TEXT NOT NULL,
        FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE
      );
    `);
  }

  private async seedData(): Promise<void> {
    const childCountResult: ResultSet = await this.execute(
      "SELECT COUNT(1) AS total FROM children;",
    );
    const childCount: number = Number(childCountResult.rows.item(0).total ?? 0);
    if (childCount === 0) {
      await this.execute(
        `
        INSERT INTO children (id, name, avatar, total_stars)
        VALUES
          ('child-gia-bao', 'Bé Gia Bảo', '🦁', 0),
          ('child-tue-lam', 'Bé Tuệ Lâm', '🦊', 0);
        `,
      );
    }

    const taskCountResult: ResultSet = await this.execute("SELECT COUNT(1) AS total FROM tasks;");
    const taskCount: number = Number(taskCountResult.rows.item(0).total ?? 0);
    if (taskCount === 0) {
      await this.execute(`
        INSERT INTO tasks (id, child_id, title, icon, points, description)
        VALUES
          ('task-gb-1', 'child-gia-bao', 'Đánh răng buổi sáng', '🪥', 10, 'Đánh răng sạch sẽ sau khi thức dậy.'),
          ('task-gb-2', 'child-gia-bao', 'Xếp chăn gối', '🛏️', 8, 'Tự xếp chăn gối gọn gàng.'),
          ('task-tl-1', 'child-tue-lam', 'Dọn đồ chơi', '🧸', 12, 'Cất đồ chơi vào hộp sau khi chơi.'),
          ('task-tl-2', 'child-tue-lam', 'Rửa tay trước ăn', '🫧', 6, 'Rửa tay bằng xà phòng trước bữa ăn.');
      `);
    }
  }

  private requireDb(): NativeSQLiteDatabase {
    if (this.db === null) {
      throw new Error("SQLiteDatabase is not initialized. Call initialize() first.");
    }

    return this.db;
  }
}
