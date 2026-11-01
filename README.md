# KFC Vietnam Landing Page (Serverless CSV-Driven)

Trang Landing Page hiện đại quảng bá thương hiệu **Gà Rán KFC** được xây dựng hoàn toàn bằng **HTML5, CSS3 và Vanilla JavaScript (ES6+)**, đọc dữ liệu thực đơn trực tiếp từ file cơ sở dữ liệu `menu.csv` mà không cần Backend phức tạp.

---

## 1. Cấu Trúc Thư Mục Dự Án

```text
kfc-csv/
├── images/
│   └── KFC_logo-image.png   # Logo thương hiệu KFC chính thức
├── index.html               # Khung giao diện chính (Header, Hero, Deals, Menu, Cart, Footer)
├── style.css                # Giao diện KFC Theme (#E4002B, #202124, #FFFFFF, #F8F9FA), Responsive
├── app.js                   # Fetch & Parse CSV, Render Menu SVG động, Lọc/Tìm kiếm, Giỏ hàng localStorage
├── menu.csv                 # Cơ sở dữ liệu danh sách món ăn KFC
└── README.md                # Tài liệu hướng dẫn chạy dự án
```

---

## 2. Tính Năng Nổi Bật

- **Nhận diện thương hiệu KFC chuẩn mực**: Sử dụng logo từ `images/KFC_logo-image.png`, dải 3 sọc đỏ đặc trưng, bảng màu Đỏ KFC (`#E4002B`) - Đen (`#202124`) - Trắng (`#FFFFFF`) - Xám nhạt (`#F8F9FA`) và font chữ `Poppins` / `Roboto`.
- **Quản lý dữ liệu bằng `menu.csv`**: Tự động tải danh sách món ăn qua `fetch('./menu.csv')`, phân tích cú pháp CSV thành mảng Object và render ra giao diện.
- **Lọc, Tìm kiếm & Sắp xếp thời gian thực**:
  - Lọc theo danh mục: *Tất cả, Gà Rán, Burger, Combo, Khoai & Món Phụ, Nước & Tráng Miệng*.
  - Tìm kiếm tức thì theo tên món hoặc mô tả.
  - Sắp xếp theo giá tăng dần / giảm dần.
- **Hình minh họa Inline Vector SVG siêu nhẹ**: Mỗi loại sản phẩm (`fried-chicken`, `burger`, `combo`, `fries`, `drink`, `dessert`) được vẽ bằng mã SVG thuần giúp tải trang tức thì.
- **Giỏ hàng Mini (Client-side + `localStorage`)**:
  - Thêm món từ thực đơn hoặc từ thẻ Khuyến mãi Hot.
  - Tăng/giảm số lượng, xóa món, tự động tính tổng tiền & thanh tiến trình miễn phí giao hàng cho đơn từ `150.000đ`.
  - Lưu trữ trạng thái giỏ hàng bền vững trong `localStorage`.

---

## 3. Hướng Dẫn Chạy Dự Án (Zero-Backend)

Để trình duyệt cho phép đọc file `./menu.csv` qua giao thức HTTP (tránh giới hạn CORS của `file:///`), bạn có thể chạy dự án bằng một trong hai cách sau:

### Cách 1: Sử dụng Python HTTP Server (Khuyên dùng)
Mở Terminal tại thư mục dự án và chạy:

```bash
python -m http.server 8000
```

Sau đó mở trình duyệt và truy cập: **`http://localhost:8000`**

### Cách 2: Sử dụng tiện ích Live Server (VS Code / Antigravity)
1. Nhấp chuột phải vào file `index.html`.
2. Chọn **Open with Live Server**.

*(Lưu ý: Trong trường hợp bạn mở trực tiếp file `index.html` bằng thao tác nhấp đúp chuột `file:///`, ứng dụng cũng đã tích hợp sẵn bộ dữ liệu dự phòng từ `menu.csv` để giao diện vẫn hoạt động trơn tru).*
