(() => {
    'use strict';
    const q = id => document.getElementById(id);
    let fileResult = null;
    let benchResult = null;

    function alertBox(id, message = '', error = false) {
        const element = q(id);
        if (!element) return;
        element.hidden = !message;
        element.textContent = message;
        element.classList.toggle('is-error', error);
    }

    function errorMessage(data, fallback) {
        if (typeof data?.message === 'string' && data.message) return data.message;
        if (typeof data?.detail === 'string' && data.detail) return data.detail;
        if (data?.errors) return String(Object.values(data.errors).flat()[0] || fallback);
        return fallback;
    }

    async function request(url, options, fallback) {
        const response = await fetch(url, options);
        let data;
        try { data = await response.json(); }
        catch { throw new Error('Server tidak mengembalikan JSON. Periksa koneksi engine dan log aplikasi.'); }
        if (!response.ok || !data.success) throw new Error(errorMessage(data, fallback));
        return data;
    }

    function formatKey(value) {
        if (value === null || value === undefined || value === '') return '—';
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
    }

    function download(name, text) {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function resetFile() {
        fileResult = null;
        q('cdDownloadFile').disabled = true;
        q('cdFileResolvedKey').textContent = '—';
        q('cdFileSize').textContent = '—';
        q('cdFileOutput').textContent = 'Belum ada hasil.';
        q('cdFileNotes').textContent = '—';
        alertBox('cdFileAlert');
    }

    function updateFileGuide() {
        const decrypt = q('cdFileMode').value === 'decrypt';
        const algorithm = q('cdFileAlgorithm').value;
        const guide = {
            caesar: ['Shift angka, misalnya 3', 'Caesar menggunakan shift angka.'],
            vigenere: ['KUNCI', 'Vigenere menggunakan key huruf A–Z.'],
            playfair: ['KRIPTO', 'Playfair memakai keyword; spasi dihapus, J menjadi I, dan padding dapat ditambahkan.'],
            hill: ['7 8 19 3', 'Hill 2×2: 7 8 19 3, 7,8,19,3, atau [[7,8],[19,3]]. Matriks harus invertible modulo 26.'],
            otp: ['Key Base64 hasil encrypt', 'OTP memakai key Base64 sepanjang data dalam byte. Jangan gunakan ulang key.'],
            stream: ['Secret key hasil encrypt', 'Stream memakai secret key yang sama untuk encrypt dan decrypt.']
        }[algorithm];
        q('cdFileKey').placeholder = decrypt ? guide[0] : `${guide[0]} · boleh kosong`;
        q('cdFileKeyHelp').textContent = `${guide[1]} ${decrypt
            ? 'Decrypt membutuhkan key yang sama dengan hasil encrypt.'
            : 'Kosongkan key untuk membuat key otomatis.'}`;
        q('cdFileKey').required = decrypt;
        q('cdRunFile').textContent = decrypt ? 'Decrypt file' : 'Encrypt file';
    }

    function setupFileLab() {
        const input = q('cdFileInput');
        const run = q('cdRunFile');
        if (!input || !run) return;
        input.addEventListener('change', () => {
            q('cdFileName').textContent = input.files?.[0]?.name || 'Belum ada file dipilih.';
            resetFile();
        });
        ['cdFileMode', 'cdFileAlgorithm', 'cdFileKey', 'otpFileCipherFormat', 'otpFileKeyFormat'].forEach(id => {
            q(id).addEventListener(id === 'cdFileKey' ? 'input' : 'change', () => {
                resetFile();
                updateFileGuide();
            });
        });
        updateFileGuide();
        run.addEventListener('click', async () => {
            resetFile();
            const file = input.files?.[0];
            const mode = q('cdFileMode').value;
            const key = q('cdFileKey').value.trim();
            if (!file) return alertBox('cdFileAlert', 'Pilih file .txt terlebih dahulu.', true);
            if (!file.name.toLowerCase().endsWith('.txt')) return alertBox('cdFileAlert', 'File harus berekstensi .txt.', true);
            if (file.size > 2 * 1024 * 1024) return alertBox('cdFileAlert', 'File melebihi batas 2 MB.', true);
            if (mode === 'decrypt' && !key) return alertBox('cdFileAlert', 'Decrypt membutuhkan secret key.', true);
            const form = new FormData();
            form.append('file', file);
            form.append('mode', mode);
            form.append('algorithm', q('cdFileAlgorithm').value);
            if (key) form.append('key', key);
            // Freeze input while the returned key and output belong to this request.
            const controls = ['cdFileInput', 'cdFileMode', 'cdFileAlgorithm', 'cdFileKey', 'otpFileCipherFormat', 'otpFileKeyFormat', 'otpFileKeyUpload'].map(q);
            controls.forEach(element => { element.disabled = true; });
            run.disabled = true;
            run.textContent = 'Processing…';
            alertBox('cdFileAlert', 'File sedang diproses oleh engine Python…');
            try {
                if (mode === 'decrypt' && q('cdFileAlgorithm').value === 'otp') {
                    const normalized = window.CryptoOTPFormat.normalize(await file.text(), key,
                        q('otpFileCipherFormat').value, q('otpFileKeyFormat').value);
                    form.set('file', new File([normalized.ciphertext], file.name, { type: 'text/plain' }));
                    form.set('key', normalized.key);
                }
                const data = await request('/api/coursework/file-process', {
                    method: 'POST', headers: { Accept: 'application/json' }, body: form
                }, 'File gagal diproses.');
                fileResult = data;
                q('cdFileResolvedKey').textContent = formatKey(data.key);
                q('cdFileSize').textContent = `${data.input_bytes} B → ${data.output_bytes} B`;
                q('cdFileOutput').textContent = data.output_text || '';
                const notes = [data.reason, ...(Array.isArray(data.notes) ? data.notes : [])].filter(Boolean);
                q('cdFileNotes').textContent = notes.join(' ') || '—';
                q('cdDownloadFile').disabled = false;
                alertBox('cdFileAlert', 'Selesai. Simpan resolved key untuk dekripsi; download berisi output teks saja.');
            } catch (error) {
                resetFile();
                alertBox('cdFileAlert', (mode === 'decrypt' && q('cdFileAlgorithm').value === 'otp' ? window.CryptoOTPFormat.error(error.message) : error.message) || 'File gagal diproses.', true);
            } finally {
                controls.forEach(element => { element.disabled = false; });
                run.disabled = false;
                updateFileGuide();
            }
        });
        q('cdDownloadFile').addEventListener('click', () => {
            if (fileResult) download(fileResult.download_name || 'crypto-result.txt', fileResult.output_text || '');
        });
    }

    function clearBenchmark() {
        benchResult = null;
        q('cdDownloadBenchmark').disabled = true;
        q('cdBenchmarkSummary').hidden = true;
        q('cdBenchmarkDetails').replaceChildren();
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 9;
        cell.className = 'cd-empty-row';
        cell.textContent = 'Jalankan benchmark untuk melihat pengukuran.';
        row.appendChild(cell);
        q('cdBenchmarkBody').replaceChildren(row);
    }

    function renderBenchmark(data) {
        q('cdBenchmarkBody').replaceChildren();
        q('cdBenchmarkDetails').replaceChildren();
        q('cdBenchmarkSummary').textContent = `${data.results.length} algoritma · ${data.iterations} iterasi per operasi · ${data.input_characters} karakter · ${data.input_bytes} B input · Python core`;
        q('cdBenchmarkSummary').hidden = false;
        data.results.forEach(result => {
            const row = document.createElement('tr');
            ['algorithm', 'input_bytes', 'output_bytes', 'avg_encrypt_ms', 'avg_decrypt_ms',
                'encrypt_peak_memory_kib', 'decrypt_peak_memory_kib', 'encrypt_throughput_mb_s',
                'decrypt_throughput_mb_s'].forEach(key => {
                const cell = document.createElement('td');
                cell.textContent = String(result[key] ?? '—');
                row.appendChild(cell);
            });
            q('cdBenchmarkBody').appendChild(row);
            const card = document.createElement('article');
            card.className = 'cd-algorithm-detail';
            const title = document.createElement('h4');
            title.textContent = result.algorithm;
            const description = document.createElement('p');
            description.textContent = result.explanation;
            const complexity = document.createElement('p');
            complexity.className = 'cd-complexity';
            complexity.textContent = `Encrypt: ${result.complexity_encrypt} · Decrypt: ${result.complexity_decrypt} · Memory: ${result.memory_complexity}`;
            card.append(title, description, complexity);
            q('cdBenchmarkDetails').appendChild(card);
        });
    }

    function report(data) {
        const lines = ['CRYPTO DETECTIVE', 'COMPUTATIONAL LOAD REPORT', '========================================', '',
            `Measurement : ${data.measurement}`, `Iterations  : ${data.iterations}`,
            `Input chars : ${data.input_characters}`, `Input bytes : ${data.input_bytes}`,
            `Generated   : ${new Date().toISOString()}`, '', data.disclaimer || '',
            'Timing measures Python core, including automatic encryption-key generation.',
            'Peak memory is separately traced Python allocation, not total process RAM.',
            'HTTP, upload, database, and browser render time are excluded.', ''];
        data.results.forEach(result => lines.push(`--- ${String(result.algorithm).toUpperCase()} ---`,
            `Input bytes       : ${result.input_bytes}`, `Output bytes      : ${result.output_bytes}`,
            `Average encrypt   : ${result.avg_encrypt_ms} ms`, `Average decrypt   : ${result.avg_decrypt_ms} ms`,
            `Min/max encrypt   : ${result.min_encrypt_ms} / ${result.max_encrypt_ms} ms`,
            `Min/max decrypt   : ${result.min_decrypt_ms} / ${result.max_decrypt_ms} ms`,
            `Encrypt peak mem  : ${result.encrypt_peak_memory_kib} KiB`, `Decrypt peak mem  : ${result.decrypt_peak_memory_kib} KiB`,
            `Encrypt throughput: ${result.encrypt_throughput_mb_s} MB/s`, `Decrypt throughput: ${result.decrypt_throughput_mb_s} MB/s`,
            `Encrypt complexity: ${result.complexity_encrypt}`, `Decrypt complexity: ${result.complexity_decrypt}`,
            `Memory complexity : ${result.memory_complexity}`, `Explanation       : ${result.explanation}`,
            `Measurement note  : ${result.measurement_note}`, ''));
        return lines.join('\n');
    }

    function setupBenchmark() {
        const run = q('cdRunBenchmark');
        if (!run) return;
        ['cdBenchmarkText', 'cdBenchmarkIterations'].forEach(id => q(id).addEventListener('input', () => {
            clearBenchmark(); alertBox('cdBenchmarkAlert');
        }));
        run.addEventListener('click', async () => {
            clearBenchmark();
            const plaintext = q('cdBenchmarkText').value;
            const iterations = Number(q('cdBenchmarkIterations').value);
            if (plaintext.length < 10 || plaintext.length > 20000) return alertBox('cdBenchmarkAlert', 'Plaintext harus 10–20.000 karakter.', true);
            if (!Number.isInteger(iterations) || iterations < 1 || iterations > 50) return alertBox('cdBenchmarkAlert', 'Iterasi harus integer 1–50.', true);
            run.disabled = true;
            run.textContent = 'Benchmarking…';
            q('cdBenchmarkText').disabled = true;
            q('cdBenchmarkIterations').disabled = true;
            alertBox('cdBenchmarkAlert', 'Mengukur enam algoritma pada engine Python…');
            try {
                const data = await request('/api/coursework/benchmark', {
                    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ plaintext, iterations })
                }, 'Benchmark gagal.');
                if (!Array.isArray(data.results) || data.results.length !== 6) throw new Error('Hasil benchmark enam algoritma tidak lengkap.');
                benchResult = data;
                renderBenchmark(data);
                q('cdDownloadBenchmark').disabled = false;
                alertBox('cdBenchmarkAlert', 'Benchmark selesai. Nilai di bawah berasal dari pengukuran runtime aktual.');
            } catch (error) {
                clearBenchmark();
                alertBox('cdBenchmarkAlert', error.message || 'Benchmark gagal.', true);
            } finally {
                run.disabled = false;
                run.textContent = 'Run benchmark';
                q('cdBenchmarkText').disabled = false;
                q('cdBenchmarkIterations').disabled = false;
            }
        });
        q('cdDownloadBenchmark').addEventListener('click', () => {
            if (benchResult) download('crypto-detective-computational-load-report.txt', report(benchResult));
        });
    }

    function init() { setupFileLab(); setupBenchmark(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
