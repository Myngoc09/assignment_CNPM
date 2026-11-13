
'use client';

import type { CartItem } from '@/store/useCartStore';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';

type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say' | '';

type Profile = {
  id: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  gender: Gender | null;
  birthDate: string | null;
  address: string | null;
  createdAt: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const setCartUserId = useCartStore((state) => state.setUserId);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGender, setEditGender] = useState<Gender>('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editAddress, setEditAddress] = useState('');

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage('');
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setCartUserId(null);
      setCheckingProfile(false);
      return;
    }

    fetch('http://localhost:3001/auth/profile', {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('access_token');
          throw new Error('Phien dang nhap het han.');
        }

        if (!response.ok) {
          throw new Error('Khong the tai thong tin tai khoan.');
        }

        return response.json();
      })
      .then((data: Profile) => {
        setProfile(data);
        setCartUserId(data.id);
      })
      .catch(() => {
        setProfile(null);
        setCartUserId(null);
      })
      .finally(() => {
        setCheckingProfile(false);
      });
  }, []);

  const fillEditForm = (data: Profile) => {
    setEditFullName(data.fullName || '');
    setEditPhone(data.phone || '');
    setEditGender(data.gender || '');
    setEditBirthDate(data.birthDate || '');
    setEditAddress(data.address || '');
  };

  const startEditing = () => {
    if (!profile) return;

    fillEditForm(profile);
    setEditing(true);
    setMessage('');
  };

  const cancelEditing = () => {
    if (profile) fillEditForm(profile);

    setEditing(false);
    setMessage('');
  };

  const handleSaveProfile = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setMessage('');

    if (!editFullName.trim()) {
      setMessageType('error');
      setMessage('Vui long nhap ho va ten.');
      return;
    }

    if (editPhone && !/^[0-9]{10,11}$/.test(editPhone.trim())) {
      setMessageType('error');
      setMessage('So dien thoai phai gom 10-11 chu so.');
      return;
    }

    if (editBirthDate) {
      const [year, month, day] = editBirthDate.split('-').map(Number);
      const date = new Date(year, month - 1, day);

      const validDate =
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!validDate) {
        setMessageType('error');
        setMessage('Ngày sinh không hợp lệ.');
        return;
      }

      if (date > today) {
        setMessageType('error');
        setMessage('Ngày sinh không thể ở trong tương lai.');
        return;
      }
    }

    const token = localStorage.getItem('access_token');

    if (!token) {
      setMessageType('error');
      setMessage('Phien dang nhap khong ton tai. Vui long dang nhap lai.');
      setProfile(null);
      setEditing(false);
      return;
    }

    setSavingProfile(true);

    try {
      const response = await fetch('http://localhost:3001/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: editFullName.trim(),
          phone: editPhone.trim(),
          gender: editGender,
          birthDate: editBirthDate,
          address: editAddress.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message || 'Khong the cap nhat ho so.',
        );
      }

      const updatedProfile: Profile = {
        id: data.id,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        gender: data.gender,
        birthDate: data.birthDate,
        address: data.address,
        createdAt: data.createdAt,
      };

      setProfile(updatedProfile);
      setEditing(false);
      setMessageType('success');
      setMessage('Cap nhat ho so thanh cong!');
    } catch (error) {
      setMessageType('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Khong the ket noi den may chu.',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setMessage('');

    if (mode === 'register' && password !== confirmPassword) {
      setMessageType('error');
      setMessage('Mat khau xac nhan khong khop.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === 'login' ? 'login' : 'register';

      const body =
        mode === 'login'
          ? { email, password }
          : { fullName, email, phone, password };

      const response = await fetch(
        `http://localhost:3001/auth/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message || 'Yeu cau khong thanh cong.',
        );
      }

      if (mode === 'login') {
        if (!data.access_token || !data.user?.id) {
          throw new Error('Khong nhan duoc thong tin tai khoan tu may chu.');
        }

        localStorage.setItem('access_token', data.access_token);

        setCartUserId(data.user.id);

        console.log('LOGIN USER:', data.user);

        // Neu la Admin thi chuyen den trang quan tri
        if (data.user.role === 'ADMIN') {
          router.push('/admin/inventory');
          return;
        }

        // Lay san pham dang cho trong qua trinh dang nhap
        const pendingItem = sessionStorage.getItem('pending_cart_item');

        if (pendingItem) {
          try {
            const cartItem: CartItem = JSON.parse(pendingItem);

            useCartStore.getState().addToCart(cartItem);

            sessionStorage.removeItem('pending_cart_item');

            router.push('/cart');
          } catch {
            setMessageType('error');
            setMessage('Khong the them san pham vao gio hang.');
            router.push('/');
          }
        } else {
          router.push('/');
        }
      } else {
        setMessageType('success');
        setMessage('Dang ky thanh cong! Ba co the dang nhap.');
        setMode('login');
        setFullName('');
        setPhone('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      setMessageType('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Khong the ket noi den may chu.',
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setCartUserId(null);
    setProfile(null);
    setEditing(false);
    setMessage('');
    setMode('login');
    router.refresh();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Chua cap nhat';

    const date = new Date(`${dateString.slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) return 'Chua cap nhat';

    return date.toLocaleDateString('vi-VN');
  };

  const genderLabel = (gender: Gender | null) => {
    switch (gender) {
      case 'male':
        return 'Nam';
      case 'female':
        return 'Nu';
      case 'other':
        return 'Khac';
      case 'prefer_not_to_say':
        return 'Khong muon tiet lo';
      default:
        return 'Chua cap nhat';
    }
  };

  const inputClass =
    'w-full rounded-xl border border-[#E5E7E1] bg-white px-4 py-3 text-sm text-[#1C2A24] outline-none transition focus:border-[#526D59] focus:ring-2 focus:ring-[#526D59]/10';

  const labelClass = 'mb-2 block text-sm font-medium text-[#35443A]';

  return (
    <main className="min-h-screen bg-[#F7F6F0] px-4 py-8 text-[#1C2A24] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7E1] bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 hover:border-[#1C2A24] hover:bg-[#1C2A24] hover:text-white"
        >
          <span aria-hidden="true">←</span>
          Quay lại thực đơn
        </Link>

        {checkingProfile ? (
          <div className="mt-12 rounded-3xl border border-[#EAE8DF] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E8EDE8] text-2xl">
              ☕
            </div>
            <p className="text-sm text-[#777D75]">Đang tải hồ sơ...</p>
          </div>
        ) : profile ? (
          <div className="mt-8 space-y-5">
            <header className="px-1 py-3">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#DCE5DA] bg-[#E8EDE8] text-3xl shadow-sm">
                  ☕
                </div>

                <div className="min-w-0">
                  <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
                    Xin chào, {profile.fullName?.trim() || 'bạn'}!
                  </h1>
                  <p className="mt-2 text-sm text-[#777D75]">
                    Chào mừng bạn trở lại BrewLite.
                  </p>
                </div>
              </div>
            </header>

            {message && (
              <p
                role="status"
                aria-live="polite"
                className={`rounded-xl border p-3 text-sm ${
                  messageType === 'success'
                    ? 'border-[#D5E4D4] bg-[#EDF5EB] text-[#345D3B]'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {message}
              </p>
            )}

            <section className="rounded-3xl border border-[#EAE8DF] bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">
                    Thông tin cá nhân
                  </h2>
                </div>

                {!editing && (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#DCE5DA] bg-[#F5F8F2] px-4 py-2.5 text-sm font-medium text-[#354F3B] transition hover:bg-[#E8EDE8]"
                  >
                    <span aria-hidden="true">✎</span>
                    Chỉnh sửa
                  </button>
                )}
              </div>

              <div className="my-6 border-t border-[#F0EFE9]" />

              {editing ? (
                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div>
                    <label htmlFor="editFullName" className={labelClass}>
                      Họ và tên
                    </label>
                    <input
                      id="editFullName"
                      type="text"
                      required
                      maxLength={100}
                      value={editFullName}
                      onChange={(event) => setEditFullName(event.target.value)}
                      className={inputClass}
                      placeholder="Nhập họ và tên"
                    />
                  </div>

                  <div>
                    <label htmlFor="editEmail" className={labelClass}>
                      Email
                    </label>
                    <input
                      id="editEmail"
                      type="email"
                      value={profile.email}
                      readOnly
                      className={`${inputClass} cursor-not-allowed bg-[#F7F7F3] text-[#777D75]`}
                    />
                    <p className="mt-1.5 text-xs text-[#858980]">
                      Email không thể thay đổi tại đây.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="editPhone" className={labelClass}>
                      Số điện thoại
                    </label>
                    <input
                      id="editPhone"
                      type="tel"
                      pattern="[0-9]{10,11}"
                      title="Số điện thoại gồm 10-11 chữ số."
                      value={editPhone}
                      onChange={(event) => setEditPhone(event.target.value)}
                      className={inputClass}
                      placeholder="Nhập số điện thoại"
                    />
                  </div>

                  <div>
                    <label htmlFor="editGender" className={labelClass}>
                      Giới tính
                    </label>
                    <select
                      id="editGender"
                      value={editGender}
                      onChange={(event) =>
                        setEditGender(event.target.value as Gender)
                      }
                      className={inputClass}
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="editBirthDate" className={labelClass}>
                      Ngày sinh
                    </label>
                    <input
                      id="editBirthDate"
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      value={editBirthDate}
                      onChange={(event) =>
                        setEditBirthDate(event.target.value)
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="editAddress" className={labelClass}>
                      Địa chỉ giao hàng
                    </label>
                    <textarea
                      id="editAddress"
                      rows={3}
                      maxLength={250}
                      value={editAddress}
                      onChange={(event) => setEditAddress(event.target.value)}
                      className={`${inputClass} resize-y`}
                      placeholder="Nhập địa chỉ giao hàng của bạn"
                    />
                  </div>

                  <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={savingProfile}
                      className="rounded-xl border border-[#E5E7E1] px-5 py-3 text-sm font-medium transition hover:bg-[#F7F7F3] disabled:opacity-60"
                    >
                      Hủy
                    </button>

                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="rounded-xl bg-[#1C2A24] px-5 py-3 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-0">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="min-w-0 rounded-2xl bg-[#FAFAF7] p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-[#858980]">
                        Họ và tên
                      </p>
                      <p className="mt-2 break-words text-sm font-medium">
                        {profile.fullName || 'Chưa cập nhật'}
                      </p>
                    </div>

                    <div className="min-w-0 rounded-2xl bg-[#FAFAF7] p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-[#858980]">
                        Email
                      </p>
                      <p className="mt-2 break-all text-sm font-medium">
                        {profile.email}
                      </p>
                    </div>

                    <div className="min-w-0 rounded-2xl bg-[#FAFAF7] p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-[#858980]">
                        Số điện thoại
                      </p>
                      <p className="mt-2 break-words text-sm font-medium">
                        {profile.phone || 'Chưa cập nhật'}
                      </p>
                    </div>

                    <div className="min-w-0 rounded-2xl bg-[#FAFAF7] p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-[#858980]">
                        Giới tính
                      </p>
                      <p className="mt-2 break-words text-sm font-medium">
                        {genderLabel(profile.gender)}
                      </p>
                    </div>

                    <div className="min-w-0 rounded-2xl bg-[#FAFAF7] p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-[#858980]">
                        Ngày sinh
                      </p>
                      <p className="mt-2 text-sm font-medium">
                        {formatDate(profile.birthDate)}
                      </p>
                    </div>

                    <div className="min-w-0 rounded-2xl bg-[#FAFAF7] p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-[#858980]">
                        Ngày tạo tài khoản
                      </p>
                      <p className="mt-2 text-sm font-medium">
                        {profile.createdAt
                          ? new Date(profile.createdAt).toLocaleDateString('vi-VN')
                          : 'Chưa có thông tin'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-[#FAFAF7] p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-[#858980]">
                      Địa chỉ giao hàng
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium">
                      {profile.address || 'Chưa cập nhật'}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="w-full">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-2xl border border-[#EAE8DF] bg-white px-5 py-4
                          text-center font-medium text-[#1C2A24] shadow-sm
                          transition-colors hover:bg-black hover:text-white"
              >
                Đăng xuất
              </button>
            </section>
          </div>
        ) : (
          <section className="mt-8 rounded-3xl border border-[#EAE8DF] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E8EDE8] text-3xl">
                ☕
              </div>

              <h1 className="text-2xl font-semibold">
                {mode === 'login'
                  ? 'Chào mừng đến BrewLite'
                  : 'Tạo tài khoản'}
              </h1>

              <p className="mt-2 text-sm leading-6 text-[#777D75]">
                {mode === 'login'
                  ? 'Đăng nhập để tiếp tục đặt món yêu thích của bạn.'
                  : 'Đăng ký để bắt đầu trải nghiệm BrewLite.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label htmlFor="fullName" className={labelClass}>
                      Họ và tên
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      required
                      maxLength={100}
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className={inputClass}
                      placeholder="Nhập họ và tên"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      Số điện thoại
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      required
                      pattern="[0-9]{10,11}"
                      title="Số điện thoại gồm 10-11 chữ số."
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className={inputClass}
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="off"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClass}
                  placeholder="Nhập email của bạn"
                />
              </div>

              <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="password" className="text-sm font-medium text-[#35443A]">
                  Mật khẩu
                </label>

                {mode === 'login' && (
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-[#526D59] transition hover:underline"
                  >
                    Quên mật khẩu?
                  </Link>
                )}
              </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClass}
                  placeholder="Nhập mật khẩu"
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label htmlFor="confirmPassword" className={labelClass}>
                    Xác nhận mật khẩu
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    required
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    className={inputClass}
                    placeholder="Nhập lại mật khẩu"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#1C2A24] py-3 font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? 'Đang xử lý...'
                  : mode === 'login'
                    ? 'Đăng nhập'
                    : 'Tạo tài khoản'}
              </button>
            </form>

            {message && (
              <p
                role="status"
                aria-live="polite"
                className={`mt-4 break-words rounded-xl border p-3 text-sm ${
                  messageType === 'success'
                    ? 'border-[#D5E4D4] bg-[#EDF5EB] text-[#345D3B]'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {message}
              </p>
            )}

            <p className="mt-6 text-center text-sm text-[#777D75]">
              {mode === 'login'
                ? 'Chưa có tài khoản?'
                : 'Đã có tài khoản?'}{' '}
              <button
                type="button"
                onClick={switchMode}
                className="font-semibold text-[#1C2A24] hover:underline"
              >
                {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
              </button>
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
