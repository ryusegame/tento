<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * 仕訳行モデル。複式帳簿の1行（借方 or 貸方）を表す。
 * JournalService により取引ごとに2行が自動生成される。
 * updated_at は持たないため $timestamps = false（created_at のみ手動管理）。
 */
class JournalLine extends Model
{
    public $timestamps = false;

    protected $fillable = ['transaction_id', 'account_id', 'side', 'amount'];

    protected function casts(): array
    {
        return [
            'amount'     => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }
}
