<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_simulations', function (Blueprint $table) {
            $table->id();

            $table->string('sender')->default('Alice');
            $table->string('receiver')->default('Bob');
            $table->string('attacker')->default('Trudy');

            $table->longText('plaintext');
            $table->longText('ciphertext');

            $table->string('algorithm', 50);

            // Disimpan untuk kebutuhan demo/laporan.
            // Nantinya tidak ditampilkan kepada Trudy.
            $table->text('key_value')->nullable();

            $table->longText('bob_result')->nullable();
            $table->longText('trudy_result')->nullable();

            $table->string('bob_status', 50)->nullable();
            $table->string('trudy_status', 50)->nullable();

            $table->json('metadata')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_simulations');
    }
};