import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { client } from '../api/client';
import { Transaction } from '../api/types';

// SCR-005 取引詳細モーダル。
// 取引の詳細を表示し、未決済なら決済日を入力して決済済みに更新できる。取引削除も可能。

type Props = NativeStackScreenProps<any, 'TransactionDetail'>;

const today = () => new Date().toISOString().split('T')[0];

const formatAmount = (amount: number | string) =>
  Number(amount).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

export default function TransactionDetailModal({ navigation, route }: Props) {
  const [tx, setTx] = useState<Transaction>((route.params as any).transaction);
  const [settlementDate, setSettlementDate] = useState(today());
  const [loading, setLoading] = useState(false);

  const isIncome = tx.account.type === 'revenue';

  // 未決済 → 決済済みに更新
  const handleSettle = async () => {
    setLoading(true);
    try {
      const res = await client.patch<Transaction>(`/transactions/${tx.id}`, {
        settlement_status: 'settled',
        settlement_date: settlementDate,
      });
      setTx(res.data);
      Alert.alert('更新完了', '決済済みにしました');
    } catch (e: any) {
      const errors = e.response?.data?.errors;
      const message = errors
        ? Object.values(errors).flat().join('\n')
        : e.response?.data?.message ?? '更新に失敗しました';
      Alert.alert('エラー', message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('削除確認', 'この取引を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await client.delete(`/transactions/${tx.id}`);
            navigation.goBack();
          } catch {
            Alert.alert('エラー', '削除に失敗しました');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>取引詳細</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.close}>閉じる</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Row label="取引タイプ" value={isIncome ? '収入' : '支出'} />
        <Row label="科目" value={tx.account.name} />
        <Row label="金額" value={formatAmount(tx.amount)} />
        <Row label="支払方法" value={tx.payment_method === 'bank' ? '銀行口座' : '現金'} />
        <Row label="発生日" value={tx.occurred_at} />
        <Row label="決済状況" value={tx.settlement_status === 'settled' ? '決済済み' : '未決済'} />
        {tx.settlement_date ? <Row label="決済日" value={tx.settlement_date} /> : null}
        {tx.memo ? <Row label="メモ" value={tx.memo} /> : null}
      </View>

      {/* 未決済のときのみ決済日入力＋決済ボタン */}
      {tx.settlement_status === 'unsettled' && (
        <View style={styles.settleBox}>
          <Text style={styles.settleLabel}>決済日</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={settlementDate}
            onChangeText={setSettlementDate}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.button, styles.settleButton]}
            onPress={handleSettle}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>決済済みにする</Text>}
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete} disabled={loading}>
        <Text style={styles.buttonText}>削除する</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f9fafb' },
  content:      { padding: 20 },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title:        { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  close:        { fontSize: 15, color: '#3B82F6', fontWeight: '600' },
  card:         { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 24 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowLabel:     { fontSize: 14, color: '#6b7280' },
  rowValue:     { fontSize: 14, fontWeight: '500', color: '#111827', maxWidth: '60%', textAlign: 'right' },
  settleBox:    { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 24 },
  settleLabel:  { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input:        { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16 },
  button:       { borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12 },
  settleButton: { backgroundColor: '#3B82F6', marginBottom: 0 },
  deleteButton: { backgroundColor: '#ef4444' },
  buttonText:   { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
