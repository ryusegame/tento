// アプリ全体で使う型定義（正本）

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type PaymentMethod = 'cash' | 'bank';
export type SettlementStatus = 'unsettled' | 'settled';

export type User = {
  id: number;
  email: string;
};

export type Account = {
  id: number;
  name: string;
  type: AccountType;
  is_preset: boolean;
};

export type Transaction = {
  id: number;
  amount: number;
  // APIのTransactionResourceはaccountをid/name/typeのみ返す
  account: Pick<Account, 'id' | 'name' | 'type'>;
  payment_method: PaymentMethod;
  occurred_at: string;
  settlement_status: SettlementStatus;
  settlement_date: string | null;
  memo: string | null;
  created_at: string;
};

export type BalanceSummary = {
  income: number;
  expense: number;
  balance: number;
};

export type AccountBalance = {
  name: string;
  type: AccountType;
  balance: number;
};

export type Balance = {
  summary: BalanceSummary;
  total_assets: number;
  by_account: AccountBalance[];
};

// 後方互換のためのエイリアス（既存コードがBalanceResponseを参照）
export type BalanceResponse = Balance;

export type PaginatedResponse<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type AuthResponse = {
  token: string;
  user: User;
};
