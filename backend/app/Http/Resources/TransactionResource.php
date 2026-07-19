<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 取引1件をAPIレスポンス用のJSON形状に整形する。
 * 日付はYYYY-MM-DD、作成日時はISO8601形式で返す。
 */
class TransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'amount'            => $this->amount,
            'account'           => [
                'id'   => $this->account->id,
                'name' => $this->account->name,
                'type' => $this->account->type,
            ],
            'payment_method'    => $this->payment_method,
            'occurred_at'       => $this->occurred_at?->toDateString(),
            'settlement_status' => $this->settlement_status,
            'settlement_date'   => $this->settlement_date?->toDateString(),
            'memo'              => $this->memo,
            'created_at'        => $this->created_at?->toIso8601String(),
        ];
    }
}
