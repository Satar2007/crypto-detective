<?php

use App\Http\Controllers\CryptoController;
use App\Http\Controllers\MessageSimulationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Crypto Engine API
|--------------------------------------------------------------------------
*/

Route::prefix('crypto')->group(function () {
    Route::get(
        '/health',
        [CryptoController::class, 'health']
    );

    Route::post(
        '/encrypt',
        [CryptoController::class, 'encrypt']
    );

    Route::post(
        '/decrypt',
        [CryptoController::class, 'decrypt']
    );

    Route::post(
        '/crack',
        [CryptoController::class, 'crack']
    );

    Route::get(
        '/history',
        [CryptoController::class, 'history']
    );

    Route::get(
        '/history/{cryptoOperation}',
        [CryptoController::class, 'show']
    );
});

/*
|--------------------------------------------------------------------------
| Alice - Bob - Trudy Simulation API
|--------------------------------------------------------------------------
*/

Route::prefix('simulation')->group(function () {
    Route::post(
        '/run',
        [
            MessageSimulationController::class,
            'simulate',
        ]
    );

    Route::get(
        '/history',
        [
            MessageSimulationController::class,
            'history',
        ]
    );

    Route::get(
        '/history/{messageSimulation}',
        [
            MessageSimulationController::class,
            'show',
        ]
    );

    Route::get(
        '/{messageSimulation}/trudy',
        [
            MessageSimulationController::class,
            'trudyView',
        ]
    );
});

// COURSEWORK_UI_V1_ROUTES_START
Route::post(
    '/coursework/file-process',
    [\App\Http\Controllers\CourseworkController::class, 'fileProcess']
);
Route::post(
    '/coursework/benchmark',
    [\App\Http\Controllers\CourseworkController::class, 'benchmark']
);
// COURSEWORK_UI_V1_ROUTES_END

