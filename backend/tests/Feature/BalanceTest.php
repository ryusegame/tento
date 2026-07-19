<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\User;
use Database\Seeders\AccountSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BalanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccountSeeder::class);
    }

    private function actingUserWithData(): User
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        // 仕訳を生成するためAPI経由で取引を登録
        $this->postJson('/api/transactions', [
            'amount'            => 150000,
            'account_id'        => Account::where('name', '売上')->value('id'),
            'payment_method'    => 'bank',
            'occurred_at'       => '2026-05-10',
            'settlement_status' => 'settled',
            'settlement_date'   => '2026-05-10',
            'memo'              => null,
        ]);
        $this->postJson('/api/transactions', [
            'amount'            => 3000,
            'account_id'        => Account::where('name', '食費')->value('id'),
            'payment_method'    => 'cash',
            'occurred_at'       => '2026-05-12',
            'settlement_status' => 'settled',
            'settlement_date'   => '2026-05-12',
            'memo'              => null,
        ]);

        return $user;
    }

    /** 1. 全期間の残高を取得できる（200） */
    public function test_全期間の残高を取得できる(): void
    {
        $this->actingUserWithData();

        $this->getJson('/api/balance')
            ->assertStatus(200)
            ->assertJsonStructure([
                'summary' => ['income', 'expense', 'balance'],
                'total_assets',
                'by_account' => [['name', 'type', 'balance']],
            ])
            ->assertJsonPath('summary.income', 150000)
            ->assertJsonPath('summary.expense', 3000);
    }

    /** 2. 月次の残高を取得できる（200） */
    public function test_月次の残高を取得できる(): void
    {
        $this->actingUserWithData();

        $this->getJson('/api/balance?year=2026&month=5')
            ->assertStatus(200)
            ->assertJsonStructure(['summary' => ['income', 'expense', 'balance'], 'total_assets', 'by_account'])
            ->assertJsonPath('summary.income', 150000);
    }

    /** 3. 年次の残高を取得できる（200） */
    public function test_年次の残高を取得できる(): void
    {
        $this->actingUserWithData();

        $this->getJson('/api/balance?year=2026')
            ->assertStatus(200)
            ->assertJsonStructure(['summary' => ['income', 'expense', 'balance'], 'total_assets', 'by_account'])
            ->assertJsonPath('summary.income', 150000);
    }

    /** 4. 未認証の場合エラー（401） */
    public function test_未認証ではエラー(): void
    {
        $this->getJson('/api/balance')->assertStatus(401);
    }
}
