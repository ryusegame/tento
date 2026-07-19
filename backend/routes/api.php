<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\BalanceController;

// APIルート定義。認証系のみ公開、それ以外は Sanctum トークン認証を必須とする。

// 認証不要
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login',    [AuthController::class, 'login']);
});

// Sanctum認証必須
Route::middleware('auth:sanctum')->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);

    Route::get('accounts', [AccountController::class, 'index']);

    Route::post('transactions',                 [TransactionController::class, 'store']);
    Route::get('transactions',                  [TransactionController::class, 'index']);
    Route::get('transactions/{transaction}',    [TransactionController::class, 'show']);
    Route::patch('transactions/{transaction}',  [TransactionController::class, 'updateSettlement']);
    Route::delete('transactions/{transaction}', [TransactionController::class, 'destroy']);

    Route::get('balance', [BalanceController::class, 'index']);
});
