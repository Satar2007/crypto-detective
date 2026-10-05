<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CryptoOperation extends Model
{
    protected $fillable = [
        'mode',
        'algorithm',
        'input_text',
        'output_text',
        'key_value',
        'confidence',
        'status',
        'reason',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'confidence' => 'decimal:2',
            'metadata' => 'array',
        ];
    }
}