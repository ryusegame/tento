<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * プリセット勘定科目（全ユーザー共通・user_id=NULL）を投入するシーダー。
 * insertOrIgnore を使うため、再実行しても重複登録されない。
 */
class AccountSeeder extends Seeder
{
    public function run(): void
    {
        $presets = [
            // 資産
            ['type' => 'asset',     'name' => '現金'],
            ['type' => 'asset',     'name' => '普通預金'],
            ['type' => 'asset',     'name' => '売掛金'],
            // 負債
            ['type' => 'liability', 'name' => '買掛金'],
            // 資本
            ['type' => 'equity',    'name' => '元入金'],
            // 収益
            ['type' => 'revenue',   'name' => '売上'],
            ['type' => 'revenue',   'name' => '雑収入'],
            // 費用
            ['type' => 'expense',   'name' => '食費'],
            ['type' => 'expense',   'name' => '交通費'],
            ['type' => 'expense',   'name' => '通信費'],
            ['type' => 'expense',   'name' => '消耗品費'],
            ['type' => 'expense',   'name' => '外注費'],
            ['type' => 'expense',   'name' => '広告費'],
        ];

        foreach ($presets as $preset) {
            DB::table('accounts')->insertOrIgnore([
                'user_id'    => null,
                'name'       => $preset['name'],
                'type'       => $preset['type'],
                'is_preset'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
