# API Examples

## 1. Đăng nhập bằng Google

```bash
POST /api/auth/google-login
Content-Type: application/json

{
  "token": "google-id-token-from-client"
}
```

Response:
```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "https://...",
    "emergencyContact": {
      "email": null,
      "message": null
    },
    "checkInInterval": "24h",
    "emailNotificationDelay": "immediate",
    "lastCheckIn": null,
    "status": "active"
  }
}
```

## 2. Lấy thông tin profile

```bash
GET /api/auth/profile
Authorization: Bearer jwt-token-here
```

## 3. Cập nhật cài đặt

```bash
PUT /api/settings
Authorization: Bearer jwt-token-here
Content-Type: application/json

{
  "emergencyContact": {
    "email": "relative@example.com",
    "message": "Xin chào, đây là tin nhắn tự động từ ứng dụng điểm danh. Nếu bạn nhận được email này, có nghĩa là tôi đã không điểm danh trong khoảng thời gian đã cài đặt. Vui lòng liên hệ với tôi hoặc các cơ quan chức năng nếu cần thiết."
  },
  "checkInInterval": "24h",
  "emailNotificationDelay": "immediate"
}
```

Các giá trị hợp lệ:
- `checkInInterval`: `"12h"`, `"24h"`, `"3d"`, `"1w"`
- `emailNotificationDelay`: `"immediate"`, `"1d"`

## 4. Điểm danh

```bash
POST /api/checkin
Authorization: Bearer jwt-token-here
```

Response:
```json
{
  "success": true,
  "message": "Check-in successful",
  "lastCheckIn": "2024-01-01T12:00:00.000Z",
  "status": "active"
}
```

## 5. Lấy trạng thái điểm danh

```bash
GET /api/checkin/status
Authorization: Bearer jwt-token-here
```

Response:
```json
{
  "success": true,
  "needsCheckIn": false,
  "lastCheckIn": "2024-01-01T12:00:00.000Z",
  "hoursSinceLastCheckIn": 5,
  "daysSinceLastCheckIn": 0,
  "checkInInterval": "24h",
  "status": "active"
}
```

## 6. Lấy lịch sử điểm danh

```bash
GET /api/checkin/history?limit=50
Authorization: Bearer jwt-token-here
```

## Testing với cURL

### Đăng nhập
```bash
curl -X POST http://localhost:3000/api/auth/google-login \
  -H "Content-Type: application/json" \
  -d '{"token":"your-google-id-token"}'
```

### Điểm danh
```bash
curl -X POST http://localhost:3000/api/checkin \
  -H "Authorization: Bearer your-jwt-token"
```

### Cập nhật cài đặt
```bash
curl -X PUT http://localhost:3000/api/settings \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "emergencyContact": {
      "email": "relative@example.com",
      "message": "Tin nhắn của bạn"
    },
    "checkInInterval": "24h",
    "emailNotificationDelay": "immediate"
  }'
```
