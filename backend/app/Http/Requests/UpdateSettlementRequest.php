<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * 決済状況更新（PATCH /api/transactions/{id}）のバリデーション。
 * settled の場合は settlement_date を必須とする。
 */
class UpdateSettlementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'settlement_status' => ['required', 'in:unsettled,settled'],
            'settlement_date'   => ['nullable', 'date', 'required_if:settlement_status,settled'],
        ];
    }

    public function messages(): array
    {
        return [
            'settlement_status.required' => '決済状況は必須です',
            'settlement_status.in'       => '決済状況はunsettledまたはsettledを指定してください',
            'settlement_date.required_if'=> '決済済みの場合は決済日を入力してください',
            'settlement_date.date'       => '決済日の形式が正しくありません',
        ];
    }
}
