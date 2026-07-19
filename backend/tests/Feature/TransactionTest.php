<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\JournalLine;
use App\Models\Transaction;
use App\Models\User;
use Database\Seeders\AccountSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TransactionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccountSeeder::class);
    }

    private function accountId(string $name): int
    {
        return Account::where('name', $name)->value('id');
    }

    private function actingUser(): User
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        return $user;
    }

    private function validPayload(array $override = []): array
    {
        return array_merge([
            'amount'            => 50000,
            'account_id'        => $this->accountId('売上'),
            'payment_method'    => 'bank',
            'occurred_at'       => '2026-05-10',
            'settlement_status' => 'unsettled',
            'settlement_date'   => null,
            'memo'              => 'Web制作案件',
        ], $override);
    }

    // ===== store =====

    /** 1. 正しいデータで取引を登録できる（201） */
    public function test_正しいデータで取引を登録できる(): void
    {
        $this->actingUser();

        $response = $this->postJson('/api/transactions', $this->validPayload());

        $response->assertStatus(201)
            ->assertJsonStructure(['id', 'amount', 'account' => ['id', 'name', 'type']])
            ->assertJsonPath('account.name', '売上');
    }

    /** 2. 取引登録時に仕訳が自動生成される（journal_linesに2行） */
    public function test_取引登録時に仕訳が自動生成される(): void
    {
        $this->actingUser();

        $response = $this->postJson('/api/transactions', $this->validPayload());
        $id = $response->json('id');

        $this->assertEquals(2, JournalLine::where('transaction_id', $id)->count());
        $debit  = JournalLine::where('transaction_id', $id)->where('side', 'debit')->sum('amount');
        $credit = JournalLine::where('transaction_id', $id)->where('side', 'credit')->sum('amount');
        $this->assertEquals($debit, $credit);
    }

    /** 3. 金額が0の場合エラー（422） */
    public function test_金額が0だとエラー(): void
    {
        $this->actingUser();

        $this->postJson('/api/transactions', $this->validPayload(['amount' => 0]))
            ->assertStatus(422)->assertJsonValidationErrors('amount');
    }

    /** 4. 金額が負の場合エラー（422） */
    public function test_金額が負だとエラー(): void
    {
        $this->actingUser();

        $this->postJson('/api/transactions', $this->validPayload(['amount' => -100]))
            ->assertStatus(422)->assertJsonValidationErrors('amount');
    }

    /** 5. 存在しない勘定科目IDの場合エラー（422） */
    public function test_存在しない勘定科目IDだとエラー(): void
    {
        $this->actingUser();

        $this->postJson('/api/transactions', $this->validPayload(['account_id' => 999999]))
            ->assertStatus(422)->assertJsonValidationErrors('account_id');
    }

    /** 6. 決済済みで決済日がない場合エラー（422） */
    public function test_決済済みで決済日がないとエラー(): void
    {
        $this->actingUser();

        $this->postJson('/api/transactions', $this->validPayload([
            'settlement_status' => 'settled',
            'settlement_date'   => null,
        ]))->assertStatus(422)->assertJsonValidationErrors('settlement_date');
    }

    /** 7. 未認証の場合エラー（401） */
    public function test_未認証で登録するとエラー(): void
    {
        $this->postJson('/api/transactions', $this->validPayload())
            ->assertStatus(401);
    }

    // ===== index =====

    /** 8. 取引一覧を日付降順で取得できる（200） */
    public function test_取引一覧を日付降順で取得できる(): void
    {
        $user = $this->actingUser();
        $acc  = $this->accountId('食費');
        Transaction::factory()->create(['user_id' => $user->id, 'account_id' => $acc, 'occurred_at' => '2026-01-01']);
        Transaction::factory()->create(['user_id' => $user->id, 'account_id' => $acc, 'occurred_at' => '2026-03-01']);
        Transaction::factory()->create(['user_id' => $user->id, 'account_id' => $acc, 'occurred_at' => '2026-02-01']);

        $response = $this->getJson('/api/transactions');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.occurred_at', '2026-03-01')
            ->assertJsonPath('data.1.occurred_at', '2026-02-01')
            ->assertJsonPath('data.2.occurred_at', '2026-01-01');
    }

    /** 9. キーワード検索で絞り込みができる（200） */
    public function test_キーワード検索で絞り込みできる(): void
    {
        $user = $this->actingUser();
        Transaction::factory()->create(['user_id' => $user->id, 'account_id' => $this->accountId('食費'), 'memo' => 'ランチ代']);
        Transaction::factory()->create(['user_id' => $user->id, 'account_id' => $this->accountId('交通費'), 'memo' => '電車賃']);

        // クエリ文字列はURLエンコードして渡す（生のマルチバイトは破損するため）
        $response = $this->getJson('/api/transactions?' . http_build_query(['keyword' => 'ランチ']));

        $response->assertStatus(200)->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.memo', 'ランチ代');
    }

    /** 10. 他ユーザーの取引は取得できない（200・空リスト） */
    public function test_他ユーザーの取引は一覧に出ない(): void
    {
        $other = User::factory()->create();
        Transaction::factory()->create(['user_id' => $other->id, 'account_id' => $this->accountId('食費')]);

        $this->actingUser(); // 別ユーザーとして認証

        $this->getJson('/api/transactions')
            ->assertStatus(200)->assertJsonCount(0, 'data');
    }

    /** 11. 未認証の場合エラー（401） */
    public function test_未認証で一覧取得するとエラー(): void
    {
        $this->getJson('/api/transactions')->assertStatus(401);
    }

    // ===== show =====

    /** 12. 取引詳細を取得できる（200） */
    public function test_取引詳細を取得できる(): void
    {
        $user = $this->actingUser();
        $tx   = Transaction::factory()->create(['user_id' => $user->id, 'account_id' => $this->accountId('売上')]);

        $this->getJson("/api/transactions/{$tx->id}")
            ->assertStatus(200)->assertJsonPath('id', $tx->id);
    }

    /** 13. 他ユーザーの取引詳細は取得できない（403） */
    public function test_他ユーザーの取引詳細は取得できない(): void
    {
        $other = User::factory()->create();
        $tx    = Transaction::factory()->create(['user_id' => $other->id, 'account_id' => $this->accountId('売上')]);

        $this->actingUser();

        $this->getJson("/api/transactions/{$tx->id}")->assertStatus(403);
    }

    /** 14. 存在しないIDの場合エラー（404） */
    public function test_存在しないID詳細は404(): void
    {
        $this->actingUser();

        $this->getJson('/api/transactions/999999')->assertStatus(404);
    }

    // ===== updateSettlement =====

    /** 15. 未決済→決済済みに更新できる（200） */
    public function test_未決済から決済済みに更新できる(): void
    {
        $user = $this->actingUser();
        $tx   = Transaction::factory()->create([
            'user_id'           => $user->id,
            'account_id'        => $this->accountId('売上'),
            'settlement_status' => 'unsettled',
            'settlement_date'   => null,
        ]);

        $this->patchJson("/api/transactions/{$tx->id}", [
            'settlement_status' => 'settled',
            'settlement_date'   => '2026-05-20',
        ])->assertStatus(200)->assertJsonPath('settlement_status', 'settled');

        $this->assertDatabaseHas('transactions', [
            'id'                => $tx->id,
            'settlement_status' => 'settled',
        ]);
    }

    /** 16. 決済日なしで決済済みにしようとするとエラー（422） */
    public function test_決済日なしで決済済みにするとエラー(): void
    {
        $user = $this->actingUser();
        $tx   = Transaction::factory()->create([
            'user_id'    => $user->id,
            'account_id' => $this->accountId('売上'),
        ]);

        $this->patchJson("/api/transactions/{$tx->id}", [
            'settlement_status' => 'settled',
        ])->assertStatus(422)->assertJsonValidationErrors('settlement_date');
    }

    /** 17. 他ユーザーの取引は更新できない（403） */
    public function test_他ユーザーの取引は更新できない(): void
    {
        $other = User::factory()->create();
        $tx    = Transaction::factory()->create(['user_id' => $other->id, 'account_id' => $this->accountId('売上')]);

        $this->actingUser();

        $this->patchJson("/api/transactions/{$tx->id}", [
            'settlement_status' => 'settled',
            'settlement_date'   => '2026-05-20',
        ])->assertStatus(403);
    }

    // ===== destroy =====

    /** 18. 取引を削除できる（200） */
    public function test_取引を削除できる(): void
    {
        $user = $this->actingUser();
        $tx   = Transaction::factory()->create(['user_id' => $user->id, 'account_id' => $this->accountId('売上')]);

        $this->deleteJson("/api/transactions/{$tx->id}")->assertStatus(200);
        $this->assertDatabaseMissing('transactions', ['id' => $tx->id]);
    }

    /** 19. 削除時にjournal_linesも削除される */
    public function test_削除時に仕訳行も削除される(): void
    {
        $this->actingUser();

        // 仕訳が生成されるようAPI経由で登録
        $id = $this->postJson('/api/transactions', $this->validPayload())->json('id');
        $this->assertEquals(2, JournalLine::where('transaction_id', $id)->count());

        $this->deleteJson("/api/transactions/{$id}")->assertStatus(200);

        $this->assertEquals(0, JournalLine::where('transaction_id', $id)->count());
    }

    /** 20. 他ユーザーの取引は削除できない（403） */
    public function test_他ユーザーの取引は削除できない(): void
    {
        $other = User::factory()->create();
        $tx    = Transaction::factory()->create(['user_id' => $other->id, 'account_id' => $this->accountId('売上')]);

        $this->actingUser();

        $this->deleteJson("/api/transactions/{$tx->id}")->assertStatus(403);
        $this->assertDatabaseHas('transactions', ['id' => $tx->id]);
    }
}
