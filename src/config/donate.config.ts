/**
 * donate.config.ts
 *
 * ─── Cấu hình cho tính năng Donate / Mời Cafe ────────────────────────────────
 *
 * QR CODE
 * ───────
 * Để cập nhật ảnh QR mới:
 *   1. Đặt file ảnh mới vào thư mục: src/presentation/assets/
 *   2. Đổi dòng `require(...)` bên dưới trỏ tới file mới là xong.
 *
 * TELEGRAM
 * ────────
 * Token và Chat ID được đọc tự động từ file .env (EXPO_PUBLIC_*).
 * Chỉnh sửa file .env ở thư mục gốc dự án.
 */

// ─── QR Code image ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const DONATE_QR_SOURCE = require("../presentation/assets/donate_qr.png") as number;

// ─── Telegram config (từ biến môi trường) ────────────────────────────────────
export const TELEGRAM_BOT_TOKEN: string =
  process.env.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN ?? "";

export const TELEGRAM_CHAT_ID: string =
  process.env.EXPO_PUBLIC_TELEGRAM_CHAT_ID ?? "";
