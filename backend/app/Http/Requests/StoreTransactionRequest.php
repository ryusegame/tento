<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * 取引登録（POST /api/transactions）のバリデーション。
 * PostgreSQLではENUMを使わないため、区分値は in ルールで制限する。
 */
class StoreTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount'             => ['required', 'numeric', 'min:0.01'],
            'account_id'         => ['required', 'integer', 'exists:accounts,id'],
            'payment_method'     => ['required', 'in:cash,bank'],
            'occurred_at'        => ['required', 'date'],
            'settlement_status'  => ['required', 'in:unsettled,settled'],
            'settlement_date'    => ['nullable', 'date', 'required_if:settlement_status,settled'],
            'memo'               => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'amount.required'            => '金額は必須です',
            'amount.numeric'             => '金額は数値で入力してください',
            'amount.min'                 => '金額は0より大きい値を入力してください',
            'account_id.required'        => '勘定科目は必須です',
            'account_id.exists'          => '指定された勘定科目が存在しません',
            'payment_method.required'    => '支払方法は必須です',
            'payment_method.in'          => '支払方法はcashまたはbankを指定してください',
            'occurred_at.required'       => '発生日は必須です',
            'occurred_at.date'           => '発生日の形式が正しくありません',
            'settlement_status.required' => '決済状況は必須です',
            'settlement_status.in'       => '決済状況はunsettledまたはsettledを指定してください',
            'settlement_date.required_if'=> '決済済みの場合は決済日を入力してください',
            'settlement_date.date'       => '決済日の形式が正しくありません',
            'memo.max'                   => 'メモは1000文字以内で入力してください',
        ];
    }
}
