# Đặc Tả Kỹ Thuật Dự Án: KFC Landing Page (Serverless CSV-Driven)

Tài liệu này định hình cấu trúc mã nguồn, định dạng file `.csv` và cách thiết lập môi trường chạy không cần backend.

---

## 1. Cấu Trúc Thư Mục Dự Án

```text
kfc-landing-page/
├── index.html        # Khung giao diện chính và cấu trúc DOM
├── style.css         # Màu sắc, Typography, Flexbox/Grid, Responsive
├── app.js            # Fetch CSV, parse CSV, render Menu, Cart logic
├── menu.csv          # File database chứa danh sách sản phẩm
└── README.md         # Hướng dẫn chạy dự án
```

---

## 2. Cấu Trúc Dữ Liệu `menu.csv`

Dưới đây là nội dung mẫu của file `menu.csv` dùng làm cơ sở dữ liệu:

```csv
id,name,category,price,description,badge,image_type
1,Gà Giòn Cay (1 Miếng),chicken,38000,Gà giòn cay thơm nức giòn rụm khó cưỡng,Bestseller,fried-chicken
2,Gà Truyền Thống (1 Miếng),chicken,38000,Hương vị 11 loại thảo mộc nguyên bản KFC,,fried-chicken
3,Burger Tôm Cay,burger,55000,Tôm biển giòn ngọt kèm sốt cay bùng nổ,Mới,burger
4,Burger Zinger,burger,65000,Thịt gà phi lê xốt mayonnaise thượng hạng,Hot,burger
5,Combo Nhóm Siêu Tiết Kiệm,combo,149000,3 miếng gà + 1 burger + 2 lon Pepsi,Tiết kiệm 20%,combo
6,Khoai Tây Chiên (Lớn),side,29000,Khoai tây cắt thanh giòn vàng rộm,,fries
7,Pepsi Không Calo,drink,19000,Nước ngọt có gas mát lạnh sảng khoái,,drink
```

---

## 3. Cơ Chế Đọc CSV Bằng JavaScript Thuần

Do trình duyệt bảo vệ chính sách bảo mật (CORS), bạn không thể nhấp đúp trực tiếp vào `index.html` (giao thức `file:///`) để đọc file `menu.csv`. Cần sử dụng một HTTP server tĩnh nội bộ:

### Đoạn Code Phân Tích CSV Mẫu (`app.js`):
```javascript
async function loadMenuFromCSV() {
  try {
    const response = await fetch('./menu.csv');
    const data = await response.text();
    
    // Tách dòng
    const rows = data.trim().split('\n');
    const headers = rows[0].split(',').map(h => h.trim());
    
    const items = rows.slice(1).map(row => {
      const values = row.split(',').map(v => v.trim());
      return headers.reduce((obj, header, index) => {
        obj[header] = values[index];
        return obj;
      }, {});
    });

    renderMenu(items);
  } catch (error) {
    console.error('Không thể tải menu.csv:', error);
  }
}
```

---

## 4. Cách Vận Hành (Zero-Backend)

1. Mở thư mục dự án trong VS Code hoặc Antigravity.
2. Dùng tiện ích mở rộng **Live Server** (Click chuột phải vào `index.html` $\rightarrow$ chọn **Open with Live Server**).
3. Hoặc mở Terminal chạy lệnh Python sẵn có trên máy:
   ```bash
   python -m http.server 8000
   ```
4. Truy cập `http://localhost:8000` để trải nghiệm Landing Page.