import { Platform } from 'react-native';


// iOS Client ID (from Google Cloud Console > Credentials > OAuth 2.0 Client IDs > iOS)
export const GOOGLE_CLIENT_ID_IOS = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';

// Android Client ID (from Google Cloud Console > Credentials > OAuth 2.0 Client IDs > Android)
export const GOOGLE_CLIENT_ID_ANDROID = '70164710992-03p8jd0d6bfq6hvbpadegms0uieagd8i.apps.googleusercontent.com';

// Web Client ID (from Google Cloud Console > Credentials > OAuth 2.0 Client IDs > Web application)
export const GOOGLE_CLIENT_ID_WEB = '70164710992-2n9g38nqur8jt0hb49fh9t62ctp5k37e.apps.googleusercontent.com';

// Auto-select Client ID based on platform
export const GOOGLE_CLIENT_ID = Platform.select({
  ios: GOOGLE_CLIENT_ID_IOS,
  android: GOOGLE_CLIENT_ID_ANDROID,
  default: GOOGLE_CLIENT_ID_WEB,
});
