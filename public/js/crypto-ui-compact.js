/* Presentation only: existing nodes and upload handlers retain their identities. */
(() => {
    'use strict';
    function init() {
        for (const [keyId, uploadId, algorithmId] of [
            ['encryptKey','labEncryptKeyUpload','encryptAlgorithm'],
            ['decryptKey','otpTextKeyUpload','decryptAlgorithm']
        ]) {
            const key = document.getElementById(keyId);
            const upload = document.getElementById(uploadId);
            const algorithm = document.getElementById(algorithmId);
            if (!key || !upload || !algorithm) continue;
            const box = upload.parentElement;
            if (box.closest('.lab-key-tools')) continue;
            const helper = key.parentElement.querySelector('.cd-v2-helper');
            const details = document.createElement('details');
            details.className = 'lab-key-tools';
            const summary = document.createElement('summary');
            summary.textContent = 'Panduan dan unggah kunci .txt';
            details.appendChild(summary);
            box.before(details);
            if (helper) details.appendChild(helper);
            details.appendChild(box);
            // Hill already provides its own guide and key upload controls.
            const update = () => { details.hidden = algorithm.value === 'hill'; };
            algorithm.addEventListener('change',update);
            update();
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
    else init();
})();
