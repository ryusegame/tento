<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * 認証（会員登録・ログイン・ログアウト）を担当するコントローラ。
 * 認証には Laravel Sanctum のパーソナルアクセストークンを使用する。
 */
class AuthController extends Controller
{
    /**
     * 会員登録し、発行したトークンとユーザー情報を返す（201）。
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'email'    => $request->email,
            'password' => $request->password,
        ]);

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => ['id' => $user->id, 'email' => $user->email],
        ], 201);
    }

    /**
     * ログイン認証を行い、新しいトークンを発行して返す。
     */
    public function login(LoginRequest $request): JsonResponse
    {
        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'message' => 'メールアドレスまたはパスワードが正しくありません',
            ], 401);
        }

        /** @var User $user */
        $user = Auth::user();

        // 既存トークンを削除してから新規発行
        $user->tokens()->delete();
        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => ['id' => $user->id, 'email' => $user->email],
        ]);
    }

    /**
     * ログアウトし、現在使用中のトークンのみを失効させる。
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'ログアウトしました']);
    }
}
