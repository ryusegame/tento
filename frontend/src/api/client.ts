// API通信の共通axiosインスタンス。
// リクエスト時にSanctumトークンを自動付与し、401時はトークン破棄→ログイン画面へ戻す。
// トークンはAsyncStorageに永続化する。
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetToLogin } from '../navigation/navigationRef';

const TOKEN_KEY = 'auth_token';

export const client = axios.create({
  // baseURL: 'http://localhost:8000/api',
  //実機テスト用
  //baseURL: 'http://192.168.151.46:8000/api',
  baseURL: 'https://tento-production.up.railway.app/api',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401（認証切れ）時はトークンを削除してログイン画面へ戻す
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      resetToLogin();
    }
    return Promise.reject(error);
  }
);

export const saveToken = (token: string) => AsyncStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => AsyncStorage.removeItem(TOKEN_KEY);
export const getToken = () => AsyncStorage.getItem(TOKEN_KEY);
