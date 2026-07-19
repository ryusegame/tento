<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 残高集計結果をAPIレスポンス用のJSON形状に整形する。
 * BalanceControllerで組み立てた配列（summary / total_assets / by_account）を受け取る。
 */
class BalanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'summary' => [
                'income'  => $this->resource['summary']['income'],
                'expense' => $this->resource['summary']['expense'],
                'balance' => $this->resource['summary']['balance'],
            ],
            'total_assets' => $this->resource['total_assets'],
            'by_account'   => array_map(fn ($account) => [
                'name'    => $account['name'],
                'type'    => $account['type'],
                'balance' => $account['balance'],
            ], $this->resource['by_account']),
        ];
    }
}
