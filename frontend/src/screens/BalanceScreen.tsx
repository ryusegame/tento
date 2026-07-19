import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { client } from '../api/client';
import { BalanceResponse } from '../api/types';

// SCR-006 残高・資産画面。
// 期間（月次／年次／全期間）を切り替えて収支サマリーと口座別の資産残高を表示する。
// 資産残高はバーの長さで大小を可視化する。

export default function BalanceScreen() {
  const [data, setData] = useState<BalanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'all' | 'year' | 'month'>('month');

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const fetchBalance = async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const params: Record<string, number> = {};
      if (period === 'year' || period === 'month') params.year = year;
      if (period === 'month') params.month = month;
      const res = await client.get<BalanceResponse>('/balance', { params });
      setData(res.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // タブにフォーカスが当たるたび（取引登録・削除後の戻り含む）に再取得する。
  // 期間（period / year / month）が変わったときも再取得する。
  useFocusEffect(
    useCallback(() => {
      fetchBalance();
    }, [period, year, month])
  );

  const fmt = (n: number) => n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

  const periodLabel = () => {
    if (period === 'month') return `${year}年${month}月`;
    if (period === 'year') return `${year}年`;
    return '全期間';
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBalance(true)} />}
    >
      {/* 期間切り替え */}
      <View style={styles.periodRow}>
        {(['month', 'year', 'all'] as const).map((p) => (
          <TouchableOpacity key={p} style={[styles.periodTab, period === p && styles.periodTabActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.periodTabText, period === p && styles.periodTabTextActive]}>
              {p === 'month' ? '月次' : p === 'year' ? '年次' : '全期間'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {period !== 'all' && (
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => {
            if (period === 'month') {
              if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
            } else setYear(y => y - 1);
          }}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.periodLabel}>{periodLabel()}</Text>
          <TouchableOpacity onPress={() => {
            if (period === 'month') {
              if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
            } else setYear(y => y + 1);
          }}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && !data ? (
        <ActivityIndicator style={{ marginTop: 48 }} />
      ) : data ? (
        <>
          {/* 収支サマリー */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>収支サマリー</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>収入</Text>
              <Text style={[styles.summaryValue, styles.income]}>{fmt(data.summary.income)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>支出</Text>
              <Text style={[styles.summaryValue, styles.expense]}>{fmt(data.summary.expense)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.balanceRow]}>
              <Text style={styles.balanceLabel}>収支</Text>
              <Text style={[styles.balanceValue, data.summary.balance >= 0 ? styles.income : styles.expense]}>
                {fmt(data.summary.balance)}
              </Text>
            </View>
          </View>

          {/* 資産残高 */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>資産残高</Text>
            <View style={[styles.summaryRow, styles.balanceRow]}>
              <Text style={styles.balanceLabel}>合計</Text>
              <Text style={styles.balanceValue}>{fmt(data.total_assets)}</Text>
            </View>
            {(() => {
              // プログレスバーの基準（残高絶対値の最大）
              const maxAbs = Math.max(1, ...data.by_account.map((a) => Math.abs(a.balance)));
              return data.by_account.map((a, i) => {
                const ratio = Math.min(1, Math.abs(a.balance) / maxAbs);
                const negative = a.balance < 0;
                return (
                  <View key={i} style={styles.accountBlock}>
                    <View style={styles.accountHeader}>
                      <Text style={styles.summaryLabel}>{a.name}</Text>
                      <Text style={[styles.summaryValue, negative && styles.expense]}>{fmt(a.balance)}</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${ratio * 100}%` },
                          negative && styles.progressFillNegative,
                        ]}
                      />
                    </View>
                  </View>
                );
              });
            })()}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#f9fafb' },
  periodRow:          { flexDirection: 'row', margin: 16, backgroundColor: '#e5e7eb', borderRadius: 8, padding: 4 },
  periodTab:          { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  periodTabActive:    { backgroundColor: '#fff' },
  periodTabText:      { fontSize: 14, color: '#6b7280' },
  periodTabTextActive:{ color: '#111827', fontWeight: '600' },
  navRow:             { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  navArrow:           { fontSize: 28, color: '#3B82F6', paddingHorizontal: 20 },
  periodLabel:        { fontSize: 16, fontWeight: '600', color: '#111827', minWidth: 100, textAlign: 'center' },
  summaryCard:        { backgroundColor: '#fff', margin: 16, marginTop: 0, borderRadius: 12, padding: 16 },
  cardTitle:          { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  summaryRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  summaryLabel:       { fontSize: 14, color: '#6b7280' },
  summaryValue:       { fontSize: 14, fontWeight: '500', color: '#111827' },
  balanceRow:         { borderBottomWidth: 0, marginTop: 4 },
  balanceLabel:       { fontSize: 15, fontWeight: '700', color: '#111827' },
  balanceValue:       { fontSize: 15, fontWeight: '700', color: '#111827' },
  income:             { color: '#059669' },
  expense:            { color: '#dc2626' },
  accountBlock:       { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  accountHeader:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressTrack:      { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  progressFill:       { height: 8, backgroundColor: '#3B82F6', borderRadius: 4 },
  progressFillNegative: { backgroundColor: '#dc2626' },
});
