import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { client } from '../api/client';
import { BalanceResponse, PaginatedResponse, Transaction } from '../api/types';

// SCR-004 取引履歴画面。
// 取引一覧をキーワード検索・無限スクロールで表示し、
// 画面下部に今月の収支サマリーを常時表示する。行タップで詳細モーダルへ遷移。

type Props = {
  navigation: any;
};

const formatAmount = (amount: number | string) =>
  Number(amount).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });

export default function TransactionListScreen({ navigation }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<BalanceResponse['summary'] | null>(null);

  // フォーカス時の再取得で最新のkeywordを参照するためのref
  const keywordRef = useRef(keyword);
  keywordRef.current = keyword;

  const fetchTransactions = useCallback(async (p: number, kw: string, reset: boolean) => {
    setLoading(true);
    try {
      const res = await client.get<PaginatedResponse<Transaction>>('/transactions', {
        params: { page: p, ...(kw ? { keyword: kw } : {}) },
      });
      setTransactions((prev) => (reset || p === 1 ? res.data.data : [...prev, ...res.data.data]));
      setLastPage(res.data.last_page);
      setPage(p);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 今月の収支サマリー
  const fetchSummary = useCallback(async () => {
    const now = new Date();
    try {
      const res = await client.get<BalanceResponse>('/balance', {
        params: { year: now.getFullYear(), month: now.getMonth() + 1 },
      });
      setSummary(res.data.summary);
    } catch {
      // サマリーの取得失敗は致命的でないため無視
    }
  }, []);

  // キーワード入力のたびにAPI呼び出し（デバウンス）。初回マウント時も実行される。
  useEffect(() => {
    const t = setTimeout(() => {
      fetchTransactions(1, keyword, true);
    }, 400);
    return () => clearTimeout(t);
  }, [keyword, fetchTransactions]);

  // 詳細モーダルを閉じて戻ってきたときに一覧・サマリーを再取得
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTransactions(1, keywordRef.current, true);
      fetchSummary();
    });
    return unsubscribe;
  }, [navigation, fetchTransactions, fetchSummary]);

  const handleLoadMore = () => {
    if (!loading && page < lastPage) fetchTransactions(page + 1, keyword, false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTransactions(1, keyword, true);
    fetchSummary();
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const isIncome = item.account.type === 'revenue';
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('TransactionDetail', { transaction: item })}
      >
        <View style={styles.rowLeft}>
          <Text style={styles.date}>{item.occurred_at}</Text>
          <View style={styles.accountLine}>
            <Text style={[styles.typeLabel, isIncome ? styles.incomeBadge : styles.expenseBadge]}>
              {isIncome ? '収入' : '支出'}
            </Text>
            <Text style={styles.accountName}>{item.account.name}</Text>
          </View>
          {item.memo ? <Text style={styles.memo} numberOfLines={1}>{item.memo}</Text> : null}
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.amount, isIncome ? styles.income : styles.expense]}>
            {isIncome ? '+' : '-'}{formatAmount(item.amount)}
          </Text>
          <Text style={[styles.status, item.settlement_status === 'settled' ? styles.settled : styles.unsettled]}>
            {item.settlement_status === 'settled' ? '決済済み' : '未決済'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="科目名・メモで検索"
          value={keyword}
          onChangeText={setKeyword}
          returnKeyType="search"
          autoCapitalize="none"
        />
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListFooterComponent={loading && !refreshing ? <ActivityIndicator style={{ margin: 16 }} /> : null}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>取引がありません</Text> : null}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* 今月の収支サマリー */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryTitle}>今月の収支</Text>
        <View style={styles.summaryItems}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>収入</Text>
            <Text style={[styles.summaryItemValue, styles.income]}>
              {summary ? formatAmount(summary.income) : '—'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>支出</Text>
            <Text style={[styles.summaryItemValue, styles.expense]}>
              {summary ? formatAmount(summary.expense) : '—'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>収支</Text>
            <Text style={[styles.summaryItemValue, summary && summary.balance < 0 ? styles.expense : styles.income]}>
              {summary ? formatAmount(summary.balance) : '—'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fff' },
  searchBar:    { padding: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  searchInput:  { backgroundColor: '#f3f4f6', borderRadius: 8, padding: 10, fontSize: 15 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  rowLeft:      { flex: 1, marginRight: 12 },
  rowRight:     { alignItems: 'flex-end' },
  date:         { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  accountLine:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeLabel:    { fontSize: 11, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  incomeBadge:  { backgroundColor: '#d1fae5', color: '#065f46' },
  expenseBadge: { backgroundColor: '#fee2e2', color: '#991b1b' },
  accountName:  { fontSize: 15, fontWeight: '600', color: '#111827' },
  memo:         { fontSize: 13, color: '#6b7280', marginTop: 2 },
  amount:       { fontSize: 16, fontWeight: 'bold' },
  income:       { color: '#059669' },
  expense:      { color: '#dc2626' },
  status:       { fontSize: 11, marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  settled:      { backgroundColor: '#d1fae5', color: '#065f46' },
  unsettled:    { backgroundColor: '#fef3c7', color: '#92400e' },
  separator:    { height: 1, backgroundColor: '#f3f4f6' },
  empty:        { textAlign: 'center', color: '#9ca3af', marginTop: 48 },
  summaryBar:   { borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#f9fafb', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 },
  summaryTitle: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  summaryItems: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem:  { alignItems: 'center', flex: 1 },
  summaryItemLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  summaryItemValue: { fontSize: 15, fontWeight: '700' },
});
