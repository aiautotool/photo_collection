import appJson from './app.json';

export default {
  ...appJson.expo,
  plugins: [
    'expo-router',
    'expo-media-library',
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme:
          process.env.EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID ||
          'com.googleusercontent.apps.REPLACE_WITH_IOS_CLIENT_ID',
      },
    ],
  ],
  ios: {
    ...appJson.expo.ios,
    infoPlist: {
      NSPhotoLibraryUsageDescription: 'PhotoSync cần quyền đọc ảnh và video để sao lưu lên Google Drive.',
    },
  },
  android: {
    ...appJson.expo.android,
    permissions: ['READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO'],
  },
};
