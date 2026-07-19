import React, { useState } from 'react';
import {
  Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { client, saveToken } from '../../api/client';
import { AuthResponse } from '../../api/types';

// SCR-002 会員登録画面。
// email・パスワード（確認込み）で登録し、成功時はトークンを保存してメイン画面へ遷移する。

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function RegisterScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !passwordConfirmation) {
      Alert.alert('エラー', '全ての項目を入力してください');
      return;
    }
    setLoading(true);
    try {
      const res = await client.post<AuthResponse>('/auth/register', {
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      await saveToken(res.data.token);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e: any) {
      const errors = e.response?.data?.errors;
      const message = errors
        ? Object.values(errors).flat().join('\n')
        : e.response?.data?.message ?? '登録に失敗しました';
      Alert.alert('エラー', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>アカウント登録</Text>
      <TextInput
        style={styles.input}
        placeholder="メールアドレス"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="パスワード（8文字以上）"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="パスワード（確認）"
        value={passwordConfirmation}
        onChangeText={setPasswordConfirmation}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>登録する</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>すでにアカウントをお持ちの方はこちら</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title:     { fontSize: 24, fontWeight: 'bold', marginBottom: 32, textAlign: 'center' },
  input:     { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  button:    { backgroundColor: '#3B82F6', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 16 },
  buttonText:{ color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link:      { color: '#3B82F6', textAlign: 'center', fontSize: 14 },
});
