
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = 'http://localhost:3001';

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  reservedStock: number;
  availableStock: number;
};

type Transaction = {
  id: string;
  type: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  note: string | null;
  createdAt: string;
  ingredient?: {
    name: string;
    unit: string;
  };
};

const formatNumber = (value: number) =>
  Number(value).toLocaleString('vi-VN');

const formatDate = (value: string) =>
  new Date(value).toLocaleString('vi-VN');

const transactionLabels: Record<string, string> = {
  RESERVE: 'Giữ nguyên liệu',
  SALE: 'Xuất sử dụng',
  RELEASE: 'Hoàn nguyên liệu',
  IMPORT: 'Nhập kho',
  ADJUSTMENT: 'Điều chỉnh',
};

const UNIT_LABELS: Record<string, string> = {
  cai: 'cái',
  qua: 'quả',
  mieng: 'miếng',
  cay: 'cây',
  tui: 'túi',
  g: 'g',
  ml: 'ml',
};

const formatUnit = (unit: string) => UNIT_LABELS[unit] ?? unit;

export default function AdminInventoryPage() {
  const router = useRouter();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
    useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage('');
    }, 4000);

    return () => clearTimeout(timer);
  }, [message]);

  const [selected, setSelected] = useState<Ingredient | null>(null);
  const [action, setAction] = useState<'import' | 'adjust'>('import');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const getToken = () => localStorage.getItem('access_token');

  const loadData = useCallback(async () => {
    const token = getToken();

    if (!token) {
      router.replace('/profile');
      return;
    }

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [ingredientResponse, transactionResponse] =
        await Promise.all([
          fetch(`${API_URL}/inventory/ingredients`, { headers }),
          fetch(`${API_URL}/inventory/transactions`, { headers }),
        ]);

      if (
        ingredientResponse.status === 401 ||
        ingredientResponse.status === 403 ||
        transactionResponse.status === 401 ||
        transactionResponse.status === 403
      ) {
        setError('Tài khoản không có quyền quản trị hoặc phiên đăng nhập đã hết hạn.');
        return;
      }

      if (!ingredientResponse.ok || !transactionResponse.ok) {
        throw new Error('Không thể tải dữ liệu kho nguyên liệu.');
      }

      const ingredientData = await ingredientResponse.json();
      const transactionData = await transactionResponse.json();

      setIngredients(ingredientData);
      setTransactions(transactionData);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Lỗi kết nối đến máy chủ.',
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalIngredients = ingredients.length;
  const totalTransactions = transactions.length;

  const openAction = (
    ingredient: Ingredient,
    selectedAction: 'import' | 'adjust',
  ) => {
    setSelected(ingredient);
    setAction(selectedAction);
    setQuantity(
      selectedAction === 'adjust'
        ? String(ingredient.stock)
        : '',
    );
    setNote('');
    setMessage('');
  };

  const closeAction = () => {
    setSelected(null);
    setQuantity('');
    setNote('');
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!selected) return;

    const value = Number(quantity);

    if (!Number.isFinite(value) || value < 0) {
      setMessage('Số lượng không hợp lệ.');
      return;
    }

    if (action === 'import' && value <= 0) {
      setMessage('Số lượng nhập phải lớn hơn 0.');
      return;
    }

    if (action === 'adjust' && value < selected.reservedStock) {
      setMessage(
        `Tồn kho mới không được thấp hơn ${formatNumber(selected.reservedStock)} ${formatUnit(selected.unit)} đang được giữ.`,
      );
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const token = getToken();

      if (!token) {
        router.replace('/profile');
        return;
      }

      const endpoint =
        action === 'import'
          ? `${API_URL}/inventory/ingredients/${selected.id}/import`
          : `${API_URL}/inventory/ingredients/${selected.id}/adjust`;

      const response = await fetch(endpoint, {
        method: action === 'import' ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          action === 'import'
            ? { quantity: value, note }
            : { newStock: value, note },
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message || 'Thao tác thất bại.',
        );
      }

      setMessage(
        action === 'import'
          ? 'Nhập kho thành công.'
          : 'Điều chỉnh tồn kho thành công.',
      );
      closeAction();
      await loadData();
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-[#1C2A24]">
        Đang tải dữ liệu kho...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#1C2A24] p-5 md:p-10">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm tracking-[0.2em] text-[#8B7355] uppercase">
              QUẢN TRỊ BREWLITE
            </p>
            <h1 className="text-3xl font-serif font-semibold mt-2">
              Quản lý kho nguyên liệu
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Theo dõi tồn kho và lịch sử giao dịch nguyên liệu.
            </p>
          </div>

          <button
            onClick={() => router.push('/')}
            className="rounded-full border border-[#1C2A24] px-5 py-2.5 text-sm hover:bg-[#1C2A24] hover:text-white transition"
          >
            Về trang chủ
          </button>
        </header>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 mb-5">
            {error}
            <button
              onClick={() => {
                if (error.includes('quyền quản trị')) {
                  router.replace('/profile');
                } else {
                  setLoading(true);
                  loadData();
                }
              }}
              className="ml-3 underline"
            >
              {error.includes('quyền quản trị') ? 'Đăng nhập lại' : 'Thử lại'}
            </button>
          </div>
        )}

        {message && (
          <div className="bg-green-50 text-green-800 rounded-xl p-4 mb-5">
            {message}
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white border border-[#E9E3D9] rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">Loại nguyên liệu</p>
            <p className="text-2xl font-semibold mt-3">
              {formatNumber(totalIngredients)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Loại nguyên liệu trong kho
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              document.getElementById('transaction-history')?.scrollIntoView({
                behavior: 'smooth',
              })
            }
            className="text-left bg-white border border-[#E9E3D9] rounded-2xl p-5 shadow-sm hover:border-[#8B7355] transition"
          >
            <p className="text-sm text-gray-500">Giao dịch kho</p>
            <p className="text-2xl font-semibold mt-3">
              {formatNumber(totalTransactions)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Nhấn để xem lịch sử giao dịch
            </p>
          </button>
        </section>

        <section className="bg-white border border-[#E9E3D9] rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="p-5 border-b border-[#E9E3D9] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-serif font-semibold">
                Danh sách nguyên liệu
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {ingredients.length} nguyên liệu trong hệ thống
              </p>
            </div>

            <button
              onClick={loadData}
              className="rounded-full border border-[#D8D0C3] px-4 py-2 text-sm hover:bg-[#FDFBF7]"
            >
              Làm mới dữ liệu
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8F5EF] text-gray-600">
                <tr>
                  <th className="p-4">Nguyên liệu</th>
                  <th className="p-4">Tổng tồn</th>
                  <th className="p-4">Đang giữ</th>
                  <th className="p-4">Khả dụng</th>
                  <th className="p-4">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ingredient) => (
                  <tr
                    key={ingredient.id}
                    className="border-t border-[#F0ECE5] hover:bg-[#FDFBF7]"
                  >
                    <td className="p-4 font-medium">
                      {ingredient.name}
                    </td>
                    <td className="p-4">
                      {formatNumber(ingredient.stock)} {formatUnit(ingredient.unit)}
                    </td>
                    <td className="p-4 text-amber-700">
                      {formatNumber(ingredient.reservedStock)} {formatUnit(ingredient.unit)}
                    </td>
                    <td className="p-4 font-semibold text-[#1C6B45]">
                      {formatNumber(ingredient.availableStock)} {formatUnit(ingredient.unit)}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openAction(ingredient, 'import')}
                          className="px-3 py-1.5 rounded-lg bg-[#1C2A24] text-white hover:bg-[#344A3E]"
                        >
                          Nhập
                        </button>
                        <button
                          onClick={() => openAction(ingredient, 'adjust')}
                          className="px-3 py-1.5 rounded-lg border border-[#D8D0C3] hover:bg-[#F8F5EF]"
                        >
                          Điều chỉnh
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {ingredients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      Chưa có nguyên liệu nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section
          id="transaction-history"
          className="bg-white border border-[#E9E3D9] rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="p-5 border-b border-[#E9E3D9]">
            <h2 className="text-xl font-serif font-semibold">
              Lịch sử giao dịch kho
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              100 giao dịch gần nhất
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8F5EF] text-gray-600">
                <tr>
                  <th className="p-4">Thời gian</th>
                  <th className="p-4">Nguyên liệu</th>
                  <th className="p-4">Loại giao dịch</th>
                  <th className="p-4">Số lượng</th>
                  <th className="p-4">Tồn trước</th>
                  <th className="p-4">Tồn sau</th>
                  <th className="p-4">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-t border-[#F0ECE5]"
                  >
                    <td className="p-4 whitespace-nowrap">
                      {formatDate(transaction.createdAt)}
                    </td>
                    <td className="p-4">
                      {transaction.ingredient?.name || 'Không rõ'}
                    </td>
                    <td className="p-4">
                      {transactionLabels[transaction.type] || transaction.type}
                      
                    </td>
                    <td className="p-4">
                      {formatNumber(transaction.quantity)}{' '}
                      {transaction.ingredient
                        ? formatUnit(transaction.ingredient.unit)
                        : ''}
                    </td>
                    <td className="p-4">
                      {formatNumber(transaction.stockBefore)}
                    </td>
                    <td className="p-4">
                      {formatNumber(transaction.stockAfter)}
                    </td>
                    <td className="p-4">
                      {transaction.note || '-'}
                    </td>
                  </tr>
                ))}

                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      Chưa có giao dịch kho nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
          >
            <h2 className="text-xl font-serif font-semibold mb-2">
              {action === 'import' ? 'Nhập thêm nguyên liệu' : 'Điều chỉnh tồn kho'}
            </h2>

            <p className="text-sm text-gray-500 mb-5">
              {selected.name} ({formatUnit(selected.unit)})
            </p>

            {action === 'adjust' && (
              <p className="text-sm bg-amber-50 text-amber-800 rounded-lg p-3 mb-4">
                Số lượng đang giữ: {formatNumber(selected.reservedStock)}{' '}
                {formatUnit(selected.unit)}. Tồn kho mới không được thấp hơn số lượng đang giữ.
              </p>
            )}

            <label className="block text-sm font-medium mb-2">
              {action === 'import' ? 'Số lượng nhập thêm' : 'Tồn kho mới'}
            </label>

            <input
              type="number"
              min={action === 'import' ? '0.000001' : '0'}
              step="any"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
              className="w-full border border-[#D8D0C3] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1C2A24] mb-4"
              placeholder="Nhập số lượng"
            />

            <label className="block text-sm font-medium mb-2">
              Ghi chú (không bắt buộc)
            </label>

            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              rows={3}
              className="w-full border border-[#D8D0C3] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1C2A24] mb-5"
              placeholder="Ví dụ: Nhập nguyên liệu từ nhà cung cấp..."
            />

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={closeAction}
                disabled={saving}
                className="px-4 py-2.5 rounded-full border border-[#D8D0C3]"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-full bg-[#1C2A24] text-white disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
