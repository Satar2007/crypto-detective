/* Observe presentation only; never wrap fetch, clipboard, download or cipher handlers. */
(() => {
    'use strict';
    function init() {
        const toggle = document.getElementById('cryptoMotionToggle');
        if (!toggle || toggle.dataset.initialized) return;
        toggle.dataset.initialized = 'true';
        const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
        let enabled = true;
        try { enabled = localStorage.getItem('crypto-detective-motion') !== 'off'; } catch (_) { /* Optional storage. */ }
        function sync() {
            const effective = enabled && !preference.matches;
            document.body.classList.toggle('crypto-motion-enabled', effective);
            document.body.classList.toggle('crypto-motion-paused', document.hidden);
            toggle.setAttribute('aria-pressed', String(effective));
            toggle.textContent = preference.matches ? 'Animasi: gerakan dikurangi' : effective ? 'Animasi: aktif' : 'Animasi: nonaktif';
        }
        toggle.addEventListener('click', () => {
            enabled = !enabled;
            try { localStorage.setItem('crypto-detective-motion', enabled ? 'on' : 'off'); } catch (_) { /* Optional storage. */ }
            sync();
        });
        preference.addEventListener('change', sync);
        document.addEventListener('visibilitychange', sync);
        sync();
        const notice = document.createElement('div');
        notice.className = 'crypto-motion-notice';
        notice.setAttribute('role', 'status');
        notice.setAttribute('aria-live', 'polite');
        notice.hidden = true;
        document.body.appendChild(notice);
        let noticeTimer;
        function announce(message) {
            notice.textContent = message;
            notice.hidden = false;
            clearTimeout(noticeTimer);
            noticeTimer = setTimeout(() => { notice.hidden = true; }, 2200);
        }
        // Existing clipboard code marks success only after copying finishes.
        document.querySelectorAll('.cd-v2-action-row button').forEach(button => {
            new MutationObserver(() => {
                if (button.classList.contains('cd-v2-success')) announce('Berhasil disalin');
            }).observe(button, { attributes:true, attributeFilter:['class'] });
        });
        // Observe an actual download anchor; do not claim the file was saved.
        document.addEventListener('click', event => {
            const anchor = event.target.closest?.('a[download]');
            if (anchor && anchor.download && anchor.href.startsWith('blob:')) announce('Unduhan dimulai');
        }, true);
        ['encryptResult', 'decryptResult', 'simulationResult', 'cdFileOutput', 'cdBenchmarkSummary'].forEach(id => {
            const element = document.getElementById(id);
            if (!element) return;
            let pending = false;
            new MutationObserver(() => {
                if (pending) return;
                pending = true;
                queueMicrotask(() => {
                    pending = false;
                    if (!document.body.classList.contains('crypto-motion-enabled') || document.hidden) return;
                    element.classList.remove('crypto-result-enter');
                    // Restart on changed output, without moving or replacing result nodes.
                    void element.offsetWidth;
                    element.classList.add('crypto-result-enter');
                });
            }).observe(element, { childList:true, characterData:true, subtree:true });
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
    else init();
})();
