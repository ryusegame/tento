import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { client, removeToken } from '../api/client';
import { resetToLogin } from '../navigation/navigationRef';

// SCR-007 設定画面。
// アカウントの削除（App Store 5.1.1(v) 対応）を提供する。
// 削除は確認ダイアログを挟み、成功したらトークンを破棄してログイン画面へ戻す。

export default function SettingsScreen() {
  const [deleting, setDeleting] = useState(false);

  // 実際の削除処理。API成功後にトークンを破棄しログイン画面へ。
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await client.delete('/user');
      await removeToken();
      resetToLogin();
    } catch (e) {
      Alert.alert(
        'エラー',
        'アカウントの削除に失敗しました。通信環境をご確認のうえ、時間をおいて再度お試しください。'
      );
    } finally {
      setDeleting(false);
    }
  };

  // 押した直後には削除せず、内容と取り消し不可を明記した確認ダイアログを挟む。
  const handleDelete = () => {
    Alert.alert(
      'アカウントを削除',
      'アカウントを削除すると、以下のデータがすべて完全に削除されます。\n\n' +
        '・登録したすべての取引\n' +
        '・自動生成された仕訳\n' +
        '・あなたが作成した勘定科目\n\n' +
        'この操作は取り消せません。本当に削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除する', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>アカウント</Text>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#dc2626" />
          ) : (
            <Text style={styles.deleteButtonText}>アカウントを削除</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.caption}>
          アカウントと、登録したすべての取引・仕訳・勘定科目が完全に削除されます。この操作は取り消せません。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f9fafb' },
  section:          { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 16 },
  sectionTitle:     { fontSize: 13, fontWeight: '700', color: '#6b7280', marginBottom: 12 },
  deleteButton:     { borderWidth: 1, borderColor: '#dc2626', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  deleteButtonText: { color: '#dc2626', fontSize: 16, fontWeight: '600' },
  caption:          { fontSize: 12, color: '#9ca3af', marginTop: 12, lineHeight: 18 },
});
