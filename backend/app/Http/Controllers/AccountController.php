<?php

namespace App\Http\Controllers;

use App\Http\Resources\AccountResource;
use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * 勘定科目（accounts）を扱うコントローラ。
 * MVPではプリセット科目の一覧取得のみを提供する。
 */
class AccountController extends Controller
{
    /**
     * プリセット勘定科目の一覧を取得する（type→name順）。
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $accounts = Account::where('is_preset', true)
            ->orderBy('type')
            ->orderBy('name')
            ->get();

        return AccountResource::collection($accounts);
    }
}
