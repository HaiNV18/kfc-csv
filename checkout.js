/**
 * ============================================================================
 * MODULE 2: THANH TOÁN (KFC CHECKOUT & PAYMENT MODULE) - VANILLA JS (ES6+)
 * - Tích hợp trực tiếp với dữ liệu & component từ Module 1 (Giỏ Hàng)
 * - Xác thực thông tin giao hàng / nhận tại quầy (Form Validation nghiêm ngặt)
 * - Hệ thống mã giảm giá (Voucher Engine: KFC20, KFC30K, FREESHIP, KFCVIP)
 * - 4 Phương thức thanh toán chính:
 *   1. Tiền Mặt (cod)
 *   2. Mã QR MoMo (momo)
 *   3. Mã QR ZaloPay (zalopay)
 *   4. Thẻ ATM Nội Địa (atm)
 * - Lưu lịch sử đơn hàng vào localStorage (`kfc_orders_history_v1`)
 * ============================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KFCCheckoutModule = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  // ================= HẰNG SỐ CẤU HÌNH & DỮ LIỆU DÙNG LẠI TỪ GIỎ HÀNG =================
  const CART_STORAGE_KEY =
    typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : 'kfc_cart_items_v1';
  const ORDER_HISTORY_STORAGE_KEY = 'kfc_orders_history_v1';

  const SHIP_THRESHOLD =
    typeof FREE_SHIP_THRESHOLD !== 'undefined' ? FREE_SHIP_THRESHOLD : 150000;
  const BASE_SHIP_FEE =
    typeof DEFAULT_SHIPPING_FEE !== 'undefined' ? DEFAULT_SHIPPING_FEE : 15000;

  // Danh sách cửa hàng KFC hỗ trợ Nhận tại quầy (Pickup)
  const KFC_STORES = [
    { id: 'kfc-ndh', name: 'KFC Nguyễn Du - Quận 1, TP.HCM' },
    { id: 'kfc-ltt', name: 'KFC Lý Tự Trọng - Quận 1, TP.HCM' },
    { id: 'kfc-cag', name: 'KFC Cầu Giấy - Quận Cầu Giấy, Hà Nội' },
    { id: 'kfc-hk', name: 'KFC Hoàn Kiếm - Quận Hoàn Kiếm, Hà Nội' },
    { id: 'kfc-dn', name: 'KFC Nguyễn Văn Linh - Hải Châu, Đà Nẵng' }
  ];

  // Danh sách Ngân hàng hỗ trợ thanh toán Thẻ ATM Nội Địa (NAPAS)
  const ATM_BANKS = [
    { code: 'VCB', name: 'Vietcombank - Ngân hàng Ngoại thương VN' },
    { code: 'TCB', name: 'Techcombank - Ngân hàng Kỹ thương VN' },
    { code: 'MB', name: 'MB Bank - Ngân hàng Quân Đội' },
    { code: 'BIDV', name: 'BIDV - Ngân hàng Đầu tư & Phát triển VN' },
    { code: 'CTG', name: 'VietinBank - Ngân hàng Công thương VN' },
    { code: 'ACB', name: 'ACB - Ngân hàng Á Châu' },
    { code: 'VPB', name: 'VPBank - Ngân hàng Việt Nam Thịnh Vượng' },
    { code: 'VBA', name: 'Agribank - Ngân hàng NN & PT Nông thôn' }
  ];

  // Cơ sở dữ liệu Mã giảm giá (Voucher)
  const VOUCHER_DB = {
    KFC20: {
      code: 'KFC20',
      type: 'percent',
      value: 20,
      maxDiscount: 50000,
      minOrder: 100000,
      description: 'Giảm 20% (tối đa 50.000đ) cho đơn từ 100.000đ'
    },
    KFC30K: {
      code: 'KFC30K',
      type: 'fixed',
      value: 30000,
      maxDiscount: 30000,
      minOrder: 120000,
      description: 'Giảm 30.000đ trực tiếp cho đơn từ 120.000đ'
    },
    FREESHIP: {
      code: 'FREESHIP',
      type: 'freeship',
      value: 15000,
      maxDiscount: 15000,
      minOrder: 60000,
      description: 'Miễn phí giao hàng 15.000đ cho đơn từ 60.000đ'
    },
    KFCVIP: {
      code: 'KFCVIP',
      type: 'fixed',
      value: 50000,
      maxDiscount: 50000,
      minOrder: 200000,
      description: 'Giảm 50.000đ cho đơn tiệc nhóm từ 200.000đ'
    }
  };

  // Các phương thức thanh toán được hỗ trợ: Tiền Mặt, Mã QR MoMo, Mã QR ZaloPay, Thẻ ATM
  const VALID_PAYMENT_METHODS = ['cod', 'momo', 'zalopay', 'atm'];
  const PAYMENT_METHOD_LABELS = {
    cod: 'Tiền Mặt (Thanh toán khi nhận hàng)',
    momo: 'Mã QR MoMo (Ví điện tử MoMo)',
    zalopay: 'Mã QR ZaloPay (Ví điện tử ZaloPay)',
    atm: 'Thẻ ATM Nội Địa (NAPAS)'
  };

  // ================= CÁC HÀM TIỆN ÍCH & BẢO MẬT =================

  /**
   * Làm sạch chuỗi ký tự đầu vào để phòng chống XSS
   */
  function sanitizeText(input) {
    if (input === null || input === undefined) return '';
    return String(input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .trim();
  }

  /**
   * Định dạng tiền tệ VNĐ (tái sử dụng hàm `formatVND` từ Module Giỏ Hàng nếu có)
   */
  function formatCurrency(amount) {
    if (typeof formatVND === 'function') {
      return formatVND(amount);
    }
    const num = Math.max(0, Math.round(Number(amount) || 0));
    return num.toLocaleString('vi-VN') + 'đ';
  }

  /**
   * Chuẩn hóa số điện thoại Việt Nam:
   * - Xóa khoảng trắng, dấu chấm, dấu gạch ngang
   * - Chuyển đổi đầu số +84 hoặc 84 thành 0
   */
  function normalizePhone(phone) {
    if (!phone) return '';
    let cleaned = String(phone).replace(/[\s.\-()]/g, '');
    if (cleaned.startsWith('+84')) {
      cleaned = '0' + cleaned.slice(3);
    } else if (cleaned.startsWith('84') && cleaned.length === 11) {
      cleaned = '0' + cleaned.slice(2);
    }
    return cleaned;
  }

  /**
   * Kiểm tra số điện thoại di động Việt Nam hợp lệ (10 số, đầu 03, 05, 07, 08, 09)
   */
  function isValidVietnamPhone(phone) {
    const normalized = normalizePhone(phone);
    return /^0[35789][0-9]{8}$/.test(normalized);
  }

  // ================= XÁC THỰC DỮ LIỆU ĐẦU VÀO (VALIDATION) =================

  /**
   * Kiểm tra tính hợp lệ của Giỏ hàng trước khi thanh toán
   */
  function validateCartItems(cartItems) {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return {
        valid: false,
        error: 'Giỏ hàng đang trống. Vui lòng chọn ít nhất 1 món ăn trước khi thanh toán.'
      };
    }

    for (const item of cartItems) {
      if (!item || !item.id || !item.name) {
        return {
          valid: false,
          error: 'Dữ liệu sản phẩm trong giỏ hàng không hợp lệ (thiếu id hoặc tên món).'
        };
      }
      const price = Number(item.price);
      const qty = Number(item.quantity);
      if (!Number.isFinite(price) || price <= 0) {
        return {
          valid: false,
          error: `Giá sản phẩm "${item.name}" không hợp lệ.`
        };
      }
      if (!Number.isInteger(qty) || qty <= 0 || qty > 99) {
        return {
          valid: false,
          error: `Số lượng sản phẩm "${item.name}" phải là số nguyên từ 1 đến 99.`
        };
      }
    }

    return { valid: true, error: null };
  }

  /**
   * Xác thực thông tin khách hàng và hình thức nhận hàng
   */
  function validateCustomerInfo(info = {}) {
    const errors = {};
    const fullName = String(info.fullName || '').trim();
    const rawPhone = String(info.phone || '').trim();
    const deliveryMode = info.deliveryMode || 'delivery';
    const address = String(info.address || '').trim();
    const storeId = String(info.storeId || '').trim();
    const note = String(info.note || '').trim();

    if (!fullName || fullName.length < 2) {
      errors.fullName = 'Họ và tên người nhận phải có ít nhất 2 ký tự.';
    } else if (fullName.length > 80) {
      errors.fullName = 'Họ và tên không được vượt quá 80 ký tự.';
    }

    if (!rawPhone) {
      errors.phone = 'Vui lòng nhập số điện thoại liên hệ.';
    } else if (!isValidVietnamPhone(rawPhone)) {
      errors.phone = 'Số điện thoại không hợp lệ (gồm 10 số, đầu 03/05/07/08/09).';
    }

    if (deliveryMode !== 'delivery' && deliveryMode !== 'pickup') {
      errors.deliveryMode = 'Hình thức nhận hàng không hợp lệ.';
    } else if (deliveryMode === 'delivery') {
      if (!address || address.length < 10) {
        errors.address = 'Địa chỉ giao hàng cần chi tiết tối thiểu 10 ký tự (Số nhà, Đường, Phường/Xã).';
      } else if (address.length > 200) {
        errors.address = 'Địa chỉ giao hàng không vượt quá 200 ký tự.';
      }
    } else if (deliveryMode === 'pickup') {
      const storeExists = KFC_STORES.some(s => s.id === storeId);
      if (!storeId || !storeExists) {
        errors.storeId = 'Vui lòng chọn nhà hàng KFC hợp lệ để nhận món.';
      }
    }

    if (note.length > 200) {
      errors.note = 'Ghi chú đơn hàng tối đa 200 ký tự.';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      normalizedData: {
        fullName: sanitizeText(fullName),
        phone: normalizePhone(rawPhone),
        deliveryMode,
        address: deliveryMode === 'delivery' ? sanitizeText(address) : '',
        storeId: deliveryMode === 'pickup' ? storeId : '',
        storeName:
          deliveryMode === 'pickup'
            ? (KFC_STORES.find(s => s.id === storeId) || {}).name || ''
            : '',
        note: sanitizeText(note)
      }
    };
  }

  /**
   * Xác thực phương thức thanh toán:
   * - `cod`: Tiền Mặt
   * - `momo`: Mã QR MoMo
   * - `zalopay`: Mã QR ZaloPay
   * - `atm`: Thẻ ATM Nội Địa (kiểm tra Ngân hàng, Số thẻ 16-19 số, Tên chủ thẻ, Ngày phát hành/hết hạn MM/YY)
   */
  function validatePaymentDetails(paymentMethod, paymentDetails = {}) {
    const errors = {};

    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      errors.paymentMethod =
        'Phương thức thanh toán không hợp lệ (chỉ hỗ trợ Tiền Mặt, Mã QR MoMo, Mã QR ZaloPay, ATM).';
      return { valid: false, errors, bankName: null, maskedCard: null };
    }

    let bankName = null;
    let maskedCard = null;

    if (paymentMethod === 'atm') {
      const bankCode = String(paymentDetails.bankCode || '').trim().toUpperCase();
      const cardNumber = String(paymentDetails.cardNumber || '').replace(/\s+/g, '');
      const cardHolder = String(paymentDetails.cardHolder || '').trim();
      const cardDate = String(paymentDetails.cardDate || paymentDetails.expiry || '').trim();

      const matchedBank = ATM_BANKS.find(b => b.code === bankCode);
      if (!bankCode || !matchedBank) {
        errors.bankCode = 'Vui lòng chọn Ngân hàng phát hành thẻ ATM.';
      } else {
        bankName = matchedBank.name;
      }

      if (!/^[0-9]{16,19}$/.test(cardNumber)) {
        errors.cardNumber = 'Số thẻ ATM nội địa phải gồm từ 16 đến 19 chữ số (VD: 9704...).';
      } else {
        maskedCard =
          cardNumber.slice(0, 4) + ' **** **** ' + cardNumber.slice(-4);
      }

      if (!cardHolder || cardHolder.length < 3) {
        errors.cardHolder = 'Vui lòng nhập họ tên chủ thẻ ATM (tối thiểu 3 ký tự).';
      }

      if (!/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(cardDate)) {
        errors.cardDate = 'Ngày phát hành/hết hạn thẻ phải theo định dạng MM/YY (VD: 08/26).';
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      bankName,
      maskedCard
    };
  }

  // ================= VOUCHER ENGINE & TÍNH TOÁN TỔNG TIỀN =================

  /**
   * Kiểm tra và tính toán giá trị giảm của Mã khuyến mãi (Voucher)
   */
  function evaluateVoucher(rawCode, subtotal, deliveryMode = 'delivery') {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) {
      return {
        valid: false,
        code: '',
        discountAmount: 0,
        shippingDiscount: 0,
        message: 'Vui lòng nhập mã giảm giá.'
      };
    }

    const voucher = VOUCHER_DB[code];
    if (!voucher) {
      return {
        valid: false,
        code,
        discountAmount: 0,
        shippingDiscount: 0,
        message: `Mã giảm giá "${code}" không tồn tại hoặc đã hết hạn.`
      };
    }

    const safeSubtotal = Math.max(0, Number(subtotal) || 0);
    if (safeSubtotal < voucher.minOrder) {
      return {
        valid: false,
        code,
        discountAmount: 0,
        shippingDiscount: 0,
        message: `Mã ${code} yêu cầu đơn hàng tối thiểu ${formatCurrency(voucher.minOrder)}.`
      };
    }

    const baseShip =
      deliveryMode === 'pickup' || safeSubtotal === 0 || safeSubtotal >= SHIP_THRESHOLD
        ? 0
        : BASE_SHIP_FEE;

    if (voucher.type === 'freeship') {
      if (deliveryMode === 'pickup') {
        return {
          valid: false,
          code,
          discountAmount: 0,
          shippingDiscount: 0,
          message: 'Mã FREESHIP chỉ áp dụng cho đơn Giao hàng tận nơi.'
        };
      }
      if (baseShip === 0) {
        return {
          valid: false,
          code,
          discountAmount: 0,
          shippingDiscount: 0,
          message: 'Đơn hàng của bạn đã được Miễn phí giao hàng sẵn.'
        };
      }
      return {
        valid: true,
        code,
        discountAmount: 0,
        shippingDiscount: baseShip,
        message: `Áp dụng mã ${code}: Miễn phí giao hàng (-${formatCurrency(baseShip)}).`
      };
    }

    let discountAmount = 0;
    if (voucher.type === 'percent') {
      discountAmount = Math.round((safeSubtotal * voucher.value) / 100);
      if (voucher.maxDiscount) {
        discountAmount = Math.min(discountAmount, voucher.maxDiscount);
      }
    } else if (voucher.type === 'fixed') {
      discountAmount = voucher.value;
    }

    discountAmount = Math.min(discountAmount, safeSubtotal);

    return {
      valid: true,
      code,
      discountAmount,
      shippingDiscount: 0,
      message: `Áp dụng mã ${code} thành công (-${formatCurrency(discountAmount)}).`
    };
  }

  /**
   * Tính toán chi tiết số tiền thanh toán từ danh sách món trong Giỏ Hàng
   */
  function calculateCheckoutSummary(cartItems = [], options = {}) {
    const deliveryMode = options.deliveryMode || 'delivery';
    const voucherCode = String(options.voucherCode || '').trim().toUpperCase();

    const validItems = Array.isArray(cartItems) ? cartItems : [];
    const totalQuantity = validItems.reduce(
      (sum, item) => sum + Math.max(0, Number(item.quantity) || 0),
      0
    );
    const subtotal = validItems.reduce(
      (sum, item) =>
        sum + Math.max(0, Number(item.price) || 0) * Math.max(0, Number(item.quantity) || 0),
      0
    );

    const baseShippingFee =
      subtotal === 0 || deliveryMode === 'pickup' || subtotal >= SHIP_THRESHOLD
        ? 0
        : BASE_SHIP_FEE;

    let discountAmount = 0;
    let shippingDiscount = 0;
    let appliedVoucher = null;

    if (voucherCode && subtotal > 0) {
      const voucherResult = evaluateVoucher(voucherCode, subtotal, deliveryMode);
      if (voucherResult.valid) {
        discountAmount = voucherResult.discountAmount;
        shippingDiscount = Math.min(baseShippingFee, voucherResult.shippingDiscount);
        appliedVoucher = voucherResult.code;
      }
    }

    const finalShippingFee = Math.max(0, baseShippingFee - shippingDiscount);
    const finalTotal = Math.max(0, subtotal - discountAmount + finalShippingFee);

    return {
      totalQuantity,
      subtotal,
      baseShippingFee,
      discountAmount,
      shippingDiscount,
      finalShippingFee,
      finalTotal,
      appliedVoucher,
      isFreeShipping: subtotal > 0 && finalShippingFee === 0
    };
  }

  /**
   * Sinh mã đơn hàng duy nhất theo định dạng `#KFC-YYYYMMDD-XXXX`
   */
  function generateOrderCode(dateObj = new Date(), randomSeed = Math.random()) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const suffix = Math.floor(1000 + randomSeed * 9000);
    return `#KFC-${yyyy}${mm}${dd}-${suffix}`;
  }

  /**
   * Xử lý tạo đơn hàng hoàn chỉnh (end-to-end)
   */
  function createOrderRecord({
    cartItems,
    customerInfo,
    paymentMethod = 'cod',
    paymentDetails = {},
    voucherCode = '',
    now = new Date()
  }) {
    // 1. Kiểm tra Giỏ hàng
    const cartCheck = validateCartItems(cartItems);
    if (!cartCheck.valid) {
      return { success: false, stage: 'cart', errors: { cart: cartCheck.error } };
    }

    // 2. Kiểm tra Thông tin khách hàng
    const customerCheck = validateCustomerInfo(customerInfo);
    if (!customerCheck.valid) {
      return { success: false, stage: 'customer', errors: customerCheck.errors };
    }

    // 3. Kiểm tra Phương thức thanh toán (Tiền Mặt, Mã QR MoMo, Mã QR ZaloPay, Thẻ ATM)
    const paymentCheck = validatePaymentDetails(paymentMethod, paymentDetails);
    if (!paymentCheck.valid) {
      return { success: false, stage: 'payment', errors: paymentCheck.errors };
    }

    // 4. Kiểm tra Voucher (nếu người dùng có nhập mã)
    const trimmedVoucher = String(voucherCode || '').trim().toUpperCase();
    const tempSummary = calculateCheckoutSummary(cartItems, {
      deliveryMode: customerCheck.normalizedData.deliveryMode
    });

    if (trimmedVoucher) {
      const voucherEval = evaluateVoucher(
        trimmedVoucher,
        tempSummary.subtotal,
        customerCheck.normalizedData.deliveryMode
      );
      if (!voucherEval.valid) {
        return {
          success: false,
          stage: 'voucher',
          errors: { voucher: voucherEval.message }
        };
      }
    }

    // 5. Tính toán tổng tiền cuối cùng
    const pricing = calculateCheckoutSummary(cartItems, {
      deliveryMode: customerCheck.normalizedData.deliveryMode,
      voucherCode: trimmedVoucher
    });

    // 6. Đóng gói bản ghi Đơn hàng
    const orderRecord = {
      orderCode: generateOrderCode(now),
      createdAt: now.toISOString(),
      status: paymentMethod === 'cod' ? 'CONFIRMED_COD' : 'PAID_ONLINE',
      customer: customerCheck.normalizedData,
      payment: {
        method: paymentMethod,
        methodLabel: PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod,
        bankName: paymentCheck.bankName,
        maskedCard: paymentCheck.maskedCard
      },
      items: cartItems.map(item => ({
        id: String(item.id),
        name: sanitizeText(item.name),
        price: Number(item.price),
        quantity: Number(item.quantity),
        image_type: item.image_type || 'fried-chicken',
        lineTotal: Number(item.price) * Number(item.quantity)
      })),
      pricing
    };

    return {
      success: true,
      order: orderRecord,
      errors: {}
    };
  }

  /**
   * Lưu đơn hàng vào lịch sử `localStorage`
   */
  function saveOrderToHistory(order, storageObj = typeof localStorage !== 'undefined' ? localStorage : null) {
    if (!storageObj || !order) return [];
    try {
      const existingRaw = storageObj.getItem(ORDER_HISTORY_STORAGE_KEY);
      const history = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [order, ...(Array.isArray(history) ? history : [])].slice(0, 50);
      storageObj.setItem(ORDER_HISTORY_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      return [];
    }
  }

  function getOrderHistory(storageObj = typeof localStorage !== 'undefined' ? localStorage : null) {
    if (!storageObj) return [];
    try {
      const raw = storageObj.getItem(ORDER_HISTORY_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  // ================= GIAO DIỆN DOM CHO MODULE THANH TOÁN =================

  const checkoutUIState = {
    deliveryMode: 'delivery',
    paymentMethod: 'cod',
    voucherCode: ''
  };

  /**
   * Sinh mã QR Vector SVG riêng biệt cho MoMo và ZaloPay
   */
  function getQRCodeSVG(provider = 'momo') {
    const isMomo = provider === 'momo';
    const primaryColor = isMomo ? '#A50064' : '#0068FF';
    const badgeColor = isMomo ? '#D82D8B' : '#00B14F';
    const badgeLabel = isMomo ? 'MoMo' : 'ZaloPay';

    return `
      <svg class="co-qr-svg" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mã QR ${badgeLabel}">
        <rect x="2" y="2" width="116" height="116" rx="10" fill="#FFFFFF" stroke="${primaryColor}" stroke-width="3"/>
        <!-- 3 Góc định vị QR -->
        <rect x="10" y="10" width="28" height="28" rx="4" stroke="${primaryColor}" stroke-width="5"/>
        <rect x="17" y="17" width="14" height="14" rx="2" fill="${primaryColor}"/>
        <rect x="82" y="10" width="28" height="28" rx="4" stroke="${primaryColor}" stroke-width="5"/>
        <rect x="89" y="17" width="14" height="14" rx="2" fill="${primaryColor}"/>
        <rect x="10" y="82" width="28" height="28" rx="4" stroke="${primaryColor}" stroke-width="5"/>
        <rect x="17" y="89" width="14" height="14" rx="2" fill="${primaryColor}"/>
        <!-- Điểm dữ liệu QR -->
        <rect x="46" y="12" width="8" height="8" fill="#202124"/>
        <rect x="58" y="12" width="14" height="8" fill="${primaryColor}"/>
        <rect x="46" y="26" width="12" height="10" fill="#202124"/>
        <rect x="64" y="26" width="10" height="10" fill="#202124"/>
        <rect x="12" y="46" width="10" height="10" fill="#202124"/>
        <rect x="26" y="46" width="8" height="18" fill="${primaryColor}"/>
        <rect x="84" y="46" width="10" height="10" fill="#202124"/>
        <rect x="98" y="46" width="12" height="16" fill="${primaryColor}"/>
        <rect x="12" y="64" width="12" height="10" fill="#202124"/>
        <rect x="84" y="66" width="24" height="8" fill="#202124"/>
        <rect x="46" y="84" width="12" height="10" fill="${primaryColor}"/>
        <rect x="64" y="84" width="10" height="12" fill="#202124"/>
        <rect x="82" y="84" width="14" height="10" fill="${primaryColor}"/>
        <rect x="46" y="100" width="22" height="8" fill="#202124"/>
        <rect x="76" y="98" width="12" height="10" fill="#202124"/>
        <rect x="94" y="96" width="14" height="12" fill="${primaryColor}"/>
        <!-- Logo thương hiệu ở tâm QR -->
        <rect x="38" y="44" width="44" height="32" rx="7" fill="${badgeColor}" stroke="#FFFFFF" stroke-width="2.5"/>
        <text x="60" y="64" text-anchor="middle" font-family="Poppins, sans-serif" font-weight="800" font-size="9.5" fill="#FFFFFF">${badgeLabel}</text>
      </svg>`;
  }

  /**
   * Đọc danh sách món hiện tại từ Module Giỏ Hàng (`state.cart` hoặc `localStorage`)
   */
  function getActiveCartItems() {
    if (typeof state !== 'undefined' && Array.isArray(state.cart)) {
      return state.cart;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  /**
   * Khởi tạo cấu trúc DOM của Modal Thanh Toán (nếu chưa có)
   */
  function mountCheckoutModalDOM() {
    if (typeof document === 'undefined' || document.getElementById('kfcCheckoutOverlay')) {
      return;
    }

    const storeOptionsHTML = KFC_STORES.map(
      store => `<option value="${store.id}">${store.name}</option>`
    ).join('');

    const wrapper = document.createElement('div');
    wrapper.className = 'kfc-checkout-overlay';
    wrapper.id = 'kfcCheckoutOverlay';
    wrapper.setAttribute('aria-hidden', 'true');

    wrapper.innerHTML = `
      <div class="kfc-checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="kfcCheckoutHeading">
        <!-- Header -->
        <div class="kfc-checkout-header">
          <div class="kfc-checkout-brand">
            <img src="./images/KFC_logo-image.png" alt="KFC Logo" />
            <div>
              <h2 id="kfcCheckoutHeading">Thanh Toán Đơn Hàng KFC</h2>
              <span>An toàn • Nhanh chóng • Giao nóng hổi trong 30 phút</span>
            </div>
          </div>
          <button type="button" class="kfc-checkout-close" id="kfcCloseCheckoutBtn" aria-label="Đóng cửa sổ thanh toán">✕</button>
        </div>

        <!-- Body -->
        <form id="kfcCheckoutForm" class="kfc-checkout-body" novalidate>
          <!-- Cột trái: Thông tin giao nhận & Phương thức thanh toán -->
          <div class="kfc-checkout-form-col">
            <div class="co-section-title">
              <span class="co-step-badge">1</span>
              <span>Hình Thức Nhận Hàng & Thông Tin Liên Hệ</span>
            </div>

            <!-- Chọn Giao tận nơi / Nhận tại quầy -->
            <div class="co-delivery-tabs" role="tablist">
              <button type="button" class="co-delivery-tab active" data-delivery-mode="delivery">
                🛵 Giao Hàng Tận Nơi
              </button>
              <button type="button" class="co-delivery-tab" data-delivery-mode="pickup">
                🏪 Nhận Tại Nhà Hàng
              </button>
            </div>

            <div class="co-field-grid">
              <div class="co-field">
                <label for="coFullName">Họ và tên người nhận <span class="req">*</span></label>
                <input type="text" id="coFullName" class="co-input" placeholder="Nguyễn Văn A" autocomplete="name" />
                <span class="co-error-msg" id="errFullName"></span>
              </div>

              <div class="co-field">
                <label for="coPhone">Số điện thoại <span class="req">*</span></label>
                <input type="tel" id="coPhone" class="co-input" placeholder="0901234567" autocomplete="tel" />
                <span class="co-error-msg" id="errPhone"></span>
              </div>
            </div>

            <!-- Địa chỉ giao hàng (hiển thị khi deliveryMode = delivery) -->
            <div class="co-field" id="coAddressGroup">
              <label for="coAddress">Địa chỉ giao hàng chi tiết <span class="req">*</span></label>
              <input type="text" id="coAddress" class="co-input" placeholder="Số nhà, tên đường, phường/xã, quận/huyện..." autocomplete="street-address" />
              <span class="co-error-msg" id="errAddress"></span>
            </div>

            <!-- Chọn nhà hàng KFC (hiển thị khi deliveryMode = pickup) -->
            <div class="co-field" id="coStoreGroup" style="display: none;">
              <label for="coStoreSelect">Chọn nhà hàng KFC nhận món <span class="req">*</span></label>
              <select id="coStoreSelect" class="co-select">
                <option value="">-- Chọn nhà hàng KFC gần bạn --</option>
                ${storeOptionsHTML}
              </select>
              <span class="co-error-msg" id="errStoreId"></span>
            </div>

            <div class="co-field">
              <label for="coNote">Ghi chú cho nhà hàng / tài xế (Tùy chọn)</label>
              <input type="text" id="coNote" class="co-input" placeholder="VD: Lấy thêm tương ớt, gọi trước khi giao..." maxlength="200" />
              <span class="co-error-msg" id="errNote"></span>
            </div>

            <!-- Bước 2: 4 Phương thức thanh toán: Tiền Mặt, Mã QR MoMo, Mã QR ZaloPay, ATM -->
            <div class="co-section-title" style="margin-top: 18px;">
              <span class="co-step-badge">2</span>
              <span>Phương Thức Thanh Toán</span>
            </div>

            <div class="co-payment-options" id="coPaymentOptions">
              <button type="button" class="co-pay-card active" data-pay-method="cod">
                <div class="co-pay-icon">💵</div>
                <div class="co-pay-info">
                  <strong>Tiền Mặt</strong>
                  <small>Thanh toán khi nhận món</small>
                </div>
              </button>

              <button type="button" class="co-pay-card" data-pay-method="momo">
                <div class="co-pay-icon" style="background:#FFF0F6;color:#A50064;font-weight:900;font-size:0.75rem;">MoMo</div>
                <div class="co-pay-info">
                  <strong>Mã QR MoMo</strong>
                  <small>Quét mã bằng Ví MoMo</small>
                </div>
              </button>

              <button type="button" class="co-pay-card" data-pay-method="zalopay">
                <div class="co-pay-icon" style="background:#EBF5FF;color:#0068FF;font-weight:900;font-size:0.72rem;">Zalo</div>
                <div class="co-pay-info">
                  <strong>Mã QR ZaloPay</strong>
                  <small>Quét mã bằng ZaloPay</small>
                </div>
              </button>

              <button type="button" class="co-pay-card" data-pay-method="atm">
                <div class="co-pay-icon">🏧</div>
                <div class="co-pay-info">
                  <strong>Thẻ ATM</strong>
                  <small>Thẻ ngân hàng nội địa</small>
                </div>
              </button>
            </div>

            <!-- Panel phụ hiển thị Mã QR MoMo / QR ZaloPay / Form Thẻ ATM / Hướng dẫn Tiền mặt -->
            <div id="coPaymentSubPanel"></div>
          </div>

          <!-- Cột phải: Tóm tắt Giỏ hàng, Mã giảm giá & Tổng tiền -->
          <div class="kfc-checkout-summary-col">
            <div>
              <div class="co-section-title">
                <span class="co-step-badge">3</span>
                <span>Tóm Tắt Đơn Hàng (<span id="coSummaryCount">0</span> món)</span>
              </div>

              <!-- Danh sách món lấy từ Module Giỏ Hàng -->
              <div class="co-items-list" id="coSummaryItemsList"></div>

              <!-- Khu vực Mã giảm giá (Voucher) -->
              <div class="co-voucher-box">
                <div class="co-voucher-input-row">
                  <input type="text" id="coVoucherInput" class="co-input" placeholder="Nhập mã giảm giá (VD: KFC20)" />
                  <button type="button" class="co-voucher-btn" id="coApplyVoucherBtn">Áp dụng</button>
                </div>
                <div class="co-voucher-pills">
                  <button type="button" class="co-voucher-pill" data-quick-voucher="KFC20">KFC20 (-20%)</button>
                  <button type="button" class="co-voucher-pill" data-quick-voucher="KFC30K">KFC30K (-30K)</button>
                  <button type="button" class="co-voucher-pill" data-quick-voucher="FREESHIP">FREESHIP</button>
                </div>
                <div class="co-voucher-status" id="coVoucherStatus"></div>
              </div>
            </div>

            <!-- Tổng kết chi phí & Nút xác nhận -->
            <div>
              <div class="co-Calc-rows">
                <div class="co-calc-line">
                  <span>Tạm tính:</span>
                  <strong id="coCalcSubtotal">0đ</strong>
                </div>
                <div class="co-calc-line">
                  <span>Phí giao hàng:</span>
                  <strong id="coCalcShipping">0đ</strong>
                </div>
                <div class="co-calc-line discount" id="coCalcDiscountRow" style="display: none;">
                  <span>Giảm giá Voucher:</span>
                  <strong id="coCalcDiscount">-0đ</strong>
                </div>
                <div class="co-calc-line total">
                  <span>Tổng thanh toán:</span>
                  <strong id="coCalcFinalTotal">0đ</strong>
                </div>
              </div>

              <button type="submit" class="btn btn-primary co-submit-btn" id="coConfirmPayBtn">
                <span>Xác Nhận Thanh Toán</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(wrapper);
    bindCheckoutDOMEvents();
  }

  /**
   * Render phần nội dung chi tiết cho từng phương thức thanh toán:
   * - Tiền Mặt (`cod`)
   * - Mã QR MoMo (`momo`)
   * - Mã QR ZaloPay (`zalopay`)
   * - Thẻ ATM (`atm`)
   */
  function renderPaymentSubPanel() {
    const subPanel = document.getElementById('coPaymentSubPanel');
    if (!subPanel) return;

    const cartItems = getActiveCartItems();
    const summary = calculateCheckoutSummary(cartItems, {
      deliveryMode: checkoutUIState.deliveryMode,
      voucherCode: checkoutUIState.voucherCode
    });

    const method = checkoutUIState.paymentMethod;

    if (method === 'cod') {
      subPanel.innerHTML = `
        <div class="co-payment-extra">
          <small style="color: #5F6368; display: block; line-height: 1.5;">
            💵 <strong>Thanh toán Tiền Mặt khi nhận hàng:</strong> Quý khách vui lòng chuẩn bị số tiền
            <strong style="color:#E4002B;">${formatCurrency(summary.finalTotal)}</strong> khi nhân viên KFC giao món.
          </small>
        </div>
      `;
    } else if (method === 'momo') {
      subPanel.innerHTML = `
        <div class="co-payment-extra co-qr-box" style="border-color: #A50064; background-color: #FFF7FB;">
          ${getQRCodeSVG('momo')}
          <div class="co-qr-text">
            <strong style="color: #A50064;">Quét Mã QR MoMo để thanh toán</strong>
            <p>Đơn vị nhận: <strong>KFC VIỆT NAM</strong></p>
            <p>Số tiền: <strong style="color:#E4002B;">${formatCurrency(summary.finalTotal)}</strong></p>
            <p>Mở ứng dụng <strong>Ví MoMo</strong> → Chọn <strong>Quét Mã QR</strong> và nhấn Xác nhận bên phải.</p>
          </div>
        </div>
      `;
    } else if (method === 'zalopay') {
      subPanel.innerHTML = `
        <div class="co-payment-extra co-qr-box" style="border-color: #0068FF; background-color: #F2F8FF;">
          ${getQRCodeSVG('zalopay')}
          <div class="co-qr-text">
            <strong style="color: #0068FF;">Quét Mã QR ZaloPay để thanh toán</strong>
            <p>Đơn vị nhận: <strong>KFC VIETNAM OFFICIAL</strong></p>
            <p>Số tiền: <strong style="color:#E4002B;">${formatCurrency(summary.finalTotal)}</strong></p>
            <p>Mở ứng dụng <strong>ZaloPay</strong> hoặc <strong>Zalo</strong> → Quét mã QR và nhấn Xác nhận.</p>
          </div>
        </div>
      `;
    } else if (method === 'atm') {
      const bankOptions = ATM_BANKS.map(
        b => `<option value="${b.code}">${b.name}</option>`
      ).join('');

      subPanel.innerHTML = `
        <div class="co-payment-extra">
          <div class="co-field">
            <label for="coBankCode">Ngân hàng phát hành thẻ ATM <span class="req">*</span></label>
            <select id="coBankCode" class="co-select">
              <option value="">-- Chọn ngân hàng nội địa (NAPAS) --</option>
              ${bankOptions}
            </select>
            <span class="co-error-msg" id="errBankCode"></span>
          </div>
          <div class="co-field">
            <label for="coCardNumber">Số thẻ ATM (16 - 19 chữ số) <span class="req">*</span></label>
            <input type="text" id="coCardNumber" class="co-input" placeholder="9704 1500 1234 5678" maxlength="23" />
            <span class="co-error-msg" id="errCardNumber"></span>
          </div>
          <div class="co-field-grid" style="margin-bottom: 0;">
            <div class="co-field" style="margin-bottom: 0;">
              <label for="coCardHolder">Tên chủ thẻ (Không dấu) <span class="req">*</span></label>
              <input type="text" id="coCardHolder" class="co-input" placeholder="NGUYEN VAN A" />
              <span class="co-error-msg" id="errCardHolder"></span>
            </div>
            <div class="co-field" style="margin-bottom: 0;">
              <label for="coCardDate">Ngày phát hành (MM/YY) <span class="req">*</span></label>
              <input type="text" id="coCardDate" class="co-input" placeholder="08/24" maxlength="5" />
              <span class="co-error-msg" id="errCardDate"></span>
            </div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Đồng bộ dữ liệu từ Giỏ hàng vào Cột tóm tắt của Modal Thanh Toán
   */
  function refreshCheckoutSummaryUI() {
    const cartItems = getActiveCartItems();
    const listEl = document.getElementById('coSummaryItemsList');
    const countEl = document.getElementById('coSummaryCount');

    const summary = calculateCheckoutSummary(cartItems, {
      deliveryMode: checkoutUIState.deliveryMode,
      voucherCode: checkoutUIState.voucherCode
    });

    if (countEl) countEl.textContent = summary.totalQuantity;

    if (listEl) {
      const svgHelper =
        typeof getProductSVG === 'function' ? getProductSVG : () => '<span>🍗</span>';
      listEl.innerHTML = cartItems
        .map(
          item => `
          <div class="co-summary-item">
            <div class="co-summary-item-left">
              <div class="co-summary-thumb">${svgHelper(item.image_type)}</div>
              <div>
                <div class="co-summary-name">${sanitizeText(item.name)}</div>
                <div class="co-summary-qty">Số lượng: x${item.quantity}</div>
              </div>
            </div>
            <div class="co-summary-price">${formatCurrency(item.price * item.quantity)}</div>
          </div>
        `
        )
        .join('');
    }

    const subtotalEl = document.getElementById('coCalcSubtotal');
    const shippingEl = document.getElementById('coCalcShipping');
    const discountRowEl = document.getElementById('coCalcDiscountRow');
    const discountEl = document.getElementById('coCalcDiscount');
    const finalTotalEl = document.getElementById('coCalcFinalTotal');
    const confirmBtn = document.getElementById('coConfirmPayBtn');

    if (subtotalEl) subtotalEl.textContent = formatCurrency(summary.subtotal);
    if (shippingEl) {
      shippingEl.textContent =
        summary.finalShippingFee === 0 ? 'Miễn phí (0đ)' : formatCurrency(summary.finalShippingFee);
    }

    const totalDiscount = summary.discountAmount + summary.shippingDiscount;
    if (discountRowEl && discountEl) {
      if (totalDiscount > 0) {
        discountRowEl.style.display = 'flex';
        discountEl.textContent = `-${formatCurrency(totalDiscount)}`;
      } else {
        discountRowEl.style.display = 'none';
      }
    }

    if (finalTotalEl) finalTotalEl.textContent = formatCurrency(summary.finalTotal);
    if (confirmBtn) {
      confirmBtn.innerHTML = `<span>Xác Nhận Thanh Toán • ${formatCurrency(summary.finalTotal)}</span>`;
    }

    // Nếu đang ở chế độ QR hoặc COD thì cập nhật lại số tiền hiển thị trong panel phụ
    if (checkoutUIState.paymentMethod !== 'atm') {
      renderPaymentSubPanel();
    }
  }

  function clearValidationErrorsUI() {
    document.querySelectorAll('#kfcCheckoutForm .co-error-msg').forEach(el => {
      el.textContent = '';
    });
    document.querySelectorAll('#kfcCheckoutForm .input-error').forEach(el => {
      el.classList.remove('input-error');
    });
  }

  function showFieldErrorUI(inputId, errorId, message) {
    const inputEl = document.getElementById(inputId);
    const errEl = document.getElementById(errorId);
    if (inputEl && message) inputEl.classList.add('input-error');
    if (errEl) errEl.textContent = message || '';
  }

  function openCheckoutModal() {
    const cartItems = getActiveCartItems();
    const cartCheck = validateCartItems(cartItems);
    if (!cartCheck.valid) {
      if (typeof showToast === 'function') {
        showToast(cartCheck.error);
      }
      return false;
    }

    mountCheckoutModalDOM();
    if (typeof toggleCartDrawer === 'function') {
      toggleCartDrawer(false);
    }

    clearValidationErrorsUI();
    renderPaymentSubPanel();
    refreshCheckoutSummaryUI();

    const overlay = document.getElementById('kfcCheckoutOverlay');
    if (overlay) {
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
    }
    return true;
  }

  function closeCheckoutModal() {
    const overlay = document.getElementById('kfcCheckoutOverlay');
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function bindCheckoutDOMEvents() {
    const closeBtn = document.getElementById('kfcCloseCheckoutBtn');
    const overlay = document.getElementById('kfcCheckoutOverlay');
    const form = document.getElementById('kfcCheckoutForm');

    if (closeBtn) closeBtn.addEventListener('click', closeCheckoutModal);
    if (overlay) {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) closeCheckoutModal();
      });
    }

    // Chuyển đổi Giao hàng tận nơi / Nhận tại nhà hàng
    document.querySelectorAll('[data-delivery-mode]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('[data-delivery-mode]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        checkoutUIState.deliveryMode = tab.dataset.deliveryMode;
        const addrGroup = document.getElementById('coAddressGroup');
        const storeGroup = document.getElementById('coStoreGroup');

        if (checkoutUIState.deliveryMode === 'delivery') {
          if (addrGroup) addrGroup.style.display = 'flex';
          if (storeGroup) storeGroup.style.display = 'none';
        } else {
          if (addrGroup) addrGroup.style.display = 'none';
          if (storeGroup) storeGroup.style.display = 'flex';
        }
        refreshCheckoutSummaryUI();
      });
    });

    // Chuyển đổi Phương thức thanh toán (Tiền Mặt, Mã QR MoMo, Mã QR ZaloPay, ATM)
    document.querySelectorAll('[data-pay-method]').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('[data-pay-method]').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        checkoutUIState.paymentMethod = card.dataset.payMethod;
        renderPaymentSubPanel();
      });
    });

    // Áp dụng mã Voucher
    const applyVoucherBtn = document.getElementById('coApplyVoucherBtn');
    const voucherInput = document.getElementById('coVoucherInput');
    const voucherStatus = document.getElementById('coVoucherStatus');

    function handleApplyVoucher(codeToApply) {
      const cartItems = getActiveCartItems();
      const temp = calculateCheckoutSummary(cartItems, {
        deliveryMode: checkoutUIState.deliveryMode
      });
      const result = evaluateVoucher(codeToApply, temp.subtotal, checkoutUIState.deliveryMode);

      if (voucherStatus) {
        voucherStatus.textContent = result.message;
        voucherStatus.className = 'co-voucher-status ' + (result.valid ? 'success' : 'error');
      }

      checkoutUIState.voucherCode = result.valid ? result.code : '';
      refreshCheckoutSummaryUI();
    }

    if (applyVoucherBtn && voucherInput) {
      applyVoucherBtn.addEventListener('click', () => handleApplyVoucher(voucherInput.value));
    }

    document.querySelectorAll('[data-quick-voucher]').forEach(pill => {
      pill.addEventListener('click', () => {
        const code = pill.dataset.quickVoucher;
        if (voucherInput) voucherInput.value = code;
        handleApplyVoucher(code);
      });
    });

    // Submit Form Thanh Toán
    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        clearValidationErrorsUI();

        const cartItems = getActiveCartItems();
        const customerInfo = {
          fullName: (document.getElementById('coFullName') || {}).value || '',
          phone: (document.getElementById('coPhone') || {}).value || '',
          deliveryMode: checkoutUIState.deliveryMode,
          address: (document.getElementById('coAddress') || {}).value || '',
          storeId: (document.getElementById('coStoreSelect') || {}).value || '',
          note: (document.getElementById('coNote') || {}).value || ''
        };

        const paymentDetails = {
          bankCode: (document.getElementById('coBankCode') || {}).value || '',
          cardNumber: (document.getElementById('coCardNumber') || {}).value || '',
          cardHolder: (document.getElementById('coCardHolder') || {}).value || '',
          cardDate: (document.getElementById('coCardDate') || {}).value || ''
        };

        const result = createOrderRecord({
          cartItems,
          customerInfo,
          paymentMethod: checkoutUIState.paymentMethod,
          paymentDetails,
          voucherCode: checkoutUIState.voucherCode
        });

        if (!result.success) {
          const errs = result.errors || {};
          if (errs.fullName) showFieldErrorUI('coFullName', 'errFullName', errs.fullName);
          if (errs.phone) showFieldErrorUI('coPhone', 'errPhone', errs.phone);
          if (errs.address) showFieldErrorUI('coAddress', 'errAddress', errs.address);
          if (errs.storeId) showFieldErrorUI('coStoreSelect', 'errStoreId', errs.storeId);
          if (errs.note) showFieldErrorUI('coNote', 'errNote', errs.note);
          if (errs.bankCode) showFieldErrorUI('coBankCode', 'errBankCode', errs.bankCode);
          if (errs.cardNumber) showFieldErrorUI('coCardNumber', 'errCardNumber', errs.cardNumber);
          if (errs.cardHolder) showFieldErrorUI('coCardHolder', 'errCardHolder', errs.cardHolder);
          if (errs.cardDate) showFieldErrorUI('coCardDate', 'errCardDate', errs.cardDate);
          return;
        }

        // Lưu lịch sử đơn hàng & làm trống giỏ hàng
        saveOrderToHistory(result.order);
        if (typeof state !== 'undefined' && Array.isArray(state.cart)) {
          state.cart = [];
        }
        if (typeof saveCartToStorage === 'function') saveCartToStorage();
        if (typeof updateCartUI === 'function') updateCartUI();

        closeCheckoutModal();
        showOrderReceiptModal(result.order);
      });
    }
  }

  /**
   * Hiển thị Biên lai xác nhận đơn hàng trên `#checkoutModalBackdrop`
   */
  function showOrderReceiptModal(order) {
    const backdrop = document.getElementById('checkoutModalBackdrop');
    const codeEl = document.getElementById('checkoutOrderCode');
    const msgEl = document.getElementById('checkoutMessage');

    if (codeEl) {
      codeEl.textContent = `Mã đơn: ${order.orderCode}`;
    }

    if (msgEl) {
      const receiveText =
        order.customer.deliveryMode === 'pickup'
          ? `Nhận tại: ${order.customer.storeName}`
          : `Giao đến: ${order.customer.address}`;

      const extraPayInfo =
        order.payment.method === 'atm' && order.payment.maskedCard
          ? ` (${order.payment.bankName} - ${order.payment.maskedCard})`
          : '';

      msgEl.innerHTML = `
        Cảm ơn <strong>${order.customer.fullName}</strong> (${order.customer.phone})!<br/>
        <span style="display:inline-block;margin-top:6px;">${receiveText}</span><br/>
        <span style="display:inline-block;margin-top:4px;color:#E4002B;font-weight:700;">
          Tổng thanh toán: ${formatCurrency(order.pricing.finalTotal)} • ${order.payment.methodLabel}${extraPayInfo}
        </span>
      `;
    }

    if (backdrop) {
      backdrop.classList.add('open');
    }
  }

  /**
   * Gắn sự kiện vào nút `#checkoutBtn` của Module Giỏ Hàng (Capture phase)
   */
  function initBrowserCheckoutIntegration() {
    if (typeof document === 'undefined') return;

    const attachTrigger = () => {
      mountCheckoutModalDOM();
      const checkoutBtn = document.getElementById('checkoutBtn');
      if (checkoutBtn && !checkoutBtn.dataset.kfcCheckoutBound) {
        checkoutBtn.dataset.kfcCheckoutBound = 'true';
        checkoutBtn.addEventListener(
          'click',
          event => {
            event.stopImmediatePropagation();
            event.preventDefault();
            openCheckoutModal();
          },
          true
        );
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachTrigger);
    } else {
      attachTrigger();
    }
  }

  initBrowserCheckoutIntegration();

  // Xuất API đầy đủ phục vụ Unit Test & tích hợp các module tiếp theo
  return {
    CART_STORAGE_KEY,
    ORDER_HISTORY_STORAGE_KEY,
    SHIP_THRESHOLD,
    BASE_SHIP_FEE,
    KFC_STORES,
    ATM_BANKS,
    VOUCHER_DB,
    VALID_PAYMENT_METHODS,
    PAYMENT_METHOD_LABELS,
    sanitizeText,
    formatCurrency,
    normalizePhone,
    isValidVietnamPhone,
    validateCartItems,
    validateCustomerInfo,
    validatePaymentDetails,
    evaluateVoucher,
    calculateCheckoutSummary,
    generateOrderCode,
    createOrderRecord,
    saveOrderToHistory,
    getOrderHistory,
    getQRCodeSVG,
    openCheckoutModal,
    closeCheckoutModal
  };
});
