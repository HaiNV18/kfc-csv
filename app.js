/**
 * ============================================================================
 * KFC LANDING PAGE - VANILLA JAVASCRIPT APPLICATION (ES6+)
 * - Đọc và phân tích dữ liệu từ file `menu.csv` qua Fetch API
 * - Render động danh sách món ăn với hình minh họa Inline Vector SVG siêu nhẹ
 * - Lọc theo danh mục, tìm kiếm theo từ khóa và sắp xếp theo giá
 * - Quản lý Giỏ hàng Mini (Client-side) lưu trữ bền vững trong localStorage
 * ============================================================================
 */

const STORAGE_KEY = 'kfc_cart_items_v1';
const FREE_SHIP_THRESHOLD = 150000;
const DEFAULT_SHIPPING_FEE = 15000;

// Dữ liệu dự phòng (Fallback) trong trường hợp người dùng mở trực tiếp bằng giao thức file:///
const FALLBACK_CSV_DATA = `id,name,category,price,description,badge,image_type
1,Gà Giòn Cay (1 Miếng),chicken,38000,Gà giòn cay thơm nức giòn rụm khó cưỡng,Bestseller,fried-chicken
2,Gà Truyền Thống (1 Miếng),chicken,38000,Hương vị 11 loại thảo mộc nguyên bản KFC,,fried-chicken
3,Burger Tôm Cay,burger,55000,Tôm biển giòn ngọt kèm sốt cay bùng nổ,Mới,burger
4,Burger Zinger,burger,65000,Thịt gà phi lê xốt mayonnaise thượng hạng,Hot,burger
5,Combo Nhóm Siêu Tiết Kiệm,combo,149000,3 miếng gà + 1 burger + 2 lon Pepsi,Tiết kiệm 20%,combo
6,Khoai Tây Chiên (Lớn),side,29000,Khoai tây cắt thanh giòn vàng rộm,,fries
7,Pepsi Không Calo,drink,19000,Nước ngọt có gas mát lạnh sảng khoái,,drink
8,Gà Sốt Hàn Quốc (2 Miếng),chicken,79000,Gà rán phủ sốt cay ngọt kiểu Hàn rắc mè rang,Hot,fried-chicken
9,Burger Gà Quay Flava,burger,62000,Đùi gà quay tiêu đậm đà kẹp rau tươi giòn,,burger
10,Combo Đôi Hạnh Phúc,combo,115000,2 miếng gà giòn + 1 khoai tây lớn + 2 Pepsi,Bán chạy,combo
11,Bánh Trứng Nướng KFC (2 Cái),drink,34000,Vỏ bánh ngàn lớp giòn xốp nhân kem trứng béo ngậy,Yêu thích,dessert
12,Trà Đào Cam Sả,drink,29000,Trà đào thanh mát kèm miếng đào giòn ngọt,Mới,drink`;

// State toàn cục của ứng dụng
const state = {
  menuItems: [],
  activeCategory: 'all',
  searchQuery: '',
  sortBy: 'default',
  cart: []
};

// Nhãn hiển thị tiếng Việt cho từng danh mục
const CATEGORY_LABELS = {
  chicken: 'Gà Rán',
  burger: 'Burger',
  combo: 'Combo Tiết Kiệm',
  side: 'Khoai & Món Phụ',
  drink: 'Nước & Tráng Miệng'
};

/**
 * Định dạng tiền tệ VNĐ (VD: 38000 -> "38.000đ")
 */
function formatVND(amount) {
  const num = Number(amount) || 0;
  return num.toLocaleString('vi-VN') + 'đ';
}

/**
 * Kho thư viện hình minh họa Inline Vector SVG siêu nhẹ cho từng loại món ăn
 */
function getProductSVG(imageType) {
  switch ((imageType || '').trim()) {
    case 'fried-chicken':
      return `
        <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="80" cy="80" r="64" fill="#FFE8EC" />
          <!-- Bone end -->
          <g transform="rotate(-28 80 80)">
            <rect x="72" y="18" width="16" height="44" rx="7" fill="#FFFDF9" stroke="#E2C6A8" stroke-width="2.5"/>
            <circle cx="73" cy="18" r="9" fill="#FFFDF9" stroke="#E2C6A8" stroke-width="2"/>
            <circle cx="87" cy="18" r="9" fill="#FFFDF9" stroke="#E2C6A8" stroke-width="2"/>
            <!-- Crispy Drumstick Meat -->
            <path d="M48 56 C42 38, 118 38, 112 56 C126 92, 110 136, 80 138 C50 136, 34 92, 48 56 Z" fill="#F77F00" stroke="#9C3D00" stroke-width="2.5"/>
            <path d="M56 62 C52 48, 108 48, 104 62 C114 88, 102 122, 80 124 C58 122, 46 88, 56 62 Z" fill="#FCBF49" opacity="0.45"/>
            <!-- Crispy Crumbs -->
            <circle cx="68" cy="76" r="6" fill="#FFE082"/>
            <circle cx="92" cy="88" r="7" fill="#FFE082"/>
            <circle cx="74" cy="106" r="5" fill="#FFE082"/>
          </g>
        </svg>`;

    case 'burger':
      return `
        <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="80" cy="80" r="64" fill="#FFF3D6" />
          <!-- Top Bun -->
          <path d="M32 72 C32 40, 128 40, 128 72 Z" fill="#F4A261" stroke="#8D4A19" stroke-width="2.5"/>
          <!-- Sesame seeds -->
          <ellipse cx="64" cy="54" rx="4" ry="2" fill="#FFF8EB" transform="rotate(-15 64 54)"/>
          <ellipse cx="80" cy="49" rx="4" ry="2" fill="#FFF8EB"/>
          <ellipse cx="98" cy="55" rx="4" ry="2" fill="#FFF8EB" transform="rotate(15 98 55)"/>
          <!-- Lettuce -->
          <path d="M26 76 Q38 84 50 76 T74 76 T98 76 T122 76 T134 76" stroke="#2A9D8F" stroke-width="7" stroke-linecap="round"/>
          <!-- Tomato & Cheese -->
          <rect x="36" y="80" width="88" height="7" rx="3.5" fill="#E63946"/>
          <polygon points="34,87 126,87 116,97 88,89 56,98" fill="#FFB703"/>
          <!-- Crispy Zinger Chicken Fillet -->
          <rect x="30" y="90" width="100" height="18" rx="9" fill="#D65A00" stroke="#7A3000" stroke-width="2.5"/>
          <!-- Bottom Bun -->
          <path d="M34 108 H126 C126 122, 114 128, 80 128 C46 128, 34 122, 34 108 Z" fill="#F4A261" stroke="#8D4A19" stroke-width="2.5"/>
        </svg>`;

    case 'combo':
      return `
        <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="80" cy="80" r="64" fill="#FFE8EC" />
          <!-- Drink Cup in back -->
          <path d="M92 38 H130 L124 118 H98 L92 38 Z" fill="#004B93" stroke="#1D1E22" stroke-width="2.5"/>
          <rect x="89" y="32" width="44" height="7" rx="3.5" fill="#FFFFFF" stroke="#1D1E22" stroke-width="2"/>
          <path d="M111 32 L117 16 H127" stroke="#E4002B" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="111" cy="76" r="10" fill="#E4002B" stroke="#FFFFFF" stroke-width="2"/>
          <!-- KFC Mini Bucket -->
          <path d="M30 66 H98 L90 130 H38 L30 66 Z" fill="#FFFFFF" stroke="#202124" stroke-width="2.5"/>
          <path d="M33 66 H48 L51 129 H39 L33 66 Z" fill="#E4002B"/>
          <path d="M80 66 H95 L89 129 H77 L80 66 Z" fill="#E4002B"/>
          <!-- Crispy Chicken Tops in Bucket -->
          <circle cx="50" cy="58" r="13" fill="#F77F00" stroke="#8D3B00" stroke-width="2"/>
          <circle cx="66" cy="53" r="15" fill="#FFB703" stroke="#8D3B00" stroke-width="2"/>
          <circle cx="80" cy="59" r="12" fill="#F77F00" stroke="#8D3B00" stroke-width="2"/>
          <rect x="27" y="62" width="74" height="7" rx="3.5" fill="#FFFFFF" stroke="#202124" stroke-width="2"/>
          <text x="64" y="104" text-anchor="middle" font-family="Poppins, sans-serif" font-weight="900" font-size="15" fill="#E4002B">KFC</text>
        </svg>`;

    case 'fries':
      return `
        <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="80" cy="80" r="64" fill="#FFF5D6" />
          <!-- Fries sticks -->
          <rect x="46" y="30" width="13" height="62" rx="4" transform="rotate(-8 46 30)" fill="#FFD166" stroke="#C87D12" stroke-width="2"/>
          <rect x="61" y="22" width="13" height="68" rx="4" fill="#FFC300" stroke="#C87D12" stroke-width="2"/>
          <rect x="76" y="20" width="13" height="70" rx="4" fill="#FFD166" stroke="#C87D12" stroke-width="2"/>
          <rect x="91" y="25" width="13" height="66" rx="4" transform="rotate(6 91 25)" fill="#FFC300" stroke="#C87D12" stroke-width="2"/>
          <rect x="104" y="34" width="13" height="58" rx="4" transform="rotate(14 104 34)" fill="#FFD166" stroke="#C87D12" stroke-width="2"/>
          <!-- Red Fries Box -->
          <path d="M38 68 C58 78, 102 78, 122 68 L112 132 C110 136, 50 136, 48 132 L38 68 Z" fill="#E4002B" stroke="#202124" stroke-width="2.5"/>
          <path d="M58 73 L62 134 H72 L69 75 Z" fill="#FFFFFF" opacity="0.9"/>
          <path d="M91 75 L88 134 H98 L102 73 Z" fill="#FFFFFF" opacity="0.9"/>
          <circle cx="80" cy="104" r="14" fill="#FFFFFF"/>
          <text x="80" y="109" text-anchor="middle" font-family="Poppins, sans-serif" font-weight="900" font-size="11" fill="#E4002B">KFC</text>
        </svg>`;

    case 'dessert':
      return `
        <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="80" cy="80" r="64" fill="#FFF3D6" />
          <!-- Flaky Pastry Shell -->
          <path d="M28 84 C28 74, 132 74, 132 84 L118 118 C114 126, 46 126, 42 118 L28 84 Z" fill="#E09F3E" stroke="#8D4A19" stroke-width="2.5"/>
          <!-- Golden Custard Top -->
          <ellipse cx="80" cy="82" rx="50" ry="18" fill="#FFD166" stroke="#B5651D" stroke-width="2.5"/>
          <!-- Caramelized Spots -->
          <ellipse cx="64" cy="80" rx="10" ry="5" fill="#9E2A2B" opacity="0.75"/>
          <ellipse cx="94" cy="84" rx="12" ry="6" fill="#9E2A2B" opacity="0.75"/>
          <ellipse cx="80" cy="75" rx="7" ry="3.5" fill="#9E2A2B" opacity="0.6"/>
        </svg>`;

    case 'drink':
    default:
      return `
        <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="80" cy="80" r="64" fill="#E6F2FF" />
          <!-- Straw -->
          <path d="M84 44 L94 18 H110" stroke="#E4002B" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Cup Body -->
          <path d="M50 48 H110 L102 132 C101 136, 59 136, 58 132 L50 48 Z" fill="#004B93" stroke="#202124" stroke-width="2.5"/>
          <!-- Red & White Wave Accent -->
          <path d="M53 82 Q80 72 107 82 L105 102 Q80 92 55 102 Z" fill="#FFFFFF"/>
          <path d="M54 90 Q80 80 106 90 L104 108 Q80 98 56 108 Z" fill="#E4002B"/>
          <!-- Dome Lid -->
          <rect x="46" y="42" width="68" height="8" rx="4" fill="#FFFFFF" stroke="#202124" stroke-width="2.5"/>
          <!-- Ice bubbles -->
          <circle cx="70" cy="64" r="3.5" fill="#90E0EF"/>
          <circle cx="90" cy="68" r="2.5" fill="#90E0EF"/>
        </svg>`;
  }
}

/**
 * Hàm phân tích cú pháp CSV thành mảng Object
 * Hỗ trợ đầy đủ cả header `image_type` lẫn `image_svg`
 */
function parseCSV(csvText) {
  const rows = csvText
    .trim()
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0);

  if (rows.length < 2) return [];

  const headers = rows[0].split(',').map(h => h.trim());

  return rows.slice(1).map(row => {
    const values = row.split(',').map(v => v.trim());
    const item = headers.reduce((obj, header, index) => {
      obj[header] = values[index] !== undefined ? values[index] : '';
      return obj;
    }, {});

    // Chuẩn hóa kiểu dữ liệu
    item.id = String(item.id);
    item.price = Number(item.price) || 0;
    item.image_type = item.image_type || item.image_svg || 'fried-chicken';
    return item;
  });
}

/**
 * Tải dữ liệu từ file `menu.csv` thông qua Fetch API
 */
async function loadMenuFromCSV() {
  const statusText = document.getElementById('csvStatusText');

  try {
    const response = await fetch('./menu.csv', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`);
    }
    const csvText = await response.text();
    state.menuItems = parseCSV(csvText);

    if (statusText) {
      statusText.innerHTML = `Đã đồng bộ <strong>${state.menuItems.length} món ăn</strong> trực tiếp từ <code>menu.csv</code>`;
    }
  } catch (error) {
    console.warn('Không thể fetch trực tiếp menu.csv (có thể đang mở qua file://), sử dụng dữ liệu CSV nội bộ:', error);
    state.menuItems = parseCSV(FALLBACK_CSV_DATA);

    if (statusText) {
      statusText.innerHTML = `Đang hiển thị <strong>${state.menuItems.length} món ăn</strong> từ cấu trúc <code>menu.csv</code>`;
    }
  }

  renderMenu();
}

/**
 * Lọc, sắp xếp và render danh sách sản phẩm ra lưới `#menuGrid`
 */
function renderMenu() {
  const menuGrid = document.getElementById('menuGrid');
  if (!menuGrid) return;

  // 1. Lọc theo danh mục & từ khóa tìm kiếm
  const query = state.searchQuery.trim().toLowerCase();
  let filtered = state.menuItems.filter(item => {
    const matchCategory = state.activeCategory === 'all' || item.category === state.activeCategory;
    const matchSearch =
      !query ||
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query);
    return matchCategory && matchSearch;
  });

  // 2. Sắp xếp theo giá
  if (state.sortBy === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (state.sortBy === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price);
  }

  // 3. Kiểm tra trạng thái rỗng
  if (filtered.length === 0) {
    menuGrid.innerHTML = `
      <div class="empty-menu-state">
        <p style="font-size: 2.2rem; margin-bottom: 8px;">🍗</p>
        <h3>Không tìm thấy món ăn phù hợp</h3>
        <p style="color: #5F6368; margin-top: 6px;">Hãy thử chọn danh mục khác hoặc xóa từ khóa tìm kiếm.</p>
      </div>
    `;
    return;
  }

  // 4. Render các thẻ sản phẩm
  menuGrid.innerHTML = filtered
    .map(item => {
      const badgeHTML = item.badge
        ? `<span class="product-badge">${item.badge}</span>`
        : '';
      const categoryLabel = CATEGORY_LABELS[item.category] || item.category;

      return `
        <article class="product-card" data-id="${item.id}">
          ${badgeHTML}
          <div class="product-visual">
            ${getProductSVG(item.image_type)}
          </div>
          <div class="product-body">
            <span class="product-category-label">${categoryLabel}</span>
            <h3 class="product-title">${item.name}</h3>
            <p class="product-desc">${item.description}</p>
            <div class="product-footer">
              <span class="product-price">${formatVND(item.price)}</span>
              <button class="add-to-cart-btn" type="button" data-add-id="${item.id}">
                <span>+ Thêm vào giỏ</span>
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

/* ==========================================================================
   QUẢN LÝ GIỎ HÀNG MINI (LOCALSTORAGE)
   ========================================================================== */

function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.cart = raw ? JSON.parse(raw) : [];
  } catch (e) {
    state.cart = [];
  }
  updateCartUI();
}

function saveCartToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart));
  } catch (e) {
    console.error('Không thể lưu localStorage:', e);
  }
}

function addToCart(productId) {
  const product = state.menuItems.find(item => String(item.id) === String(productId));
  if (!product) return;

  const existing = state.cart.find(entry => String(entry.id) === String(product.id));
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image_type: product.image_type,
      quantity: 1
    });
  }

  saveCartToStorage();
  updateCartUI();
  showToast(`Đã thêm "${product.name}" vào giỏ hàng!`);
}

function updateCartItemQty(productId, delta) {
  const index = state.cart.findIndex(entry => String(entry.id) === String(productId));
  if (index === -1) return;

  state.cart[index].quantity += delta;
  if (state.cart[index].quantity <= 0) {
    state.cart.splice(index, 1);
  }

  saveCartToStorage();
  updateCartUI();
}

function clearCart() {
  state.cart = [];
  saveCartToStorage();
  updateCartUI();
  showToast('Đã làm trống giỏ hàng.');
}

function updateCartUI() {
  const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal === 0 || subtotal >= FREE_SHIP_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE;
  const finalTotal = subtotal + shippingFee;

  // Cập nhật nút trên Header
  const badgeEl = document.getElementById('cartCountBadge');
  const headerTotalEl = document.getElementById('headerCartTotal');
  if (badgeEl) badgeEl.textContent = totalCount;
  if (headerTotalEl) headerTotalEl.textContent = formatVND(subtotal);

  // Cập nhật thanh tiến trình Free Ship
  const freeShipText = document.getElementById('freeShipText');
  const freeShipFill = document.getElementById('freeShipFill');
  if (freeShipText && freeShipFill) {
    const progress = Math.min(100, Math.round((subtotal / FREE_SHIP_THRESHOLD) * 100));
    freeShipFill.style.width = `${progress}%`;

    if (subtotal >= FREE_SHIP_THRESHOLD) {
      freeShipText.innerHTML = `🎉 Chúc mừng! Đơn hàng của bạn được <strong>MIỄN PHÍ GIAO HÀNG</strong>!`;
    } else {
      const remaining = FREE_SHIP_THRESHOLD - subtotal;
      freeShipText.innerHTML = `Mua thêm <strong>${formatVND(remaining)}</strong> để được <strong>MIỄN PHÍ GIAO HÀNG</strong>!`;
    }
  }

  // Render danh sách món trong giỏ
  const container = document.getElementById('cartItemsContainer');
  if (container) {
    if (state.cart.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">🍗</div>
          <h4>Giỏ hàng đang trống</h4>
          <p>Hãy chọn những miếng gà giòn rụm từ thực đơn nhé!</p>
        </div>
      `;
    } else {
      container.innerHTML = state.cart
        .map(
          item => `
          <div class="cart-item">
            <div class="cart-item-thumb">
              ${getProductSVG(item.image_type)}
            </div>
            <div class="cart-item-info">
              <div class="cart-item-title">${item.name}</div>
              <div class="cart-item-price">${formatVND(item.price * item.quantity)}</div>
            </div>
            <div class="cart-qty-controls">
              <button class="qty-btn" type="button" data-qty-id="${item.id}" data-delta="-1" aria-label="Giảm số lượng">−</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn" type="button" data-qty-id="${item.id}" data-delta="1" aria-label="Tăng số lượng">+</button>
            </div>
          </div>
        `
        )
        .join('');
    }
  }

  // Cập nhật tổng tiền ở Footer giỏ hàng
  const subtotalEl = document.getElementById('cartSubtotal');
  const shippingEl = document.getElementById('cartShipping');
  const totalEl = document.getElementById('cartTotalPrice');

  if (subtotalEl) subtotalEl.textContent = formatVND(subtotal);
  if (shippingEl) {
    shippingEl.textContent =
      subtotal === 0 ? '0đ' : shippingFee === 0 ? 'Miễn phí' : formatVND(shippingFee);
  }
  if (totalEl) totalEl.textContent = formatVND(finalTotal);
}

/* ==========================================================================
   TOAST & MODAL INTERACTIONS
   ========================================================================== */

function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-item';
  toast.innerHTML = `<span>🍗</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 260);
  }, 2400);
}

function toggleCartDrawer(isOpen) {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartBackdrop');
  if (!drawer || !backdrop) return;

  if (isOpen) {
    drawer.classList.add('open');
    backdrop.classList.add('open');
  } else {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
  }
}

function startDealCountdown() {
  let totalSeconds = 4 * 3600 + 45 * 60 + 19;
  const hoursEl = document.getElementById('cdHours');
  const minsEl = document.getElementById('cdMinutes');
  const secsEl = document.getElementById('cdSeconds');

  setInterval(() => {
    if (totalSeconds <= 0) totalSeconds = 5 * 3600;
    totalSeconds -= 1;

    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');

    if (hoursEl) hoursEl.textContent = h;
    if (minsEl) minsEl.textContent = m;
    if (secsEl) secsEl.textContent = s;
  }, 1000);
}

/* ==========================================================================
   KHỞI TẠO SỰ KIỆN DOM
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  loadCartFromStorage();
  loadMenuFromCSV();
  startDealCountdown();

  // Lọc danh mục
  const categoryTabs = document.getElementById('categoryTabs');
  if (categoryTabs) {
    categoryTabs.addEventListener('click', event => {
      const btn = event.target.closest('.cat-tab');
      if (!btn) return;

      document.querySelectorAll('.cat-tab').forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      state.activeCategory = btn.dataset.category || 'all';
      renderMenu();
    });
  }

  // Tìm kiếm món ăn
  const searchInput = document.getElementById('menuSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', event => {
      state.searchQuery = event.target.value;
      renderMenu();
    });
  }

  // Sắp xếp theo giá
  const sortSelect = document.getElementById('menuSortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', event => {
      state.sortBy = event.target.value;
      renderMenu();
    });
  }

  // Thêm vào giỏ từ lưới Menu
  const menuGrid = document.getElementById('menuGrid');
  if (menuGrid) {
    menuGrid.addEventListener('click', event => {
      const addBtn = event.target.closest('[data-add-id]');
      if (!addBtn) return;
      addToCart(addBtn.dataset.addId);
    });
  }

  // Thêm Deal Hot vào giỏ
  document.querySelectorAll('.add-deal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dealId = btn.dataset.dealId;
      addToCart(dealId);
      toggleCartDrawer(true);
    });
  });

  // Liên kết danh mục dưới Footer
  document.querySelectorAll('[data-footer-cat]').forEach(link => {
    link.addEventListener('click', () => {
      const cat = link.dataset.footerCat;
      const targetTab = document.querySelector(`.cat-tab[data-category="${cat}"]`);
      if (targetTab) targetTab.click();
    });
  });

  // Đóng / Mở Giỏ hàng Mini
  const openCartBtn = document.getElementById('openCartBtn');
  const closeCartBtn = document.getElementById('closeCartBtn');
  const cartBackdrop = document.getElementById('cartBackdrop');

  if (openCartBtn) openCartBtn.addEventListener('click', () => toggleCartDrawer(true));
  if (closeCartBtn) closeCartBtn.addEventListener('click', () => toggleCartDrawer(false));
  if (cartBackdrop) cartBackdrop.addEventListener('click', () => toggleCartDrawer(false));

  // Tăng / giảm số lượng trong Giỏ hàng
  const cartItemsContainer = document.getElementById('cartItemsContainer');
  if (cartItemsContainer) {
    cartItemsContainer.addEventListener('click', event => {
      const qtyBtn = event.target.closest('[data-qty-id]');
      if (!qtyBtn) return;
      const id = qtyBtn.dataset.qtyId;
      const delta = Number(qtyBtn.dataset.delta);
      updateCartItemQty(id, delta);
    });
  }

  // Xóa toàn bộ giỏ hàng
  const clearCartBtn = document.getElementById('clearCartBtn');
  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', () => {
      if (state.cart.length > 0) clearCart();
    });
  }

  // Thanh toán / Đặt hàng
  const checkoutBtn = document.getElementById('checkoutBtn');
  const checkoutModalBackdrop = document.getElementById('checkoutModalBackdrop');
  const closeCheckoutModalBtn = document.getElementById('closeCheckoutModalBtn');
  const checkoutOrderCode = document.getElementById('checkoutOrderCode');

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (state.cart.length === 0) {
        showToast('Giỏ hàng của bạn đang trống, hãy chọn món trước nhé!');
        return;
      }

      const randomCode = '#KFC-' + Math.floor(1000 + Math.random() * 9000);
      if (checkoutOrderCode) checkoutOrderCode.textContent = `Mã đơn hàng: ${randomCode}`;

      state.cart = [];
      saveCartToStorage();
      updateCartUI();
      toggleCartDrawer(false);

      if (checkoutModalBackdrop) checkoutModalBackdrop.classList.add('open');
    });
  }

  if (closeCheckoutModalBtn && checkoutModalBackdrop) {
    closeCheckoutModalBtn.addEventListener('click', () => {
      checkoutModalBackdrop.classList.remove('open');
    });
  }

  // Menu trên thiết bị di động
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mainNav = document.getElementById('mainNav');
  if (mobileMenuBtn && mainNav) {
    mobileMenuBtn.addEventListener('click', () => {
      const isExpanded = mainNav.classList.toggle('open');
      mobileMenuBtn.setAttribute('aria-expanded', String(isExpanded));
    });

    mainNav.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => mainNav.classList.remove('open'));
    });
  }
});
