<?php

namespace App\Http\Controllers;

use App\Models\JournalLine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ログインユーザー本人のアカウント操作を担当するコントローラ。
 *
 * App Store ガイドライン 5.1.1(v) 対応として、アカウントの完全削除（物理削除）を提供する。
 */
class UserController extends Controller
{
    /**
     * ログインユーザー自身のアカウントと、紐づく全データを物理削除する。
     *
     * 論理削除ではなく物理削除を採用（審査要件「実際に削除されること」を満たすため）。
     * プリセット勘定科目（user_id=NULL, is_preset=true）は全ユーザー共通のため削除せず、
     * 当該ユーザーが作成したカスタム科目のみ削除する。
     *
     * transactions.account_id / journal_lines.account_id は restrictOnDelete のため、
     * カスタム科目より先に取引・仕訳を削除する必要がある。DBのカスケード順に依存せず
     * 明示的な順序で削除し、全体を1つのトランザクションで囲んで途中失敗時はロールバックする。
     */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();

        DB::transaction(function () use ($user) {
            // 1. 仕訳行を削除（このユーザーの取引に紐づくもの）
            JournalLine::whereIn('transaction_id', $user->transactions()->select('id'))->delete();

            // 2. 取引を削除
            $user->transactions()->delete();

            // 3. ユーザーが作成したカスタム勘定科目を削除（プリセットは user_id=NULL のため対象外）
            $user->accounts()->delete();

            // 4. Sanctumトークンを全て失効させる
            $user->tokens()->delete();

            // 5. ユーザー本体を削除
            $user->delete();
        });

        return response()->json(['message' => 'アカウントを削除しました']);
    }
}
