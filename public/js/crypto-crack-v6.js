(() => {
    'use strict';

    /*
    |--------------------------------------------------------------------------
    | Crypto Detective - Crack Analyzer UI V6
    |--------------------------------------------------------------------------
    | Clean Shadow-DOM UI.
    | - Isolated from global CSS
    | - Compact result dashboard
    | - Candidate cards instead of a giant table
    | - Pagination per cipher family
    | - Keeps the existing backend/API untouched
    |--------------------------------------------------------------------------
    */

    const host = document.getElementById('crackResult');

    if (!host) {
        console.warn('[Crypto Detective] #crackResult not found.');
        return;
    }

    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    const previousFetch = window.fetch.bind(window);

    const state = {
        data: null,
        family: 'all',
        page: 1,
        pageSize: 6,
    };

    const FAMILY_LABELS = {
        all: 'All',
        caesar: 'Caesar',
        vigenere: 'Vigenere',
        hill: 'Hill',
        playfair: 'Playfair',
        otp: 'OTP',
        stream: 'Stream',
    };

    const styles = `
        :host {
            display: block;
            width: 100%;
            margin-top: 18px;
            color: #eaf1f5;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
                "Segoe UI", sans-serif;
        }

        * {
            box-sizing: border-box;
        }

        button {
            font: inherit;
        }

        .shell {
            width: 100%;
            overflow: hidden;
            border: 1px solid #223746;
            border-radius: 16px;
            background:
                radial-gradient(circle at 80% 0%, rgba(72, 215, 172, .055), transparent 28%),
                linear-gradient(180deg, #0d1b25 0%, #0a151d 100%);
            box-shadow: 0 16px 42px rgba(0, 0, 0, .20);
        }

        .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            padding: 16px 18px;
            border-bottom: 1px solid #223746;
        }

        .eyebrow {
            margin-bottom: 4px;
            color: #50e3b2;
            font-size: 9px;
            font-weight: 850;
            letter-spacing: .13em;
            text-transform: uppercase;
        }

        .title {
            color: #f4f8fa;
            font-size: 16px;
            font-weight: 800;
            line-height: 1.25;
        }

        .coverage {
            margin-top: 5px;
            color: #7f98a8;
            font-size: 10px;
            line-height: 1.45;
        }

        .status {
            flex: 0 0 auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 96px;
            height: 30px;
            padding: 0 12px;
            border: 1px solid #304653;
            border-radius: 999px;
            background: #10202a;
            color: #adc0ca;
            font-size: 9px;
            font-weight: 850;
            letter-spacing: .07em;
            text-transform: uppercase;
        }

        .status.cracked {
            color: #50e3b2;
            border-color: rgba(80, 227, 178, .38);
            background: rgba(80, 227, 178, .065);
        }

        .status.ambiguous {
            color: #f2c45d;
            border-color: rgba(242, 196, 93, .38);
            background: rgba(242, 196, 93, .055);
        }

        .status.key_required,
        .status.undetermined {
            color: #9db0bb;
        }

        .hero {
            display: grid;
            grid-template-columns: minmax(0, 1.65fr) minmax(280px, .75fr);
            gap: 12px;
            padding: 14px;
            border-bottom: 1px solid #223746;
        }

        .result-card,
        .metric-panel {
            border: 1px solid #243b49;
            border-radius: 12px;
            background: rgba(12, 27, 36, .82);
        }

        .result-card {
            padding: 15px;
        }

        .label {
            color: #7d95a4;
            font-size: 8px;
            font-weight: 800;
            letter-spacing: .09em;
            text-transform: uppercase;
        }

        .plaintext {
            margin-top: 7px;
            color: #f4fff9;
            font-family: Consolas, "SFMono-Regular", Menlo, monospace;
            font-size: 20px;
            font-weight: 750;
            line-height: 1.4;
            word-break: break-word;
        }

        .result-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 7px;
            margin-top: 12px;
        }

        .pill {
            display: inline-flex;
            align-items: center;
            min-height: 27px;
            padding: 0 9px;
            border: 1px solid #2d4351;
            border-radius: 8px;
            background: #12222c;
            color: #bdccd4;
            font-size: 9px;
        }

        .pill strong {
            margin-left: 5px;
            color: #edf5f8;
            font-weight: 750;
        }

        .message {
            margin-top: 11px;
            color: #8ca1ae;
            font-size: 10px;
            line-height: 1.55;
        }

        .metric-panel {
            display: grid;
            grid-template-columns: 1fr 1fr;
            overflow: hidden;
        }

        .metric {
            min-width: 0;
            padding: 13px;
            border-right: 1px solid #243b49;
            border-bottom: 1px solid #243b49;
        }

        .metric:nth-child(2n) {
            border-right: 0;
        }

        .metric:nth-last-child(-n+2) {
            border-bottom: 0;
        }

        .metric-value {
            margin-top: 5px;
            color: #edf5f8;
            font-size: 14px;
            font-weight: 800;
            line-height: 1.25;
            word-break: break-word;
        }

        .workspace {
            padding: 14px;
        }

        .section-head {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 10px;
        }

        .section-title {
            color: #d9e5ea;
            font-size: 11px;
            font-weight: 800;
        }

        .section-subtitle {
            margin-top: 3px;
            color: #728c9c;
            font-size: 9px;
        }

        .count {
            color: #728c9c;
            font-size: 9px;
            white-space: nowrap;
        }

        .tabs {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 11px;
        }

        .tab {
            appearance: none;
            height: 30px;
            padding: 0 10px;
            border: 1px solid #2a414f;
            border-radius: 8px;
            background: #10202a;
            color: #92a8b5;
            cursor: pointer;
            font-size: 9px;
            font-weight: 700;
            transition: .15s ease;
        }

        .tab:hover {
            color: #edf5f8;
            border-color: #456071;
        }

        .tab.active {
            color: #50e3b2;
            border-color: rgba(80, 227, 178, .42);
            background: rgba(80, 227, 178, .07);
        }

        .tab .num {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 18px;
            height: 17px;
            margin-left: 5px;
            padding: 0 5px;
            border-radius: 999px;
            background: rgba(255,255,255,.055);
            font-size: 8px;
        }

        .candidate-list {
            display: grid;
            gap: 8px;
        }

        .candidate {
            display: grid;
            grid-template-columns: 42px minmax(0, 1.2fr) minmax(0, 1.4fr) minmax(200px, .85fr);
            gap: 11px;
            align-items: center;
            min-height: 76px;
            padding: 10px 11px;
            border: 1px solid #243a48;
            border-radius: 11px;
            background: #0d1a23;
        }

        .candidate.best {
            border-color: rgba(80, 227, 178, .36);
            background:
                linear-gradient(90deg, rgba(80, 227, 178, .055), transparent 35%),
                #0d1a23;
        }

        .rank {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 30px;
            height: 30px;
            border-radius: 8px;
            background: #142631;
            color: #829aaa;
            font-size: 10px;
            font-weight: 800;
        }

        .candidate.best .rank {
            background: rgba(80, 227, 178, .11);
            color: #50e3b2;
        }

        .candidate-title {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
        }

        .algo {
            color: #68b9ff;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
        }

        .best-badge {
            display: inline-flex;
            align-items: center;
            height: 20px;
            padding: 0 6px;
            border-radius: 999px;
            background: rgba(80, 227, 178, .11);
            color: #50e3b2;
            font-size: 7px;
            font-weight: 850;
            letter-spacing: .05em;
        }

        .candidate-plain {
            margin-top: 5px;
            color: #eef5f8;
            font-family: Consolas, "SFMono-Regular", Menlo, monospace;
            font-size: 12px;
            font-weight: 700;
            line-height: 1.35;
            word-break: break-word;
        }

        .candidate-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 7px;
        }

        .mini {
            min-width: 0;
            padding: 8px;
            border: 1px solid #233946;
            border-radius: 8px;
            background: #0f1f29;
        }

        .mini-value {
            margin-top: 4px;
            color: #cdd9df;
            font-family: Consolas, "SFMono-Regular", Menlo, monospace;
            font-size: 9px;
            line-height: 1.3;
            word-break: break-word;
        }

        .reason {
            color: #8198a6;
            font-size: 9px;
            line-height: 1.45;
        }

        .reason .candidate-status {
            display: inline-block;
            margin-bottom: 5px;
            color: #aebfc8;
            font-size: 8px;
            font-weight: 750;
            text-transform: uppercase;
        }

        .pager {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-top: 10px;
        }

        .page-info {
            color: #748d9d;
            font-size: 9px;
        }

        .pager-buttons {
            display: flex;
            gap: 6px;
        }

        .small-btn,
        .action {
            appearance: none;
            border: 1px solid #2b4250;
            background: #12242e;
            color: #dce7ec;
            cursor: pointer;
            font-weight: 700;
        }

        .small-btn {
            height: 29px;
            padding: 0 10px;
            border-radius: 8px;
            font-size: 9px;
        }

        .small-btn:disabled {
            opacity: .35;
            cursor: default;
        }

        .footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 14px;
            border-top: 1px solid #223746;
            background: rgba(7, 17, 23, .4);
        }

        .note {
            max-width: 720px;
            color: #758e9d;
            font-size: 9px;
            line-height: 1.5;
        }

        .actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 6px;
        }

        .action {
            height: 31px;
            padding: 0 10px;
            border-radius: 8px;
            font-size: 9px;
        }

        .action.primary {
            color: #05241a;
            background: #50e3b2;
            border-color: #50e3b2;
        }

        .empty {
            padding: 30px 15px;
            border: 1px dashed #2b414e;
            border-radius: 10px;
            color: #758e9d;
            text-align: center;
            font-size: 10px;
        }

        .loading {
            display: grid;
            place-items: center;
            min-height: 170px;
            padding: 30px;
            border: 1px solid #223746;
            border-radius: 14px;
            background: #0c1922;
        }

        .loading-inner {
            text-align: center;
        }

        .spinner {
            width: 28px;
            height: 28px;
            margin: 0 auto 12px;
            border: 3px solid #203744;
            border-top-color: #50e3b2;
            border-radius: 50%;
            animation: spin .8s linear infinite;
        }

        .loading-title {
            color: #eaf1f5;
            font-size: 12px;
            font-weight: 800;
        }

        .loading-sub {
            margin-top: 5px;
            color: #7992a1;
            font-size: 9px;
        }

        .error {
            padding: 14px;
            border: 1px solid rgba(238, 105, 118, .30);
            border-radius: 12px;
            background: rgba(238, 105, 118, .055);
            color: #f0a7ae;
            font-size: 10px;
            line-height: 1.5;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        @media (max-width: 980px) {
            .hero {
                grid-template-columns: 1fr;
            }

            .candidate {
                grid-template-columns: 42px 1fr;
            }

            .candidate-meta,
            .reason {
                grid-column: 2;
            }
        }

        @media (max-width: 620px) {
            .topbar,
            .footer {
                align-items: flex-start;
                flex-direction: column;
            }

            .metric-panel {
                grid-template-columns: 1fr 1fr;
            }

            .candidate {
                grid-template-columns: 1fr;
            }

            .rank,
            .candidate-meta,
            .reason {
                grid-column: 1;
            }

            .actions {
                justify-content: flex-start;
            }
        }
    `;

    function renderLoading() {
        shadow.innerHTML = `
            <style>${styles}</style>
            <div class="loading">
                <div class="loading-inner">
                    <div class="spinner"></div>
                    <div class="loading-title">Deep cryptanalysis sedang berjalan</div>
                    <div class="loading-sub">
                        Mencoba Caesar, Vigenere, Hill, Playfair, serta deteksi OTP / Stream.
                    </div>
                </div>
            </div>
        `;
    }

    function renderError(message) {
        shadow.innerHTML = `
            <style>${styles}</style>
            <div class="error">${escapeHtml(message || 'Analysis failed.')}</div>
        `;
    }

    function isBestCandidate(candidate) {
        const data = state.data;

        if (!data) return false;

        return (
            String(candidate.algorithm ?? '').toLowerCase()
                === String(data.detected_algorithm ?? '').toLowerCase()
            && normalizeKey(candidate.recovered_key)
                === normalizeKey(data.recovered_key)
            && String(candidate.plaintext ?? '').trim().toLowerCase()
                === String(data.plaintext ?? '').trim().toLowerCase()
        );
    }

    function groupCandidates() {
        const candidates = Array.isArray(state.data?.candidates)
            ? state.data.candidates
            : [];

        const groups = {
            all: [],
            caesar: [],
            vigenere: [],
            hill: [],
            playfair: [],
            otp: [],
            stream: [],
        };

        for (const candidate of candidates) {
            const algorithm = String(candidate.algorithm ?? '').toLowerCase();

            groups.all.push(candidate);

            if (groups[algorithm]) {
                groups[algorithm].push(candidate);
            }
        }

        const sorter = (a, b) => {
            const aBest = isBestCandidate(a) ? 1 : 0;
            const bBest = isBestCandidate(b) ? 1 : 0;

            if (aBest !== bBest) {
                return bBest - aBest;
            }

            return Number(b.score ?? -Infinity) - Number(a.score ?? -Infinity);
        };

        Object.values(groups).forEach(group => group.sort(sorter));

        return groups;
    }

    function render() {
        const data = state.data;

        if (!data) return;

        const groups = groupCandidates();

        if (!groups[state.family]) {
            state.family = 'all';
        }

        const candidates = groups[state.family];
        const totalPages = Math.max(1, Math.ceil(candidates.length / state.pageSize));

        if (state.page > totalPages) {
            state.page = totalPages;
        }

        const start = (state.page - 1) * state.pageSize;
        const pageCandidates = candidates.slice(start, start + state.pageSize);

        const familyTabs = Object.entries(FAMILY_LABELS)
            .filter(([key]) => key === 'all' || groups[key].length > 0)
            .map(([key, label]) => `
                <button
                    class="tab ${state.family === key ? 'active' : ''}"
                    type="button"
                    data-family="${key}"
                >
                    ${escapeHtml(label)}
                    <span class="num">${groups[key].length}</span>
                </button>
            `)
            .join('');

        const candidateCards = pageCandidates.length
            ? pageCandidates.map((candidate, index) => {
                const rank = start + index + 1;
                const best = isBestCandidate(candidate);

                return `
                    <article class="candidate ${best ? 'best' : ''}">
                        <div class="rank">${rank}</div>

                        <div>
                            <div class="candidate-title">
                                <span class="algo">${escapeHtml(candidate.algorithm ?? '-')}</span>
                                ${best ? '<span class="best-badge">ENGINE BEST</span>' : ''}
                            </div>

                            <div class="candidate-plain">
                                ${escapeHtml(candidate.plaintext ?? '-')}
                            </div>
                        </div>

                        <div class="candidate-meta">
                            <div class="mini">
                                <div class="label">Key</div>
                                <div class="mini-value">
                                    ${escapeHtml(formatKey(candidate.recovered_key))}
                                </div>
                            </div>

                            <div class="mini">
                                <div class="label">Score / confidence</div>
                                <div class="mini-value">
                                    ${escapeHtml(formatNumber(candidate.score))}
                                    &nbsp; / &nbsp;
                                    ${escapeHtml(formatConfidence(candidate.confidence))}
                                </div>
                            </div>
                        </div>

                        <div class="reason">
                            <span class="candidate-status">
                                ${escapeHtml(candidate.status ?? '-')}
                            </span>
                            <br>
                            ${escapeHtml(candidate.reason ?? '-')}
                        </div>
                    </article>
                `;
            }).join('')
            : '<div class="empty">Tidak ada kandidat pada family ini.</div>';

        shadow.innerHTML = `
            <style>${styles}</style>

            <section class="shell">
                <header class="topbar">
                    <div>
                        <div class="eyebrow">Smart Six-Cipher Analyzer</div>
                        <div class="title">Cryptanalysis Result</div>
                        <div class="coverage">
                            Caesar · Vigenere · Playfair · Hill · OTP · Stream Cipher
                        </div>
                    </div>

                    <div class="status ${escapeHtml(data.status ?? '')}">
                        ${escapeHtml(data.status ?? 'unknown')}
                    </div>
                </header>

                <div class="hero">
                    <section class="result-card">
                        <div class="label">Best plaintext candidate</div>

                        <div class="plaintext">
                            ${escapeHtml(data.plaintext ?? '-')}
                        </div>

                        <div class="result-meta">
                            <span class="pill">
                                Algorithm
                                <strong>${escapeHtml(data.detected_algorithm ?? '-')}</strong>
                            </span>

                            <span class="pill">
                                Key
                                <strong>${escapeHtml(formatKey(data.recovered_key))}</strong>
                            </span>
                        </div>

                        <div class="message">
                            ${escapeHtml(data.message ?? '-')}
                        </div>
                    </section>

                    <aside class="metric-panel">
                        <div class="metric">
                            <div class="label">Confidence</div>
                            <div class="metric-value">
                                ${escapeHtml(formatConfidence(data.confidence))}
                            </div>
                        </div>

                        <div class="metric">
                            <div class="label">Candidates</div>
                            <div class="metric-value">
                                ${groups.all.length}
                            </div>
                        </div>

                        <div class="metric">
                            <div class="label">Best family</div>
                            <div class="metric-value">
                                ${escapeHtml(data.detected_algorithm ?? '-')}
                            </div>
                        </div>

                        <div class="metric">
                            <div class="label">Result</div>
                            <div class="metric-value">
                                ${escapeHtml(data.status ?? '-')}
                            </div>
                        </div>
                    </aside>
                </div>

                <div class="workspace">
                    <div class="section-head">
                        <div>
                            <div class="section-title">Candidate Explorer</div>
                            <div class="section-subtitle">
                                Lihat kandidat per algoritma tanpa memenuhi halaman dengan tabel panjang.
                            </div>
                        </div>

                        <div class="count">
                            ${candidates.length} candidate${candidates.length === 1 ? '' : 's'}
                        </div>
                    </div>

                    <div class="tabs">
                        ${familyTabs}
                    </div>

                    <div class="candidate-list">
                        ${candidateCards}
                    </div>

                    <div class="pager">
                        <div class="page-info">
                            Page ${state.page} of ${totalPages}
                        </div>

                        <div class="pager-buttons">
                            <button
                                class="small-btn"
                                type="button"
                                id="prevPage"
                                ${state.page <= 1 ? 'disabled' : ''}
                            >
                                Previous
                            </button>

                            <button
                                class="small-btn"
                                type="button"
                                id="nextPage"
                                ${state.page >= totalPages ? 'disabled' : ''}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                <footer class="footer">
                    <div class="note">
                        Confidence adalah ranking heuristic, bukan bukti matematis.
                        Ciphertext pendek dapat memiliki beberapa plaintext yang sama-sama masuk akal.
                    </div>

                    <div class="actions">
                        <button class="action" type="button" id="copyPlain">
                            Copy Plaintext
                        </button>

                        <button class="action" type="button" id="copyKey">
                            Copy Key
                        </button>

                        <button class="action primary" type="button" id="downloadReport">
                            Download Analysis
                        </button>
                    </div>
                </footer>
            </section>
        `;

        bindEvents(groups, totalPages);
    }

    function bindEvents(groups, totalPages) {
        shadow.querySelectorAll('[data-family]').forEach(button => {
            button.addEventListener('click', () => {
                state.family = button.dataset.family || 'all';
                state.page = 1;
                render();
            });
        });

        shadow.getElementById('prevPage')?.addEventListener('click', () => {
            if (state.page > 1) {
                state.page -= 1;
                render();
            }
        });

        shadow.getElementById('nextPage')?.addEventListener('click', () => {
            if (state.page < totalPages) {
                state.page += 1;
                render();
            }
        });

        shadow.getElementById('copyPlain')?.addEventListener('click', async event => {
            await copyText(state.data?.plaintext ?? '');
            flash(event.currentTarget, 'Copied');
        });

        shadow.getElementById('copyKey')?.addEventListener('click', async event => {
            await copyText(formatKey(state.data?.recovered_key));
            flash(event.currentTarget, 'Copied');
        });

        shadow.getElementById('downloadReport')?.addEventListener('click', () => {
            downloadReport(groups);
        });
    }

    function downloadReport(groups) {
        const data = state.data;

        if (!data) return;

        const lines = [
            'CRYPTO DETECTIVE',
            'SMART SIX-CIPHER ANALYSIS',
            '========================================',
            '',
            `Status: ${data.status ?? '-'}`,
            `Best Algorithm: ${data.detected_algorithm ?? '-'}`,
            `Confidence: ${formatConfidence(data.confidence)}`,
            `Recovered Key: ${formatKey(data.recovered_key)}`,
            '',
            'BEST PLAINTEXT',
            String(data.plaintext ?? '-'),
            '',
            'ANALYSIS',
            String(data.message ?? '-'),
            '',
        ];

        for (const family of ['caesar', 'vigenere', 'hill', 'playfair', 'otp', 'stream']) {
            const candidates = groups[family] ?? [];

            if (!candidates.length) continue;

            lines.push('========================================');
            lines.push(family.toUpperCase());
            lines.push('========================================');

            candidates.forEach((candidate, index) => {
                lines.push(
                    `#${index + 1}`,
                    `Plaintext: ${candidate.plaintext ?? '-'}`,
                    `Key: ${formatKey(candidate.recovered_key)}`,
                    `Score: ${formatNumber(candidate.score)}`,
                    `Confidence: ${formatConfidence(candidate.confidence)}`,
                    `Status: ${candidate.status ?? '-'}`,
                    `Reason: ${candidate.reason ?? '-'}`,
                    ''
                );
            });
        }

        downloadText(
            'crypto-detective-smart-analysis.txt',
            lines.join('\n')
        );
    }

    async function copyText(value) {
        const text = String(value ?? '');

        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return;
        }

        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
    }

    function flash(button, text) {
        const original = button.textContent;
        button.textContent = text;

        setTimeout(() => {
            button.textContent = original;
        }, 900);
    }

    function downloadText(filename, content) {
        const blob = new Blob(
            [content],
            { type: 'text/plain;charset=utf-8' }
        );

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = filename;

        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        URL.revokeObjectURL(url);
    }

    function normalizeKey(value) {
        if (value === null || value === undefined) return '';

        if (typeof value === 'object') {
            return JSON.stringify(value);
        }

        return String(value);
    }

    function formatKey(value) {
        const normalized = normalizeKey(value);
        return normalized === '' ? '-' : normalized;
    }

    function formatNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number.toFixed(3) : '-';
    }

    function formatConfidence(value) {
        const number = Number(value);
        return Number.isFinite(number) ? `${number.toFixed(2)}%` : '-';
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    window.fetch = async (...args) => {
        const target = args[0];
        const url = typeof target === 'string'
            ? target
            : target?.url ?? '';

        const isCrackRequest = url.includes('/api/crypto/crack');

        if (isCrackRequest) {
            renderLoading();
        }

        try {
            const response = await previousFetch(...args);

            if (!isCrackRequest) {
                return response;
            }

            const clone = response.clone();
            const json = await clone.json();

            if (response.ok && json?.success && json?.data) {
                state.data = json.data;
                state.family = 'all';
                state.page = 1;

                setTimeout(render, 0);
            } else {
                renderError(
                    json?.message
                    ?? json?.error
                    ?? 'Cryptanalysis gagal.'
                );
            }

            return response;
        } catch (error) {
            if (isCrackRequest) {
                renderError(error?.message ?? 'Tidak dapat menghubungi analyzer.');
            }

            throw error;
        }
    };

    shadow.innerHTML = `
        <style>${styles}</style>
        <div class="empty">
            Hasil Smart Crack Analyzer akan tampil di sini.
        </div>
    `;

    console.log('[Crypto Detective] Crack Analyzer UI V6 loaded.');
})();
