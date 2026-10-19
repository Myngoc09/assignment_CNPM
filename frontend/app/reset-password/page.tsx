"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Đổi nếu trang đăng nhập của bạn không nằm ở "/"
const LOGIN_PATH = "/";

// Nên đưa vào .env.local: NEXT_PUBLIC_API_URL=http://192.168.1.224:3001
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://192.168.1.224:3001";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Đọc token từ useSearchParams, fallback sang window.location.search (lỗi timing trên mobile)
  const [token, setToken] = useState<string>(() => searchParams.get("token") ?? "");

  useEffect(() => {
    if (!token) {
      const urlToken = new URLSearchParams(window.location.search).get("token");
      if (urlToken) setToken(urlToken);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setSuccess(false);

    const activeToken =
      token || new URLSearchParams(window.location.search).get("token") || "";

    if (!activeToken) {
      setMessage("⚠️ Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
      return;
    }

    if (newPassword.length < 8) {
      setMessage("⚠️ Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("⚠️ Mật khẩu xác nhận không khớp. Vui lòng nhập lại.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: activeToken, newPassword }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage = Array.isArray(data?.message)
          ? data.message.join(", ")
          : data?.message;
        setMessage(
          "❌ " +
            (errorMessage ||
              `Đặt lại mật khẩu thất bại (HTTP ${response.status}). Liên kết có thể đã hết hạn.`),
        );
        return;
      }

      setSuccess(true);
      setMessage("✅ Đặt lại mật khẩu thành công! Đang chuyển về trang đăng nhập...");
      setNewPassword("");
      setConfirmPassword("");

      // replace: bấm nút Back của trình duyệt sẽ không quay lại trang đặt lại mật khẩu
      setTimeout(() => {
        router.replace(LOGIN_PATH);
      }, 1500);
    } catch (error) {
      console.error("Lỗi đặt lại mật khẩu:", error);
      setMessage("❌ Không kết nối được máy chủ. Hãy kiểm tra backend đang chạy.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      method="post"
      className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow-lg"
    >
      <h1 className="text-center text-2xl font-bold text-[#35443A]">
        Đặt lại mật khẩu
      </h1>

      <p className="text-center text-sm text-gray-600">
        Nhập mật khẩu mới của bạn để hoàn tất quá trình đặt lại mật khẩu.
      </p>

      {!token && (
        <p className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          ⚠️ Đang kiểm tra liên kết... Nếu thấy thông báo này lâu, liên kết có thể đã hết hạn.
        </p>
      )}

      <div className="space-y-2">
        <label
          htmlFor="newPassword"
          className="block text-sm font-medium text-[#35443A]"
        >
          Mật khẩu mới
        </label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Nhập mật khẩu mới (ít nhất 8 ký tự)"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={loading || success}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#526D59] disabled:bg-gray-100"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-[#35443A]"
        >
          Xác nhận mật khẩu mới
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Nhập lại mật khẩu mới"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={loading || success}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#526D59] disabled:bg-gray-100"
        />
      </div>

      {message && (
        <p
          role="status"
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          }`}
        >
          {message}
        </p>
      )}

      {/* type="submit" để bấm nút sẽ chạy handleSubmit */}
      <button
        type="submit"
        disabled={loading || success}
        className="w-full rounded-lg bg-[#526D59] px-4 py-3 font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Đang xử lý..." : "Xác nhận mật khẩu mới"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F3EC] px-4 py-10">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center text-gray-500 shadow-lg">
            Đang tải...
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}