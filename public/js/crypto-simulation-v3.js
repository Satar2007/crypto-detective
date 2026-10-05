(() => {
    'use strict';

    /*
    |--------------------------------------------------------------------------
    | Crypto Detective - Simulation Visual V3
    |--------------------------------------------------------------------------
    |
    | Tidak mengubah backend.
    |
    | File ini:
    | - menangkap response /api/simulation/run
    | - mengganti tampilan hasil lama
    | - membuat visual Alice -> Channel -> Bob
    | - memperlihatkan Trudy menyadap channel
    | - menampilkan PROTECTED / COMPROMISED
    | - copy + download report
    |
    */

    const previousFetch =
        window.fetch.bind(window);

    let latestSimulation = null;

    /*
    |--------------------------------------------------------------------------
    | Style
    |--------------------------------------------------------------------------
    */

    // Presentation styles live in css/crypto-components.css.


    /*
    |--------------------------------------------------------------------------
    | Intercept Simulation API
    |--------------------------------------------------------------------------
    */

    window.fetch = async (...args) => {

        const response =
            await previousFetch(...args);

        try {

            const target =
                args[0];

            const url =
                typeof target === 'string'
                    ? target
                    : target?.url ?? '';

            if (
                url.includes(
                    '/api/simulation/run'
                )
            ) {

                const clone =
                    response.clone();

                const json =
                    await clone.json();

                if (
                    response.ok
                    && json
                    && json.success
                    && json.data
                ) {

                    latestSimulation =
                        json;

                    /*
                     * Original GUI akan render
                     * setelah fetch selesai.
                     *
                     * Timeout 0 memastikan V3
                     * menggantinya setelah render lama.
                     */
                    setTimeout(
                        () => {
                            renderSimulationV3(
                                json
                            );
                        },
                        350
                    );
                }
            }

        } catch (error) {

            console.warn(
                '[Crypto Detective V3] '
                + 'Simulation capture failed:',
                error
            );
        }

        return response;
    };

    /*
    |--------------------------------------------------------------------------
    | Renderer
    |--------------------------------------------------------------------------
    */

    function renderSimulationV3(
        response
    ) {

        const root =
            document.getElementById(
                'simulationResult'
            );

        if (
            !root
            || !response?.data
        ) {
            return;
        }

        const data =
            response.data;

        const alice =
            data.alice ?? {};

        const bob =
            data.bob ?? {};

        const trudy =
            data.trudy ?? {};

        const trudyStatus =
            String(
                trudy.status
                ?? 'unknown'
            ).toLowerCase();

        const statusClass =
            getStatusClass(
                trudyStatus
            );

        const bobKey =
            formatKey(
                bob.key
            );

        const confidence = Number(trudy.confidence ?? 0).toFixed(2);

        const recoveredKey =
            formatKey(
                trudy.recovered_key
            );

        root.classList.add(
            'cd-sim-v3'
        );

        root.innerHTML = `

            <div class="cd-sim-shell">

                <div class="cd-sim-head">

                    <div class="cd-sim-head-left">

                        <div class="cd-sim-eyebrow">
                            Secure Communication Simulation
                        </div>

                        <div class="cd-sim-title">
                            Alice &rarr; Encrypted Channel &rarr; Bob &middot; Trudy Eavesdropping
                        </div>

                    </div>

                    <div class="cd-sim-id">
                        Simulation #${escapeHtml(
                            response.simulation_id
                            ?? '-'
                        )}
                    </div>

                </div>

                <div class="cd-network">

                    <!-- ALICE -->

                    <div
                        class="
                            cd-node
                            cd-node-alice
                            cd-alice
                        "
                    >

                        <div class="cd-person">

                            <div class="cd-avatar alice">
                                A
                            </div>

                            <div>

                                <div class="cd-name">
                                    Alice
                                </div>

                                <div class="cd-role">
                                    Sender
                                </div>

                            </div>

                        </div>

                        <div class="cd-data">

                            <div class="cd-data-item">

                                <div class="cd-label">
                                    Original Plaintext
                                </div>

                                <div class="cd-value">
                                    ${escapeHtml(
                                        alice.plaintext
                                        ?? '-'
                                    )}
                                </div>

                            </div>

                            <div class="cd-data-item">

                                <div class="cd-label">
                                    Algorithm
                                </div>

                                <div class="cd-value">
                                    ${escapeHtml(
                                        alice.algorithm
                                        ?? '-'
                                    )}
                                </div>

                            </div>

                            <div class="cd-data-item">

                                <div class="cd-label">
                                    Action
                                </div>

                                <div class="cd-value">
                                    Encrypt message
                                    before transmission
                                </div>

                            </div>

                        </div>

                    </div>

                    <!-- ARROW -->

                    <div
                        class="
                            cd-arrow-wrap
                            cd-arrow-one
                        "
                    >

                        <div class="cd-arrow-caption">
                            Encrypt
                        </div>

                        <div class="cd-arrow">

                            <div class="cd-arrow-line"></div>

                            <div class="cd-arrow-tip">
                                &gt;
                            </div>

                        </div>

                    </div>

                    <!-- CHANNEL -->

                    <div
                        class="
                            cd-channel
                            cd-channel-box
                        "
                    >

                        <div class="cd-channel-title">
                            Encrypted Channel
                        </div>

                        <div class="cd-lock">
                            ENC
                        </div>

                        <div class="cd-label">
                            Ciphertext on network
                        </div>

                        <div class="cd-cipher">
                            ${escapeHtml(
                                alice.ciphertext
                                ?? '-'
                            )}
                        </div>

                        <div class="cd-key-safe">
                            Secret key is NOT transmitted
                            through this channel
                        </div>

                    </div>

                    <!-- ARROW -->

                    <div
                        class="
                            cd-arrow-wrap
                            cd-arrow-two
                        "
                    >

                        <div class="cd-arrow-caption">
                            Receive
                        </div>

                        <div class="cd-arrow">

                            <div class="cd-arrow-line"></div>

                            <div class="cd-arrow-tip">
                                &gt;
                            </div>

                        </div>

                    </div>

                    <!-- BOB -->

                    <div
                        class="
                            cd-node
                            cd-node-bob
                            cd-bob
                        "
                    >

                        <div class="cd-person">

                            <div class="cd-avatar bob">
                                B
                            </div>

                            <div>

                                <div class="cd-name">
                                    Bob
                                </div>

                                <div class="cd-role">
                                    Authorized Receiver
                                </div>

                            </div>

                        </div>

                        <div class="cd-data">

                            <div class="cd-data-item">

                                <div class="cd-label">
                                    Has Secret Key
                                </div>

                                <div class="cd-value">
                                    ${bob.has_secret_key
                                        ? 'YES'
                                        : 'NO'}
                                </div>

                            </div>

                            <div class="cd-data-item">

                                <div class="cd-label">
                                    Secret Key
                                </div>

                                <div class="cd-value mono">
                                    ${escapeHtml(
                                        bobKey
                                    )}
                                </div>

                            </div>

                            <div class="cd-data-item">

                                <div class="cd-label">
                                    Recovered Plaintext
                                </div>

                                <div class="cd-value">
                                    ${escapeHtml(
                                        bob.plaintext
                                        ?? '-'
                                    )}
                                </div>

                            </div>

                            <div>

                                <span class="cd-status success">
                                    Decrypt
                                    ${escapeHtml(
                                        bob.status
                                        ?? 'success'
                                    )}
                                </span>

                            </div>

                        </div>

                    </div>

                    <!-- TAP -->

                    <div class="cd-tap">

                        <div class="cd-tap-line"></div>

                        <div class="cd-tap-label">
                            Passive interception
                        </div>

                    </div>

                    <!-- TRUDY -->

                    <div
                        class="
                            cd-node
                            cd-node-trudy
                            cd-trudy
                            ${statusClass}
                        "
                    >

                        <div class="cd-person">

                            <div class="cd-avatar trudy">
                                T
                            </div>

                            <div>

                                <div class="cd-name">
                                    Trudy
                                </div>

                                <div class="cd-role">
                                    Eavesdropper / Attacker
                                </div>

                            </div>

                        </div>

                        <div class="cd-data">

                            <div class="cd-data-item">

                                <div class="cd-label">
                                    Has Secret Key
                                </div>

                                <div class="cd-value">
                                    ${trudy.has_secret_key
                                        ? 'YES'
                                        : 'NO'}
                                </div>

                            </div>

                            <div class="cd-data-item">

                                <div class="cd-label">
                                    Known Algorithm
                                </div>

                                <div class="cd-value">
                                    ${escapeHtml(
                                        trudy.detected_algorithm
                                        ?? alice.algorithm
                                        ?? '-'
                                    )}
                                </div>

                            </div>

                            <div class="cd-data-item">

                                <div class="cd-label">
                                    Attack Result
                                </div>

                                <div>

                                    <span
                                        class="
                                            cd-status
                                            ${statusClass}
                                        "
                                    >
                                        ${escapeHtml(
                                            trudyStatus
                                        )}
                                    </span>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

                <!-- STATS -->

                <div class="cd-attack-summary">

                    <div class="cd-stat">

                        <div class="cd-stat-label">
                            Algorithm
                        </div>

                        <div class="cd-stat-value">
                            ${escapeHtml(
                                alice.algorithm
                                ?? '-'
                            )}
                        </div>

                    </div>

                    <div class="cd-stat">

                        <div class="cd-stat-label">
                            Attack Confidence
                        </div>

                        <div class="cd-stat-value">
                            ${escapeHtml(
                                confidence
                            )}%
                        </div>

                    </div>

                    <div class="cd-stat">

                        <div class="cd-stat-label">
                            Recovered Key
                        </div>

                        <div class="cd-stat-value">
                            ${escapeHtml(
                                recoveredKey
                            )}
                        </div>

                    </div>

                    <div class="cd-stat">

                        <div class="cd-stat-label">
                            Trudy Plaintext
                        </div>

                        <div class="cd-stat-value">
                            ${escapeHtml(
                                shorten(
                                    trudy
                                        .recovered_plaintext
                                    ?? '-',
                                    85
                                )
                            )}
                        </div>

                    </div>

                </div>

                <!-- VERDICT -->

                <div
                    class="
                        cd-verdict
                        ${statusClass}
                    "
                >
                    ${buildVerdict(
                        trudyStatus,
                        alice.algorithm,
                        trudy
                    )}
                </div>

                <!-- ACTIONS -->

                <div class="cd-sim-actions">

                    <button
                        type="button"
                        class="cd-sim-button"
                        id="cdSimCopyCipher"
                    >
                        Copy Ciphertext
                    </button>

                    <button
                        type="button"
                        class="cd-sim-button"
                        id="cdSimCopyBob"
                    >
                        Copy Bob Plaintext
                    </button>

                    ${
                        trudy.recovered_plaintext

                        ? `
                            <button
                                type="button"
                                class="cd-sim-button"
                                id="cdSimCopyTrudy"
                            >
                                Copy Trudy Result
                            </button>
                        `

                        : ''
                    }

                    <button
                        type="button"
                        class="
                            cd-sim-button
                            primary
                        "
                        id="cdSimDownload"
                    >
                        Download Simulation Report
                    </button>

                </div>

            </div>
        `;

        bindActions(
            response
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Status / Verdict
    |--------------------------------------------------------------------------
    */

    function getStatusClass(
        status
    ) {

        if (
            status === 'compromised'
        ) {
            return 'compromised';
        }

        if (
            status === 'protected'
        ) {
            return 'protected';
        }

        return 'warning';
    }

    function buildVerdict(
        status,
        algorithm,
        trudy
    ) {

        const name =
            String(
                algorithm ?? ''
            ).toUpperCase();

        if (
            status === 'compromised'
        ) {

            return `
                <strong>
                    Communication compromised.
                </strong>

                Trudy was not given the secret key,
                but cryptanalysis recovered the
                plaintext

                ${
                    trudy.recovered_key
                        !== null
                    && trudy.recovered_key
                        !== undefined

                    ? ' and recovered key '

                        + '<strong>'
                        + escapeHtml(
                            formatKey(
                                trudy.recovered_key
                            )
                        )
                        + '</strong>'

                    : ''
                }.

                This demonstrates that encryption
                alone does not guarantee security
                when the selected cipher is
                vulnerable to practical analysis.
            `;
        }

        if (
            status === 'protected'
        ) {

            return `
                <strong>
                    Communication protected
                    in this simulation.
                </strong>

                Trudy intercepted the ciphertext
                and knew the algorithm
                (${escapeHtml(name)}),
                but was not given the secret key
                and could not reliably recover
                the original plaintext.
            `;
        }

        return `
            <strong>
                Attack result is inconclusive.
            </strong>

            Trudy produced an analysis candidate,
            but the result is not considered
            a confirmed plaintext recovery.
        `;
    }

    /*
    |--------------------------------------------------------------------------
    | Actions
    |--------------------------------------------------------------------------
    */

    function bindActions(
        response
    ) {

        const data =
            response.data;

        const alice =
            data.alice ?? {};

        const bob =
            data.bob ?? {};

        const trudy =
            data.trudy ?? {};

        const copyCipher =
            document.getElementById(
                'cdSimCopyCipher'
            );

        const copyBob =
            document.getElementById(
                'cdSimCopyBob'
            );

        const copyTrudy =
            document.getElementById(
                'cdSimCopyTrudy'
            );

        const download =
            document.getElementById(
                'cdSimDownload'
            );

        copyCipher?.addEventListener(
            'click',
            async () => {

                await copyText(
                    alice.ciphertext
                    ?? ''
                );

                buttonFeedback(
                    copyCipher
                );
            }
        );

        copyBob?.addEventListener(
            'click',
            async () => {

                await copyText(
                    bob.plaintext
                    ?? ''
                );

                buttonFeedback(
                    copyBob
                );
            }
        );

        copyTrudy?.addEventListener(
            'click',
            async () => {

                await copyText(
                    trudy
                        .recovered_plaintext
                    ?? ''
                );

                buttonFeedback(
                    copyTrudy
                );
            }
        );

        download?.addEventListener(
            'click',
            () => {

                downloadSimulation(
                    response
                );
            }
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Report
    |--------------------------------------------------------------------------
    */

    function downloadSimulation(
        response
    ) {

        const data =
            response.data;

        const alice =
            data.alice ?? {};

        const bob =
            data.bob ?? {};

        const trudy =
            data.trudy ?? {};

        const text = [

            'CRYPTO DETECTIVE',
            'ALICE - BOB - TRUDY SIMULATION',
            '========================================',
            '',

            'Simulation ID:',
            response.simulation_id
                ?? '-',
            '',

            'ALGORITHM',
            alice.algorithm
                ?? '-',
            '',

            '----------------------------------------',
            'ALICE - SENDER',
            '----------------------------------------',
            '',

            'Original Plaintext:',
            alice.plaintext
                ?? '-',
            '',

            'Ciphertext:',
            alice.ciphertext
                ?? '-',
            '',

            '----------------------------------------',
            'BOB - AUTHORIZED RECEIVER',
            '----------------------------------------',
            '',

            'Has Secret Key:',
            bob.has_secret_key
                ? 'YES'
                : 'NO',
            '',

            'Secret Key:',
            formatKey(
                bob.key
            ),
            '',

            'Status:',
            bob.status
                ?? '-',
            '',

            'Recovered Plaintext:',
            bob.plaintext
                ?? '-',
            '',

            '----------------------------------------',
            'TRUDY - ATTACKER',
            '----------------------------------------',
            '',

            'Has Secret Key:',
            trudy.has_secret_key
                ? 'YES'
                : 'NO',
            '',

            'Status:',
            trudy.status
                ?? '-',
            '',

            'Detected Algorithm:',
            trudy.detected_algorithm
                ?? '-',
            '',

            'Confidence:',
            (
                trudy.confidence
                ?? 0
            )
            + '%',
            '',

            'Recovered Key:',
            formatKey(
                trudy.recovered_key
            ),
            '',

            'Recovered Plaintext:',
            trudy.recovered_plaintext
                ?? '-',
            '',

            'Analysis:',
            trudy.message
                ?? '-',
            '',

            '========================================',
            'SECURITY RESULT',
            '========================================',
            '',

            (
                trudy.status
                === 'compromised'

                ? 'COMPROMISED'

                : (
                    trudy.status
                    === 'protected'

                    ? 'PROTECTED'

                    : String(
                        trudy.status
                        ?? 'UNKNOWN'
                    ).toUpperCase()
                )
            ),
        ].join('\n');

        const algorithm =
            alice.algorithm
            ?? 'unknown';

        downloadText(
            'crypto-detective-simulation-'
            + algorithm
            + '-'
            + (
                response.simulation_id
                ?? 'result'
            )
            + '.txt',

            text
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Clipboard / Download
    |--------------------------------------------------------------------------
    */

    async function copyText(
        value
    ) {

        const text =
            String(
                value ?? ''
            );

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

    function buttonFeedback(
        button
    ) {

        if (!button) {
            return;
        }

        const original =
            button.textContent;

        button.textContent =
            'Copied!';

        setTimeout(
            () => {
                button.textContent =
                    original;
            },
            1000
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    function formatKey(
        value
    ) {

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

    function shorten(
        value,
        length
    ) {

        const text =
            String(
                value ?? ''
            );

        if (
            text.length
            <= length
        ) {
            return text;
        }

        return (
            text.slice(
                0,
                length
            )
            + '...'
        );
    }

    function escapeHtml(
        value
    ) {

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

    console.log(
        '[Crypto Detective] '
        + 'Simulation Visual V3 loaded.'
    );

})();