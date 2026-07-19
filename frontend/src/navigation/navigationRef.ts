import { createNavigationContainerRef } from '@react-navigation/native';

// Reactコンポーネント外（axiosインターセプター等）からナビゲーションするための参照
export const navigationRef = createNavigationContainerRef();

// ログイン画面へリセット遷移する
export function resetToLogin() {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
  }
}
