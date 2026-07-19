// アプリのエントリーポイント。ナビゲーション全体を描画するだけの薄いラッパー。
import 'react-native-gesture-handler';
import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return <AppNavigator />;
}
