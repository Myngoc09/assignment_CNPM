'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Đổi nếu trang đăng nhập của bạn không nằm ở "/"
const LOGIN_PATH = '/';

// Nên đưa vào .env.local: NEXT_PUBLIC_API_URL=http://192.168.1.224:3001
//const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://192.168.1.224:3001';
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setMessage('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      // .catch để không bị văng vào "không kết nối" khi server trả về không phải JSON
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(
          typeof data?.message === 'string'
            ? data.message
            : `Không thể gửi yêu cầu (HTTP ${response.status}). Vui lòng thử lại.`,
        );
        return;
      }

      setSuccess(true);
      setMessage(
        (typeof data?.message === 'string' && data.message) ||
          'Nếu email đã đăng ký, hướng dẫn đặt lại mật khẩu sẽ được gửi đến email đó. Đang chuyển về trang đăng nhập...',
      );

      // replace: nút Back của trình duyệt sẽ không quay lại trang này
      setTimeout(() => {
        router.replace(LOGIN_PATH);
      }, 3000);
    } catch (error) {
      console.error('Loi gui yeu cau quen mat khau:', error);
      setMessage('Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F3EC] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-[#35443A]">
          Quên mật khẩu?
        </h1>

        <p className="mb-6 text-sm text-gray-600">
          Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-[#35443A]"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email của bạn"
              autoComplete="email"
              required
              disabled={loading || success}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#526D59] disabled:bg-gray-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full rounded-lg bg-[#526D59] py-3 font-medium text-white transition hover:bg-[#35443A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu'}
          </button>

          {message && (
            <p
              role="status"
              className={`text-sm ${success ? 'text-green-700' : 'text-red-600'}`}
            >
              {message}
            </p>
          )}
        </form>

        <div className="mt-6 text-center">
          <Link
            href={LOGIN_PATH}
            className="text-sm font-medium text-[#526D59] hover:underline"
          >
            ← Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </main>
  );
}