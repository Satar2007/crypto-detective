(() => {
    'use strict';
    const host = document.getElementById('crackResult');
    const shadow = host?.shadowRoot;
    const url = document.currentScript?.dataset.stylesheet;
    if (!shadow || !url) return;

    async function install() {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Crack stylesheet unavailable');
        const css = await response.text();
        // Adopted sheets survive V6's loading/result/filter innerHTML replacements.
        if ('adoptedStyleSheets' in shadow && typeof CSSStyleSheet !== 'undefined'
            && 'replaceSync' in CSSStyleSheet.prototype) {
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(css);
            shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];
            return;
        }
        // Older browsers: observe only this known ShadowRoot, never document/main.
        const apply = () => {
            if (shadow.querySelector('style[data-crypto-attack-theme]')) return;
            const style = document.createElement('style');
            style.dataset.cryptoAttackTheme = 'true';
            style.textContent = css;
            shadow.appendChild(style);
        };
        apply();
        new MutationObserver(apply).observe(shadow, { childList: true });
    }
    install().catch(error => console.warn('[Crypto UI] Attack theme:', error.message));
})();
