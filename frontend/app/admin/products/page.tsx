
'use client';

import { useCallback, useEffect, useState } from 'react';

const API_URL = 'http://localhost:3001';

type SizePrice = {
  id?: string;
  size: string;
  price: number;
};

type Product = {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  rating: number;
  price: number;
  stock: number;
  isActive: boolean;
  prices: SizePrice[];
  sellableBySize?: Partial<
    Record<'S' | 'M' | 'L' | 'ONE_SIZE', number>
  >;
  missingRecipeSizes?: string[];
};

type ProductForm = {
  name: string;
  category: string;
  imageUrl: string;
  stock: string;
  sizeMode: 'THREE_SIZE' | 'ONE_SIZE';
  priceS: string;
  priceM: string;
  priceL: string;
  priceOne: string;
};

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  reservedStock: number;
  availableStock: number;
};

type RecipeSize = 'S' | 'M' | 'L' | 'ONE_SIZE';

type RecipeRow = {
  ingredientId: string;
  size: RecipeSize;
  quantity: string;
};

type RecipeMap = Record<RecipeSize, RecipeRow[]>;

const emptyForm: ProductForm = {
  name: '',
  category: '',
  imageUrl: '',
  stock: '100',
  sizeMode: 'THREE_SIZE',
  priceS: '',
  priceM: '',
  priceL: '',
  priceOne: '',
};

const formatMoney = (value: number) =>
  Number(value).toLocaleString('vi-VN') + 'đ';

const formatNumber = (value: number) =>
  Number(value).toLocaleString('vi-VN');

function getToken() {
  return localStorage.getItem('access_token');
}

async function getErrorMessage(response: Response) {
  try {
    const data = await response.json();

    return Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message || 'Đã xảy ra lỗi.';
  } catch {
    return 'Không thể xử lý yêu cầu.';
  }
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipeRows, setRecipeRows] = useState<RecipeMap>({
    S: [],
    M: [],
    L: [],
    ONE_SIZE: [],
  });
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeSaving, setRecipeSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    const token = getToken();

    if (!token) {
      window.location.href = '/profile';
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/products`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        setError(
          'Tài khoản không có quyền quản trị hoặc phiên đăng nhập đã hết hạn.',
        );
        return;
      }

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const data = await response.json();
      setProducts(data);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể tải danh sách sản phẩm.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => setMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  const updateForm = (
    field: keyof ProductForm,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    const prices = product.prices || [];
    const oneSize = prices.some(
      (item) => item.size === 'ONE_SIZE',
    );

    const getPrice = (size: string) =>
      prices.find((item) => item.size === size)?.price?.toString() || '';

    setEditingProduct(product);

    setForm({
      name: product.name,
      category: product.category,
      imageUrl: product.imageUrl || '',
      stock: String(product.stock),
      sizeMode: oneSize ? 'ONE_SIZE' : 'THREE_SIZE',
      priceS: getPrice('S'),
      priceM: getPrice('M'),
      priceL: getPrice('L'),
      priceOne: getPrice('ONE_SIZE'),
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingProduct(null);
  };

  const buildPrices = (): SizePrice[] => {
    if (form.sizeMode === 'ONE_SIZE') {
      return [
        {
          size: 'ONE_SIZE',
          price: Number(form.priceOne),
        },
      ];
    }

    return [
      { size: 'S', price: Number(form.priceS) },
      { size: 'M', price: Number(form.priceM) },
      { size: 'L', price: Number(form.priceL) },
    ];
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!form.name.trim() || !form.category.trim()) {
      setMessage('Vui lòng nhập tên và danh mục sản phẩm.');
      return;
    }

    const stock = Number(form.stock);
    const prices = buildPrices();

    if (
      form.sizeMode === 'ONE_SIZE' &&
      (!Number.isInteger(stock) || stock < 0)
    ) {
      setMessage('Số lượng tồn kho phải là số nguyên không âm.');
      return;
    }

    if (
      prices.some(
        (item) =>
          !Number.isFinite(item.price) ||
          item.price <= 0,
      )
    ) {
      setMessage('Vui lòng nhập giá hợp lệ cho tất cả kích thước.');
      return;
    }

    const token = getToken();

    if (!token) {
      window.location.href = '/profile';
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      imageUrl: form.imageUrl.trim() || undefined,
      ...(form.sizeMode === 'ONE_SIZE' ? { stock } : {}),
      prices,
    };

    setSaving(true);
    setMessage('');

    try {
      const isEditing = editingProduct !== null;

      const response = await fetch(
        isEditing
          ? `${API_URL}/admin/products/${editingProduct.id}`
          : `${API_URL}/admin/products`,
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setMessage(
        isEditing
          ? 'Cập nhật sản phẩm thành công.'
          : 'Thêm sản phẩm thành công.',
      );

      setModalOpen(false);
      setEditingProduct(null);

      await loadProducts();
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'Không thể lưu sản phẩm.',
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product: Product) => {
    const token = getToken();

    if (!token) {
      window.location.href = '/profile';
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/admin/products/${product.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isActive: !product.isActive,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setMessage(
        product.isActive
          ? 'Đã ngừng kinh doanh sản phẩm.'
          : 'Đã mở bán sản phẩm.',
      );

      await loadProducts();
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'Không thể cập nhật trạng thái.',
      );
    }
  };

  const openRecipeModal = async (product: Product) => {
    const token = getToken();

    if (!token) {
      window.location.href = '/profile';
      return;
    }

    setRecipeProduct(product);
    setRecipeModalOpen(true);
    setRecipeLoading(true);
    setMessage('');

    try {
      const [ingredientResponse, recipeResponse] = await Promise.all([
        fetch(`${API_URL}/inventory/ingredients`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_URL}/admin/products/${product.id}/recipes`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (!ingredientResponse.ok) {
        throw new Error(await getErrorMessage(ingredientResponse));
      }

      if (!recipeResponse.ok) {
        throw new Error(await getErrorMessage(recipeResponse));
      }

      const ingredientData: Ingredient[] =
        await ingredientResponse.json();

      const recipeData = await recipeResponse.json();

      setIngredients(ingredientData);

      const oneSize = product.prices.some(
        (item) => item.size === 'ONE_SIZE',
      );

      const sizes: RecipeSize[] = oneSize
        ? ['ONE_SIZE']
        : ['S', 'M', 'L'];

      const initialRows = {
        S: [],
        M: [],
        L: [],
        ONE_SIZE: [],
      } as RecipeMap;

      sizes.forEach((size) => {
        const existingRows = recipeData
          .filter((item: any) => item.size === size)
          .map((item: any) => ({
            ingredientId: item.ingredientId,
            size,
            quantity: String(item.quantity),
          }));

        initialRows[size] = existingRows.length
          ? existingRows
          : [{ ingredientId: '', size, quantity: '' }];
      });

      setRecipeRows(initialRows);
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'Không thể tải công thức nguyên liệu.',
      );
      setRecipeModalOpen(false);
    } finally {
      setRecipeLoading(false);
    }
  };

  const updateRecipeRow = (
    size: RecipeSize,
    index: number,
    field: 'ingredientId' | 'quantity',
    value: string,
  ) => {
    setRecipeRows((current) => ({
      ...current,
      [size]: current[size].map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, [field]: value }
          : row,
      ),
    }));
  };

  const addRecipeRow = (size: RecipeSize) => {
    setRecipeRows((current) => ({
      ...current,
      [size]: [
        ...current[size],
        { ingredientId: '', size, quantity: '' },
      ],
    }));
  };

  const removeRecipeRow = (
    size: RecipeSize,
    index: number,
  ) => {
    setRecipeRows((current) => ({
      ...current,
      [size]: current[size].filter(
        (_, rowIndex) => rowIndex !== index,
      ),
    }));
  };

  const closeRecipeModal = () => {
    if (recipeSaving || recipeLoading) return;

    setRecipeModalOpen(false);
    setRecipeProduct(null);
  };

  const saveRecipes = async () => {
    if (!recipeProduct) return;

    const token = getToken();

    if (!token) {
      window.location.href = '/profile';
      return;
    }

    const oneSize = recipeProduct.prices.some(
      (item) => item.size === 'ONE_SIZE',
    );

    const sizes: RecipeSize[] = oneSize
      ? ['ONE_SIZE']
      : ['S', 'M', 'L'];

    const recipes: {
      ingredientId: string;
      size: RecipeSize;
      quantity: number;
    }[] = [];

    for (const size of sizes) {
      const rows = recipeRows[size];

      if (rows.length === 0) {
        setMessage(`Size ${size} cần ít nhất một nguyên liệu.`);
        return;
      }

      const usedIngredients = new Set<string>();

      for (const row of rows) {
        const quantity = Number(row.quantity);

        if (
          !row.ingredientId ||
          !Number.isFinite(quantity) ||
          quantity <= 0
        ) {
          setMessage(
            `Vui lòng chọn nguyên liệu và nhập định lượng hợp lệ cho size ${size}.`,
          );
          return;
        }

        if (usedIngredients.has(row.ingredientId)) {
          setMessage(
            `Size ${size} không được chọn trùng một nguyên liệu.`,
          );
          return;
        }

        usedIngredients.add(row.ingredientId);

        recipes.push({
          ingredientId: row.ingredientId,
          size,
          quantity,
        });
      }
    }

    setRecipeSaving(true);
    setMessage('');

    try {
      const response = await fetch(
        `${API_URL}/admin/products/${recipeProduct.id}/recipes`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ recipes }),
        },
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setRecipeModalOpen(false);
      setRecipeProduct(null);
      setMessage('Đã lưu công thức nguyên liệu thành công.');

      await loadProducts();
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : 'Không thể lưu công thức nguyên liệu.',
      );
    } finally {
      setRecipeSaving(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const keyword = search.toLowerCase().trim();

    const matchesSearch =
      product.name.toLowerCase().includes(keyword) ||
      product.category.toLowerCase().includes(keyword);

    const matchesFilter =
      filter === 'ALL' ||
      (filter === 'ACTIVE' && product.isActive) ||
      (filter === 'INACTIVE' && !product.isActive);

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FDFBF7] text-[#1C2A24]">
        Đang tải danh sách sản phẩm...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] p-5 text-[#1C2A24] md:p-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#8B7355]">
              QUẢN TRỊ BREWLITE
            </p>

            <h1 className="mt-2 font-serif text-3xl font-semibold">
              Quản lý sản phẩm
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Quản lý danh mục, giá bán và trạng thái sản phẩm.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="rounded-xl bg-[#1C2A24] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#344A3E]"
          >
            + Thêm sản phẩm
          </button>
        </header>

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">
            {error}
            <button
              onClick={() => {
                setLoading(true);
                loadProducts();
              }}
              className="ml-3 underline"
            >
              Thử lại
            </button>
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl bg-green-50 p-4 text-green-800">
            {message}
          </div>
        )}

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#E9E3D9] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Tổng sản phẩm</p>
            <p className="mt-3 text-3xl font-semibold">
              {formatNumber(products.length)}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E9E3D9] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Đang kinh doanh</p>
            <p className="mt-3 text-3xl font-semibold text-[#1C6B45]">
              {formatNumber(
                products.filter((item) => item.isActive).length,
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-[#E9E3D9] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Ngừng kinh doanh</p>
            <p className="mt-3 text-3xl font-semibold text-gray-500">
              {formatNumber(
                products.filter((item) => !item.isActive).length,
              )}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#E9E3D9] bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[#E9E3D9] p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-serif text-xl font-semibold">
                Danh sách sản phẩm
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {filteredProducts.length} sản phẩm được hiển thị
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm tên sản phẩm..."
                className="rounded-xl border border-[#D8D0C3] px-4 py-2.5 text-sm outline-none focus:border-[#1C2A24]"
              />

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="rounded-xl border border-[#D8D0C3] px-4 py-2.5 text-sm outline-none"
              >
                <option value="ALL">Tất cả</option>
                <option value="ACTIVE">Đang kinh doanh</option>
                <option value="INACTIVE">Ngừng kinh doanh</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-[#F8F5EF] text-gray-600">
                <tr>
                  <th className="p-4">Sản phẩm</th>
                  <th className="p-4">Danh mục</th>
                  <th className="p-4">Giá bán</th>
                  <th className="p-4">
                    Tồn kho khả dụng
                    <span className="mt-1 block text-xs font-normal text-gray-500">
                      Tính riêng theo từng size
                    </span>
                  </th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-t border-[#F0ECE5] hover:bg-[#FDFBF7]"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-14 w-14 rounded-xl border border-[#E9E3D9] object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#F1EBDF] text-xl">
                            ☕
                          </div>
                        )}

                        <div>
                          <p className="font-semibold">{product.name}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            ID: {product.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">{product.category}</td>

                    <td className="p-4">
                      <div className="space-y-1">
                        {[...(product.prices || [])]
                          .sort((a, b) =>
                            ['S', 'M', 'L', 'ONE_SIZE'].indexOf(a.size) -
                            ['S', 'M', 'L', 'ONE_SIZE'].indexOf(b.size)
                          )
                          .map((item) => (
                            <p key={item.size}>
                              <span className="mr-2 text-xs text-gray-500">
                                {item.size === 'ONE_SIZE' ? '1 size' : item.size}
                              </span>
                              <span className="font-medium">
                                {formatMoney(item.price)}
                              </span>
                            </p>
                          ))}
                      </div>
                    </td>

                    <td className="p-4">
                      {product.prices.some((item) => item.size === 'ONE_SIZE') ? (
                        <div>
                          <p className="font-semibold">
                            {formatNumber(product.sellableBySize?.ONE_SIZE ?? product.stock)} cái
                          </p>
                          <span className="text-xs text-gray-500">
                            Thành phẩm ONE_SIZE
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(['S', 'M', 'L'] as const).map((size) => {
                            const quantity = product.sellableBySize?.[size];
                            const missing = product.missingRecipeSizes?.includes(size);

                            return (
                              <div
                                key={size}
                                className="flex items-center justify-between gap-4"
                              >
                                <span className="text-gray-600">
                                  Size {size}
                                  <span className="ml-1 text-xs text-gray-400">
                                    ({size === 'S' ? '350ml' : size === 'M' ? '500ml' : '650ml'})
                                  </span>
                                </span>

                                <span className="font-semibold">
                                  {missing || quantity === undefined
                                    ? 'Chưa có công thức'
                                    : `${formatNumber(quantity)} ly`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      {product.isActive ? (
                        <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
                          Đang bán
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                          Ngừng bán
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => openRecipeModal(product)}
                          className="rounded-lg bg-[#F1EBDF] px-3 py-2 text-xs font-medium text-[#6B5035] hover:bg-[#E9DFC9]"
                        >
                          Nguyên liệu
                        </button>

                        <button
                          onClick={() => openEditModal(product)}
                          className="rounded-lg border border-[#D8D0C3] px-3 py-2 hover:bg-[#F8F5EF]"
                        >
                          Sửa
                        </button>

                        <button
                          onClick={() => toggleActive(product)}
                          className={`rounded-lg px-3 py-2 ${
                            product.isActive
                              ? 'bg-red-50 text-red-700 hover:bg-red-100'
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          {product.isActive ? 'Ngừng bán' : 'Mở bán'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-10 text-center text-gray-500"
                    >
                      Không tìm thấy sản phẩm phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <form
            onSubmit={handleSubmit}
            className="my-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-semibold">
                  {editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Điền thông tin và thiết lập giá bán.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="text-2xl text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Tên sản phẩm *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    updateForm('name', event.target.value)
                  }
                  className="w-full rounded-xl border border-[#D8D0C3] px-4 py-3 outline-none focus:border-[#1C2A24]"
                  placeholder="Ví dụ: Cà Phê Muối"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Danh mục *
                </label>
                <input
                  required
                  value={form.category}
                  onChange={(event) =>
                    updateForm('category', event.target.value)
                  }
                  className="w-full rounded-xl border border-[#D8D0C3] px-4 py-3 outline-none focus:border-[#1C2A24]"
                  placeholder="Ví dụ: Cà phê"
                />
              </div>

              {form.sizeMode === 'ONE_SIZE' && (
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Số lượng thành phẩm tồn kho *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.stock}
                    onChange={(event) =>
                      updateForm('stock', event.target.value)
                    }
                    className="w-full rounded-xl border border-[#D8D0C3] px-4 py-3 outline-none focus:border-[#1C2A24]"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Nhập số lượng thành phẩm còn lại, ví dụ 89 cái Croissant.
                  </p>
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Đường dẫn hình ảnh (không bắt buộc)
                </label>
                <input
                  value={form.imageUrl}
                  onChange={(event) =>
                    updateForm('imageUrl', event.target.value)
                  }
                  className="w-full rounded-xl border border-[#D8D0C3] px-4 py-3 outline-none focus:border-[#1C2A24]"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-3 block text-sm font-medium">
                Kiểu kích thước và giá bán *
              </label>

              <div className="mb-4 flex flex-wrap gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#D8D0C3] px-4 py-3 text-sm">
                  <input
                    type="radio"
                    checked={form.sizeMode === 'THREE_SIZE'}
                    onChange={() => updateForm('sizeMode', 'THREE_SIZE')}
                  />
                  Có 3 kích thước S / M / L
                </label>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#D8D0C3] px-4 py-3 text-sm">
                  <input
                    type="radio"
                    checked={form.sizeMode === 'ONE_SIZE'}
                    onChange={() => updateForm('sizeMode', 'ONE_SIZE')}
                  />
                  Một kích thước
                </label>
              </div>

              {form.sizeMode === 'THREE_SIZE' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(['S', 'M', 'L'] as const).map((size) => {
                    const field = `price${size}` as keyof ProductForm;

                    return (
                      <div key={size}>
                        <label className="mb-2 block text-sm font-medium">
                          Giá size {size} (VNĐ)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          required
                          value={form[field]}
                          onChange={(event) =>
                            updateForm(field, event.target.value)
                          }
                          className="w-full rounded-xl border border-[#D8D0C3] px-4 py-3 outline-none focus:border-[#1C2A24]"
                          placeholder="45000"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Giá ONE_SIZE (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={form.priceOne}
                    onChange={(event) =>
                      updateForm('priceOne', event.target.value)
                    }
                    className="w-full rounded-xl border border-[#D8D0C3] px-4 py-3 outline-none focus:border-[#1C2A24]"
                    placeholder="38000"
                  />
                </div>
              )}

              <p className="mt-3 text-xs text-gray-500">
                ONE_SIZE dành cho sản phẩm không chia kích thước, ví dụ bánh Croissant.
              </p>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-full border border-[#D8D0C3] px-5 py-2.5 text-sm"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#1C2A24] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#344A3E] disabled:opacity-50"
              >
                {saving
                  ? 'Đang lưu...'
                  : editingProduct
                    ? 'Lưu thay đổi'
                    : 'Thêm sản phẩm'}
              </button>
            </div>
          </form>
        </div>
      )}

            {recipeModalOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-semibold">
                  Công thức nguyên liệu
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {recipeProduct?.name}
                </p>
              </div>

              <button
                type="button"
                onClick={closeRecipeModal}
                disabled={recipeSaving || recipeLoading}
                className="text-2xl text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {recipeLoading ? (
              <p className="py-10 text-center text-gray-500">
                Đang tải nguyên liệu...
              </p>
            ) : (
              <>
                {recipeProduct?.prices.some(
                  (item) => item.size === 'ONE_SIZE',
                ) ? (
                  <div className="mb-5 rounded-xl bg-[#F8F5EF] p-4 text-sm text-gray-600">
                    Sản phẩm ONE_SIZE. Công thức dưới đây dùng để
                    tham khảo; tồn kho bán hàng được tính theo số
                    lượng thành phẩm.
                  </div>
                ) : (
                  <div className="mb-5 rounded-xl bg-[#F8F5EF] p-4 text-sm text-gray-600">
                    Nhập định lượng nguyên liệu cần dùng để chế biến
                    một ly ở từng kích thước.
                  </div>
                )}

                {(
                  recipeProduct?.prices.some(
                    (item) => item.size === 'ONE_SIZE',
                  )
                    ? ['ONE_SIZE']
                    : ['S', 'M', 'L']
                ).map((size) => {
                  const recipeSize = size as RecipeSize;

                  return (
                    <section
                      key={size}
                      className="mb-6 rounded-xl border border-[#E9E3D9] p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">
                            {size === 'ONE_SIZE'
                              ? 'ONE_SIZE'
                              : `Size ${size}`}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {size === 'S'
                              ? 'Ly 350ml'
                              : size === 'M'
                                ? 'Ly 500ml'
                                : size === 'L'
                                  ? 'Ly 650ml'
                                  : 'Một kích thước'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => addRecipeRow(recipeSize)}
                          className="rounded-lg border border-[#D8D0C3] px-3 py-2 text-xs hover:bg-[#F8F5EF]"
                        >
                          + Thêm nguyên liệu
                        </button>
                      </div>

                      <div className="space-y-3">
                        {recipeRows[recipeSize].map((row, index) => {
                          const selectedIngredient = ingredients.find(
                            (item) => item.id === row.ingredientId,
                          );

                          return (
                            <div
                              key={`${recipeSize}-${index}`}
                              className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_140px_auto]"
                            >
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                  Nguyên liệu
                                </label>

                                <select
                                  value={row.ingredientId}
                                  onChange={(event) =>
                                    updateRecipeRow(
                                      recipeSize,
                                      index,
                                      'ingredientId',
                                      event.target.value,
                                    )
                                  }
                                  className="w-full rounded-lg border border-[#D8D0C3] px-3 py-2.5 text-sm"
                                >
                                  <option value="">
                                    -- Chọn nguyên liệu --
                                  </option>

                                  {ingredients.map((ingredient) => (
                                    <option
                                      key={ingredient.id}
                                      value={ingredient.id}
                                    >
                                      {ingredient.name} ({ingredient.unit})
                                    </option>
                                  ))}
                                </select>

                                {selectedIngredient && (
                                  <p className="mt-1 text-xs text-gray-500">
                                    Khả dụng:{' '}
                                    {formatNumber(
                                      selectedIngredient.availableStock,
                                    )}{' '}
                                    {selectedIngredient.unit}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                  Định lượng
                                </label>

                                <input
                                  type="number"
                                  min="0.001"
                                  step="any"
                                  value={row.quantity}
                                  onChange={(event) =>
                                    updateRecipeRow(
                                      recipeSize,
                                      index,
                                      'quantity',
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Ví dụ: 20"
                                  className="w-full rounded-lg border border-[#D8D0C3] px-3 py-2.5 text-sm"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  removeRecipeRow(recipeSize, index)
                                }
                                className="rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
                              >
                                Xóa
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeRecipeModal}
                    disabled={recipeSaving}
                    className="rounded-full border border-[#D8D0C3] px-5 py-2.5 text-sm"
                  >
                    Hủy
                  </button>

                  <button
                    type="button"
                    onClick={saveRecipes}
                    disabled={recipeSaving || ingredients.length === 0}
                    className="rounded-full bg-[#1C2A24] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#344A3E] disabled:opacity-50"
                  >
                    {recipeSaving ? 'Đang lưu...' : 'Lưu công thức'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
