<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * 会員登録（POST /api/auth/register）のバリデーション。
 * password は confirmed ルールで password_confirmation との一致を検証する。
 */
class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email'    => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required'    => 'メールアドレスは必須です',
            'email.email'       => 'メールアドレスの形式が正しくありません',
            'email.unique'      => 'このメールアドレスはすでに登録されています',
            'password.required' => 'パスワードは必須です',
            'password.min'      => 'パスワードは8文字以上で入力してください',
            'password.confirmed'=> 'パスワードが一致しません',
        ];
    }
}
