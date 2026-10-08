    const api = '/api';

    const pageInfo = {
        lab: {
            title: 'Laboratorium Kriptografi',
            description:
                'Enkripsi dan dekripsi pesan atau file, disertai pengukuran komputasi aktual.'
        },

        crack: {
            title: 'Crack Analyzer',
            description:
                'Cryptanalysis tanpa secret key dengan hasil confidence dan recovered key.'
        },

        history: {
            title: 'Riwayat Operasi',
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

