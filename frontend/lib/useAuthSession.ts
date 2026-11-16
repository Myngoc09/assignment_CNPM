'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getToken } from './api';
import { useCartStore } from '@/store/useCartStore';

/**
 * Kiểm tra đăng nhập và nạp đúng giỏ hàng của tài khoản (store chỉ persist `carts`,
 * `items` phải được nạp lại bằng setUserId sau mỗi lần tải trang).
 * Chưa đăng nhập / token hết hạn => chuyển tới /profile.
 */
export function useAuthSession() {
  const router = useRouter();
  const setUserId = useCartStore((s) => s.setUserId);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/profile');
      return;
    }
    apiFetch<{ id: string }>('/auth/profile')
      .then((p) => {
        setUserId(p.id);
        setReady(true);
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        setUserId(null);
        router.replace('/profile');
      });
  }, [router, setUserId]);

  return ready;
}
