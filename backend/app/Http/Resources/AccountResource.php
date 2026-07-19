<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * 勘定科目1件をAPIレスポンス用のJSON形状に整形する。
 */
class AccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'        => $this->id,
            'name'      => $this->name,
            'type'      => $this->type,
            'is_preset' => $this->is_preset,
        ];
    }
}
