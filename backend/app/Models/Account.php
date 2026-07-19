<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * 勘定科目モデル。type は asset/liability/equity/revenue/expense のいずれか。
 * user_id が NULL のものはプリセット科目（全ユーザー共通）。
 */
class Account extends Model
{
    protected $fillable = ['user_id', 'name', 'type', 'is_preset'];

    protected function casts(): array
    {
        return [
            'is_preset' => 'boolean',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function journalLines()
    {
        return $this->hasMany(JournalLine::class);
    }
}
