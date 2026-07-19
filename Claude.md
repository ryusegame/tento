# CLAUDE.md - 複式帳簿アプリ

## プロジェクト概要

個人事業主・フリーランス向けの複式帳簿アプリ。
フロントエンドはシンプルな単式入力UIを提供し、バックエンドで複式帳簿を自動生成する。

---

## 技術スタック

### フロントエンド
- React Native（Expo）
- 言語：TypeScript
- 状態管理：useState / useReducer
- API通信：axios
- ナビゲーション：React Navigation（タブナビゲーション）

### バックエンド
- Laravel 11
- 言語：PHP 8.2以上
- 認証：Laravel Sanctum
- DB：PostgreSQL 15以上
- API形式：RESTful JSON API

### インフラ
- VPS（Ubuntu）

---

## ディレクトリ構成

### バックエンド（Laravel）

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Auth/
│   │   │   │   └── AuthController.php
│   │   │   ├── AccountController.php
│   │   │   ├── TransactionController.php
│   │   │   └── BalanceController.php
│   │   ├── Requests/
│   │   │   ├── Auth/
│   │   │   │   ├── RegisterRequest.php
│   │   │   │   └── LoginRequest.php
│   │   │   ├── StoreTransactionRequest.php
│   │   │   └── UpdateSettlementRequest.php
│   │   └── Resources/
│   │       ├── AccountResource.php
│   │       ├── TransactionResource.php
│   │       └── BalanceResource.php
│   ├── Models/
│   │   ├── User.php
│   │   ├── Account.php
│   │   ├── Transaction.php
│   │   └── JournalLine.php
│   └── Services/
│       └── JournalService.php   ← 複式仕訳の自動生成ロジック
├── database/
│   ├── migrations/
│   └── seeders/
│       └── AccountSeeder.php    ← プリセット勘定科目
└── routes/
    └── api.php
```

### フロントエンド（React Native）

```
frontend/
├── src/
│   ├── screens/
│   │   ├── Auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── TransactionInputScreen.tsx
│   │   ├── TransactionListScreen.tsx
│   │   ├── TransactionDetailModal.tsx
│   │   └── BalanceScreen.tsx
│   ├── components/
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   ├── api/
│   │   └── client.ts            ← axiosインスタンス
│   └── hooks/
└── App.tsx
```

---

## DB設計

### 重要：PostgreSQLを使用するためENUMは使わない
マイグレーションでENUMの代わりにVARCHAR型を使い、バリデーションで値を制限する。

### users（ユーザー）

| カラム名 | 型 | NULL | 説明 |
|----------|----|------|------|
| id | BIGINT | NO | PK・自動採番 |
| email | VARCHAR(255) | NO | UNIQUE |
| password | VARCHAR(255) | NO | ハッシュ |
| created_at | TIMESTAMP | NO | |
| updated_at | TIMESTAMP | NO | |

※ Laravelデフォルトの `name` と `email_verified_at` は不要なので削除する

### accounts（勘定科目）

| カラム名 | 型 | NULL | 説明 |
|----------|----|------|------|
| id | BIGINT | NO | PK・自動採番 |
| user_id | BIGINT | YES | FK→users（NULLはプリセット科目） |
| name | VARCHAR(100) | NO | 科目名 |
| type | VARCHAR(20) | NO | asset / liability / equity / revenue / expense |
| is_preset | BOOLEAN | NO | プリセットフラグ |
| created_at | TIMESTAMP | NO | |
| updated_at | TIMESTAMP | NO | |

**プリセット科目一覧（AccountSeederで投入）**

| type | 科目名 |
|------|--------|
| asset | 現金 |
| asset | 普通預金 |
| asset | 売掛金 |
| expense | 食費 |
| expense | 交通費 |
| expense | 通信費 |
| expense | 消耗品費 |
| expense | 外注費 |
| expense | 広告費 |
| revenue | 売上 |
| revenue | 雑収入 |
| liability | 買掛金 |
| equity | 元入金 |

### transactions（取引）

| カラム名 | 型 | NULL | 説明 |
|----------|----|------|------|
| id | BIGINT | NO | PK・自動採番 |
| user_id | BIGINT | NO | FK→users |
| amount | DECIMAL(15,2) | NO | 金額（正の値のみ） |
| account_id | BIGINT | NO | FK→accounts |
| payment_method | VARCHAR(20) | NO | cash / bank |
| occurred_at | DATE | NO | 発生日 |
| settlement_status | VARCHAR(20) | NO | unsettled / settled |
| settlement_date | DATE | YES | 決済日（unsettledはNULL） |
| memo | TEXT | YES | メモ |
| created_at | TIMESTAMP | NO | |
| updated_at | TIMESTAMP | NO | |

### journal_lines（仕訳行）

| カラム名 | 型 | NULL | 説明 |
|----------|----|------|------|
| id | BIGINT | NO | PK・自動採番 |
| transaction_id | BIGINT | NO | FK→transactions（cascade delete） |
| account_id | BIGINT | NO | FK→accounts |
| side | VARCHAR(10) | NO | debit / credit |
| amount | DECIMAL(15,2) | NO | 金額 |
| created_at | TIMESTAMP | NO | |

---

## API設計

### 認証系（認証不要）

| メソッド | エンドポイント | 説明 |
|----------|---------------|------|
| POST | /api/auth/register | 会員登録 |
| POST | /api/auth/login | ログイン |
| POST | /api/auth/logout | ログアウト（Sanctum必要） |

**POST /api/auth/register リクエスト**
```json
{
  "email": "test@example.com",
  "password": "password",
  "password_confirmation": "password"
}
```

**POST /api/auth/register レスポンス（201）**
```json
{
  "token": "xxxxx",
  "user": { "id": 1, "email": "test@example.com" }
}
```

### 勘定科目系（Sanctum必要）

| メソッド | エンドポイント | 説明 |
|----------|---------------|------|
| GET | /api/accounts | 勘定科目一覧取得 |

**GET /api/accounts レスポンス（200）**
```json
[
  { "id": 1, "name": "現金", "type": "asset", "is_preset": true },
  { "id": 2, "name": "普通預金", "type": "asset", "is_preset": true }
]
```

### 取引系（Sanctum必要）

| メソッド | エンドポイント | 説明 |
|----------|---------------|------|
| POST | /api/transactions | 取引登録 |
| GET | /api/transactions | 取引一覧取得 |
| GET | /api/transactions/{id} | 取引詳細取得 |
| PATCH | /api/transactions/{id} | 決済状況更新 |
| DELETE | /api/transactions/{id} | 取引削除 |

**POST /api/transactions リクエスト**
```json
{
  "amount": 50000,
  "account_id": 10,
  "payment_method": "bank",
  "occurred_at": "2026-04-03",
  "settlement_status": "unsettled",
  "settlement_date": null,
  "memo": "Web制作案件"
}
```

**POST /api/transactions レスポンス（201）**
```json
{
  "id": 1,
  "amount": 50000,
  "account": { "id": 10, "name": "売上", "type": "revenue" },
  "payment_method": "bank",
  "occurred_at": "2026-04-03",
  "settlement_status": "unsettled",
  "settlement_date": null,
  "memo": "Web制作案件",
  "created_at": "2026-04-03T12:00:00Z"
}
```

**GET /api/transactions クエリパラメータ**
- `?keyword=食費` → キーワード検索（memo・科目名）
- `?page=1` → ページネーション

**PATCH /api/transactions/{id} リクエスト**
```json
{
  "settlement_status": "settled",
  "settlement_date": "2026-04-10"
}
```

### 残高系（Sanctum必要）

| メソッド | エンドポイント | 説明 |
|----------|---------------|------|
| GET | /api/balance | 残高取得 |

**GET /api/balance クエリパラメータ**
- `?year=2026&month=4` → 月次
- `?year=2026` → 年次
- パラメータなし → 全期間

**GET /api/balance レスポンス（200）**
```json
{
  "summary": {
    "income": 130000,
    "expense": 18000,
    "balance": 112000
  },
  "total_assets": 1250000,
  "by_account": [
    { "name": "普通預金", "type": "asset", "balance": 850000 },
    { "name": "現金",     "type": "asset", "balance": 50000  },
    { "name": "売掛金",   "type": "asset", "balance": 350000 }
  ]
}
```

---

## 複式仕訳の自動生成ロジック

取引登録時に `JournalService` が `journal_lines` を2行生成する。
収入・支出の判断は `account.type` をもとに行う。

### 収入（account.type = revenue）の場合

```
例：売上 50,000円・銀行口座（payment_method = bank）

journal_lines:
  { account: 普通預金, side: debit,  amount: 50000 }  ← 資産が増える
  { account: 売上,    side: credit, amount: 50000 }  ← 収益が増える
```

### 支出（account.type = expense）の場合

```
例：食費 3,000円・現金（payment_method = cash）

journal_lines:
  { account: 食費, side: debit,  amount: 3000 }  ← 費用が増える
  { account: 現金, side: credit, amount: 3000 }  ← 資産が減る
```

### payment_method と資産科目の対応

| payment_method | 対応する資産科目 |
|---------------|----------------|
| cash | 現金 |
| bank | 普通預金 |

### 貸借バランスチェック

仕訳生成後、`debit合計 === credit合計` であることを検証する。
不一致の場合は500エラーを返す。

---

## コーディングルール

### 共通
- コメントは日本語でOK
- エラーメッセージは日本語で返す

### バックエンド（Laravel）
- FormRequestでバリデーションを行う
- API ResourceでレスポンスをJSON整形する
- ビジネスロジックはServiceクラスに分離する（特にJournalService）
- 他ユーザーのデータへのアクセスは403を返す
- DBはPostgreSQLなのでENUMは使わずVARCHAR型＋バリデーションで値を制限する
- マイグレーションでENUMを書かないこと

### フロントエンド（React Native）
- コンポーネントはfunctional component + hooks
- 型定義は必ず書く（TypeScript）
- API通信はsrc/api/client.tsのaxiosインスタンスを使う
- Sanctumトークンはasync storageに保存する

---

## 開発フェーズ

### MVP（〜5月初旬）
- 認証（登録・ログイン・ログアウト）
- 取引登録・一覧・詳細・削除
- 決済状況管理（未決済→決済済みへの更新）
- 残高表示（口座ごと・期間切り替え）
- 複式仕訳の自動生成

### フェーズ2（〜6月中旬）
- 取引編集
- 勘定科目追加（カスタム）
- 仕訳一覧の絞り込み（日付・科目）
- 残高試算表（月次・年次）
- 収支グラフ
- PDF出力

### アップデート（〜7月末）
- ユーザーレビューをもとに改善（1〜3回）

---

## 環境構築手順

### バックエンド

```bash
cd backend
composer install
cp .env.example .env
# .envのDB設定を編集
# DB_CONNECTION=pgsql
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=kaicho_db
# DB_USERNAME=postgres
# DB_PASSWORD=（各自設定）
php artisan key:generate
php artisan migrate
php artisan db:seed --class=AccountSeeder
php artisan serve
```

### フロントエンド

```bash
cd frontend
npm install
npx expo start
```

---

## 画面一覧（MVP）

| 画面ID | 画面名 | 表示形式 |
|--------|--------|---------|
| SCR-001 | ログイン画面 | 通常画面 |
| SCR-002 | 会員登録画面 | 通常画面 |
| SCR-003 | 取引入力画面 | タブ：入力（＋） |
| SCR-004 | 取引履歴画面 | タブ：履歴 |
| SCR-005 | 取引詳細画面 | モーダル |
| SCR-006 | 残高・資産画面 | タブ：残高 |