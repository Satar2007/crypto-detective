/* OTP interoperability at the UI boundary. Python cipher and API stay unchanged. */
(() => {
    'use strict';
    const q = id => document.getElementById(id);
    const compact = value => String(value ?? '').replace(/[\s\uFEFF]+/gu, '');

    function decode(value, format, label) {
        let text = compact(value);
        if (!text) throw new Error(`${label} tidak boleh kosong.`);
        if (format === 'hex') {
            text = text.replace(/^0x/i, '');
            if (!/^[0-9a-f]+$/i.test(text) || text.length % 2) {
                throw new Error(`${label}: Hex harus berisi pasangan digit 0–9 / A–F, tanpa karakter lain.`);
            }
            let binary = '';
            for (let i = 0; i < text.length; i += 2) binary += String.fromCharCode(parseInt(text.slice(i, i + 2), 16));
            return binary;
        }
        if (format !== 'base64') throw new Error('Format OTP tidak dikenal.');
        text = text.replace(/-/g, '+').replace(/_/g, '/');
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(text) || text.replace(/=+$/, '').length % 4 === 1
            || (text.includes('=') && text.length % 4 !== 0)) {
            throw new Error(`${label}: Base64 tidak valid. Jika pengirim memakai Hex, pilih format Hex.`);
        }
        text += '='.repeat((4 - text.length % 4) % 4);
        try { return atob(text); }
        catch { throw new Error(`${label}: Base64 tidak valid.`); }
    }

    function normalize(ciphertext, key, cipherFormat = 'base64', keyFormat = 'base64') {
        const cipher = decode(ciphertext, cipherFormat, 'Ciphertext');
        const secret = decode(key, keyFormat, 'Key');
        if (cipher.length !== secret.length) {
            throw new Error(`Panjang byte OTP berbeda: ciphertext ${cipher.length} B, key ${secret.length} B. Periksa key dan pilihan format keduanya.`);
        }
        return { ciphertext: btoa(cipher), key: btoa(secret) };
    }

    function error(message) {
        if (/utf-8|invalid start byte|invalid continuation byte|unexpected end of data/i.test(message || '')) {
            return 'Hasil OTP bukan teks UTF-8 yang valid. Periksa format ciphertext dan key (Hex atau Base64), pastikan key berasal dari pesan yang sama, dan tanyakan encoding teks kepada pengirim.';
        }
        return message || 'Decrypt OTP gagal.';
    }
    function reset(prefix) {
        for (const suffix of ['CipherFormat', 'KeyFormat']) if (q(prefix + suffix)) q(prefix + suffix).value = 'base64';
    }
    function invalidateText() {
        if (q('decryptResult')) q('decryptResult').textContent = 'Belum ada hasil.';
        for (const id of ['cdCopyPlaintext', 'cdDownloadDecrypt']) if (q(id)) q(id).disabled = true;
    }
    window.CryptoOTPFormat = Object.freeze({ normalize, decode, error, reset, invalidateText });

    function setup(prefix, algorithmId, keyId, buttonId, modeId) {
        const group = q(prefix + 'Formats');
        if (!group) return;
        const update = () => {
            group.hidden = q(algorithmId).value !== 'otp' || (modeId && q(modeId).value !== 'decrypt');
        };
        q(algorithmId).addEventListener('change', update);
        if (modeId) q(modeId).addEventListener('change', update);
        const invalidate = () => {
            if (prefix === 'otpText') {
                q('decryptResult').textContent = 'Belum ada hasil.';
                for (const id of ['cdCopyPlaintext', 'cdDownloadDecrypt']) if (q(id)) q(id).disabled = true;
            }
        };
        for (const suffix of ['CipherFormat', 'KeyFormat']) q(prefix + suffix).addEventListener('change', invalidate);
        update();
    }
    function setupUpload(prefix, algorithmId, keyId, buttonId) {
        const upload = q(prefix + 'KeyUpload');
        upload.addEventListener('change', async () => {
            const status = q(prefix + 'UploadStatus');
            const file = upload.files?.[0];
            status.textContent = '';
            if (!file) return;
            if (!file.name.toLowerCase().endsWith('.txt') || file.size > 2 * 1024 * 1024) {
                status.textContent = 'Key harus file .txt UTF-8, maksimum 2 MB.'; upload.value = ''; return;
            }
            upload.disabled = true; q(buttonId).disabled = true;
            try {
                const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
                if (!compact(text)) throw new Error('File key kosong.');
                q(keyId).value = text.trim();
                q(keyId).dispatchEvent(new Event('input', { bubbles: true }));
                if (prefix === 'otpText') invalidateText();
                if (prefix === 'labEncrypt') {
                    q('encryptResult').textContent = 'Belum ada hasil.';
                    for (const id of ['cdCopyCiphertext', 'cdCopyEncryptKey', 'cdSendDecrypt', 'cdDownloadEncrypt']) if (q(id)) q(id).disabled = true;
                }
                status.textContent = `Key dimuat dari ${file.name}.` + (q(algorithmId).value === 'otp' && prefix !== 'labEncrypt' ? ' Pilih format key sesuai pengirim.' : '');
            } catch (failure) { status.textContent = failure.message || 'File key gagal dibaca.'; }
            finally { upload.disabled = false; q(buttonId).disabled = false; upload.value = ''; }
        });
    }
    function init() {
        setupUpload('labEncrypt', 'encryptAlgorithm', 'encryptKey', 'encryptButton');
        setupUpload('otpText', 'decryptAlgorithm', 'decryptKey', 'decryptButton');
        setupUpload('otpFile', 'cdFileAlgorithm', 'cdFileKey', 'cdRunFile');
        setup('otpText', 'decryptAlgorithm', 'decryptKey', 'decryptButton');
        setup('otpFile', 'cdFileAlgorithm', 'cdFileKey', 'cdRunFile', 'cdFileMode');
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
