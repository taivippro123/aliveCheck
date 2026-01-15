# Hướng dẫn Fix Build Error

## Vấn đề đã fix

1. ✅ Tắt New Architecture: `newArchEnabled: false`
2. ✅ Tắt React Compiler: `reactCompiler: false`  
3. ✅ Xóa thư mục `android/` để EAS tự prebuild
4. ✅ Thêm `!google-services.json` vào `.easignore` để include file trong build
5. ✅ Thêm Node version trong `eas.json`

## Vấn đề còn lại: google-services.json không được upload

File `google-services.json` bị ignore trong `.gitignore`, nên EAS Build không thể upload nó.

### Giải pháp: Dùng EAS Secrets

**Cách 1: Upload file qua EAS Secrets (Khuyến nghị)**

1. Chạy lệnh:
   ```bash
   eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type string --value-file google-services.json
   ```

2. Thêm vào `eas.json`:
   ```json
   {
     "build": {
       "production": {
         "env": {
           "GOOGLE_SERVICES_JSON": "${GOOGLE_SERVICES_JSON}"
         }
       }
     }
   }
   ```

3. Tạo build hook để copy file (tạo file `eas-hooks/pre-build.sh`):
   ```bash
   #!/bin/bash
   echo "$GOOGLE_SERVICES_JSON" > google-services.json
   ```

**Cách 2: Force add file vào git (Đơn giản hơn nhưng không an toàn)**

```bash
git add -f fe/google-services.json
git commit -m "Add google-services.json for build"
```

Sau đó build lại:
```bash
eas build -p android --profile production --clear-cache
```

## Build lại

Sau khi fix vấn đề google-services.json:

```bash
eas build -p android --profile production --clear-cache
```

## Tóm tắt thay đổi

- ✅ `newArchEnabled: false`
- ✅ `reactCompiler: false`
- ✅ Xóa thư mục `android/` (EAS sẽ tự prebuild)
- ✅ Thêm `!google-services.json` vào `.easignore`
- ✅ Thêm Node version trong `eas.json`
- ⚠️ Cần fix vấn đề upload `google-services.json`
