
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const menuItems = [
  {
    label: 'Quản lý sản phẩm',
    href: '/admin/products',
    icon: '▦',
  },
  {
    label: 'Quản lý kho',
    href: '/admin/inventory',
    icon: '▤',
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.replace('/profile');
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-[9999] flex w-64 flex-col border-r border-[#E9E3D9] bg-white px-5 py-6 shadow-sm">
      <Link href="/admin/inventory" className="mb-10 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1C2A24] text-lg font-bold text-white">
          B
        </div>

        <div>
          <p className="font-serif text-xl font-bold text-[#1C2A24]">
            BrewLite
          </p>
          <p className="text-xs text-[#8B7355]">
            ADMINISTRATION
          </p>
        </div>
      </Link>

      <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
        Quản lý
      </p>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                active
                  ? 'bg-[#1C2A24] text-white'
                  : 'text-gray-600 hover:bg-[#F8F5EF] hover:text-[#1C2A24]'
              }`}
            >
              <span className="w-6 shrink-0 text-center text-lg">
                {item.icon}
              </span>

              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
      >
        <span className="w-6 shrink-0 text-center text-lg">↪</span>
        <span>Đăng xuất</span>
      </button>
    </aside>
  );
}
