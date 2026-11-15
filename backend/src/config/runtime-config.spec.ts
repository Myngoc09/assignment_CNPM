import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import {
  buildCorsOptions,
  buildTypeOrmOptions,
  isOriginAllowed,
} from './runtime-config';

describe('isOriginAllowed', () => {
  const list = [
    'https://brewlite-frontend-sand.vercel.app/',
    'http://localhost:3000',
    'https://*.vercel.app',
  ];

  it('khớp chính xác, bỏ qua dấu "/" cuối và hoa/thường', () => {
    expect(
      isOriginAllowed('https://BrewLite-Frontend-Sand.vercel.app', list),
    ).toBe(true);
    expect(isOriginAllowed('http://localhost:3000', list)).toBe(true);
    expect(isOriginAllowed('http://localhost:3001', list)).toBe(false);
  });

  it('mẫu *.vercel.app khớp preview nhưng không khớp tên miền giả', () => {
    expect(isOriginAllowed('https://brewlite-git-main-x.vercel.app', list)).toBe(
      true,
    );
    expect(isOriginAllowed('https://vercel.app', ['https://*.vercel.app'])).toBe(
      false,
    );
    expect(
      isOriginAllowed('https://evilvercel.app', ['https://*.vercel.app']),
    ).toBe(false);
    expect(
      isOriginAllowed('https://a.vercel.app.evil.com', ['https://*.vercel.app']),
    ).toBe(false);
    expect(
      isOriginAllowed('http://a.vercel.app', ['https://*.vercel.app']),
    ).toBe(false);
  });
});

describe('buildCorsOptions', () => {
  it('không đặt hoặc "*" => cho phép mọi origin (hành vi cũ)', () => {
    expect(buildCorsOptions(undefined)).toEqual({ origin: true });
    expect(buildCorsOptions('')).toEqual({ origin: true });
    expect(buildCorsOptions('*')).toEqual({ origin: true });
  });
});

@Controller()
class PingController {
  @Get('ping')
  ping() {
    return { ok: true };
  }
}

describe('CORS qua HTTP (giống cấu hình trong main.ts)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PingController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableCors(
      buildCorsOptions(
        'https://brewlite-frontend-sand.vercel.app,http://localhost:3000',
      ),
    );
    await app.init();
  });

  afterAll(() => app.close());

  const preflight = (origin: string) =>
    request(app.getHttpServer())
      .options('/ping')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST')
      .set(
        'Access-Control-Request-Headers',
        'authorization,content-type,idempotency-key,ngrok-skip-browser-warning',
      );

  it('origin Vercel được phép và các header của frontend đi qua được', async () => {
    const res = await preflight('https://brewlite-frontend-sand.vercel.app');

    expect(res.headers['access-control-allow-origin']).toBe(
      'https://brewlite-frontend-sand.vercel.app',
    );
    const allowed = String(res.headers['access-control-allow-headers']);
    for (const header of [
      'authorization',
      'idempotency-key',
      'ngrok-skip-browser-warning',
    ]) {
      expect(allowed.toLowerCase()).toContain(header);
    }
  });

  it('origin lạ không nhận header cho phép', async () => {
    const res = await preflight('https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('request không có Origin (curl, VNPay IPN) vẫn chạy bình thường', async () => {
    const res = await request(app.getHttpServer()).get('/ping');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('buildTypeOrmOptions', () => {
  const reader = (env: Record<string, string>) => ({
    get: <T = string>(key: string) => env[key] as T | undefined,
  });

  it('mặc định giống cấu hình cũ: synchronize=true, không SSL', () => {
    const opts = buildTypeOrmOptions(reader({ DATABASE_URL: 'postgres://x' }));
    expect(opts).toMatchObject({
      type: 'postgres',
      url: 'postgres://x',
      autoLoadEntities: true,
      synchronize: true,
      ssl: false,
    });
  });

  it('DB_SSL=true bật SSL, DB_SYNCHRONIZE=false tắt đồng bộ schema', () => {
    const opts = buildTypeOrmOptions(
      reader({ DB_SSL: 'true', DB_SYNCHRONIZE: 'false' }),
    );
    expect(opts.ssl).toEqual({ rejectUnauthorized: false });
    expect(opts.synchronize).toBe(false);
  });

  it('chấp nhận 1/yes/on và bỏ qua chuỗi rỗng', () => {
    expect(buildTypeOrmOptions(reader({ DB_SSL: '1' })).ssl).toBeTruthy();
    expect(buildTypeOrmOptions(reader({ DB_SSL: 'on' })).ssl).toBeTruthy();
    expect(buildTypeOrmOptions(reader({ DB_SSL: '' })).ssl).toBe(false);
    expect(buildTypeOrmOptions(reader({ DB_SYNCHRONIZE: '' })).synchronize).toBe(
      true,
    );
  });
});
