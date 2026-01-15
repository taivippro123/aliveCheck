# AliveCheck Backend API

Backend API cho ứng dụng điểm danh cho người sống một mình.

## Tính năng

- ✅ Đăng nhập bằng Google OAuth
- ✅ Điểm danh (Check-in)
- ✅ Cài đặt thời gian check-in: 12h, 24h, 3 ngày, 1 tuần
- ✅ Cài đặt thời gian gửi email khi quên check-in: ngay lập tức, sau 1 ngày
- ✅ Tin nhắn cuối nếu không check-in sau 7 ngày
- ✅ Gửi email tự động qua Gmail SMTP bằng Nodemailer
- ✅ Swagger API Documentation

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Tạo file `.env` từ `.env.example` và điền thông tin:
```bash
cp .env.example .env
```

3. Cấu hình `.env`:
- `MONGODB_URI`: Đường dẫn MongoDB (ví dụ: `mongodb://localhost:27017/alivecheck`)
- `JWT_SECRET`: Secret key cho JWT (tạo một chuỗi ngẫu nhiên)
- `GOOGLE_CLIENT_ID`: Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret
- `GMAIL_USER`: Email Gmail của bạn
- `GMAIL_PASS`: App Password của Gmail (không phải mật khẩu thường)

### Lấy Google OAuth Credentials

#### Bước 1: Truy cập Google Cloud Console
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Đăng nhập bằng tài khoản Google của bạn

#### Bước 2: Tạo Project mới
1. Ở góc trên cùng bên trái, click vào dropdown **"Select a project"**
2. Click **"New Project"**
3. Điền tên project (ví dụ: "AliveCheck")
4. Click **"Create"**
5. Chờ vài giây để project được tạo, sau đó chọn project vừa tạo

#### Bước 3: Enable Google Identity API
1. Vào menu **"APIs & Services"** > **"Library"** (hoặc truy cập trực tiếp: https://console.cloud.google.com/apis/library)
2. Tìm kiếm **"Google Identity"** hoặc **"Google+ API"**
3. Click vào **"Google Identity Services API"** hoặc **"Google+ API"**
4. Click nút **"Enable"** để bật API

**Lưu ý:** Google đã deprecated Google+ API, nhưng bạn có thể sử dụng **"Google Identity Services API"** hoặc **"People API"** thay thế. API này cho phép xác thực người dùng bằng Google.

#### Bước 4: Tạo OAuth Consent Screen
1. Vào **"APIs & Services"** > **"OAuth consent screen"**
2. Chọn **"External"** (cho development) hoặc **"Internal"** (nếu bạn có Google Workspace)
3. Click **"Create"**
4. Điền thông tin:
   - **App name**: Tên ứng dụng (ví dụ: "AliveCheck")
   - **User support email**: Email hỗ trợ của bạn
   - **Developer contact information**: Email của bạn
5. Click **"Save and Continue"**
6. Ở màn hình **"Scopes"**, click **"Add or Remove Scopes"**
   - Chọn scope: `openid`, `email`, `profile`
   - Click **"Update"** > **"Save and Continue"**
7. Ở màn hình **"Test users"** (nếu chọn External), bạn có thể thêm test users hoặc bỏ qua
8. Click **"Save and Continue"** > **"Back to Dashboard"**

#### Bước 5: Tạo OAuth 2.0 Client ID
1. Vào **"APIs & Services"** > **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** ở phía trên
3. Chọn **"OAuth client ID"**
4. Nếu chưa cấu hình OAuth consent screen, bạn sẽ được yêu cầu cấu hình trước (làm theo Bước 4)
5. Chọn **Application type**: 
   - **Web application** (cho backend API)
   - Hoặc **iOS/Android** (nếu bạn đang làm mobile app)
6. Điền thông tin:
   - **Name**: Tên client (ví dụ: "AliveCheck Backend")
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (cho development)
     - Thêm domain production khi deploy (ví dụ: `https://yourdomain.com`)
   - **Authorized redirect URIs**: 
     - `http://localhost:3000/api/auth/callback` (nếu cần)
     - Hoặc để trống nếu chỉ dùng ID token
7. Click **"Create"**
8. **QUAN TRỌNG**: Một popup sẽ hiện ra với:
   - **Your Client ID**: Copy giá trị này → dán vào `GOOGLE_CLIENT_ID` trong file `.env`
   - **Your Client Secret**: Copy giá trị này → dán vào `GOOGLE_CLIENT_SECRET` trong file `.env`
9. Click **"OK"** để đóng popup

**⚠️ Lưu ý quan trọng:**
- Client Secret chỉ hiển thị **MỘT LẦN DUY NHẤT**. Nếu bạn quên, phải tạo Client ID mới
- Giữ Client Secret an toàn, không commit vào Git
- Với mobile app, bạn có thể cần tạo thêm OAuth Client ID riêng cho iOS/Android

#### Bước 6: Kiểm tra lại trong file `.env`
Mở file `.env` và đảm bảo có:
```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

### Lấy Gmail App Password

#### Bước 1: Bật 2-Step Verification (Xác thực 2 bước)
1. Truy cập [Google Account Security](https://myaccount.google.com/security)
2. Tìm phần **"How you sign in to Google"**
3. Click vào **"2-Step Verification"**
4. Click **"Get Started"** và làm theo hướng dẫn:
   - Nhập mật khẩu Google của bạn
   - Chọn phương thức xác thực (SMS hoặc Authenticator app)
   - Nhập mã xác thực được gửi đến
5. Hoàn tất quá trình bật 2-Step Verification

**Lưu ý:** App Password chỉ có thể tạo khi đã bật 2-Step Verification.

#### Bước 2: Tạo App Password
1. Truy cập [App Passwords](https://myaccount.google.com/apppasswords)
   - Hoặc vào: Google Account > Security > 2-Step Verification > App passwords (ở cuối trang)
2. Nếu được yêu cầu, đăng nhập lại bằng mật khẩu Google
3. Ở màn hình **"App passwords"**:
   - **Select app**: Chọn **"Mail"**
   - **Select device**: Chọn **"Other (Custom name)"** và nhập tên (ví dụ: "AliveCheck Backend")
4. Click **"Generate"**
5. **QUAN TRỌNG**: Một mật khẩu 16 ký tự sẽ hiển thị (ví dụ: `abcd efgh ijkl mnop`)
   - Copy **TOÀN BỘ** mật khẩu này (bao gồm cả khoảng trắng hoặc bỏ khoảng trắng đều được)
   - Dán vào `GMAIL_PASS` trong file `.env`
6. Click **"Done"**

**⚠️ Lưu ý quan trọng:**
- App Password chỉ hiển thị **MỘT LẦN DUY NHẤT**. Nếu bạn quên, phải tạo App Password mới
- App Password khác với mật khẩu Gmail thông thường
- Không sử dụng mật khẩu Gmail thông thường trong `GMAIL_PASS`, sẽ không hoạt động
- Giữ App Password an toàn, không commit vào Git

#### Bước 3: Kiểm tra lại trong file `.env`
Mở file `.env` và đảm bảo có:
```env
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-16-character-app-password
```

**Ví dụ:**
```env
GMAIL_USER=myemail@gmail.com
GMAIL_PASS=abcd efgh ijkl mnop
```

#### Bước 4: Test kết nối Email (Tùy chọn)
Sau khi cấu hình xong, bạn có thể test bằng cách:
1. Chạy server: `npm start`
2. Kiểm tra console log khi server khởi động
3. Nếu có lỗi kết nối email, kiểm tra lại:
   - `GMAIL_USER` đúng định dạng email
   - `GMAIL_PASS` là App Password (không phải mật khẩu thường)
   - Đã bật 2-Step Verification

## Chạy ứng dụng

```bash
# Development mode (với auto-reload)
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại `http://localhost:3000`

## API Documentation

Swagger UI: `http://localhost:3000/api-docs`

## API Endpoints

### Authentication
- `POST /api/auth/google-login` - Đăng nhập bằng Google
- `GET /api/auth/profile` - Lấy thông tin profile (cần authentication)

### Check-in
- `POST /api/checkin` - Điểm danh (cần authentication)
- `GET /api/checkin/status` - Lấy trạng thái điểm danh (cần authentication)
- `GET /api/checkin/history` - Lấy lịch sử điểm danh (cần authentication)

### Settings
- `GET /api/settings` - Lấy cài đặt (cần authentication)
- `PUT /api/settings` - Cập nhật cài đặt (cần authentication)

## Cấu trúc thư mục

```
be/
├── config/          # Cấu hình (database, email, swagger)
├── controllers/     # Controllers xử lý logic
├── middleware/      # Middleware (authentication)
├── models/          # Mongoose models
├── routes/          # API routes
├── services/        # Business logic services
├── jobs/            # Background jobs (email checking)
└── index.js         # Entry point
```

## Background Jobs

Hệ thống tự động chạy job kiểm tra email mỗi giờ để:
- Kiểm tra người dùng nào đã quên check-in
- Gửi email cảnh báo đến người thân
- Gửi tin nhắn cuối sau 7 ngày không check-in

## License

ISC
