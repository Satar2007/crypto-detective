{{-- File and benchmark pages share the main workspace navigation. --}}
<section id="page-file" class="page cd-coursework-toolkit">
    <div class="card">
        <div class="card-header cd-panel-head">
            <div><h3>Pengolahan File Teks</h3><p>Unggah file, pilih operasi, lalu simpan hasilnya sebagai .txt.</p></div>
            <span class="cd-status-pill">6 algoritma</span>
        </div>
        <div class="card-body">
            <div class="cd-grid cd-grid-2">
                <label class="cd-field"><span>Mode</span><select id="cdFileMode"><option value="encrypt">Enkripsi</option><option value="decrypt">Dekripsi</option></select></label>
                <label class="cd-field"><span>Algoritma</span><select id="cdFileAlgorithm"><option value="caesar">Caesar</option><option value="vigenere">Vigenere</option><option value="playfair">Playfair</option><option value="hill">Hill 2x2</option><option value="otp">One-Time Pad</option><option value="stream">Stream Cipher</option></select></label>
                <label class="cd-field cd-span-2"><span>Rahasia kunci</span><input id="cdFileKey" type="text" aria-describedby="cdFileKeyHelp" placeholder="Kosongkan untuk membuat kunci otomatis"><small id="cdFileKeyHelp">Caesar menggunakan pergeseran angka. Kunci otomatis tersedia saat enkripsi.</small></label>
<div class="cd-field cd-span-2"><label for="otpFileKeyUpload">Unggah Kunci .txt</label><input id="otpFileKeyUpload" type="file" accept=".txt,text/plain"><small id="otpFileUploadStatus" role="status" aria-live="polite">File berisi kunci saja · UTF-8 · maksimum 2 MB</small></div>
<div id="otpFileFormats" class="cd-field cd-span-2" hidden>
<label for="otpFileCipherFormat">Format teks sandi OTP</label><select id="otpFileCipherFormat"><option value="base64">Base64 / Base64URL (aplikasi ini)</option><option value="hex">Hexadecimal (Hex)</option></select>
<label for="otpFileKeyFormat">Format kunci OTP</label><select id="otpFileKeyFormat"><option value="base64">Base64 / Base64URL</option><option value="hex">Hexadecimal (Hex)</option></select>
<small>Pilih format sesuai program pengirim. Spasi, baris baru, dan BOM diabaikan. Kunci yang Digunakan ditampilkan sebagai Base64.</small>
</div>
                <label class="cd-file-drop cd-span-2" for="cdFileInput"><input id="cdFileInput" type="file" accept=".txt,text/plain"><strong>Pilih file .txt</strong><span id="cdFileName">Belum ada file dipilih.</span><small>Teks UTF-8 · maksimum 2 MB</small></label>
            </div>
            <div class="cd-actions"><button type="button" id="cdRunFile" class="cd-primary-btn">Enkripsi file</button><button type="button" id="cdDownloadFile" class="cd-secondary-btn" disabled>Unduh keluaran .txt</button></div>
            <div id="cdFileAlert" class="cd-alert" role="status" aria-live="polite" hidden></div>
            <div class="cd-result-grid">
                <div class="cd-result-card"><span class="cd-result-label">Kunci yang Digunakan</span><code id="cdFileResolvedKey">—</code></div>
                <div class="cd-result-card"><span class="cd-result-label">Masukan → keluaran</span><strong id="cdFileSize">—</strong></div>
                <div class="cd-result-card cd-span-2"><span class="cd-result-label">Pratinjau Hasil</span><pre id="cdFileOutput">Belum ada hasil.</pre></div>
                <div class="cd-result-card cd-span-2"><span class="cd-result-label">Catatan mesin</span><div id="cdFileNotes">—</div></div>
            </div>
        </div>
    </div>
</section>
<section id="page-benchmark" class="page cd-coursework-toolkit">
    <div class="card">
        <div class="card-header cd-panel-head">
            <div><h3>Pengukuran Enam Algoritma</h3><p>Ukur waktu dan alokasi memori pada mesin Python dengan masukan yang sama.</p></div>
            <span class="cd-status-pill">Waktu Eksekusi Aktual</span>
        </div>
        <div class="card-body">
            <label class="cd-field"><span>Teks asli</span><textarea id="cdBenchmarkText" rows="4" minlength="10" maxlength="20000">BELAJAR KRIPTOGRAFI DI UNIVERSITAS SANATA DHARMA DENGAN ENAM ALGORITMA</textarea></label>
            <div class="cd-grid cd-grid-benchmark"><label class="cd-field"><span>Iterasi per operasi</span><input id="cdBenchmarkIterations" type="number" min="1" max="50" step="1" value="10"></label><div class="cd-benchmark-note">Waktu diukur dengan <code>perf_counter_ns</code>. Puncak adalah alokasi Python yang dilacak <code>tracemalloc</code>, diukur terpisah dari pengukuran waktu. Enkripsi mencakup pembuatan kunci; pengukuran tidak mencakup HTTP atau database.</div></div>
            <div class="cd-actions"><button type="button" id="cdRunBenchmark" class="cd-primary-btn">Ukur Beban Komputasi</button><button type="button" id="cdDownloadBenchmark" class="cd-secondary-btn" disabled>Unduh laporan .txt</button></div>
            <div id="cdBenchmarkAlert" class="cd-alert" role="status" aria-live="polite" hidden></div>
            <div id="cdBenchmarkSummary" class="cd-benchmark-summary" hidden></div>
            <div class="cd-table-wrap" tabindex="0" role="region" aria-label="Hasil pengukuran beban komputasi, geser horizontal untuk melihat semua kolom"><table class="cd-benchmark-table"><thead><tr><th>Algoritma</th><th>Masukan (B)</th><th>Keluaran (B)</th><th>Enkripsi (ms)</th><th>Dekripsi (ms)</th><th>Puncak memori enkripsi (KiB)</th><th>Puncak memori dekripsi (KiB)</th><th>Kecepatan enkripsi (MB/s)</th><th>Kecepatan dekripsi (MB/s)</th></tr></thead><tbody id="cdBenchmarkBody"><tr><td colspan="9" class="cd-empty-row">Jalankan pengukuran beban komputasi untuk melihat pengukuran.</td></tr></tbody></table></div>
            <div id="cdBenchmarkDetails" class="cd-algorithm-details"></div>
        </div>
    </div>
</section>
