<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('crypto.index');
})->name('crypto.index');