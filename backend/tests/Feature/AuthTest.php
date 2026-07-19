<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /** 1. 正しい情報で会員登録できる（201・tokenを返す） */
    public function test_正しい情報で会員登録できる(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'email'                 => 'test@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['token', 'user' => ['id', 'email']])
            ->assertJsonPath('user.email', 'test@example.com');

        $this->assertDatabaseHas('users', ['email' => 'test@example.com']);
    }

    /** 2. パスワードと確認用が一致しない場合エラー（422） */
    public function test_パスワード確認が一致しないとエラー(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'email'                 => 'test@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'different123',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('password');
    }

    /** 3. 既存メールアドレスで登録しようとするとエラー（422） */
    public function test_既存メールアドレスで登録するとエラー(): void
    {
        User::factory()->create(['email' => 'test@example.com']);

        $response = $this->postJson('/api/auth/register', [
            'email'                 => 'test@example.com',
            'password'              => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('email');
    }

    /** 4. 正しい情報でログインできる（200・tokenを返す） */
    public function test_正しい情報でログインできる(): void
    {
        User::factory()->create([
            'email'    => 'test@example.com',
            'password' => 'password123',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'user' => ['id', 'email']]);
    }

    /** 5. パスワードが間違っている場合エラー（401） */
    public function test_パスワードが間違っているとエラー(): void
    {
        User::factory()->create([
            'email'    => 'test@example.com',
            'password' => 'password123',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => 'test@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401);
    }

    /** 6. ログアウトできる（200） */
    public function test_ログアウトできる(): void
    {
        $user  = User::factory()->create();
        $token = $user->createToken('mobile')->plainTextToken;

        $response = $this->withToken($token)->postJson('/api/auth/logout');

        $response->assertStatus(200);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    /** 7. 未認証でログアウトしようとするとエラー（401） */
    public function test_未認証でログアウトするとエラー(): void
    {
        $response = $this->postJson('/api/auth/logout');

        $response->assertStatus(401);
    }
}
