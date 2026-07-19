<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * 取引モデル。ユーザーが単式で入力した1件の収入／支出を表す。
 * 1取引につき journalLines（借方・貸方の2行）が紐づく。
 */
class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'amount',
        'account_id',
        'payment_method',
        'occurred_at',
        'settlement_status',
        'settlement_date',
        'memo',
    ];

    protected function casts(): array
    {
        return [
            'amount'          => 'decimal:2',
            'occurred_at'     => 'date',
            'settlement_date' => 'date',
        ];
    }

    /** 取引の所有ユーザー */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /** 取引に紐づく勘定科目（売上・食費など） */
    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    /** 自動生成された仕訳行（借方・貸方の2行） */
    public function journalLines()
    {
        return $this->hasMany(JournalLine::class);
    }
}
