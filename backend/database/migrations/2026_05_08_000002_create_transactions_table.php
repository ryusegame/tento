<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * transactions テーブル（取引）を作成するマイグレーション。
 * ユーザー削除時はcascade、勘定科目は使用中削除を防ぐためrestrictOnDelete。
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 15, 2);
            $table->foreignId('account_id')->constrained()->restrictOnDelete();
            $table->string('payment_method', 20); // cash / bank
            $table->date('occurred_at');
            $table->string('settlement_status', 20)->default('unsettled'); // unsettled / settled
            $table->date('settlement_date')->nullable();
            $table->text('memo')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
