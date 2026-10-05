    const api = '/api';

    const pageInfo = {
        lab: {
            title: 'Crypto Laboratory',
            description:
                'Enkripsi dan dekripsi enam algoritma dalam satu workspace.'
        },

        crack: {
            title: 'Crack Analyzer',
            description:
                'Cryptanalysis tanpa secret key dengan hasil confidence dan recovered key.'
        },

        simulation: {
            title: 'Alice / Bob / Trudy',
            description:
                'Visualisasi komunikasi terenkripsi dan percobaan penyadapan oleh attacker.'
        },

        file: {
            title: 'File .txt Lab',
            description: 'Enkripsi dan dekripsi file teks dengan enam algoritma, lalu unduh hasilnya.'
        },
        benchmark: {
            title: 'Computational Load',
            description: 'Bandingkan waktu, memori, dan throughput dari pengukuran runtime Python aktual.'
        },
        history: {
            title: 'Operation History',
            description:
                'Audit operasi kriptografi yang tersimpan di database.'
        }
    };

    document
        .querySelectorAll('.nav-button')
        .forEach(button => {

            button.addEventListener(
                'click',
                () => {

                    document
                        .querySelectorAll(
                            '.nav-button'
                        )
                        .forEach(item => {
                            item.classList.remove('active');
                            item.removeAttribute('aria-current');
                        });

                    button.classList.add(
                        'active'
                    );

                    document
                        .querySelectorAll(
                            '.page'
                        )
                        .forEach(page =>
                            page.classList.remove(
                                'active'
                            )
                        );

                    button.setAttribute('aria-current', 'page');
                    const name = button.dataset.page;
                    document.body.dataset.activePage = name;

                    document
                        .getElementById(
                            'page-' + name
                        )
                        .classList.add(
                            'active'
                        );

                    document.getElementById(
                        'pageTitle'
                    ).textContent =
                        pageInfo[name].title;

                    document.getElementById(
                        'pageDescription'
                    ).textContent =
                        pageInfo[name].description;

                    if (name === 'history') {
                        loadHistory();
                    }
                }
            );

        });

    function parseKey(algorithm, value) {
        const key = value.trim();
        if (!key) return null;
        if (algorithm === 'caesar') return Number(key);
        // Preserve flexible Hill strings for the engine's existing validated parser.
        return key;
    }

    async function request(
        url,
        options = {}
    ) {
        const response = await fetch(
            url,
            {
                headers: {
                    'Accept':
                        'application/json',
                    'Content-Type':
                        'application/json',
                    ...(options.headers || {})
                },

                ...options
            }
        );

        const data =
            await response.json();

        if (
            !response.ok
            || data.success === false
        ) {
            throw new Error(
                data.message
                || data.detail
                || 'Request gagal.'
            );
        }

        return data;
    }

    async function checkHealth() {
        const dot =
            document.getElementById(
                'engineDot'
            );

        const text =
            document.getElementById(
                'engineText'
            );

        try {
            const result =
                await request(
                    api + '/crypto/health'
                );

            dot.className =
                'status-dot online';

            text.textContent =
                'Online · '
                + (
                    result.engine.version
                    || 'ready'
                );
        } catch {
            dot.className =
                'status-dot offline';

            text.textContent =
                'Engine offline';
        }
    }

    document
        .getElementById(
            'encryptButton'
        )
        .addEventListener(
            'click',
            async event => {

                const button =
                    event.currentTarget;

                const algorithm =
                    document.getElementById(
                        'encryptAlgorithm'
                    ).value;

                const plaintext =
                    document.getElementById(
                        'encryptPlaintext'
                    ).value;

                const key =
                    parseKey(
                        algorithm,
                        document.getElementById(
                            'encryptKey'
                        ).value
                    );

                button.classList.add(
                    'loading'
                );

                try {
                    const payload = {
                        plaintext,
                        algorithm
                    };

                    if (key !== null) {
                        payload.key = key;
                    }

                    const result =
                        await request(
                            api
                            + '/crypto/encrypt',
                            {
                                method: 'POST',
                                body:
                                    JSON.stringify(
                                        payload
                                    )
                            }
                        );

                    const data =
                        result.data;

                    document.getElementById(
                        'encryptResult'
                    ).textContent =
                        'Algorithm : '
                        + data.algorithm
                        + '\n\n'
                        + 'Ciphertext:\n'
                        + data.ciphertext
                        + '\n\n'
                        + 'Key:\n'
                        + JSON.stringify(
                            data.key
                        )
                        + '\n\n'
                        + 'Reason:\n'
                        + (
                            data.reason
                            || '-'
                        );

                } catch (error) {
                    document.getElementById(
                        'encryptResult'
                    ).textContent =
                        'ERROR\n'
                        + error.message;
                }

                button.classList.remove(
                    'loading'
                );
            }
        );

    document
        .getElementById(
            'decryptButton'
        )
        .addEventListener(
            'click',
            async event => {

                const button =
                    event.currentTarget;

                const algorithm =
                    document.getElementById(
                        'decryptAlgorithm'
                    ).value;

                let ciphertext =
                    document.getElementById(
                        'decryptCiphertext'
                    ).value;

                let key =
                    parseKey(
                        algorithm,
                        document.getElementById(
                            'decryptKey'
                        ).value
                    );

                button.classList.add(
                    'loading'
                );

                try {
                    if (algorithm === 'otp') {
                        window.CryptoOTPFormat.invalidateText();
                        const normalized = window.CryptoOTPFormat.normalize(ciphertext, key,
                            document.getElementById('otpTextCipherFormat').value,
                            document.getElementById('otpTextKeyFormat').value);
                        ciphertext = normalized.ciphertext;
                        key = normalized.key;
                    }
                    const result =
                        await request(
                            api
                            + '/crypto/decrypt',
                            {
                                method: 'POST',

                                body:
                                    JSON.stringify({
                                        algorithm,
                                        ciphertext,
                                        key
                                    })
                            }
                        );

                    document.getElementById(
                        'decryptResult'
                    ).textContent =
                        'Algorithm : '
                        + result.data.algorithm
                        + '\n\n'
                        + 'Plaintext:\n'
                        + result.data.plaintext;

                } catch (error) {
                    document.getElementById(
                        'decryptResult'
                    ).textContent =
                        'ERROR\n'
                        + (algorithm === 'otp' ? window.CryptoOTPFormat.error(error.message) : error.message);
                }

                button.classList.remove(
                    'loading'
                );
            }
        );

    document
        .getElementById(
            'crackButton'
        )
        .addEventListener(
            'click',
            async event => {

                const button =
                    event.currentTarget;

                const ciphertext =
                    document.getElementById(
                        'crackCiphertext'
                    ).value;

                button.classList.add(
                    'loading'
                );

                try {
                    const result =
                        await request(
                            api
                            + '/crypto/crack',
                            {
                                method: 'POST',

                                body:
                                    JSON.stringify({
                                        ciphertext
                                    })
                            }
                        );

                    const data =
                        result.data;

                    document.getElementById(
                        'crackResult'
                    ).textContent =
                        'Status     : '
                        + data.status
                        + '\n'
                        + 'Detected   : '
                        + (
                            data.detected_algorithm
                            || '-'
                        )
                        + '\n'
                        + 'Confidence : '
                        + data.confidence
                        + '\n'
                        + 'Key        : '
                        + JSON.stringify(
                            data.recovered_key
                        )
                        + '\n\n'
                        + 'Plaintext:\n'
                        + (
                            data.plaintext
                            || '-'
                        )
                        + '\n\n'
                        + 'Analysis:\n'
                        + data.message;

                } catch (error) {
                    document.getElementById(
                        'crackResult'
                    ).textContent =
                        'ERROR\n'
                        + error.message;
                }

                button.classList.remove(
                    'loading'
                );
            }
        );

    document
        .getElementById(
            'simulationButton'
        )
        .addEventListener(
            'click',
            async event => {

                const button =
                    event.currentTarget;

                const plaintext =
                    document.getElementById(
                        'simulationPlaintext'
                    ).value;

                const algorithm =
                    document.getElementById(
                        'simulationAlgorithm'
                    ).value;

                const key =
                    parseKey(
                        algorithm,
                        document.getElementById(
                            'simulationKey'
                        ).value
                    );

                button.classList.add(
                    'loading'
                );

                try {
                    const payload = {
                        plaintext,
                        algorithm
                    };

                    if (key !== null) {
                        payload.key = key;
                    }

                    const result =
                        await request(
                            api
                            + '/simulation/run',
                            {
                                method: 'POST',

                                body:
                                    JSON.stringify(
                                        payload
                                    )
                            }
                        );

                    renderSimulation(
                        result.data
                    );

                } catch (error) {
                    document.getElementById(
                        'simulationResult'
                    ).innerHTML =
                        '<div class="result">'
                        + 'ERROR\n'
                        + escapeHtml(
                            error.message
                        )
                        + '</div>';
                }

                button.classList.remove(
                    'loading'
                );
            }
        );

    function renderSimulation(data) {
        const trudyClass =
            data.trudy.status
            === 'compromised'
                ? 'danger'
                : (
                    data.trudy.status
                    === 'protected'
                        ? 'success'
                        : 'warning'
                );

        document.getElementById(
            'simulationResult'
        ).innerHTML = `

            <div class="actor">

                <h4>Alice</h4>

                <div class="actor-role">
                    Sender
                </div>

                <div class="actor-data">
                    <strong>Plaintext</strong><br>
                    ${escapeHtml(
                        data.alice.plaintext
                    )}
                    <br><br>

                    <strong>Algorithm</strong><br>
                    ${escapeHtml(
                        data.alice.algorithm
                    )}
                    <br><br>

                    <strong>Ciphertext</strong><br>
                    ${escapeHtml(
                        data.alice.ciphertext
                    )}
                </div>

            </div>

            <div class="actor">

                <h4>Bob</h4>

                <div class="actor-role">
                    Authorized Receiver
                </div>

                <div class="actor-data">
                    <strong>Has Secret Key</strong><br>
                    ${data.bob.has_secret_key}
                    <br><br>

                    <strong>Recovered Plaintext</strong><br>
                    ${escapeHtml(
                        data.bob.plaintext
                    )}
                    <br>

                    <span class="badge success">
                        ${escapeHtml(
                            data.bob.status
                        )}
                    </span>
                </div>

            </div>

            <div class="actor">

                <h4>Trudy</h4>

                <div class="actor-role">
                    Eavesdropper / Attacker
                </div>

                <div class="actor-data">
                    <strong>Has Secret Key</strong><br>
                    ${data.trudy.has_secret_key}
                    <br><br>

                    <strong>Detection</strong><br>
                    ${escapeHtml(
                        data.trudy.detected_algorithm
                        || '-'
                    )}
                    <br><br>

                    <strong>Recovered Plaintext</strong><br>
                    ${escapeHtml(
                        data.trudy.recovered_plaintext
                        || '-'
                    )}
                    <br>

                    <span class="badge ${trudyClass}">
                        ${escapeHtml(
                            data.trudy.status
                        )}
                    </span>
                </div>

            </div>
        `;
    }

    async function loadHistory() {
        const body =
            document.getElementById(
                'historyBody'
            );

        body.innerHTML =
            '<tr>'
            + '<td colspan="7" '
            + 'class="empty">'
            + 'Loading...'
            + '</td>'
            + '</tr>';

        try {
            const result =
                await request(
                    api
                    + '/crypto/history?limit=50'
                );

            if (!result.data.length) {
                body.innerHTML =
                    '<tr>'
                    + '<td colspan="7" '
                    + 'class="empty">'
                    + 'Belum ada history.'
                    + '</td>'
                    + '</tr>';

                return;
            }

            body.innerHTML =
                result.data
                    .map(item => `
                        <tr>
                            <td>
                                ${item.id}
                            </td>

                            <td>
                                ${escapeHtml(
                                    item.mode
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    item.algorithm
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    shorten(
                                        item.input_text
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    shorten(
                                        item.output_text
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    item.status
                                )}
                            </td>

                            <td>
                                ${
                                    item.confidence
                                    ?? '-'
                                }
                            </td>
                        </tr>
                    `)
                    .join('');

        } catch (error) {
            body.innerHTML =
                '<tr>'
                + '<td colspan="7" '
                + 'class="empty">'
                + escapeHtml(
                    error.message
                )
                + '</td>'
                + '</tr>';
        }
    }

    document
        .getElementById(
            'refreshHistory'
        )
        .addEventListener(
            'click',
            loadHistory
        );

    function shorten(
        value,
        length = 70
    ) {
        if (!value) {
            return '-';
        }

        return value.length > length
            ? value.slice(
                0,
                length
            ) + '...'
            : value;
    }

    function escapeHtml(value) {
        return String(
            value ?? ''
        )
            .replaceAll(
                '&',
                '&amp;'
            )
            .replaceAll(
                '<',
                '&lt;'
            )
            .replaceAll(
                '>',
                '&gt;'
            )
            .replaceAll(
                '"',
                '&quot;'
            )
            .replaceAll(
                "'",
                '&#039;'
            );
    }

    checkHealth();

