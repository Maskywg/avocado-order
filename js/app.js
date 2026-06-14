const DB = {
  get(key, def = null) {
    try { const d = localStorage.getItem('avo_' + key); return d ? JSON.parse(d) : def; }
    catch { return def; }
  },
  set(key, val) { localStorage.setItem('avo_' + key, JSON.stringify(val)); }
};

function gsUrl() { return DB.get('gsApiUrl', ''); }

const GS = {
  async postOrder(order) {
    const url = gsUrl();
    if (!url) return false;
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(order)
      });
      return true;
    } catch { return false; }
  },
  getOrders() {
    return new Promise(resolve => {
      const url = gsUrl();
      if (!url) return resolve(null);
      const cb = 'gs_cb_' + Date.now();
      window[cb] = data => { delete window[cb]; document.head.removeChild(s); resolve(data.orders || []); };
      const s = document.createElement('script');
      s.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }
};

const DEFAULT_PRODUCTS = [
  { id: 1, name: '黑美人 (大內早生)', emoji: '🥑', desc: '產期最早，果皮光滑，口感細緻綿密', originPrice: 40, price: 30, unit: '斤', stock: 200 },
  { id: 2, name: '菜寮仔 (加林一號)', emoji: '🥑', desc: '在地品種，果肉金黃，風味濃郁', originPrice: 40, price: 30, unit: '斤', stock: 150 },
  { id: 3, name: '紅心圓 (清進二號)', emoji: '🥑', desc: '果形圓潤，果肉厚實，入口滑順', originPrice: 45, price: 35, unit: '斤', stock: 150 },
  { id: 4, name: '哈里馬納 (953)', emoji: '🥑', desc: '大果品種，油脂豐富，口感極佳', originPrice: 50, price: 40, unit: '斤', stock: 120 },
  { id: 5, name: '黑金晚生', emoji: '🥑', desc: '晚作品種，果皮黑亮，風味香甜', originPrice: 50, price: 40, unit: '斤', stock: 100 },
  { id: 6, name: '綜合酪梨禮盒', emoji: '🎁', desc: '多種品項搭配，送禮自用兩相宜', originPrice: 699, price: 550, unit: '盒', stock: 30 }
];

let PRODUCTS = [];

let state = {
  cart: [],
  user: null,
  orders: []
};

function init() {
  PRODUCTS = DB.get('products', null) || [...DEFAULT_PRODUCTS];
  state.cart = DB.get('cart', []);
  state.user = DB.get('user', null);
  state.orders = DB.get('orders', []);
  if (document.getElementById('productGrid')) renderProducts();
  if (document.getElementById('cartBadge')) updateCartBadge();
  if (state.user) updateUIForUser();
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function renderProducts() {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = PRODUCTS.map(p => `
    <div class="product-card">
      <div class="product-image">${p.emoji}</div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc}</div>
        <div class="product-meta">
          <div class="product-price">NT$${p.price} <small>/ ${p.unit}</small></div>
          <div class="product-stock ${p.stock > 20 ? 'in-stock' : p.stock > 0 ? 'low-stock' : 'out-of-stock'}">
            ${p.stock > 20 ? '✓ 庫存充足' : p.stock > 0 ? '⚠ 即將售完' : '✗ 已售完'}
          </div>
        </div>
        <button class="btn ${p.stock > 0 ? 'btn-primary' : 'btn-outline'}" style="width:100%"
          onclick="addToCart(${p.id})" ${p.stock === 0 ? 'disabled' : ''}>
          ${p.stock > 0 ? '加入購物車' : '暫無庫存'}
        </button>
      </div>
    </div>
  `).join('');
}

function addToCart(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product || product.stock === 0) return;
  const existing = state.cart.find(c => c.id === id);
  if (existing) {
    if (existing.qty >= product.stock) { showToast('庫存不足'); return; }
    existing.qty++;
  } else {
    state.cart.push({ id, qty: 1 });
  }
  DB.set('cart', state.cart);
  updateCartBadge();
  showToast(`已加入 ${product.name}`);
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  const total = state.cart.reduce((s, c) => s + c.qty, 0);
  badge.textContent = total;
  badge.style.display = total > 0 ? 'flex' : 'none';
}

function toggleCart() {
  const modal = document.getElementById('cartModal');
  modal.classList.toggle('active');
  if (modal.classList.contains('active')) renderCart();
}

function renderCart() {
  const container = document.getElementById('cartContent');
  if (state.cart.length === 0) {
    container.innerHTML = '<div class="cart-empty">購物車是空的，快去選購吧！</div>';
    return;
  }
  let html = state.cart.map(item => {
    const p = PRODUCTS.find(x => x.id === item.id);
    if (!p) return '';
    return `
      <div class="cart-item">
        <div class="cart-item-emoji">${p.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-price">NT$${p.price} × ${item.qty} = NT$${p.price * item.qty}</div>
        </div>
        <div class="cart-item-actions">
          <button class="qty-btn" onclick="updateCartQty(${item.id}, -1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="updateCartQty(${item.id}, 1)">+</button>
          <button class="qty-btn" onclick="removeFromCart(${item.id})" style="margin-left:8px;color:#ef4444;border-color:#ef4444">✕</button>
        </div>
      </div>
    `;
  }).join('');
  const total = state.cart.reduce((s, item) => {
    const p = PRODUCTS.find(x => x.id === item.id);
    return s + (p ? p.price * item.qty : 0);
  }, 0);
  html += `
    <div class="cart-total">
      <span>合計</span>
      <span>NT$${total.toLocaleString()}</span>
    </div>
    <button class="btn btn-primary btn-lg" onclick="proceedCheckout()">立即結帳</button>
  `;
  container.innerHTML = html;
}

function updateCartQty(id, delta) {
  const item = state.cart.find(c => c.id === id);
  if (!item) return;
  const product = PRODUCTS.find(p => p.id === id);
  item.qty += delta;
  if (item.qty <= 0) {
    state.cart = state.cart.filter(c => c.id !== id);
  } else if (product && item.qty > product.stock) {
    item.qty = product.stock;
    showToast('庫存不足');
  }
  DB.set('cart', state.cart);
  updateCartBadge();
  renderCart();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(c => c.id !== id);
  DB.set('cart', state.cart);
  updateCartBadge();
  renderCart();
}

function proceedCheckout() {
  if (!state.user) { showToast('請先登入會員'); toggleCart(); toggleMember(); return; }
  toggleCart();
  document.getElementById('checkoutName').value = state.user.name;
  document.getElementById('checkoutEmail').value = state.user.email;
  renderCheckoutSummary();
  document.getElementById('checkoutModal').classList.add('active');
}

function renderCheckoutSummary() {
  const total = state.cart.reduce((s, item) => {
    const p = PRODUCTS.find(x => x.id === item.id);
    return s + (p ? p.price * item.qty : 0);
  }, 0);
  document.getElementById('checkoutSummary').innerHTML = `
    <h4>訂單摘要</h4>
    ${state.cart.map(item => {
      const p = PRODUCTS.find(x => x.id === item.id);
      return p ? `<div class="summary-row"><span>${p.name} × ${item.qty}</span><span>NT$${(p.price * item.qty).toLocaleString()}</span></div>` : '';
    }).join('')}
    <div class="summary-row total"><span>總計</span><span>NT$${total.toLocaleString()}</span></div>
  `;
}

function toggleCheckout() {
  document.getElementById('checkoutModal').classList.remove('active');
}

function handleCheckout(e) {
  e.preventDefault();
  const order = {
    id: 'AVO' + Date.now().toString(36).toUpperCase(),
    userId: state.user.email,
    user: { ...state.user },
    items: state.cart.map(item => {
      const p = PRODUCTS.find(x => x.id === item.id);
      return { ...p, qty: item.qty };
    }),
    delivery: {
      name: document.getElementById('checkoutName').value,
      phone: document.getElementById('checkoutPhone').value,
      email: document.getElementById('checkoutEmail').value,
      address: document.getElementById('checkoutAddress').value,
      note: document.getElementById('checkoutNote').value,
      payment: document.getElementById('checkoutPayment').value
    },
    total: state.cart.reduce((s, item) => {
      const p = PRODUCTS.find(x => x.id === item.id);
      return s + (p ? p.price * item.qty : 0);
    }, 0),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  state.orders.unshift(order);
  DB.set('orders', state.orders);
  DB.set('cart', []);
  state.cart = [];
  updateCartBadge();
  toggleCheckout();
  GS.postOrder(order);
  showToast('訂單成功！感謝您的訂購 🎉');
}

function toggleMember() {
  document.getElementById('memberModal').classList.toggle('active');
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(tab + 'Form').classList.add('active');
}

function handleLogin(e) {
  e.preventDefault();
  const email = e.target.querySelector('input[type="email"]').value;
  const password = e.target.querySelector('input[type="password"]').value;
  const users = DB.get('users', []);
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) { showToast('帳號或密碼錯誤'); return; }
  state.user = { name: user.name, email: user.email };
  DB.set('user', state.user);
  updateUIForUser();
  toggleMember();
  showToast(`歡迎回來，${user.name}！`);
}

function handleRegister(e) {
  e.preventDefault();
  const inputs = e.target.querySelectorAll('input');
  const [name, email, password, confirm] = Array.from(inputs).map(i => i.value);
  if (password !== confirm) { showToast('密碼不一致'); return; }
  const users = DB.get('users', []);
  if (users.find(u => u.email === email)) { showToast('此信箱已註冊'); return; }
  users.push({ name, email, password });
  DB.set('users', users);
  state.user = { name, email };
  DB.set('user', state.user);
  updateUIForUser();
  toggleMember();
  showToast(`歡迎加入，${name}！`);
}

function updateUIForUser() {
  const memberBtn = document.getElementById('memberBtn');
  if (state.user) {
    memberBtn.innerHTML = `<div class="user-info">
      <div class="user-avatar">${state.user.name[0]}</div>
      <span class="user-name">${state.user.name}</span>
      <div class="user-actions">
        <button class="btn btn-sm btn-outline" onclick="toggleOrders()">訂單</button>
        <button class="btn btn-sm btn-outline" style="border-color:#ef4444;color:#ef4444" onclick="handleLogout()">登出</button>
      </div>
    </div>`;
  } else {
    memberBtn.innerHTML = '👤';
  }
}

function handleLogout() {
  state.user = null;
  DB.set('user', null);
  updateUIForUser();
  showToast('已登出');
}

function toggleOrders() {
  const modal = document.getElementById('orderModal');
  modal.classList.toggle('active');
  if (modal.classList.contains('active')) renderOrders();
}

function renderOrders() {
  const container = document.getElementById('orderList');
  const userOrders = state.orders.filter(o => o.userId === state.user?.email);
  if (userOrders.length === 0) {
    container.innerHTML = '<div class="cart-empty">尚無訂單記錄</div>';
    return;
  }
  const statusMap = { pending: '待確認', confirmed: '已確認', shipped: '運送中', delivered: '已送達', cancelled: '已取消' };
  container.innerHTML = userOrders.map(o => `
    <div class="order-card">
      <div class="order-header">
        <span class="order-id">訂單編號：${o.id}</span>
        <span class="order-status ${o.status}">${statusMap[o.status] || o.status}</span>
      </div>
      <div class="order-items">
        ${o.items.map(item => `${item.name} × ${item.qty}`).join('、')}
      </div>
      <div class="order-total">總計 NT$${o.total.toLocaleString()}</div>
      <div class="order-date">訂購時間：${new Date(o.createdAt).toLocaleString('zh-TW')}</div>
      <div class="order-date">付款方式：${payMap[o.delivery?.payment] || o.delivery?.payment || '-'}</div>
      <div class="order-date">收件地址：${o.delivery?.address || '-'}</div>
    </div>
  `).join('');
}

const payMap = { linepay: 'Line Pay', credit: '信用卡', transfer: '銀行轉帳', cod: '貨到付款' };

function toggleMobileMenu() {
  document.querySelector('.nav-links').classList.toggle('open');
}

document.addEventListener('click', function(e) {
  const modal = e.target.closest('.modal-overlay');
  if (modal && e.target === modal) modal.classList.remove('active');
});

document.addEventListener('DOMContentLoaded', init);
