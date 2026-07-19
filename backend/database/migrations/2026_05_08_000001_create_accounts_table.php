<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * accounts テーブル（勘定科目）を作成するマイグレーション。
 * user_id が NULL の行はプリセット科目。type は VARCHAR＋バリデーションで制限（ENUM不使用）。
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('type', 20); // asset / liability / equity / revenue / expense
            $table->boolean('is_preset')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};
