(() => {
    'use strict';

    const state = {
        encrypt: null,
        decrypt: null,
        crack: null,
    };

    /*
    |--------------------------------------------------------------------------
    | Extra UI Style
    |--------------------------------------------------------------------------
    */

    // Presentation styles live in css/crypto-components.css.


    /*
    |--------------------------------------------------------------------------
    | Capture API Results
    |--------------------------------------------------------------------------
    |
    | Kita tidak mengganti kode API lama.
    | Fetch dibungkus supaya hasil Encrypt / Decrypt / Crack
    | dapat dipakai tombol Copy / Download / Send to Decrypt.
    |
    */

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
        const target = args[0];
        const targetUrl = typeof target === 'string' ? target : target?.url ?? '';
        const actionGroups = {
            encrypt: ['cdCopyCiphertext', 'cdCopyEncryptKey', 'cdSendDecrypt', 'cdDownloadEncrypt'],
            decrypt: ['cdCopyPlaintext', 'cdDownloadDecrypt'],
            crack: ['cdCopyCrackPlain', 'cdCopyRecoveredKey', 'cdDownloadCrack'],
        };
        for (const mode of Object.keys(actionGroups)) {
            if (targetUrl.includes('/api/crypto/' + mode)) {
                state[mode] = null;
                for (const id of actionGroups[mode]) {
                    document.getElementById(id)?.parentElement?.classList.add('cd-v2-hidden');
                }
            }
        }
        const response = await originalFetch(...args);

        try {
            const requestTarget = args[0];

            const url =
                typeof requestTarget === 'string'
                    ? requestTarget
                    : requestTarget?.url ?? '';

            const clone = response.clone();

            const json = await clone.json();

            if (
                response.ok
                && json
                && json.success !== false
            ) {
                if (
                    url.includes(
                        '/api/crypto/encrypt'
                    )
                ) {
                    state.encrypt =
                        json.data ?? null;

                    updateEncryptActions();
                }

                if (
                    url.includes(
                        '/api/crypto/decrypt'
                    )
                ) {
                    state.decrypt =
                        json.data ?? null;

                    updateDecryptActions();
                }

                if (
                    url.includes(
                        '/api/crypto/crack'
                    )
                ) {
                    state.crack =
                        json.data ?? null;

                    updateCrackActions();
                }
            }
        } catch {
            /*
             * Response yang bukan JSON cukup diabaikan.
             * Fetch asli tetap dikembalikan ke aplikasi.
             */
        }

        return response;
    };

    /*
    |--------------------------------------------------------------------------
    | Key Guide
    |--------------------------------------------------------------------------
    */

    const keyGuides = {
        auto: {
            placeholder:
                'Kosong = generate otomatis',

            help:
                'Auto akan memilih algoritma yang sesuai dan membuat key otomatis bila diperlukan.',
        },

        caesar: {
            placeholder:
                'Contoh: 3',

            help:
                'Caesar menggunakan angka shift 1–25. Contoh key: 3.',
        },

        vigenere: {
            placeholder:
                'Contoh: KUNCI',

            help:
                'Vigenère menggunakan kata/kumpulan huruf A–Z. Contoh: KUNCI.',
        },

        playfair: {
            placeholder:
                'Contoh: KRIPTO',

            help:
                'Playfair menggunakan keyword alfabet. Huruf J akan diperlakukan sebagai I.',
        },

        hill: {
            placeholder:
                'Contoh: 3,3,2,5',

            help:
                'Hill 2×2 memakai 4 angka dan matriks harus invertible modulo 26. Contoh valid: 3,3,2,5 atau 7,8,19,3. Kosongkan key untuk membuat matriks valid secara acak.',
        },

        otp: {
            placeholder:
                'Disarankan kosong',

            help:
                'OTP: kosongkan key agar aplikasi membuat key acak sepanjang plaintext. Jangan gunakan ulang key OTP.',
        },

        stream: {
            placeholder:
                'Disarankan kosong',

            help:
                'Stream Cipher: kosongkan agar aplikasi membuat secret key otomatis.',
        },
    };

    function setupKeyGuide(
        selectId,
        inputId
    ) {
        const select =
            document.getElementById(
                selectId
            );

        const input =
            document.getElementById(
                inputId
            );

        if (
            !select
            || !input
        ) {
            return;
        }

        const helper =
            document.createElement(
                'div'
            );

        helper.className =
            'cd-v2-helper';

        input.insertAdjacentElement(
            'afterend',
            helper
        );

        const update = () => {
            const guide =
                keyGuides[
                    select.value
                ]
                ?? keyGuides.auto;

            input.placeholder = selectId === 'decryptAlgorithm'
                ? (select.value === 'otp' ? 'Key Base64 dari hasil encrypt' : 'Masukkan secret key hasil encrypt')
                : guide.placeholder;

            helper.textContent = (selectId === 'decryptAlgorithm'
                ? 'Decrypt membutuhkan key yang sama dengan saat encrypt. '
                : '') + guide.help.replace(selectId === 'decryptAlgorithm'
                    ? /Kosongkan key[^.]*\.|OTP: kosongkan key[^.]*\.|Stream Cipher: kosongkan[^.]*\./g
                    : /$^/g, '');
        };

        select.addEventListener(
            'change',
            update
        );

        update();
    }

    setupKeyGuide(
        'encryptAlgorithm',
        'encryptKey'
    );

    setupKeyGuide(
        'decryptAlgorithm',
        'decryptKey'
    );

    setupKeyGuide(
        'simulationAlgorithm',
        'simulationKey'
    );

    /*
    |--------------------------------------------------------------------------
    | TXT File Loader
    |--------------------------------------------------------------------------
    */

    function addTextFileLoader({
        textareaId,
        title = 'Load .txt',
    }) {
        const textarea =
            document.getElementById(
                textareaId
            );

        if (!textarea) {
            return;
        }

        const container =
            document.createElement(
                'div'
            );

        container.className =
            'cd-v2-file-row';

        const fileInput =
            document.createElement(
                'input'
            );

        fileInput.type =
            'file';

        fileInput.accept =
            '.txt,text/plain';

        fileInput.className =
            'cd-v2-hidden';

        const button =
            document.createElement(
                'button'
            );

        button.type =
            'button';

        button.className =
            'button secondary cd-v2-small';

        button.textContent =
            title;

        const fileName =
            document.createElement(
                'span'
            );

        fileName.className =
            'cd-v2-file-name';

        fileName.textContent =
            'Belum ada file.';

        container.append(
            fileInput,
            button,
            fileName
        );

        textarea.insertAdjacentElement(
            'afterend',
            container
        );

        button.addEventListener(
            'click',
            () => {
                fileInput.click();
            }
        );

        fileInput.addEventListener(
            'change',
            async () => {
                const file =
                    fileInput.files?.[0];

                if (!file) {
                    return;
                }

                const isTxt =
                    file.name
                        .toLowerCase()
                        .endsWith(
                            '.txt'
                        )
                    || file.type
                        === 'text/plain';

                if (!isTxt) {
                    alert(
                        'File harus berformat .txt'
                    );

                    fileInput.value =
                        '';

                    return;
                }

                /*
                 * GUI dibatasi 1 MB.
                 * API sendiri tetap punya validasi
                 * panjang input.
                 */
                const maxSize =
                    1024 * 1024;

                if (
                    file.size
                    > maxSize
                ) {
                    alert(
                        'File terlalu besar. Maksimum 1 MB.'
                    );

                    fileInput.value =
                        '';

                    return;
                }

                try {
                    let text =
                        await file.text();

                    /*
                     * Hilangkan UTF-8 BOM
                     * jika file memilikinya.
                     */
                    text =
                        text.replace(
                            /^\uFEFF/,
                            ''
                        );

                    if (text.length > 20000) {
                        alert('Teks melebihi 20.000 karakter. Gunakan halaman File .txt Lab untuk file lebih besar.');
                        fileInput.value = '';
                        return;
                    }
                    textarea.value = text;

                    fileName.textContent =
                        file.name
                        + ' · '
                        + formatBytes(
                            file.size
                        );
                } catch (error) {
                    alert(
                        'Gagal membaca file: '
                        + error.message
                    );
                }
            }
        );
    }

    addTextFileLoader({
        textareaId:
            'encryptPlaintext',

        title:
            'Load Plaintext .txt',
    });

    addTextFileLoader({
        textareaId:
            'decryptCiphertext',

        title:
            'Load Ciphertext .txt',
    });

    addTextFileLoader({
        textareaId:
            'crackCiphertext',

        title:
            'Load Ciphertext .txt',
    });

    /*
     * Sekalian Alice bisa membaca pesan
     * dari file teks.
     */
    addTextFileLoader({
        textareaId:
            'simulationPlaintext',

        title:
            'Load Alice Message .txt',
    });

    /*
    |--------------------------------------------------------------------------
    | Encrypt Result Actions
    |--------------------------------------------------------------------------
    */

    const encryptResult =
        document.getElementById(
            'encryptResult'
        );

    const encryptActions =
        createActionRow(
            encryptResult,
            [
                {
                    id:
                        'cdCopyCiphertext',

                    text:
                        'Copy Ciphertext',

                    action:
                        copyEncryptCiphertext,
                },

                {
                    id:
                        'cdCopyEncryptKey',

                    text:
                        'Copy Key',

                    action:
                        copyEncryptKey,
                },

                {
                    id:
                        'cdSendDecrypt',

                    text:
                        'Send to Decrypt',

                    primary:
                        true,

                    action:
                        sendEncryptToDecrypt,
                },

                {
                    id:
                        'cdDownloadEncrypt',

                    text:
                        'Download .txt',

                    ghost:
                        true,

                    action:
                        downloadEncrypt,
                },
            ]
        );

    encryptActions?.classList.add(
        'cd-v2-hidden'
    );

    /*
    |--------------------------------------------------------------------------
    | Decrypt Result Actions
    |--------------------------------------------------------------------------
    */

    const decryptResult =
        document.getElementById(
            'decryptResult'
        );

    const decryptActions =
        createActionRow(
            decryptResult,
            [
                {
                    id:
                        'cdCopyPlaintext',

                    text:
                        'Copy Plaintext',

                    action:
                        copyDecryptPlaintext,
                },

                {
                    id:
                        'cdDownloadDecrypt',

                    text:
                        'Download .txt',

                    ghost:
                        true,

                    action:
                        downloadDecrypt,
                },
            ]
        );

    decryptActions?.classList.add(
        'cd-v2-hidden'
    );

    /*
    |--------------------------------------------------------------------------
    | Crack Result Actions
    |--------------------------------------------------------------------------
    */

    const crackResult =
        document.getElementById(
            'crackResult'
        );

    const crackActions =
        createActionRow(
            crackResult,
            [
                {
                    id:
                        'cdCopyCrackPlain',

                    text:
                        'Copy Plaintext',

                    action:
                        copyCrackPlaintext,
                },

                {
                    id:
                        'cdCopyRecoveredKey',

                    text:
                        'Copy Recovered Key',

                    action:
                        copyRecoveredKey,
                },

                {
                    id:
                        'cdDownloadCrack',

                    text:
                        'Download Analysis',

                    ghost:
                        true,

                    action:
                        downloadCrack,
                },
            ]
        );

    crackActions?.classList.add(
        'cd-v2-hidden'
    );

    function createActionRow(
        resultElement,
        actions
    ) {
        if (!resultElement) {
            return null;
        }

        const row =
            document.createElement(
                'div'
            );

        row.className =
            'cd-v2-action-row';

        actions.forEach(
            config => {
                const button =
                    document.createElement(
                        'button'
                    );

                button.type =
                    'button';

                button.id =
                    config.id;

                button.textContent =
                    config.text;

                button.className =
                    'button secondary cd-v2-small';

                if (
                    config.primary
                ) {
                    button.className =
                        'button blue cd-v2-small';
                }

                if (
                    config.ghost
                ) {
                    button.className =
                        'button cd-v2-small cd-v2-ghost';
                }

                button.addEventListener(
                    'click',
                    config.action
                );

                row.appendChild(
                    button
                );
            }
        );

        resultElement
            .insertAdjacentElement(
                'afterend',
                row
            );

        return row;
    }

    /*
    |--------------------------------------------------------------------------
    | Update Actions
    |--------------------------------------------------------------------------
    */

    function updateEncryptActions() {
        if (
            !state.encrypt
            || !encryptActions
        ) {
            return;
        }

        encryptActions.classList.remove(
            'cd-v2-hidden'
        );
    }

    function updateDecryptActions() {
        if (
            !state.decrypt
            || !decryptActions
        ) {
            return;
        }

        decryptActions.classList.remove(
            'cd-v2-hidden'
        );
    }

    function updateCrackActions() {
        if (
            !state.crack
            || !crackActions
        ) {
            return;
        }

        crackActions.classList.remove(
            'cd-v2-hidden'
        );

        const copyPlain =
            document.getElementById(
                'cdCopyCrackPlain'
            );

        const copyKey =
            document.getElementById(
                'cdCopyRecoveredKey'
            );

        if (copyPlain) {
            copyPlain.disabled =
                !state.crack.plaintext;
        }

        if (copyKey) {
            copyKey.disabled =
                state.crack.recovered_key
                    === null
                || state.crack.recovered_key
                    === undefined;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Encrypt Actions
    |--------------------------------------------------------------------------
    */

    async function copyEncryptCiphertext() {
        if (!state.encrypt) {
            return;
        }

        await copyText(
            state.encrypt.ciphertext
        );

        buttonFeedback(
            'cdCopyCiphertext'
        );
    }

    async function copyEncryptKey() {
        if (!state.encrypt) {
            return;
        }

        await copyText(
            formatKey(
                state.encrypt.key
            )
        );

        buttonFeedback(
            'cdCopyEncryptKey'
        );
    }

    function sendEncryptToDecrypt() {
        if (!state.encrypt) {
            return;
        }

        const cipherInput =
            document.getElementById(
                'decryptCiphertext'
            );

        const algorithmInput =
            document.getElementById(
                'decryptAlgorithm'
            );

        const keyInput =
            document.getElementById(
                'decryptKey'
            );

        if (
            !cipherInput
            || !algorithmInput
            || !keyInput
        ) {
            return;
        }

        cipherInput.value =
            state.encrypt.ciphertext;

        algorithmInput.value =
            state.encrypt.algorithm;

        keyInput.value =
            formatKey(
                state.encrypt.key
            );

        if (window.CryptoOTPFormat) window.CryptoOTPFormat.reset('otpText');
        algorithmInput.dispatchEvent(
            new Event(
                'change'
            )
        );

        /*
         * Scroll ke panel Decrypt.
         */
        cipherInput.scrollIntoView({
            behavior:
                'smooth',

            block:
                'center',
        });

        cipherInput.focus();
    }

    function downloadEncrypt() {
        if (!state.encrypt) {
            return;
        }

        const text = [
            'CRYPTO DETECTIVE',
            'ENCRYPT RESULT',
            '==============================',
            '',
            'Algorithm: '
                + state.encrypt.algorithm,
            '',
            'Secret Key:',
            formatKey(
                state.encrypt.key
            ),
            '',
            'Ciphertext:',
            state.encrypt.ciphertext,
            '',
            'Normalized Plaintext:',
            state.encrypt
                .normalized_plaintext
                ?? '-',
            '',
            'Reason:',
            state.encrypt.reason
                ?? '-',
        ].join('\n');

        downloadText(
            'crypto-detective-encrypt-'
            + state.encrypt.algorithm
            + '.txt',
            text
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Decrypt Actions
    |--------------------------------------------------------------------------
    */

    async function copyDecryptPlaintext() {
        if (!state.decrypt) {
            return;
        }

        await copyText(
            state.decrypt.plaintext
        );

        buttonFeedback(
            'cdCopyPlaintext'
        );
    }

    function downloadDecrypt() {
        if (!state.decrypt) {
            return;
        }

        const text = [
            'CRYPTO DETECTIVE',
            'DECRYPT RESULT',
            '==============================',
            '',
            'Algorithm: '
                + state.decrypt.algorithm,
            '',
            'Plaintext:',
            state.decrypt.plaintext,
        ].join('\n');

        downloadText(
            'crypto-detective-decrypt-'
            + state.decrypt.algorithm
            + '.txt',
            text
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Crack Actions
    |--------------------------------------------------------------------------
    */

    async function copyCrackPlaintext() {
        if (
            !state.crack
            || !state.crack.plaintext
        ) {
            return;
        }

        await copyText(
            state.crack.plaintext
        );

        buttonFeedback(
            'cdCopyCrackPlain'
        );
    }

    async function copyRecoveredKey() {
        if (
            !state.crack
            || state.crack.recovered_key
                === null
            || state.crack.recovered_key
                === undefined
        ) {
            return;
        }

        await copyText(
            formatKey(
                state.crack
                    .recovered_key
            )
        );

        buttonFeedback(
            'cdCopyRecoveredKey'
        );
    }

    function downloadCrack() {
        if (!state.crack) {
            return;
        }

        const candidates =
            Array.isArray(
                state.crack.candidates
            )
                ? state.crack
                    .candidates
                    .map(
                        (
                            candidate,
                            index
                        ) => {
                            return [
                                '',
                                'Candidate '
                                    + (
                                        index
                                        + 1
                                    ),
                                'Algorithm: '
                                    + (
                                        candidate
                                            .algorithm
                                        ?? '-'
                                    ),
                                'Status: '
                                    + (
                                        candidate
                                            .status
                                        ?? '-'
                                    ),
                                'Confidence: '
                                    + (
                                        candidate
                                            .confidence
                                        ?? '-'
                                    ),
                                'Recovered Key: '
                                    + formatKey(
                                        candidate
                                            .recovered_key
                                    ),
                                'Plaintext: '
                                    + (
                                        candidate
                                            .plaintext
                                        ?? '-'
                                    ),
                            ].join(
                                '\n'
                            );
                        }
                    )
                    .join('\n')
                : '';

        const text = [
            'CRYPTO DETECTIVE',
            'CRACK ANALYSIS',
            '==============================',
            '',
            'Status: '
                + (
                    state.crack.status
                    ?? '-'
                ),
            'Detected Algorithm: '
                + (
                    state.crack
                        .detected_algorithm
                    ?? '-'
                ),
            'Confidence: '
                + (
                    state.crack.confidence
                    ?? '-'
                ),
            'Recovered Key: '
                + formatKey(
                    state.crack
                        .recovered_key
                ),
            '',
            'Recovered Plaintext:',
            state.crack.plaintext
                ?? '-',
            '',
            'Analysis:',
            state.crack.message
                ?? '-',
            '',
            'Candidates:',
            candidates
                || 'Tidak ada kandidat.',
        ].join('\n');

        downloadText(
            'crypto-detective-crack-analysis.txt',
            text
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Clipboard
    |--------------------------------------------------------------------------
    */

    async function copyText(value) {
        const text =
            String(
                value ?? ''
            );

        /*
         * localhost/.test HTTP kadang
         * tidak mendapat Secure Context
         * untuk Clipboard API.
         *
         * Karena itu ada fallback.
         */
        if (
            navigator.clipboard
            && window.isSecureContext
        ) {
            await navigator
                .clipboard
                .writeText(
                    text
                );

            return;
        }

        const temp =
            document.createElement(
                'textarea'
            );

        temp.value =
            text;

        temp.style.position =
            'fixed';

        temp.style.opacity =
            '0';

        document.body
            .appendChild(
                temp
            );

        temp.focus();
        temp.select();

        document.execCommand(
            'copy'
        );

        temp.remove();
    }

    function buttonFeedback(id) {
        const button =
            document.getElementById(
                id
            );

        if (!button) {
            return;
        }

        const original =
            button.textContent;

        button.textContent =
            'Copied!';

        button.classList.add(
            'cd-v2-success'
        );

        setTimeout(
            () => {
                button.textContent =
                    original;

                button.classList.remove(
                    'cd-v2-success'
                );
            },
            1100
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Download
    |--------------------------------------------------------------------------
    */

    function downloadText(
        filename,
        content
    ) {
        const blob =
            new Blob(
                [content],
                {
                    type:
                        'text/plain;charset=utf-8',
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const anchor =
            document.createElement(
                'a'
            );

        anchor.href =
            url;

        anchor.download =
            filename;

        document.body
            .appendChild(
                anchor
            );

        anchor.click();
        anchor.remove();

        URL.revokeObjectURL(
            url
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Utilities
    |--------------------------------------------------------------------------
    */

    function formatKey(value) {
        if (
            value === null
            || value === undefined
            || value === ''
        ) {
            return '-';
        }

        if (
            Array.isArray(value)
            || typeof value
                === 'object'
        ) {
            return JSON.stringify(
                value
            );
        }

        return String(
            value
        );
    }

    function formatBytes(bytes) {
        if (bytes < 1024) {
            return (
                bytes
                + ' B'
            );
        }

        if (
            bytes
            < 1024 * 1024
        ) {
            return (
                (
                    bytes
                    / 1024
                ).toFixed(1)
                + ' KB'
            );
        }

        return (
            (
                bytes
                / (
                    1024
                    * 1024
                )
            ).toFixed(1)
            + ' MB'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Ready
    |--------------------------------------------------------------------------
    */

    console.log(
        '[Crypto Detective] GUI Enhancement v2 loaded.'
    );
})();