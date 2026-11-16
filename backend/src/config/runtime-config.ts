import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Cấu hình chạy công khai (ngrok, Render, Railway...) đọc từ biến môi trường.
 * Giá trị mặc định giữ nguyên hành vi cũ, nên không đặt biến nào thì
 * backend chạy y như trước.
 */

// ---------------------------------------------------------------
// CORS
// ---------------------------------------------------------------

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '').toLowerCase();
}

/**
 * Kiểm tra origin của trình duyệt có nằm trong danh sách cho phép không.
 * Mỗi mục là một origin đầy đủ (https://app.vercel.app) hoặc mẫu có
 * ký tự đại diện ở tên miền con (https://*.vercel.app, dùng cho các bản
 * preview của Vercel).
 */
export function isOriginAllowed(origin: string, allowList: string[]): boolean {
  const target = normalizeOrigin(origin);

  return allowList.some((entry) => {
    const pattern = normalizeOrigin(entry);

    if (!pattern.includes('*')) return pattern === target;

    // "https://*.vercel.app" => khớp đúng một hoặc nhiều nhãn tên miền con,
    // không khớp "https://vercel.app" hay "https://evilvercel.app".
    const [scheme, host] = pattern.split('://');
    if (!scheme || !host?.startsWith('*.')) return false;

    const suffix = host.slice(1); // ".vercel.app"
    const targetUrl = URL.canParse(target) ? new URL(target) : null;
    if (!targetUrl) return false;

    return (
      targetUrl.protocol === `${scheme}:` &&
      targetUrl.host.endsWith(suffix) &&
      targetUrl.host.length > suffix.length
    );
  });
}

/**
 * CORS_ORIGINS: danh sách origin được phép, cách nhau bằng dấu phẩy.
 * - Không đặt (hoặc "*"): cho phép mọi origin (hành vi cũ).
 * - Request không có header Origin (curl, Postman, VNPay gọi IPN): luôn được phép.
 *
 * Không đặt allowedHeaders: thư viện cors sẽ phản hồi đúng các header trình
 * duyệt xin phép, nên Authorization, Idempotency-Key và
 * ngrok-skip-browser-warning đều đi qua được.
 */
export function buildCorsOptions(raw?: string): CorsOptions {
  const allowList = (raw ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (allowList.length === 0 || allowList.includes('*')) {
    return { origin: true };
  }

  return {
    origin: (requestOrigin, callback) => {
      if (!requestOrigin || isOriginAllowed(requestOrigin, allowList)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
  };
}

// ---------------------------------------------------------------
// TypeORM / PostgreSQL
// ---------------------------------------------------------------

export interface EnvReader {
  get<T = string>(key: string): T | undefined;
}

const isTrue = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value.trim() === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
};

/**
 * - DB_SYNCHRONIZE: mặc định true (như cũ). Đặt false khi database đã ổn định.
 * - DB_SSL: đặt true nếu database là dịch vụ đám mây yêu cầu SSL
 *   (Neon, Supabase, Render, Railway...). Mặc định false (Postgres local).
 *   Dùng rejectUnauthorized=false vì các dịch vụ này thường dùng chứng chỉ
 *   tự cấp.
 */
export function buildTypeOrmOptions(config: EnvReader) {
  return {
    type: 'postgres' as const,
    url: config.get<string>('DATABASE_URL'),
    autoLoadEntities: true,
    synchronize: isTrue(config.get<string>('DB_SYNCHRONIZE'), true),
    ssl: isTrue(config.get<string>('DB_SSL'), false)
      ? { rejectUnauthorized: false }
      : false,
  };
}
