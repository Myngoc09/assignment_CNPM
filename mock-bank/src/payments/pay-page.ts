// Trang HTML thanh toán của Mock Bank (không cần JavaScript, dùng form POST).

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatVnd = (n: number) =>
  `${n.toLocaleString('vi-VN')}₫`;

const layout = (body: string) => `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mock Bank - Xác nhận thanh toán</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#FDFBF7;color:#1C2A24;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:20px}
  .card{width:100%;max-width:420px;background:#fff;border:1px solid #eee;border-radius:24px;
    box-shadow:0 2px 12px rgba(0,0,0,.05);padding:28px}
  .brand{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#B58A59;font-weight:600}
  h1{margin:6px 0 18px;font-size:22px}
  .row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #f1f1f1;font-size:14px}
  .row span:first-child{color:#777}
  .amount{font-size:30px;font-weight:700;text-align:center;margin:22px 0 6px}
  .note{font-size:12px;color:#999;text-align:center;margin:0 0 20px}
  button{width:100%;border:0;border-radius:12px;padding:14px;font-size:15px;font-weight:600;cursor:pointer;margin-top:10px}
  .ok{background:#1C2A24;color:#fff}.ok:hover{background:#2c3e36}
  .fail{background:#fff;color:#c0392b;border:1px solid #e6b0aa}.fail:hover{background:#fdf2f0}
  .err{background:#fef2f2;color:#dc2626;border-radius:12px;padding:12px;font-size:14px;margin-bottom:14px}
  .center{text-align:center}
  a.btn{display:block;margin-top:18px;text-decoration:none;background:#1C2A24;color:#fff;
    padding:13px;border-radius:12px;font-weight:600}
</style>
</head>
<body><div class="card">${body}</div></body>
</html>`;

export function renderPayPage(opts: {
  sessionId: string;
  orderId: string;
  amount: number;
  error?: string;
}) {
  const action = `/pay/${encodeURIComponent(opts.sessionId)}/confirm`;
  const orderCode = `#${opts.orderId.slice(0, 8).toUpperCase()}`;

  return layout(`
  <div class="brand">BrewLite · Mock Bank</div>
  <h1>Xác nhận thanh toán</h1>
  ${opts.error ? `<div class="err" role="alert">${escapeHtml(opts.error)}</div>` : ''}
  <div class="row"><span>Đơn hàng</span><span>${escapeHtml(orderCode)}</span></div>
  <div class="row"><span>Người nhận</span><span>BrewLite Coffee</span></div>
  <div class="amount">${escapeHtml(formatVnd(opts.amount))}</div>
  <p class="note">Đây là ngân hàng giả lập dùng để demo. Không có tiền thật bị trừ.</p>
  <form method="POST" action="${escapeHtml(action)}">
    <button class="ok" type="submit" name="result" value="SUCCESS">Thanh toán thành công</button>
    <button class="fail" type="submit" name="result" value="FAILED">Thanh toán thất bại / Hủy</button>
  </form>`);
}

export function renderNotFoundPage(message: string) {
  return layout(`
  <div class="brand">BrewLite · Mock Bank</div>
  <h1>Không thể thanh toán</h1>
  <div class="err center">${escapeHtml(message)}</div>
  <p class="note">Hãy quay lại cửa hàng và tạo giao dịch mới.</p>`);
}
