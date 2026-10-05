<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>Crypto Detective</title>

    <link rel="stylesheet" href="{{ asset('css/crypto-app.css') }}?v=3.0.1">
    <link rel="stylesheet" href="{{ asset('css/crypto-components.css') }}?v=3.0.0">
    <link rel="stylesheet" href="{{ asset('css/crypto-coursework-v1.css') }}?v=3.0.0">
    <link rel="stylesheet" href="{{ asset('css/crypto-file-workspace.css') }}?v=3.0.0">
    <link rel="stylesheet" href="{{ asset('css/crypto-hill-input.css') }}?v=3.0.0">
</head>

<body>

<div class="app">

    <aside class="sidebar">

        <div class="brand">
            <div class="brand-mark">CD</div>

            <h1>Crypto Detective</h1>

            <p>
                Enkripsi, analisis, dan simulasi.
            </p>
        </div>

        <div class="nav-label">Ruang kerja</div>
        <nav class="nav" aria-label="Navigasi ruang kerja">
            <button type="button" class="nav-button active" data-page="lab" aria-current="page"><span class="nav-index">01</span><span>Lab Kriptografi</span></button>
            <button type="button" class="nav-button" data-page="crack"><span class="nav-index">02</span><span>Analisis Pemecahan Sandi</span></button>
            <button type="button" class="nav-button" data-page="simulation"><span class="nav-index">03</span><span>Alice / Bob / Trudy</span></button>
            <button type="button" class="nav-button" data-page="history"><span class="nav-index">04</span><span>Riwayat</span></button>
            <button type="button" class="nav-button" data-page="file"><span class="nav-index">05</span><span>Lab File .txt</span></button>
            <button type="button" class="nav-button" data-page="benchmark"><span class="nav-index">06</span><span>Beban Komputasi</span></button>
        </nav>

        <div class="engine-box">

            <div class="engine-title">
                Mesin Kriptografi
            </div>

            <div class="engine-status">
                <span
                    id="engineDot"
                    class="status-dot"
                ></span>

                <span id="engineText">
                    Memeriksa…
                </span>
            </div>

        </div>

    </aside>

    <main class="main">

        <header class="topbar">

            <div>
                <div class="eyebrow">
                    Ruang kerja
                </div>

                <h2 id="pageTitle">
                    Laboratorium Kriptografi
                </h2>

                <p id="pageDescription">
                    Enkripsi dan dekripsi enam algoritma dalam satu ruang kerja.
                </p>
            </div>

        </header>

        <!-- CRYPTO LAB -->
        <section
            id="page-lab"
            class="page active"
        >

            <div class="grid">

                <article class="card">

                    <div class="card-header">
                        <h3>Enkripsi</h3>
                        <p>
                            Pilih algoritma manual atau gunakan Pemilihan Otomatis.
                        </p>
                    </div>

                    <div class="card-body">

                        <div class="field">
                            <label for="encryptPlaintext">
                                Teks asli
                            </label>

                            <textarea
                                id="encryptPlaintext"
                                placeholder="Masukkan pesan..."
                            ></textarea>
                        </div>

                        <div class="row">

                            <div class="field">
                                <label for="encryptAlgorithm">
                                    Algoritma
                                </label>

                                <select id="encryptAlgorithm">
                                    <option value="auto">
                                        Otomatis
                                    </option>
                                    <option value="caesar">
                                        Caesar
                                    </option>
                                    <option value="vigenere">
                                        Vigenère
                                    </option>
                                    <option value="playfair">
                                        Playfair
                                    </option>
                                    <option value="hill">
                                        Hill
                                    </option>
                                    <option value="otp">
                                        One-Time Pad
                                    </option>
                                    <option value="stream">
                                        Stream Cipher
                                    </option>
                                </select>
                            </div>

                            <div class="field">
                                <label for="encryptKey">
                                    Kunci
                                </label>

                                <input
                                    id="encryptKey"
                                    placeholder="Kosong = generate otomatis"
                                >
                            <div class="field"><label for="labEncryptKeyUpload">Unggah Kunci .txt</label><input id="labEncryptKeyUpload" type="file" accept=".txt,text/plain"><small id="labEncryptUploadStatus" role="status" aria-live="polite">File berisi kunci saja · UTF-8 · maksimum 2 MB</small></div>
</div>

                        </div>

                        <button
                            id="encryptButton"
                            class="button"
                        >
                            Enkripsi Pesan
                        </button>

                        <div
                            id="encryptResult"
                            class="result"
                        >
                            Belum ada hasil.
                        </div>

                    </div>

                </article>

                <article class="card">

                    <div class="card-header">
                        <h3>Dekripsi</h3>
                        <p>
                            Dekripsi teks sandi menggunakan algoritma dan rahasia kunci.
                        </p>
                    </div>

                    <div class="card-body">

                        <div class="field">
                            <label for="decryptCiphertext">
                                Teks sandi
                            </label>

                            <textarea
                                id="decryptCiphertext"
                                placeholder="Masukkan teks sandi..."
                            ></textarea>
                        </div>

                        <div class="row">

                            <div class="field">
                                <label for="decryptAlgorithm">
                                    Algoritma
                                </label>

                                <select id="decryptAlgorithm">
                                    <option value="caesar">
                                        Caesar
                                    </option>
                                    <option value="vigenere">
                                        Vigenère
                                    </option>
                                    <option value="playfair">
                                        Playfair
                                    </option>
                                    <option value="hill">
                                        Hill
                                    </option>
                                    <option value="otp">
                                        One-Time Pad
                                    </option>
                                    <option value="stream">
                                        Stream Cipher
                                    </option>
                                </select>
                            </div>

                            <div class="field">
                                <label for="decryptKey">
                                    Kunci Rahasia
                                </label>

                                <input
                                    id="decryptKey"
                                    placeholder="Masukkan kunci"
                                >
                            <div class="field"><label for="otpTextKeyUpload">Unggah Kunci .txt</label><input id="otpTextKeyUpload" type="file" accept=".txt,text/plain"><small id="otpTextUploadStatus" role="status" aria-live="polite">File berisi kunci saja · UTF-8 · maksimum 2 MB</small></div>
</div>

                        </div>

<div class="field" id="otpTextFormats" hidden>
<label for="otpTextCipherFormat">Format teks sandi OTP</label>
<select id="otpTextCipherFormat"><option value="base64">Base64 / Base64URL (aplikasi ini)</option><option value="hex">Hexadecimal (Hex)</option></select>
<label for="otpTextKeyFormat">Format kunci OTP</label>
<select id="otpTextKeyFormat"><option value="base64">Base64 / Base64URL</option><option value="hex">Hexadecimal (Hex)</option></select>
<small>Pilih format sesuai program pengirim. Teks sandi dan kunci boleh berbeda format. Spasi, baris baru, dan BOM diabaikan.</small>
</div>
                        <button
                            id="decryptButton"
                            class="button blue"
                        >
                            Dekripsi Pesan
                        </button>

                        <div
                            id="decryptResult"
                            class="result"
                        >
                            Belum ada hasil.
                        </div>

                    </div>

                </article>

            </div>

        </section>

        <!-- CRACK -->
        <section
            id="page-crack"
            class="page"
        >

            <article class="card">

                <div class="card-header">
                    <h3>Otomatis Kriptanalisis</h3>

                    <p>
                        Analyzer mencoba mengenali dan memecahkan teks sandi tanpa rahasia kunci.
                    </p>
                </div>

                <div class="card-body">

                    <div class="field">
                        <label for="crackCiphertext">
                            Belum diketahui Teks sandi
                        </label>

                        <textarea
                            id="crackCiphertext"
                            placeholder="Tempel teks sandi yang akan dianalisis..."
                        ></textarea>
                    </div>

                    <button
                        id="crackButton"
                        class="button"
                    >
                        Analisis Sandi
                    </button>

                    <div
                        id="crackResult"
                        class="result"
                    >
                        Belum ada analisis.
                    </div>

                </div>

            </article>

        </section>

        <!-- SIMULATION -->
        <section
            id="page-simulation"
            class="page"
        >

            <article class="card">

                <div class="card-header">
                    <h3>
                        Alice → Bob → Trudy
                    </h3>

                    <p>
                        Alice mengirim pesan terenkripsi, Bob memiliki rahasia kunci, sedangkan Trudy hanya menyadap teks sandi.
                    </p>
                </div>

                <div class="card-body">

                    <div class="field">
                        <label for="simulationPlaintext">
                            Pesan Alice
                        </label>

                        <textarea
                            id="simulationPlaintext"
                            placeholder="Masukkan pesan rahasia Alice..."
                        ></textarea>
                    </div>

                    <div class="row">

                        <div class="field">
                            <label for="simulationAlgorithm">
                                Algoritma
                            </label>

                            <select id="simulationAlgorithm">
                                <option value="caesar">
                                    Caesar
                                </option>
                                <option value="vigenere">
                                    Vigenère
                                </option>
                                <option value="playfair">
                                    Playfair
                                </option>
                                <option value="hill">
                                    Hill
                                </option>
                                <option value="otp">
                                    One-Time Pad
                                </option>
                                <option value="stream">
                                    Stream Cipher
                                </option>
                            </select>
                        </div>

                        <div class="field">
                            <label for="simulationKey">
                                Kunci Rahasia
                            </label>

                            <input
                                id="simulationKey"
                                placeholder="Kosong = generate otomatis"
                            >
                        </div>

                    </div>

                    <button
                        id="simulationButton"
                        class="button"
                    >
                        Jalankan Simulasi
                    </button>

                    <div
                        id="simulationResult"
                        class="simulation-grid"
                    ></div>

                </div>

            </article>

        </section>

        <!-- HISTORY -->
        <section
            id="page-history"
            class="page"
        >

            <article class="card">

                <div class="card-header">
                    <h3>
                        Riwayat Operasi
                    </h3>

                    <p>
                        Riwayat enkripsi, dekripsi, dan kriptanalisis yang tersimpan di MySQL.
                    </p>
                </div>

                <div class="card-body">

                    <button
                        id="refreshHistory"
                        class="button secondary"
                    >
                        Muat ulang Riwayat
                    </button>

                    <div
                        class="table-wrap history-table-wrap"
                    >

                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Mode</th>
                                    <th>Algoritma</th>
                                    <th>Masukan</th>
                                    <th>Keluaran</th>
                                    <th>Status</th>
                                    <th>Tingkat keyakinan</th>
                                </tr>
                            </thead>

                            <tbody id="historyBody">
                                <tr>
                                    <td
                                        colspan="7"
                                        class="empty"
                                    >
                                        Memuat…
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                    </div>

                </div>

            </article>

        </section>

        @include('crypto.partials.coursework-v1')

    </main>

</div>

<script src="{{ asset('js/crypto-otp-format.js') }}?v=2.2.0"></script>
<script src="{{ asset('js/crypto-app.js') }}?v=2.1.0"></script>

    <script src="{{ asset('js/crypto-lab-v2.js') }}?v=2.1.0"></script>
    <script src="{{ asset('js/crypto-simulation-v3.js') }}?v=3.2.0"></script>
    


    <script src="{{ asset('js/crypto-crack-v6.js') }}?v=6.0.0"></script>
    <script src="{{ asset('js/crypto-crack-theme.js') }}?v=2.0.0" data-stylesheet="{{ asset('css/crypto-crack-theme.css') }}?v=2.0.0"></script>
    <script src="{{ asset('js/crypto-coursework-v1.js') }}?v=2.1.0" defer></script>
<script src="{{ asset('js/crypto-compatibility-v1.js') }}?v=2.0.1" defer></script>
<script src="{{ asset('js/crypto-hill-input.js') }}?v=1.0.0" defer></script>
<script src="{{ asset('js/crypto-ui-simple.js') }}?v=1.0.0" defer></script>
<script src="{{ asset('js/crypto-ui-indonesia.js') }}?v=1.0.0" defer></script>
</body>
</html>
