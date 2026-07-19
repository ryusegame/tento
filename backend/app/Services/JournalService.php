<?php

namespace App\Services;

use App\Models\Account;
use App\Models\JournalLine;
use App\Models\Transaction;
use RuntimeException;
use InvalidArgumentException;

/**
 * 複式仕訳の自動生成サービス。
 *
 * フロントの単式入力（1取引）を受け取り、複式帳簿の仕訳行（journal_lines）を
 * 借方・貸方の2行に自動展開する。収入／支出の判定は account.type をもとに行う。
 */
class JournalService
{
    /**
     * 取引1件から仕訳行を2行生成し、貸借バランスを検証する。
     *
     * @throws \InvalidArgumentException 収入・支出以外の科目タイプの場合
     * @throws \RuntimeException         借方合計と貸方合計が一致しない場合
     */
    public function generateJournalLines(Transaction $transaction): void
    {
        // 支払方法から対応する資産科目を決定（cash→現金 / bank→普通預金）
        $assetAccountName = $transaction->payment_method === 'cash' ? '現金' : '普通預金';
        $assetAccount = Account::where('name', $assetAccountName)
            ->where('is_preset', true)
            ->firstOrFail();

        $accountType = $transaction->account->type;

        if ($accountType === 'revenue') {
            // 収入：資産の増加（借方）/ 収益の増加（貸方）
            $debitAccountId  = $assetAccount->id;
            $creditAccountId = $transaction->account_id;
        } elseif ($accountType === 'expense') {
            // 支出：費用の発生（借方）/ 資産の減少（貸方）
            $debitAccountId  = $transaction->account_id;
            $creditAccountId = $assetAccount->id;
        } else {
            throw new InvalidArgumentException('対応していない科目タイプです: ' . $accountType);
        }

        $now = now();
        JournalLine::insert([
            [
                'transaction_id' => $transaction->id,
                'account_id'     => $debitAccountId,
                'side'           => 'debit',
                'amount'         => $transaction->amount,
                'created_at'     => $now,
            ],
            [
                'transaction_id' => $transaction->id,
                'account_id'     => $creditAccountId,
                'side'           => 'credit',
                'amount'         => $transaction->amount,
                'created_at'     => $now,
            ],
        ]);

        // 貸借バランスチェック
        $lines       = JournalLine::where('transaction_id', $transaction->id)->get();
        $debitTotal  = $lines->where('side', 'debit')->sum('amount');
        $creditTotal = $lines->where('side', 'credit')->sum('amount');

        if (bccomp((string) $debitTotal, (string) $creditTotal, 2) !== 0) {
            throw new RuntimeException('仕訳の貸借が一致しません');
        }
    }
}
