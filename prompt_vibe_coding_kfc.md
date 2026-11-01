# Prompt Dành Cho Vibe Coding (Copy vào Antigravity / Cursor)

Sao chép toàn bộ nội dung bên dưới và dán vào cửa sổ chat của Antigravity để AI tự động code trang Landing Page cho bạn:

---

```text
Hãy đóng vai trò là một Frontend Developer chuyên nghiệp. Hãy tạo cho tôi một Landing Page hiện đại, bắt mắt để quảng bá thương hiệu Gà Rán KFC với các yêu cầu kỹ thuật nghiêm ngặt sau:

1. Kiến trúc & Công nghệ:
   - Chỉ sử dụng HTML5, CSS3 hiện đại (Flexbox/Grid, CSS Variables, animation mượt mà) và Vanilla JavaScript thuần (ES6+).
   - KHÔNG dùng bất kỳ Backend framework nào (Node.js, Python, PHP,...).
   - KHÔNG dùng build tool phức tạp (Webpack, Vite,...). Chạy trực tiếp qua HTTP server đơn giản hoặc Live Server.

2. Quản lý Dữ liệu (Database CSV):
   - Tạo một file dữ liệu tên là `menu.csv` chứa danh sách món ăn:
     id,name,category,price,description,badge,image_svg
   - Phía JavaScript: Sử dụng Web API `fetch('menu.csv')` để đọc file CSV, viết hàm parser đơn giản chuyển CSV thành mảng Object và render động ra giao diện.
   - Hỗ trợ lọc theo Danh mục (Tất cả, Gà Rán, Burger, Combo, Nước & Tráng miệng).

3. Giao diện & Nhận diện thương hiệu (KFC Theme):
   - Tông màu chủ đạo: Đỏ KFC (`#E4002B`), Đen (`#202124`), Trắng (`#FFFFFF`), Xám nhạt (`#F8F9FA`).
   - Typography: Font không chân hiện đại, đậm chất đồ ăn nhanh (Roboto hoặc Poppins từ Google Fonts).
   - Bố cục trang gồm các Section:
     * Header & Navbar: Logo KFC cách điệu, menu điều hướng, nút giỏ hàng (hiển thị số lượng món).
     * Hero Banner: Slogan ấn tượng "Vị Ngon Trên Từng Ngón Tay", nút CTA "Đặt Ngay", hoạt họa món gà hấp dẫn.
     * Khuyến mãi Hot: Slider / Grid các deal hot trong ngày.
     * Menu động: Lọc danh mục + Grid sản phẩm lấy trực tiếp từ `menu.csv`.
     * Tính năng Giỏ hàng Mini (Client-side): Click "Thêm vào giỏ" sẽ cập nhật modal giỏ hàng và tính tổng tiền bằng JavaScript (lưu vào localStorage).
     * Footer: Thông tin liên hệ, bản quyền KFC fan-made.

4. Xử lý Hình ảnh (Dung lượng siêu nhẹ):
   - Không dùng ảnh PNG/JPG nặng.
   - Sử dụng các biểu tượng Inline SVG trực tiếp hoặc tạo các hình minh họa gà rán, burger, nước ngọt bằng vector SVG code nhẹ, tải tức thì.

Hãy tạo mã nguồn hoàn chỉnh, sạch đẹp, có chú thích rõ ràng.
```