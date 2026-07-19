<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\AccountSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccountSeeder::class);
    }

    /** 1. プリセット科目一覧を取得できる（200） */
    public function test_プリセット科目一覧を取得できる(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $response = $this->getJson('/api/accounts');

        $response->assertStatus(200)
            ->assertJsonCount(13)
            ->assertJsonStructure([['id', 'name', 'type', 'is_preset']]);
    }

    /** 2. 未認証の場合エラー（401） */
    public function test_未認証ではエラー(): void
    {
        $response = $this->getJson('/api/accounts');

        $response->assertStatus(401);
    }
}
