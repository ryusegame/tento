<?php

namespace App\Http\Controllers;

use App\Http\Resources\BalanceResource;
use App\Models\JournalLine;
use Illuminate\Http\Request;

/**
 * 残高・資産の集計を担当するコントローラ。
 *
 * 収支サマリー（収入・支出・差引）は指定期間の仕訳行から、
 * 資産残高（口座ごと）は全期間の仕訳行から算出する。
 */
class BalanceController extends Controller
{
    /**
     * 残高を取得する。
     * クエリ ?year=&month= で月次、?year= で年次、指定なしで全期間集計。
     */
    public function index(Request $request): BalanceResource
    {
        $user  = $request->user();
        $year  = $request->query('year');
        $month = $request->query('month');

        // 期間フィルタ付きのjournal_linesを集計（収支サマリー用）
        $periodLines = JournalLine::whereHas('transaction', function ($q) use ($user, $year, $month) {
            $q->where('user_id', $user->id);
            if ($year && $month) {
                $q->whereYear('occurred_at', $year)->whereMonth('occurred_at', $month);
            } elseif ($year) {
                $q->whereYear('occurred_at', $year);
            }
        })->with('account')->get();

        $income  = $periodLines->filter(fn ($l) => $l->account->type === 'revenue' && $l->side === 'credit')->sum('amount');
        $expense = $periodLines->filter(fn ($l) => $l->account->type === 'expense'  && $l->side === 'debit')->sum('amount');

        // 全期間の資産残高
        $allLines = JournalLine::whereHas('transaction', fn ($q) => $q->where('user_id', $user->id))
            ->with('account')
            ->get();

        $byAccount = $allLines
            ->filter(fn ($l) => $l->account->type === 'asset')
            ->groupBy('account_id')
            ->map(function ($group) {
                $account = $group->first()->account;
                // 資産科目の残高＝借方合計−貸方合計（増加は借方・減少は貸方）
                $balance = $group->sum(fn ($l) => $l->side === 'debit' ? (float) $l->amount : -(float) $l->amount);
                return [
                    'name'    => $account->name,
                    'type'    => $account->type,
                    'balance' => $balance,
                ];
            })
            ->values()
            ->all();

        return new BalanceResource([
            'summary' => [
                'income'  => (float) $income,
                'expense' => (float) $expense,
                'balance' => (float) $income - (float) $expense,
            ],
            'total_assets' => array_sum(array_column($byAccount, 'balance')),
            'by_account'   => $byAccount,
        ]);
    }
}
