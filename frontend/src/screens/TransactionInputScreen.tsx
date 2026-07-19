import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { client } from '../api/client';
import { Account, PaymentMethod, SettlementStatus } from '../api/types';

// SCR-003 取引入力画面。
// 単式（1件）で取引を入力し、POST /api/transactions で登録する。
// 複式仕訳はバックエンド側で自動生成されるため、ここでは扱わない。

// 取引タイプ（フロントの入力区分）
type TxType = 'expense' | 'revenue';

// ローカル時間で今日の日付（YYYY-MM-DD）を取得する
// new Date().toISOString() はUTC基準のため、JST（+9時間）では日付が一日前にずれてしまう
const today = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function TransactionInputScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txType, setTxType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank');
  const [occurredAt, setOccurredAt] = useState(today());
  const [settlementStatus, setSettlementStatus] = useState<SettlementStatus>('unsettled');
  const [settlementDate, setSettlementDate] = useState(today());
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    client.get<Account[]>('/accounts').then((res) => setAccounts(res.data));
  }, []);

  // 選択中タイプに対応する科目のみ表示
  const visibleAccounts = useMemo(
    () => accounts.filter((a) => a.type === txType),
    [accounts, txType]
  );

  // タイプ切り替え時は選択中の科目をリセット
  const handleChangeType = (type: TxType) => {
    setTxType(type);
    setAccountId(null);
  };

  const resetForm = () => {
    setAmount('');
    setMemo('');
    setAccountId(null);
    setPaymentMethod('bank');
    setOccurredAt(today());
    setSettlementStatus('unsettled');
    setSettlementDate(today());
  };

  const handleSubmit = async () => {
    // 各項目を個別にチェックして、該当するエラーメッセージだけを表示する
    if (!amount) {
      Alert.alert('エラー', '金額を入力してください');
      return;
    }
    if (isNaN(Number(amount))) {
      Alert.alert('エラー', '金額は数字で入力してください');
      return;
    }
    if (!accountId) {
      Alert.alert('エラー', '勘定科目を選択してください');
      return;
    }
    if (settlementStatus === 'settled' && !settlementDate) {
      Alert.alert('エラー', '決済日を入力してください');
      return;
    }
    setLoading(true);
    try {
      await client.post('/transactions', {
        amount: parseFloat(amount),
        account_id: accountId,
        payment_method: paymentMethod,
        occurred_at: occurredAt,
        settlement_status: settlementStatus,
        settlement_date: settlementStatus === 'settled' ? settlementDate : null,
        memo: memo || null,
      });
      Alert.alert('登録完了', '取引を登録しました');
      resetForm();
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
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      extraScrollHeight={20}
    >
      {/* 取引タイプ */}
      <Text style={styles.label}>取引タイプ</Text>
      <View style={styles.typeRow}>
        {([
          { key: 'expense', label: '支出' },
          { key: 'revenue', label: '収入' },
        ] as { key: TxType; label: string }[]).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.typeButton,
              txType === t.key && (t.key === 'revenue' ? styles.typeIncomeActive : styles.typeExpenseActive),
            ]}
            onPress={() => handleChangeType(t.key)}
          >
            <Text style={[styles.typeButtonText, txType === t.key && styles.typeButtonTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>金額</Text>
      <TextInput
        style={styles.input}
        placeholder="例：50000"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />

      <Text style={styles.label}>勘定科目（{txType === 'revenue' ? '収入' : '支出'}）</Text>
      <View style={styles.chipRow}>
        {visibleAccounts.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[styles.chip, accountId === a.id && styles.chipSelected]}
            onPress={() => setAccountId(a.id)}
          >
            <Text style={[styles.chipText, accountId === a.id && styles.chipTextSelected]}>{a.name}</Text>
          </TouchableOpacity>
        ))}
        {visibleAccounts.length === 0 && <Text style={styles.hint}>科目を読み込み中...</Text>}
      </View>

      <Text style={styles.label}>支払方法</Text>
      <View style={styles.chipRow}>
        {(['bank', 'cash'] as PaymentMethod[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.chip, paymentMethod === m && styles.chipSelected]}
            onPress={() => setPaymentMethod(m)}
          >
            <Text style={[styles.chipText, paymentMethod === m && styles.chipTextSelected]}>
              {m === 'bank' ? '銀行口座' : '現金'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>発生日</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={occurredAt}
        onChangeText={setOccurredAt}
        autoCapitalize="none"
      />

      <Text style={styles.label}>決済状況</Text>
      <View style={styles.chipRow}>
        {(['unsettled', 'settled'] as SettlementStatus[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, settlementStatus === s && styles.chipSelected]}
            onPress={() => setSettlementStatus(s)}
          >
            <Text style={[styles.chipText, settlementStatus === s && styles.chipTextSelected]}>
              {s === 'unsettled' ? '未決済' : '決済済み'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 決済済みのときのみ決済日を表示 */}
      {settlementStatus === 'settled' && (
        <>
          <Text style={styles.label}>決済日</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={settlementDate}
            onChangeText={setSettlementDate}
            autoCapitalize="none"
          />
        </>
      )}

      <Text style={styles.label}>メモ（任意）</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="例：Web制作案件"
        value={memo}
        onChangeText={setMemo}
        multiline
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>登録する</Text>}
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#fff' },
  content:          { padding: 20, paddingBottom: 40 },
  label:            { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  input:            { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
  textArea:         { height: 80, textAlignVertical: 'top' },
  typeRow:          { flexDirection: 'row', gap: 12 },
  typeButton:       { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f9fafb', alignItems: 'center' },
  typeExpenseActive:{ backgroundColor: '#dc2626', borderColor: '#dc2626' },
  typeIncomeActive: { backgroundColor: '#059669', borderColor: '#059669' },
  typeButtonText:   { fontSize: 16, fontWeight: '600', color: '#374151' },
  typeButtonTextActive: { color: '#fff' },
  chipRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:             { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f9fafb' },
  chipSelected:     { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  chipText:         { fontSize: 14, color: '#374151' },
  chipTextSelected: { color: '#fff' },
  hint:             { fontSize: 13, color: '#9ca3af' },
  button:           { backgroundColor: '#3B82F6', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 32 },
  buttonText:       { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
