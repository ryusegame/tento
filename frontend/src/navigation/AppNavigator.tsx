import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { client, getToken, removeToken } from '../api/client';
import { navigationRef } from './navigationRef';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import TransactionInputScreen from '../screens/TransactionInputScreen';
import TransactionListScreen from '../screens/TransactionListScreen';
import TransactionDetailModal from '../screens/TransactionDetailModal';
import BalanceScreen from '../screens/BalanceScreen';
import SettingsScreen from '../screens/SettingsScreen';

// アプリのナビゲーション定義。
// 起動時のトークン有無でログイン画面／メインタブを切り替え、
// メインは入力・履歴・残高の3タブ＋取引詳細モーダルで構成する。

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ログイン後のメイン画面（下タブ：入力／履歴／残高、ヘッダー右にログアウト）
function MainTabs({ navigation }: { navigation: any }) {
  const handleLogout = () => {
    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'ログアウト',
        style: 'destructive',
        onPress: async () => {
          try {
            await client.post('/auth/logout');
          } finally {
            await removeToken();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }
        },
      },
    ]);
  };

  const logoutButton = (
    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 12 }}>
      <Text style={{ color: '#ef4444', fontSize: 14 }}>ログアウト</Text>
    </TouchableOpacity>
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerRight: () => logoutButton,
      }}
    >
      <Tab.Screen
        name="Input"
        component={TransactionInputScreen}
        options={{ title: '入力', tabBarLabel: '入力', tabBarIcon: () => <Text>＋</Text> }}
      />
      <Tab.Screen
        name="List"
        component={TransactionListScreen}
        options={{ title: '履歴', tabBarLabel: '履歴', tabBarIcon: () => <Text>📋</Text> }}
      />
      <Tab.Screen
        name="Balance"
        component={BalanceScreen}
        options={{ title: '残高', tabBarLabel: '残高', tabBarIcon: () => <Text>💰</Text> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: '設定', tabBarLabel: '設定', tabBarIcon: () => <Text>⚙️</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  // 保存済みトークンの有無で初期表示先を決定（判定中はnullで何も描画しない）
  useEffect(() => {
    getToken().then((token) => setInitialRoute(token ? 'Main' : 'Login'));
  }, []);

  if (!initialRoute) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="TransactionDetail"
          component={TransactionDetailModal}
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
