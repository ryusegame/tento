<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTransactionRequest;
use App\Http\Requests\UpdateSettlementRequest;
use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use App\Services\JournalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * 取引（transactions）のCRUDを担当するコントローラ。
 *
 * 取引登録時には JournalService を呼び出して複式仕訳を自動生成する。
 * すべての操作はログインユーザー本人の取引に限定される。
 */
class TransactionController extends Controller
{
    /**
     * 取引一覧を取得する（keyword検索・20件ページネーション対応）。
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = $request->user()->transactions()
            ->with('account')
            ->orderByDesc('occurred_at');

        if ($request->filled('keyword')) {
            $keyword = $request->keyword;
            $query->where(function ($q) use ($keyword) {
                $q->where('memo', 'like', "%{$keyword}%")
                  ->orWhereHas('account', fn ($q) => $q->where('name', 'like', "%{$keyword}%"));
            });
        }

        return TransactionResource::collection($query->paginate(20));
    }

    /**
     * 取引を登録し、同一トランザクション内で仕訳行を生成する。
     * 仕訳生成が失敗した場合は取引ごとロールバックされる。
     */
    public function store(StoreTransactionRequest $request, JournalService $journal): JsonResponse
    {
        // 取引作成と仕訳生成をDBトランザクションで束ね、整合性を担保する
        $transaction = DB::transaction(function () use ($request, $journal) {
            $transaction = $request->user()->transactions()->create($request->validated());

            $transaction->load('account');
            $journal->generateJournalLines($transaction);

            return $transaction;
        });

        return (new TransactionResource($transaction))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * 取引詳細を取得する。
     */
    public function show(Request $request, Transaction $transaction): TransactionResource
    {
        $this->authorizeOwner($request, $transaction);

        return new TransactionResource($transaction->load('account'));
    }

    /**
     * 決済状況（未決済／決済済み）を更新する。
     */
    public function updateSettlement(UpdateSettlementRequest $request, Transaction $transaction): TransactionResource
    {
        $this->authorizeOwner($request, $transaction);

        $transaction->update($request->validated());

        return new TransactionResource($transaction->load('account'));
    }

    /**
     * 取引を削除する（関連する仕訳行はcascade deleteで自動削除）。
     */
    public function destroy(Request $request, Transaction $transaction): JsonResponse
    {
        $this->authorizeOwner($request, $transaction);

        // journal_linesはcascade deleteされる
        $transaction->delete();

        return response()->json(['message' => '削除しました']);
    }

    /**
     * 他ユーザーのデータへのアクセスは403を返す
     */
    private function authorizeOwner(Request $request, Transaction $transaction): void
    {
        if ($transaction->user_id !== $request->user()->id) {
            abort(403, '他のユーザーのデータにはアクセスできません');
        }
    }
}
