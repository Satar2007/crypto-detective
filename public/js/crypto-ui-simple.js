/* Presentation only: preserve the existing forms, handlers and API behavior. */
(() => {
    'use strict';
    function init() {
        const grid = document.querySelector('#page-lab > .grid');
        if (!grid || grid.children.length !== 2) return;
        const panels = Array.from(grid.children);
        const tabs = document.createElement('div');
        tabs.className = 'lab-tabs';
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', 'Operasi Crypto Lab');
        const buttons = panels.map((panel, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'lab-tab';
            button.id = 'lab-tab-' + index;
            button.textContent = index === 0 ? 'Encrypt' : 'Decrypt';
            button.setAttribute('role', 'tab');
            panel.id = 'lab-panel-' + index;
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('aria-labelledby', button.id);
            button.setAttribute('aria-controls', panel.id);
            button.addEventListener('click', () => select(index));
            button.addEventListener('keydown', event => {
                let target;
                if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') target = 1 - index;
                else if (event.key === 'Home') target = 0;
                else if (event.key === 'End') target = 1;
                if (target !== undefined) {
                    event.preventDefault();
                    select(target);
                    buttons[target].focus();
                }
            });
            tabs.appendChild(button);
            return button;
        });
        function select(index) {
            panels.forEach((panel, i) => {
                panel.hidden = i !== index;
                buttons[i].setAttribute('aria-selected', String(i === index));
                buttons[i].tabIndex = i === index ? 0 : -1;
            });
        }
        grid.before(tabs);
        grid.classList.add('lab-tabbed');
        select(0);
        // Capture opens the destination before the existing handler fills and scrolls it.
        document.addEventListener('click', event => {
            if (event.target.closest?.('#cdSendDecrypt')) select(1);
        }, true);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
