<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Transaction>
 */
class TransactionFactory extends Factory
{
    protected $model = Transaction::class;

    public function definition(): array
    {
        return [
            'user_id'           => User::factory(),
            // プリセットの費用科目を既定にする（AccountSeeder実行済み前提）
            'account_id'        => fn () => Account::where('is_preset', true)
                ->where('type', 'expense')
                ->value('id'),
            'amount'            => fake()->numberBetween(100, 100000),
            'payment_method'    => fake()->randomElement(['cash', 'bank']),
            'occurred_at'       => fake()->dateTimeBetween('-3 months', 'now')->format('Y-m-d'),
            'settlement_status' => 'unsettled',
            'settlement_date'   => null,
            'memo'              => fake()->optional()->sentence(),
        ];
    }

    /**
     * user_id は fillable 外のため forceFill で確実にセットする。
     */
    public function newModel(array $attributes = [])
    {
        return (new Transaction)->forceFill($attributes);
    }

    /**
     * 決済済み状態
     */
    public function settled(): static
    {
        return $this->state(fn () => [
            'settlement_status' => 'settled',
            'settlement_date'   => fake()->dateTimeBetween('-1 month', 'now')->format('Y-m-d'),
        ]);
    }
}
