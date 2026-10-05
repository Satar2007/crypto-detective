<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crypto_operations', function (Blueprint $table) {
            $table->id();

            // encrypt / decrypt / crack
            $table->string('mode', 20);

            // caesar / vigenere / playfair / hill / otp / stream
            $table->string('algorithm', 50);

            // Pesan asli / ciphertext yang dimasukkan user
            $table->longText('input_text');

            // Hasil encrypt / decrypt / crack
            $table->longText('output_text')->nullable();

            // Key, shift, matrix, seed, dan sebagainya
            $table->text('key_value')->nullable();

            // Nilai confidence untuk mode analyzer/crack
            $table->decimal('confidence', 5, 2)->nullable();

            // success / cracked / failed / key_required / candidate
            $table->string('status', 50)->default('success');

            // Penjelasan kenapa algoritma tersebut dipilih/dideteksi
            $table->text('reason')->nullable();

            // Data tambahan dari Python engine
            $table->json('metadata')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crypto_operations');
    }
};