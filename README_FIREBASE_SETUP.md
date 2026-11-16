# MISA — cài đặt Firebase + Cloudinary + Vercel

Bộ source này giữ giao diện MISA hiện tại và dùng Firebase Authentication, Cloud Firestore, Cloudinary, Vercel. Vì website chưa có dữ liệu sản phẩm, không cần chuyển dữ liệu từ Supabase.

## 1. Firebase
1. Firebase Console → Authentication → Sign-in method → bật **Email/Password**.
2. Firebase Console → Firestore Database → Create database.
3. Mở tab Rules, dán nội dung file `firestore.rules`, bấm Publish.
4. Web config đã được điền vào `config.js` theo Firebase Web App bạn cung cấp.
5. Firebase Authentication → Settings → Authorized domains: thêm domain Vercel của website.

## 2. Tạo tài khoản Admin duy nhất
1. Deploy website trước (hoặc chạy trên localhost qua local web server). Mở `login.html`.
2. Chọn **Create a customer account**, nhập email và mật khẩu để tạo tài khoản.
3. Firebase Console → Authentication → Users → mở tài khoản vừa tạo → sao chép **User UID**.
4. Firestore Database → Start collection → Collection ID: `admins`.
5. Document ID: dán chính xác User UID vừa sao chép.
6. Thêm field `role`, type `string`, value `admin`, rồi Save.
7. Quay lại website, đăng nhập bằng tài khoản đó. Nút quản trị trên thanh điều hướng sẽ mở Admin Dashboard.

**Không tạo tài khoản Admin bằng cách thêm role trong trình duyệt.** Chỉ tạo document `admins/{UID}` thủ công trong Firebase Console. Firestore Rules chặn người dùng tự cấp quyền Admin.

## 3. Cloudinary
Cloud name trong `config.js` đã được điền là `yy6p2qnz`. Trong Cloudinary Dashboard, lấy API Key và API Secret.

## 4. Vercel Environment Variables
Vercel → Project `affiliate` → Settings → Environment Variables. Thêm 4 biến dưới đây, chọn Environment = **Production** (có thể thêm Preview nếu cần):

| Key | Value | Type        |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | `yy6p2qnz` | Config |
| `CLOUDINARY_API_KEY` | API Key trong Cloudinary | Secret |
| `CLOUDINARY_API_SECRET` | API Secret trong Cloudinary | Secret |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Toàn bộ JSON service account | Secret |

Lấy `FIREBASE_SERVICE_ACCOUNT_JSON`: Firebase Project settings → Service accounts → Generate new private key. Mở file JSON vừa tải và dán toàn bộ nội dung vào Value. Không đưa file JSON này vào GitHub, không gửi cho người khác.

## 5. Deploy
1. Giải nén ZIP. Đưa toàn bộ nội dung bên trong thư mục dự án (không đưa cả thư mục ZIP lồng thêm một cấp) lên GitHub branch `main` đang kết nối với Vercel.
2. Vercel tự deploy hoặc vào Deployments → Redeploy.
3. Kiểm tra trang chủ, đăng nhập Admin, thêm sản phẩm thử, tải ảnh, sửa/ẩn/xóa sản phẩm.

## 6. Các tính năng
- Đăng nhập và tạo tài khoản Firebase Email/Password.
- Admin được xác thực qua document `admins/{UID}` trong Firestore.
- Firestore lưu sản phẩm; khách chỉ đọc sản phẩm có `hidden = false`.
- Admin thêm, sửa, ẩn/hiện, xóa sản phẩm.
- Ảnh được upload lên Cloudinary thông qua API Vercel; API Secret và Firebase Service Account chỉ nằm ở server environment variables.
- Sản phẩm đã lưu/bookmark được lưu trên trình duyệt của từng khách bằng localStorage.

## Lưu ý bảo mật
- Firebase Web API Key và Cloudinary Cloud Name là thông tin cấu hình công khai.
- Không bao giờ commit `FIREBASE_SERVICE_ACCOUNT_JSON`, `CLOUDINARY_API_SECRET` hoặc các private key lên GitHub.
- Không xóa Supabase cho đến khi website Firebase đã được kiểm tra ổn định, dù không cần chuyển dữ liệu sản phẩm.
