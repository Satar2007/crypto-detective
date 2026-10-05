/* Indonesian presentation adapter. Never changes form values, API data or cipher output. */
(() => {
    'use strict';
    const phrases = {
        'Crypto Lab': 'Lab Kriptografi', 'Crypto Laboratory': 'Laboratorium Kriptografi',
        'Crack Analyzer': 'Analisis Pemecahan Sandi', 'Smart Crack Analyzer': 'Analisis Pemecahan Sandi',
        'File .txt Lab': 'Lab File .txt', 'Computational Load': 'Beban Komputasi',
        'Operation History': 'Riwayat Operasi', 'Crypto Engine': 'Mesin Kriptografi',
        'Text file workspace': 'Pengolahan File Teks', 'Six-algorithm benchmark': 'Pengukuran Enam Algoritma',
        'Benchmark': 'Beban Komputasi', 'Actual runtime': 'Waktu Eksekusi Aktual', '6 algorithms': '6 algoritma',
        'Smart Auto Selection': 'Pemilihan Otomatis', 'Smart Six-Cipher Analyzer': 'Analisis Enam Algoritma',
        'Cryptanalysis Result': 'Hasil Kriptanalisis', 'Deep cryptanalysis sedang berjalan': 'Kriptanalisis mendalam sedang berjalan',
        'Best plaintext candidate': 'Kandidat teks asli terbaik', 'Best family': 'Algoritma terbaik',
        'Candidate Explorer': 'Daftar Kandidat', 'ENGINE BEST': 'KANDIDAT TERBAIK',
        'Score / confidence': 'Skor / tingkat keyakinan', 'Analysis failed.': 'Analisis gagal.',
        'Send to Decrypt': 'Kirim ke Dekripsi', 'Send to decrypt': 'Kirim ke Dekripsi',
        'Run Simulation': 'Jalankan Simulasi', 'Start Simulation': 'Jalankan Simulasi',
        'Run benchmark': 'Ukur Beban Komputasi', 'Benchmarking…': 'Mengukur beban komputasi…',
        'Analyze Cipher': 'Analisis Sandi', 'Run Crack Analyzer': 'Jalankan Analisis Sandi', 'Analyze Ciphertext': 'Analisis Teks Sandi',
        'Original Plaintext': 'Teks Asli Pengirim', 'Recovered Plaintext': 'Teks Asli yang Dipulihkan',
        'Recovered Key': 'Kunci yang Ditemukan', 'Secret Key': 'Kunci Rahasia',
        'Has Secret Key': 'Memiliki Kunci Rahasia', 'Attack Confidence': 'Tingkat Keyakinan Serangan',
        'Attack Result': 'Hasil Serangan', 'Trudy Plaintext': 'Teks Asli Hasil Trudy',
        'Encrypted Channel': 'Saluran Terenkripsi', 'Ciphertext on network': 'Teks sandi di jaringan',
        'Authorized Receiver': 'Penerima Sah', 'Eavesdropper / Attacker': 'Penyadap / Penyerang',
        'Trudy Eavesdropping': 'Trudy Menyadap', 'Secret key is NOT transmitted': 'Kunci rahasia TIDAK dikirim',
        'Encrypt message before transmission': 'Enkripsi pesan sebelum dikirim',
        'Communication compromised.': 'Komunikasi berhasil disadap.',
        'Communication protected in this simulation.': 'Komunikasi terlindungi dalam simulasi ini.',
        'Attack result is inconclusive.': 'Hasil serangan belum dapat dipastikan.',
        'Trudy was not given the secret key, but cryptanalysis recovered the plaintext': 'Trudy tidak diberi kunci rahasia, tetapi kriptanalisis berhasil memulihkan teks asli',
        'and recovered key': 'dan menemukan kunci',
        'This demonstrates that encryption alone does not guarantee security when the selected cipher is vulnerable to practical analysis.': 'Enkripsi saja belum menjamin keamanan jika algoritma yang dipilih rentan terhadap analisis praktis.',
        'Trudy intercepted the ciphertext and knew the algorithm': 'Trudy menyadap teks sandi dan mengetahui algoritmanya',
        'but was not given the secret key and could not reliably recover the original plaintext.': 'tetapi tidak diberi kunci rahasia dan tidak berhasil memulihkan teks asli secara meyakinkan.',
        'Trudy produced an analysis candidate, but the result is not considered a confirmed plaintext recovery.': 'Trudy menghasilkan kandidat, tetapi hasilnya belum dianggap sebagai pemulihan teks asli yang terkonfirmasi.',
        'Copied!': 'Tersalin!', 'Checking...': 'Memeriksa…', 'Loading...': 'Memuat…',
        'Processing…': 'Memproses…', 'Engine offline': 'Mesin tidak terhubung',
        'Encrypt ms': 'Enkripsi (ms)', 'Decrypt ms': 'Dekripsi (ms)',
        'Enc peak KiB': 'Puncak memori enkripsi (KiB)', 'Dec peak KiB': 'Puncak memori dekripsi (KiB)',
        'Enc MB/s': 'Kecepatan enkripsi (MB/s)', 'Dec MB/s': 'Kecepatan dekripsi (MB/s)',
        'Input B': 'Masukan (B)', 'Output B': 'Keluaran (B)', 'Output preview': 'Pratinjau Hasil',
        'Resolved key': 'Kunci yang Digunakan', 'Input → output': 'Masukan → keluaran',
        'Load Alice Message .txt': 'Unggah Pesan Alice .txt', 'Copy Bob Plaintext': 'Salin Teks Asli Bob',
        'Copy Trudy Result': 'Salin Hasil Trudy', 'Download Simulation Report': 'Unduh Laporan Simulasi',
        'Copy Recovered Key': 'Salin Kunci yang Ditemukan',
        'Cryptanalysis tanpa secret key dengan hasil confidence dan recovered key.': 'Kriptanalisis tanpa kunci rahasia, disertai tingkat keyakinan dan kunci yang ditemukan.',
        'Visualisasi komunikasi terenkripsi dan percobaan penyadapan oleh attacker.': 'Visualisasi komunikasi terenkripsi dan percobaan penyadapan oleh penyerang.',
        'Confidence adalah ranking heuristic, bukan bukti matematis.': 'Tingkat keyakinan adalah peringkat heuristik, bukan bukti matematis.'
    };
    const words = {
        encrypt: 'enkripsi', decrypt: 'dekripsi', encryption: 'enkripsi', decryption: 'dekripsi',
        plaintext: 'teks asli', ciphertext: 'teks sandi', key: 'kunci', keys: 'kunci',
        secret: 'rahasia', resolved: 'yang digunakan', recovered: 'yang ditemukan',
        algorithm: 'algoritma', algorithms: 'algoritma', confidence: 'tingkat keyakinan',
        candidate: 'kandidat', candidates: 'kandidat', family: 'kelompok algoritma',
        download: 'unduh', upload: 'unggah', load: 'unggah', copy: 'salin',
        history: 'riwayat', benchmark: 'pengukuran beban komputasi', workspace: 'ruang kerja',
        input: 'masukan', output: 'keluaran', preview: 'pratinjau', report: 'laporan',
        analysis: 'analisis', cryptanalysis: 'kriptanalisis', detection: 'deteksi',
        detected: 'terdeteksi', attack: 'serangan', attacker: 'penyerang', action: 'tindakan',
        all: 'semua', previous: 'sebelumnya', next: 'berikutnya', result: 'hasil',
        success: 'berhasil', compromised: 'berhasil disadap', protected: 'terlindungi',
        candidate_found: 'kandidat ditemukan', inconclusive: 'belum dapat dipastikan', unknown: 'belum diketahui',
        error: 'kesalahan', failed: 'gagal', auto: 'otomatis', manual: 'manual',
        online: 'terhubung', offline: 'tidak terhubung', ready: 'siap',
        processing: 'memproses', loading: 'memuat', checking: 'memeriksa',
        refresh: 'muat ulang', reason: 'alasan', memory: 'memori',
        throughput: 'kecepatan pemrosesan', runtime: 'waktu eksekusi', engine: 'mesin',
        default: 'bawaan', shift: 'pergeseran', counter: 'penghitung', integer: 'bilangan bulat',
        message: 'pesan', status: 'status', mode: 'mode', yes: 'ya', no: 'tidak',
        automatic: 'otomatis', analyze: 'analisis', simulation: 'simulasi', sender: 'pengirim',
        receiver: 'penerima', transmitted: 'dikirim', transmission: 'pengiriman',
        eavesdropping: 'penyadapan', eavesdropper: 'penyadap', copied: 'tersalin',
        peak: 'puncak', timing: 'pengukuran waktu', heuristic: 'heuristik', ranking: 'peringkat'
    };
    const ordered = Object.keys(phrases).sort((a,b) => b.length - a.length);
    function translate(text) {
        let value = text;
        for (const phrase of ordered) value = value.split(phrase).join(phrases[phrase]);
        value = value.replace(/\bPage (\d+) of (\d+)\b/g, 'Halaman $1 dari $2');
        value = value.replace(/\b[A-Za-z_]+\b/g, word => {
            const replacement = words[word.toLowerCase()];
            if (!replacement) return word;
            return /^[A-Z]/.test(word) ? replacement[0].toUpperCase()+replacement.slice(1) : replacement;
        });
        return value;
    }
    const raw = 'script,style,textarea,input,pre,code,.plaintext,.candidate-plain,.mini-value,.metric-value,.cx-candidate-preview,.cd-cipher,.cd-stat-value,.mono,#cxTextName,#cxKeyName,#cxSelectedMeta,#cdFileName,#cdFileSize,#encryptResult,#decryptResult,#crackResult';
    function allowed(element) {
        if (!element) return false;
        const metric = element.closest('.metric-value');
        if (metric && ['Result','Hasil'].includes(metric.parentElement.querySelector('.label')?.textContent.trim())) return true;
        if (element.closest(raw)) return false;
        const cell = element.closest('#historyBody td');
        if (cell && (cell.cellIndex === 3 || cell.cellIndex === 4)) return false;
        const value = element.closest('.cd-value');
        if (value) {
            const label = value.parentElement.querySelector('.cd-label')?.textContent.trim();
            if (!['Has Secret Key','Memiliki Kunci Rahasia','Action','Tindakan'].includes(label)) return false;
        }
        // A result-meta strong contains an algorithm name or a key; keep the original.
        if (element.closest('.result-meta strong,.cd-v2-file-name')) return false;
        return true;
    }
    function resultLabels(element) {
        let text = element.textContent;
        const encrypt = text.match(/^Algorithm : ([^\n]+)\n\nCiphertext:\n([\s\S]*)\n\nKey:\n([\s\S]*)\n\nReason:\n([\s\S]*)$/);
        const decrypt = text.match(/^Algorithm : ([^\n]+)\n\nPlaintext:\n([\s\S]*)$/);
        if (encrypt) text = `Algoritma : ${encrypt[1]}\n\nTeks sandi:\n${encrypt[2]}\n\nKunci:\n${encrypt[3]}\n\nAlasan:\n${translate(encrypt[4])}`;
        else if (decrypt) text = `Algoritma : ${decrypt[1]}\n\nTeks asli:\n${decrypt[2]}`;
        else if (text.startsWith('ERROR\n')) text = 'KESALAHAN\n'+translate(text.slice(6));
        if (text !== element.textContent) element.textContent = text;
    }
    function apply(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            if (!allowed(node.parentElement)) continue;
            const value = translate(node.nodeValue.replace(/\s+/g,' ').trim());
            const original = node.nodeValue.replace(/\s+/g,' ').trim();
            if (value !== original) node.nodeValue = node.nodeValue.replace(/\S[\s\S]*\S|\S/, value);
        }
        root.querySelectorAll('[placeholder],[aria-label],[title]').forEach(element => {
            for (const name of ['placeholder','aria-label','title']) {
                const value = element.getAttribute(name);
                if (value && translate(value) !== value) element.setAttribute(name,translate(value));
            }
        });
        if (root === document.body) for (const id of ['encryptResult','decryptResult']) {
            const element = document.getElementById(id); if (element) resultLabels(element);
        }
    }
    function observe(root) {
        let scheduled = false;
        const observer = new MutationObserver(() => {
            if (scheduled) return;
            scheduled = true;
            queueMicrotask(() => {scheduled=false;apply(root);});
        });
        apply(root);
        observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title']});
    }
    window.CryptoUIIndonesian = Object.freeze({translate});
    function init() {
        observe(document.body);
        const shadow = document.getElementById('crackResult')?.shadowRoot;
        if (shadow) observe(shadow);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
    else init();
})();
