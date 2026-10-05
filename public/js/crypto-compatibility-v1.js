/* File workspace: explicit candidate detection. Cipher implementations stay in the engine. */
(() => {
    'use strict';
    const labels = {caesar:'Caesar', vigenere:'Vigenère', playfair:'Playfair', hill:'Hill 2×2', 'otp-byte':'OTP XOR byte', 'otp-alpha':'OTP alfabet', 'stream-sha256':'Stream SHA-256 counter'};
    const compact = value => String(value).replace(/[\s\uFEFF]/gu, '');
    function alphabet(text, key, decrypt) {
        const clean = value => {
            const result = compact(value).toUpperCase();
            if (!/^[A-Z]+$/.test(result)) throw new Error('Mode alfabet hanya menerima huruf A-Z dan spasi/baris baru.');
            return result;
        };
        const data = clean(text), pad = clean(key);
        if (data.length !== pad.length) throw new Error(`OTP alfabet: pesan ${data.length} huruf, key ${pad.length} huruf. Panjang harus sama; key tidak diulang.`);
        return Array.from(data, (ch, i) => String.fromCharCode(65 + ((ch.charCodeAt(0) - 65 + (decrypt ? -1 : 1) * (pad.charCodeAt(i) - 65) + 26) % 26))).join('');
    }
    function randomPad(n) {
        let result = '';
        while (result.length < n) {
            const buffer = new Uint8Array(256); crypto.getRandomValues(buffer);
            for (const value of buffer) if (value < 234 && result.length < n) result += String.fromCharCode(65 + value % 26);
        }
        return result;
    }
    const hex = binary => Array.from(binary, c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
    function validate(text, key, requireKey = true) {
        if (!text.trim() || text.length > 20000) throw new Error('Input harus berisi 1–20.000 karakter. Untuk file lebih besar, gunakan mode manual.');
        if (key.length > 20000) throw new Error('Key melebihi 20.000 karakter.');
        if (requireKey && !key.trim()) throw new Error('Masukkan atau upload key pengirim. Auto ini menggunakan key, bukan crack tanpa key.');
    }
    function decode(value, format, label) {
        if (!window.CryptoOTPFormat) throw new Error('Helper format belum termuat. Refresh browser dengan Ctrl+F5.');
        return window.CryptoOTPFormat.decode(value, format, label);
    }
    function formats(value, selected = 'auto') {
        const found = [];
        for (const format of selected === 'auto' ? ['hex','base64'] : [selected]) {
            try { found.push({format, binary:decode(value,format,'Data')}); } catch(e) { if (selected !== 'auto') throw e; }
        }
        return found;
    }
    function buildPlans(text, key, {variant = 'auto', cipherFormat = 'auto', keyFormat = 'auto'} = {}) {
        validate(text,key); key = key.trim();
        if (variant !== 'auto' && !labels[variant]) throw new Error('Metode tidak dikenal.');
        const plans = [], letters = compact(text), pad = compact(key);
        const add = (method, reason, cf = 'text', kf = 'text') => plans.push({variant:method, reason, cipherFormat:cf, keyFormat:kf});
        const chosen = method => variant === 'auto' || variant === method;
        if (chosen('caesar') && (variant !== 'auto' || /^[-+]?\d+$/.test(key))) add('caesar','Key berupa shift angka.');
        if (chosen('hill') && (variant !== 'auto' || (/^[A-Za-z]+$/.test(letters) && letters.length % 2 === 0 && (key.match(/-?\d+/g) || []).length === 4))) add('hill','Key berisi empat integer; validitas matriks diperiksa engine.');
        if (chosen('vigenere') && (variant !== 'auto' || (/^[A-Za-z]+$/.test(pad) && /[A-Za-z]/.test(text)))) add('vigenere','Key berupa huruf; dicoba sebagai Vigenère.');
        if (chosen('playfair') && (variant !== 'auto' || (/^[A-Za-z]+$/.test(pad) && /^[A-Za-z]+$/.test(letters) && letters.length % 2 === 0))) add('playfair','Key huruf dan ciphertext berpasangan; J/filler mengikuti engine.');
        if (chosen('otp-alpha') && (variant !== 'auto' || (/^[A-Za-z]+$/.test(pad) && /^[A-Za-z]+$/.test(letters) && pad.length === letters.length))) add('otp-alpha','Jumlah huruf ciphertext dan pad sama; A=0, modulo 26.');
        if (chosen('otp-byte') || chosen('stream-sha256')) {
            const ciphers = formats(text,cipherFormat);
            if (chosen('otp-byte')) {
                for (const cipher of ciphers) for (const secret of formats(key,keyFormat)) {
                    if (cipher.binary.length === secret.binary.length) add('otp-byte','Panjang ciphertext dan pad sama dalam byte.',cipher.format,secret.format);
                }
            }
            if (chosen('stream-sha256')) for (const cipher of ciphers) add('stream-sha256','Format byte valid; keystream dicoba dengan SHA-256 counter milik aplikasi.',cipher.format,'literal');
        }
        return plans;
    }
    async function process({mode, variant, text, key = '', cipherFormat = 'base64', keyFormat = 'base64', signal}) {
        if (!['encrypt','decrypt'].includes(mode) || !labels[variant]) throw new Error('Mode atau metode tidak dikenal.');
        key = String(key).trim(); validate(text,key,mode === 'decrypt');
        if (variant === 'otp-alpha') {
            const clean = compact(text).toUpperCase();
            if (!/^[A-Z]+$/.test(clean)) throw new Error('Input OTP alfabet harus huruf A-Z.');
            if (!key && mode === 'encrypt') key = randomPad(clean.length);
            return {output:alphabet(text,key,mode === 'decrypt'), key:compact(key).toUpperCase(), notes:'OTP alfabet A=0, modulo 26. Spasi dihapus. Diproses lokal; tidak dicatat di History/benchmark.'};
        }
        const algorithm = variant === 'otp-byte' ? 'otp' : variant === 'stream-sha256' ? 'stream' : variant;
        let input = text, resolved = key;
        if (algorithm === 'otp' && key) resolved = btoa(decode(key,keyFormat,'Key'));
        if (mode === 'decrypt' && ['otp','stream'].includes(algorithm)) input = btoa(decode(text,cipherFormat,'Ciphertext'));
        if (mode === 'decrypt' && algorithm === 'otp') window.CryptoOTPFormat.normalize(input,resolved);
        const form = new FormData();
        form.append('mode',mode); form.append('algorithm',algorithm);
        form.append('file',new File([input],'compat-message.txt',{type:'text/plain'}));
        if (resolved) form.append('key',resolved);
        const controller = new AbortController();
        const abort = () => controller.abort();
        if (signal?.aborted) abort(); else signal?.addEventListener('abort',abort,{once:true});
        const timeout = setTimeout(abort,125000);
        try {
            const response = await fetch('/api/coursework/file-process',{method:'POST',headers:{Accept:'application/json'},body:form,signal:controller.signal});
            let answer;
            try { answer = await response.json(); } catch { throw new Error('Server tidak mengembalikan JSON. Periksa Laragon dan Python engine.'); }
            if (!response.ok || answer.success !== true) {
                let message = answer.message || answer.detail || 'Operasi engine gagal.';
                if (answer.errors) message = String(Object.values(answer.errors).flat()[0] || message);
                if (/utf-8|invalid start byte|invalid continuation byte/i.test(message)) message = 'Hasil bukan UTF-8. Key atau metode pengirim tidak cocok; Stream membutuhkan keystream yang sama.';
                const error = new Error(message); error.status = response.status; throw error;
            }
            if (typeof answer.output_text !== 'string' || !answer.output_text.length) throw new Error('Engine tidak memberikan output teks.');
            let output = answer.output_text;
            resolved = typeof answer.key === 'object' ? JSON.stringify(answer.key) : String(answer.key ?? resolved);
            if (mode === 'encrypt' && ['otp','stream'].includes(algorithm) && cipherFormat === 'hex') output = hex(decode(output,'base64','Ciphertext hasil'));
            if (algorithm === 'otp' && keyFormat === 'hex') resolved = hex(decode(resolved,'base64','Key hasil'));
            return {output,key:resolved,notes:'Diproses oleh engine lewat File Lab; tidak dicatat di History. '+(['hill','playfair'].includes(algorithm) ? 'Spasi, J, dan filler/padding mengikuti aturan engine. ' : '')+(algorithm === 'stream' ? 'Stream SHA-256 counter, key teks literal; metode pengirim harus sama.' : '')};
        } finally { clearTimeout(timeout); signal?.removeEventListener('abort',abort); }
    }
    async function analyze(options, onProgress = () => {}) {
        const plans = buildPlans(options.text,options.key,options), candidates = [], failures = [];
        for (let i = 0; i < plans.length; i++) {
            if (options.signal?.aborted) throw new DOMException('Dibatalkan','AbortError');
            const plan = plans[i]; onProgress(i+1,plans.length,labels[plan.variant]);
            try {
                const result = await process({...options,...plan,mode:'decrypt'});
                candidates.push({...plan,...result,label:labels[plan.variant]});
            } catch(e) {
                if (e.name === 'AbortError' || !e.status || e.status >= 500 || [401,403,419,429].includes(e.status)) throw e;
                failures.push({label:labels[plan.variant],message:e.message});
            }
        }
        return {candidates,failures,attempts:plans.length};
    }
    window.CryptoCompatibilityV1 = Object.freeze({alphabet,randomPad,process,buildPlans,analyze,formats});
    function init() {
        const host = document.getElementById('page-file');
        if (!host || document.getElementById('cdCompat')) return;
        const manualCard = host.querySelector('.card');
        const manual = document.createElement('details'); manual.className = 'cx-manual';
        const summary = document.createElement('summary'); summary.textContent = 'Encrypt file / mode manual';
        manual.appendChild(summary); if (manualCard) manual.appendChild(manualCard);
        const card = document.createElement('article'); card.id = 'cdCompat'; card.className = 'cx-workspace';
        card.innerHTML = `<header class="cx-head"><div><span class="cx-eyebrow">FILE LAB</span><h2 id="cxHeading">Decrypt pesan</h2><p id="cxSubtitle">Upload ciphertext dan key. Auto akan memeriksa metode serta format yang sesuai.</p></div><span class="cx-badge" id="cxBadge">Auto dengan key</span></header>
<div class="cx-upload-grid"><label class="cx-upload" for="cxTextFile"><span id="cxInputLabel">Ciphertext .txt</span><input id="cxTextFile" type="file" accept=".txt,text/plain"><small id="cxTextName">Pilih file pesan dari pengirim.</small></label><label class="cx-upload" for="cxKeyFile"><span>Key .txt</span><input id="cxKeyFile" type="file" accept=".txt,text/plain"><small id="cxKeyName">Pilih file key dari pesan yang sama.</small></label></div>
<details class="cx-details" id="cxPaste"><summary>Tempel ciphertext atau key</summary><div class="cx-paste-grid"><label for="cxText"><span id="cxTextLabel">Ciphertext</span><textarea id="cxText" rows="4" maxlength="20000" spellcheck="false"></textarea></label><label for="cxKey">Key<textarea id="cxKey" rows="4" maxlength="20000" spellcheck="false"></textarea></label></div></details>
<div class="cx-method"><label for="cxMode" class="cx-operation">Operasi<select id="cxMode"><option value="decrypt">Decrypt</option><option value="encrypt">Encrypt</option></select></label><label for="cxVariant">Metode<select id="cxVariant"><option value="auto" id="cxAutoOption">Auto — periksa enam algoritma</option><option value="caesar">Caesar</option><option value="vigenere">Vigenère</option><option value="playfair">Playfair</option><option value="hill">Hill 2×2</option><option value="otp-byte">OTP XOR byte</option><option value="otp-alpha">OTP alfabet A–Z</option><option value="stream-sha256">Stream SHA-256 counter</option></select></label><details class="cx-details" id="cxFormatSettings" hidden><summary>Pengaturan format</summary><div class="cx-format-grid"><label for="cxCipherFormat">Ciphertext<select id="cxCipherFormat"><option value="auto">Auto: Hex / Base64</option><option value="hex">Hex</option><option value="base64">Base64 / Base64URL</option></select></label><label for="cxKeyFormat" id="cxKeyFormatWrap">Key OTP byte<select id="cxKeyFormat"><option value="auto">Auto: Hex / Base64</option><option value="hex">Hex</option><option value="base64">Base64 / Base64URL</option></select></label></div></details></div>
<p class="cx-hint" id="cxGuide">Auto menghasilkan kandidat, bukan kepastian. Tidak melakukan crack tanpa key.</p>
<div class="cx-actions"><button type="button" id="cxRun" class="cx-primary">Analisis dan decrypt</button><button type="button" id="cxCancel" class="cx-secondary" hidden>Batalkan</button><span id="cxFileStatus" role="status" aria-live="polite"></span></div>
<p id="cxStatus" class="cx-status" role="status" aria-live="polite"></p>
<section id="cxResults" class="cx-results" hidden aria-labelledby="cxResultsTitle"><div class="cx-result-head"><h3 id="cxResultsTitle">Kandidat plaintext</h3><span id="cxResultCount"></span></div><p class="cx-hint" id="cxCandidateHint">Pilih hasil setelah mencocokkan dengan pengirim. Output yang terbaca belum membuktikan metode atau key benar.</p><div id="cxCandidates" class="cx-candidates"></div><div id="cxPreview" hidden><p id="cxSelectedMeta" class="cx-selected-meta"></p><pre id="cxOutput" tabindex="0"></pre><div class="cx-actions"><button type="button" id="cxDownload" class="cx-primary" disabled>Download plaintext .txt</button><button type="button" id="cxDownloadKey" class="cx-secondary" disabled>Download key .txt</button></div><details class="cx-details"><summary>Detail pemrosesan</summary><p>Resolved key: <code id="cxResolvedKey"></code></p><p id="cxNotes"></p><button type="button" id="cxReport" class="cx-secondary" disabled>Download catatan analisis</button></details></div></section>
<details id="cxDiagnostics" class="cx-details" hidden><summary>Metode yang tidak menghasilkan kandidat</summary><div id="cxFailures"></div></details>`;
        host.prepend(card); host.appendChild(manual);
        const q = id => document.getElementById(id);
        let selected = null, analysis = null, controller = null;
        const downloads = ['cxDownload','cxDownloadKey','cxReport'];
        function reset() {
            selected = analysis = null; q('cxResults').hidden = q('cxPreview').hidden = q('cxDiagnostics').hidden = true;
            q('cxCandidates').replaceChildren(); q('cxFailures').replaceChildren(); q('cxOutput').textContent = q('cxStatus').textContent = '';
            downloads.forEach(id => q(id).disabled = true);
        }
        function guide() {
            const encrypt = q('cxMode').value === 'encrypt';
            if (encrypt && q('cxVariant').value === 'auto') q('cxVariant').value = 'caesar';
            const v = q('cxVariant').value; q('cxAutoOption').disabled = encrypt;
            q('cxHeading').textContent = encrypt ? 'Encrypt pesan' : 'Decrypt pesan';
            q('cxSubtitle').textContent = encrypt ? 'Upload atau tempel plaintext, lalu pilih metode. Key boleh dibuat otomatis.' : 'Upload ciphertext dan key. Auto akan memeriksa metode serta format yang sesuai.';
            q('cxInputLabel').textContent = encrypt ? 'Plaintext .txt' : 'Ciphertext .txt'; q('cxTextLabel').textContent = encrypt ? 'Plaintext' : 'Ciphertext';
            q('cxBadge').textContent = encrypt ? 'Key otomatis tersedia' : 'Auto dengan key';
            q('cxRun').textContent = encrypt ? 'Encrypt pesan' : 'Analisis dan decrypt';
            q('cxFormatSettings').hidden = !['otp-byte','stream-sha256'].includes(v);
            q('cxKeyFormatWrap').hidden = v !== 'otp-byte';
            q('cxGuide').textContent = v === 'auto' ? 'Auto menghasilkan kandidat, bukan kepastian. Tidak melakukan crack tanpa key.' : v === 'otp-alpha' ? 'OTP alfabet: A=0, key sepanjang huruf pesan, spasi dihapus.' : v === 'stream-sha256' ? 'Hex/Base64 adalah format ciphertext. Metode Stream pengirim harus SHA-256 counter yang sama.' : 'Metode dipilih manual; periksa key dan aturan program pengirim.';
            if (encrypt) q('cxGuide').textContent = 'Pilih metode untuk encrypt. Kosongkan key untuk dibuat otomatis; format output byte default Base64.';
        }
        const controls = Array.from(card.querySelectorAll('input,textarea,select,button')).filter(e => !downloads.includes(e.id) && e.id !== 'cxCancel');
        function busy(value) { controls.forEach(e => e.disabled = value); q('cxCancel').hidden = !value; card.setAttribute('aria-busy',String(value)); }
        ['cxMode','cxVariant','cxCipherFormat','cxKeyFormat','cxText','cxKey'].forEach(id => q(id).addEventListener(['cxText','cxKey'].includes(id) ? 'input' : 'change',() => {if (id === 'cxMode') q('cxVariant').value = q('cxMode').value === 'decrypt' ? 'auto' : 'caesar'; reset();guide();}));
        for (const [fileId,fieldId,nameId] of [['cxTextFile','cxText','cxTextName'],['cxKeyFile','cxKey','cxKeyName']]) q(fileId).addEventListener('change',async () => {
            const file = q(fileId).files?.[0]; if (!file) return;
            reset(); q('cxFileStatus').textContent = ''; busy(true); q('cxCancel').hidden = true;
            try {
                if (!file.name.toLowerCase().endsWith('.txt') || file.size > 2*1024*1024) throw new Error('Pilih .txt UTF-8 maksimum 2 MB.');
                const text = new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());
                validate(text,'',false);
                q(fieldId).value = fieldId === 'cxKey' ? text.trim() : text;
                q(fieldId).dispatchEvent(new Event('input',{bubbles:true}));
                q(nameId).textContent = file.name + ' · ' + file.size + ' B';
                q('cxFileStatus').textContent = file.name + ' dimuat.';
            } catch(e) { q('cxFileStatus').textContent = e.message; }
            finally { busy(false); q(fileId).value = ''; }
        });
        function choose(candidate) {
            selected = candidate; q('cxPreview').hidden = false;
            q('cxSelectedMeta').textContent = candidate.label + ' · ciphertext ' + candidate.cipherFormat + ' · key ' + candidate.keyFormat;
            q('cxOutput').textContent = candidate.output; q('cxResolvedKey').textContent = candidate.key;
            q('cxNotes').textContent = candidate.reason + ' ' + candidate.notes + ' Benchmark tetap mengukur enam metode utama.';
            downloads.forEach(id => q(id).disabled = false);
        }
        function render(data) {
            const encrypt = q('cxMode').value === 'encrypt';
            q('cxResultsTitle').textContent = encrypt ? 'Hasil encrypt' : 'Kandidat plaintext';
            q('cxCandidateHint').textContent = encrypt ? 'Simpan ciphertext dan key untuk penerima. Jangan gunakan ulang key OTP atau Stream.' : 'Pilih hasil setelah mencocokkan dengan pengirim. Output yang terbaca belum membuktikan metode atau key benar.';
            q('cxDownload').textContent = encrypt ? 'Download ciphertext .txt' : 'Download plaintext .txt';
            analysis = data; q('cxResults').hidden = !data.candidates.length;
            q('cxResultCount').textContent = encrypt ? '' : data.candidates.length + ' kandidat';
            data.candidates.forEach((candidate,i) => {
                if (encrypt) return;
                const label = document.createElement('label'); label.className = 'cx-candidate';
                const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'cxCandidate'; radio.value = String(i);
                const content = document.createElement('span'), title = document.createElement('strong'), meta = document.createElement('small'), preview = document.createElement('span');
                title.textContent = candidate.label;
                meta.textContent = candidate.cipherFormat + ' · key ' + candidate.keyFormat;
                preview.textContent = candidate.output.slice(0,140) + (candidate.output.length > 140 ? '…' : ''); preview.className = 'cx-candidate-preview';
                content.append(title,meta,preview); label.append(radio,content); q('cxCandidates').appendChild(label);
                radio.addEventListener('change',() => choose(candidate));
            });
            if (data.failures.length) {
                q('cxDiagnostics').hidden = false;
                data.failures.forEach(failure => { const p = document.createElement('p'); p.textContent = failure.label + ': ' + failure.message; q('cxFailures').appendChild(p); });
            }
            if (encrypt && data.candidates.length) {choose(data.candidates[0]); q('cxStatus').textContent = 'Encrypt selesai. Download hasil dan key.'; return;}
            q('cxStatus').textContent = data.candidates.length ? `${data.attempts} kemungkinan diperiksa. Pilih kandidat untuk melihat dan mengunduh plaintext.` : 'Tidak ada kandidat dengan metode/key ini. Periksa isi file, key, dan aturan pengirim. Auto tidak dapat menebak metode Stream yang belum didukung.';
        }
        q('cxCancel').addEventListener('click',() => controller?.abort());
        q('cxRun').addEventListener('click',async () => {
            reset(); q('cxFileStatus').textContent = ''; busy(true); controller = new AbortController();
            try {
                const options = {text:q('cxText').value,key:q('cxKey').value,variant:q('cxVariant').value,cipherFormat:q('cxVariant').value === 'auto' ? 'auto' : q('cxCipherFormat').value,keyFormat:q('cxVariant').value === 'auto' ? 'auto' : q('cxKeyFormat').value,signal:controller.signal};
                if (q('cxMode').value === 'encrypt') {
                    let keyFormat = options.keyFormat === 'auto' ? 'base64' : options.keyFormat;
                    if (options.variant === 'otp-byte' && options.key.trim() && options.keyFormat === 'auto') {
                        const possible = formats(options.key);
                        if (possible.length !== 1) throw new Error('Format key OTP ambigu atau tidak valid. Pilih Hex/Base64 di pengaturan format.');
                        keyFormat = possible[0].format;
                    }
                    const format = options.cipherFormat === 'auto' ? 'base64' : options.cipherFormat;
                    const output = await process({...options,mode:'encrypt',cipherFormat:format,keyFormat});
                    render({candidates:[{...output,variant:options.variant,label:labels[options.variant],cipherFormat:['otp-byte','stream-sha256'].includes(options.variant) ? format : 'text',keyFormat:options.variant === 'otp-byte' ? keyFormat : 'text',reason:'Metode dipilih pengguna untuk encrypt.'}],failures:[],attempts:1});
                } else render(await analyze(options,(i,n,label) => {q('cxStatus').textContent = `Memeriksa ${i}/${n} · ${label}…`;}));
            } catch(e) { reset(); q('cxStatus').textContent = e.name === 'AbortError' ? 'Analisis dibatalkan atau batas waktu terlewati. Tidak ada hasil dipilih.' : e.message; }
            finally { controller = null; busy(false); }
        });
        function download(name,value) {
            const url = URL.createObjectURL(new Blob([value],{type:'text/plain;charset=utf-8'}));
            const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
        }
        q('cxDownload').addEventListener('click',() => {if(selected) download(selected.variant+(q('cxMode').value === 'encrypt' ? '-ciphertext.txt' : '-plaintext.txt'),selected.output);});
        q('cxDownloadKey').addEventListener('click',() => {if(selected) download(selected.variant+'-key.txt',selected.key);});
        q('cxReport').addEventListener('click',() => {if(selected && analysis) download('file-analysis.txt',['CRYPTO DETECTIVE — FILE ANALYSIS',`Generated: ${new Date().toISOString()}`,`Mode: ${q('cxMode').value}`,`Selected by user: ${selected.label}`,`Ciphertext format: ${selected.cipherFormat}`,`Key format: ${selected.keyFormat}`,`Attempts: ${analysis.attempts}`,`Candidates: ${analysis.candidates.length}`,selected.reason,'Selection is not proof of the sender method or correct plaintext.',selected.notes,'','Selected output:',selected.output].join('\n'));});
        guide();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
