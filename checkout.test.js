/**
 * ============================================================================
 * BỘ KIỂM THỬ NGHIÊM NGẶT (STRICT TEST SUITE) - MODULE 2: THANH TOÁN
 * Bao gồm 4 phương thức thanh toán: Tiền Mặt, Mã QR MoMo, Mã QR ZaloPay, Thẻ ATM
 * Chạy trực tiếp bằng lệnh: `node checkout.test.js`
 * ============================================================================
 */

const assert = require('assert');
const Checkout = require('./checkout.js');

let passedTests = 0;
let failedTests = 0;
const testResults = [];

function runTest(testId, description, fn) {
  try {
    fn();
    passedTests += 1;
    testResults.push({ id: testId, status: 'PASS', description });
    console.log(`✅ [PASS] ${testId}: ${description}`);
  } catch (error) {
    failedTests += 1;
    testResults.push({ id: testId, status: 'FAIL', description, error: error.message });
    console.error(`❌ [FAIL] ${testId}: ${description}`);
    console.error(`   ↳ Chi tiết lỗi: ${error.message}`);
  }
}

// Dữ liệu mẫu mô phỏng từ Module 1 (Giỏ Hàng - `kfc_cart_items_v1`)
const SAMPLE_CART_SMALL = [
  {
    id: '1',
    name: 'Gà Giòn Cay (1 Miếng)',
    price: 38000,
    image_type: 'fried-chicken',
    quantity: 2 // 76.000đ (< 150.000đ -> có phí ship 15.000đ)
  }
];

const SAMPLE_CART_MEDIUM = [
  {
    id: '4',
    name: 'Burger Zinger',
    price: 65000,
    image_type: 'burger',
    quantity: 2 // 130.000đ (< 150.000đ -> có phí ship 15.000đ)
  }
];

const SAMPLE_CART_LARGE = [
  {
    id: '5',
    name: 'Combo Nhóm Siêu Tiết Kiệm',
    price: 149000,
    image_type: 'combo',
    quantity: 2 // 298.000đ (>= 150.000đ -> Miễn phí giao hàng)
  }
];

console.log('====================================================================');
console.log(' BẮT ĐẦU CHẠY BỘ TEST CASE NGHIÊM NGẶT CHO MODULE 2: THANH TOÁN KFC ');
console.log('====================================================================\n');

// ----------------------------------------------------------------------------
// NHÓM 1: KIỂM THỬ HỢP ĐỒNG DỮ LIỆU VỚI MODULE GIỎ HÀNG (CART INTEGRATION)
// ----------------------------------------------------------------------------

runTest('TC-01', 'Từ chối thanh toán khi giỏ hàng rỗng hoặc không phải mảng', () => {
  const resEmpty = Checkout.validateCartItems([]);
  assert.strictEqual(resEmpty.valid, false);
  assert.ok(resEmpty.error.includes('Giỏ hàng đang trống'));

  const resNull = Checkout.validateCartItems(null);
  assert.strictEqual(resNull.valid, false);
});

runTest('TC-02', 'Từ chối giỏ hàng có sản phẩm sai cấu trúc (thiếu id, giá <= 0, số lượng âm hoặc > 99)', () => {
  const missingName = Checkout.validateCartItems([{ id: '1', price: 38000, quantity: 1 }]);
  assert.strictEqual(missingName.valid, false);

  const negativePrice = Checkout.validateCartItems([
    { id: '1', name: 'Gà Rán', price: -10000, quantity: 1 }
  ]);
  assert.strictEqual(negativePrice.valid, false);

  const zeroQty = Checkout.validateCartItems([
    { id: '1', name: 'Gà Rán', price: 38000, quantity: 0 }
  ]);
  assert.strictEqual(zeroQty.valid, false);

  const overflowQty = Checkout.validateCartItems([
    { id: '1', name: 'Gà Rán', price: 38000, quantity: 100 }
  ]);
  assert.strictEqual(overflowQty.valid, false);
});

runTest('TC-03', 'Chấp nhận giỏ hàng chuẩn cấu trúc từ Module Giỏ Hàng', () => {
  const validCart = Checkout.validateCartItems(SAMPLE_CART_SMALL);
  assert.strictEqual(validCart.valid, true);
  assert.strictEqual(validCart.error, null);
});

// ----------------------------------------------------------------------------
// NHÓM 2: KIỂM THỬ XÁC THỰC THÔNG TIN KHÁCH HÀNG & GIAO NHẬN
// ----------------------------------------------------------------------------

runTest('TC-04', 'Chuẩn hóa và kiểm tra số điện thoại Việt Nam (03, 05, 07, 08, 09 & +84)', () => {
  assert.strictEqual(Checkout.normalizePhone('+84 901 234 567'), '0901234567');
  assert.strictEqual(Checkout.normalizePhone('098-765-4321'), '0987654321');
  assert.strictEqual(Checkout.isValidVietnamPhone('0901234567'), true);
  assert.strictEqual(Checkout.isValidVietnamPhone('+84388112233'), true);
  assert.strictEqual(Checkout.isValidVietnamPhone('0123456789'), false);
  assert.strictEqual(Checkout.isValidVietnamPhone('09012345'), false);
});

runTest('TC-05', 'Bắt lỗi khi Họ tên, SĐT hoặc Địa chỉ giao hàng bị bỏ trống / quá ngắn', () => {
  const res = Checkout.validateCustomerInfo({
    fullName: 'A',
    phone: '12345',
    deliveryMode: 'delivery',
    address: 'Số 1'
  });
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.fullName);
  assert.ok(res.errors.phone);
  assert.ok(res.errors.address);
});

runTest('TC-06', 'Xác thực chế độ Nhận tại nhà hàng (Pickup) yêu cầu mã cửa hàng KFC hợp lệ', () => {
  const invalidStore = Checkout.validateCustomerInfo({
    fullName: 'Trần Thị B',
    phone: '0912345678',
    deliveryMode: 'pickup',
    storeId: 'invalid-store-id'
  });
  assert.strictEqual(invalidStore.valid, false);
  assert.ok(invalidStore.errors.storeId);

  const validStore = Checkout.validateCustomerInfo({
    fullName: 'Trần Thị B',
    phone: '0912345678',
    deliveryMode: 'pickup',
    storeId: 'kfc-ndh'
  });
  assert.strictEqual(validStore.valid, true);
  assert.strictEqual(validStore.normalizedData.storeName, 'KFC Nguyễn Du - Quận 1, TP.HCM');
  assert.strictEqual(validStore.normalizedData.address, '');
});

runTest('TC-07', 'Chống tấn công XSS (Sanitize HTML tags) trong thông tin khách hàng', () => {
  const check = Checkout.validateCustomerInfo({
    fullName: '<script>alert("xss")</script>Nguyễn Văn A',
    phone: '0909112233',
    deliveryMode: 'delivery',
    address: '123 Lê Lợi, Phường Bến Nghé, Quận 1 <b>TP.HCM</b>',
    note: '<img src=x onerror=alert(1)>Không lấy tương cà'
  });
  assert.strictEqual(check.valid, true);
  assert.ok(!check.normalizedData.fullName.includes('<script>'));
  assert.ok(!check.normalizedData.address.includes('<b>'));
  assert.ok(!check.normalizedData.note.includes('<img'));
});

// ----------------------------------------------------------------------------
// NHÓM 3: KIỂM THỬ VOUCHER ENGINE & TÍNH TOÁN GIÁ TIỀN
// ----------------------------------------------------------------------------

runTest('TC-08', 'Tính phí giao hàng chuẩn: < 150.000đ tính 15.000đ, >= 150.000đ miễn phí, Pickup miễn phí', () => {
  const sumSmall = Checkout.calculateCheckoutSummary(SAMPLE_CART_SMALL, {
    deliveryMode: 'delivery'
  });
  assert.strictEqual(sumSmall.subtotal, 76000);
  assert.strictEqual(sumSmall.finalShippingFee, 15000);
  assert.strictEqual(sumSmall.finalTotal, 91000);

  const sumLarge = Checkout.calculateCheckoutSummary(SAMPLE_CART_LARGE, {
    deliveryMode: 'delivery'
  });
  assert.strictEqual(sumLarge.subtotal, 298000);
  assert.strictEqual(sumLarge.finalShippingFee, 0);
  assert.strictEqual(sumLarge.finalTotal, 298000);

  const sumPickup = Checkout.calculateCheckoutSummary(SAMPLE_CART_SMALL, {
    deliveryMode: 'pickup'
  });
  assert.strictEqual(sumPickup.finalShippingFee, 0);
  assert.strictEqual(sumPickup.finalTotal, 76000);
});

runTest('TC-09', 'Mã giảm giá KFC20: giảm 20% tối đa 50.000đ cho đơn từ 100.000đ', () => {
  const failUnderMin = Checkout.evaluateVoucher('KFC20', 76000, 'delivery');
  assert.strictEqual(failUnderMin.valid, false);

  const okMedium = Checkout.evaluateVoucher('kfc20', 130000, 'delivery');
  assert.strictEqual(okMedium.valid, true);
  assert.strictEqual(okMedium.discountAmount, 26000);

  const okCap = Checkout.evaluateVoucher('KFC20', 298000, 'delivery');
  assert.strictEqual(okCap.valid, true);
  assert.strictEqual(okCap.discountAmount, 50000);
});

runTest('TC-10', 'Mã FREESHIP: miễn phí ship 15.000đ cho đơn >= 60.000đ, từ chối khi chọn Pickup hoặc đã Freeship', () => {
  const okFreeShip = Checkout.evaluateVoucher('FREESHIP', 76000, 'delivery');
  assert.strictEqual(okFreeShip.valid, true);
  assert.strictEqual(okFreeShip.shippingDiscount, 15000);

  const failPickup = Checkout.evaluateVoucher('FREESHIP', 76000, 'pickup');
  assert.strictEqual(failPickup.valid, false);

  const failAlreadyFree = Checkout.evaluateVoucher('FREESHIP', 200000, 'delivery');
  assert.strictEqual(failAlreadyFree.valid, false);
});

// ----------------------------------------------------------------------------
// NHÓM 4: KIỂM THỬ 4 PHƯƠNG THỨC THANH TOÁN (TIỀN MẶT, MÃ QR MOMO, MÃ QR ZALOPAY, THẺ ATM)
// ----------------------------------------------------------------------------

runTest('TC-11', 'Xác thực 4 phương thức thanh toán: Tiền Mặt (cod), Mã QR MoMo (momo), Mã QR ZaloPay (zalopay), Thẻ ATM (atm)', () => {
  assert.deepStrictEqual(Checkout.VALID_PAYMENT_METHODS, ['cod', 'momo', 'zalopay', 'atm']);
  assert.strictEqual(Checkout.validatePaymentDetails('cod').valid, true);
  assert.strictEqual(Checkout.validatePaymentDetails('momo').valid, true);
  assert.strictEqual(Checkout.validatePaymentDetails('zalopay').valid, true);
  assert.strictEqual(Checkout.validatePaymentDetails('bitcoin').valid, false);
});

runTest('TC-12', 'Sinh mã QR Vector SVG riêng biệt cho Mã QR MoMo và Mã QR ZaloPay', () => {
  const momoQR = Checkout.getQRCodeSVG('momo');
  const zaloQR = Checkout.getQRCodeSVG('zalopay');
  assert.ok(momoQR.includes('MoMo') && momoQR.includes('#A50064'));
  assert.ok(zaloQR.includes('ZaloPay') && zaloQR.includes('#0068FF'));
});

runTest('TC-13', 'Xác thực Thẻ ATM Nội Địa (chọn Ngân hàng, số thẻ 16-19 số, tên chủ thẻ, ngày phát hành MM/YY, che số thẻ)', () => {
  // Thiếu ngân hàng và số thẻ sai
  const invalidAtm = Checkout.validatePaymentDetails('atm', {
    bankCode: '',
    cardNumber: '12345',
    cardHolder: 'A',
    cardDate: '15/2026'
  });
  assert.strictEqual(invalidAtm.valid, false);
  assert.ok(invalidAtm.errors.bankCode);
  assert.ok(invalidAtm.errors.cardNumber);
  assert.ok(invalidAtm.errors.cardHolder);
  assert.ok(invalidAtm.errors.cardDate);

  // Thẻ ATM Vietcombank hợp lệ (16 chữ số NAPAS 9704...)
  const validAtm = Checkout.validatePaymentDetails('atm', {
    bankCode: 'VCB',
    cardNumber: '9704 3600 1234 5678',
    cardHolder: 'NGUYEN VAN A',
    cardDate: '08/24'
  });
  assert.strictEqual(validAtm.valid, true);
  assert.ok(validAtm.bankName.includes('Vietcombank'));
  assert.strictEqual(validAtm.maskedCard, '9704 **** **** 5678');
});

// ----------------------------------------------------------------------------
// NHÓM 5: KIỂM THỬ TẠO ĐƠN HÀNG HOÀN CHỈNH VỚI MỖI PHƯƠNG THỨC & LƯU LOCALSTORAGE
// ----------------------------------------------------------------------------

runTest('TC-14', 'Tạo đơn hàng thành công với Mã QR ZaloPay & Thẻ ATM và lưu lịch sử vào localStorage', () => {
  const mockStorage = {
    store: {},
    getItem(k) {
      return this.store[k] || null;
    },
    setItem(k, v) {
      this.store[k] = String(v);
    }
  };

  const fixedNow = new Date('2026-11-01T14:40:00.000Z');

  // Đơn hàng 1: Thanh toán bằng Mã QR ZaloPay
  const zaloOrderRes = Checkout.createOrderRecord({
    cartItems: SAMPLE_CART_MEDIUM, // 130.000đ
    customerInfo: {
      fullName: 'Lê Hoàng Nam',
      phone: '+84 918 223 344',
      deliveryMode: 'delivery',
      address: '45 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
      note: 'Giao giờ nghỉ trưa'
    },
    paymentMethod: 'zalopay',
    voucherCode: 'KFC30K', // Giảm 30.000đ
    now: fixedNow
  });

  assert.strictEqual(zaloOrderRes.success, true);
  assert.strictEqual(zaloOrderRes.order.payment.method, 'zalopay');
  assert.strictEqual(zaloOrderRes.order.payment.methodLabel, 'Mã QR ZaloPay (Ví điện tử ZaloPay)');
  assert.strictEqual(zaloOrderRes.order.pricing.finalTotal, 115000);

  // Đơn hàng 2: Thanh toán bằng Thẻ ATM Techcombank
  const atmOrderRes = Checkout.createOrderRecord({
    cartItems: SAMPLE_CART_LARGE, // 298.000đ (Free ship)
    customerInfo: {
      fullName: 'Nguyễn Minh Châu',
      phone: '0909888777',
      deliveryMode: 'delivery',
      address: '100 Trần Hưng Đạo, Quận 1, TP.HCM'
    },
    paymentMethod: 'atm',
    paymentDetails: {
      bankCode: 'TCB',
      cardNumber: '9704070099887766',
      cardHolder: 'NGUYEN MINH CHAU',
      cardDate: '05/25'
    },
    now: fixedNow
  });

  assert.strictEqual(atmOrderRes.success, true);
  assert.strictEqual(atmOrderRes.order.payment.method, 'atm');
  assert.ok(atmOrderRes.order.payment.bankName.includes('Techcombank'));
  assert.strictEqual(atmOrderRes.order.payment.maskedCard, '9704 **** **** 7766');

  // Lưu cả 2 đơn hàng vào lịch sử
  Checkout.saveOrderToHistory(zaloOrderRes.order, mockStorage);
  Checkout.saveOrderToHistory(atmOrderRes.order, mockStorage);
  const savedHistory = Checkout.getOrderHistory(mockStorage);
  assert.strictEqual(savedHistory.length, 2);
});

runTest('TC-15', 'Chặn tạo đơn hàng nếu người dùng nhập mã Voucher không hợp lệ', () => {
  const res = Checkout.createOrderRecord({
    cartItems: SAMPLE_CART_SMALL,
    customerInfo: {
      fullName: 'Phạm Minh Tuấn',
      phone: '0933445566',
      deliveryMode: 'delivery',
      address: '88 Đồng Khởi, Phường Bến Nghé, Quận 1, TP.HCM'
    },
    paymentMethod: 'cod',
    voucherCode: 'MA_SAI_123'
  });

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.stage, 'voucher');
  assert.ok(res.errors.voucher);
});

console.log('\n====================================================================');
console.log(` KẾT QUẢ KIỂM THỬ: ${passedTests}/${passedTests + failedTests} TEST CASES ĐẠT (PASS)`);
console.log('====================================================================');

if (failedTests > 0) {
  process.exit(1);
}
