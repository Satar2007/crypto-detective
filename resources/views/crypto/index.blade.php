<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>Crypto Detective</title>

    <link rel="stylesheet" href="{{ asset('css/crypto-app.css') }}?v=3.1.0">
    <link rel="stylesheet" href="{{ asset('css/crypto-components.css') }}?v=3.0.0">
    <link rel="stylesheet" href="{{ asset('css/crypto-file-workspace.css') }}?v=5.0.0">
    <link rel="stylesheet" href="{{ asset('css/crypto-hill-input.css') }}?v=3.0.0">
    <link rel="stylesheet" href="{{ asset('css/crypto-motion.css') }}?v=1.0.0">
    <link rel="stylesheet" href="{{ asset('css/crypto-lab-metrics.css') }}?v=1.0.0">
</head>

<body>

<div class="app">

    <aside class="sidebar">

        <div class="brand">

            <h1>Crypto Detective</h1>

            <p>
                Pesan, file, dan analisis sandi.
            </p>
        </div>
        <nav class="nav" aria-label="Navigasi utama">
            <button type="button" class="nav-button active" data-page="lab" aria-current="page"><span>Lab Kriptografi</span></button>
            <button type="button" class="nav-button" data-page="crack"><span>Analisis Pemecahan Sandi</span></button>
            <button type="button" class="nav-button" data-page="history"><span>Riwayat</span></button>
        </nav>

    </aside>

    <!-- Keep existing health-check hooks outside the visible navigation. -->
    <div hidden aria-hidden="true"><span id="engineDot"></span><span id="engineText"></span></div>

    <main class="main">

        <header class="topbar">

            <div>

                <h2 id="pageTitle">
                    Laboratorium Kriptografi
                </h2>

                <p id="pageDescription">
                    Enkripsi dan dekripsi pesan atau file, disertai pengukuran komputasi aktual.
                </p>
            </div>

        </header>

        <section id="page-lab" class="page active"></section>

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



    </main>

</div>

<script src="{{ asset('js/crypto-otp-format.js') }}?v=3.0.0"></script>
<script src="{{ asset('js/crypto-app.js') }}?v=3.0.0"></script>

    


    <script src="{{ asset('js/crypto-crack-v6.js') }}?v=6.0.0"></script>
    <script src="{{ asset('js/crypto-crack-theme.js') }}?v=2.0.0" data-stylesheet="{{ asset('css/crypto-crack-theme.css') }}?v=2.0.0"></script>
<script src="{{ asset('js/crypto-compatibility-v1.js') }}?v=4.0.1" defer></script>
<script src="{{ asset('js/crypto-lab-metrics.js') }}?v=1.0.0" defer></script>
<script src="{{ asset('js/crypto-hill-input.js') }}?v=1.0.0" defer></script>
<script src="{{ asset('js/crypto-ui-indonesia.js') }}?v=1.0.1" defer></script>
<aside id="cryptoMascot" class="crypto-mascot" aria-hidden="true">
    <div class="crypto-mascot-pose"><img src="{{ asset('images/crypto-spider-upright.png') }}" alt="" width="375" height="666"></div>
    <div class="crypto-mascot-pose crypto-mascot-second"><img src="{{ asset('images/crypto-spider-inverted.png') }}" alt="" width="375" height="666"></div>
</aside>
<button type="button" id="cryptoMotionToggle" class="crypto-motion-toggle" aria-pressed="true">Animasi: aktif</button>
<script src="{{ asset('js/crypto-motion.js') }}?v=1.1.0" defer></script>
</body>
</html>
