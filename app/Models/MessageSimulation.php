<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MessageSimulation extends Model
{
    protected $fillable = [
        'sender',
        'receiver',
        'attacker',
        'plaintext',
        'ciphertext',
        'algorithm',
        'key_value',
        'bob_result',
        'trudy_result',
        'bob_status',
        'trudy_status',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }
}