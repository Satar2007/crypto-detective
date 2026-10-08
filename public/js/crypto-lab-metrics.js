/* Actual engine metrics for the selected result, never a second benchmark run. */
(() => {
    'use strict';
    let panel;
    function clear() { if (panel) { panel.hidden = true; panel.replaceChildren(); } }
    function render(metrics) {
        clear();
        if (!panel) return;
        if (!metrics || metrics.operation_count !== 1 || !Number.isFinite(metrics.runtime_ms)) {
            panel.hidden = false; panel.textContent = 'Metrik belum tersedia. Restart engine Python setelah pembaruan.'; return;
        }
        const number = value => Number(value).toLocaleString('id-ID', {maximumFractionDigits:6});
        const title = document.createElement('h4'); title.textContent = 'Beban komputasi operasi ini';
        const grid = document.createElement('dl'); grid.className = 'lm-grid';
        for (const [label,value] of [['Waktu engine',number(metrics.runtime_ms)+' ms'], ['Masukan',number(metrics.input_bytes)+' B'], ['Keluaran',number(metrics.output_bytes)+' B']]) {
            const item = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent=label; dd.textContent=value; item.append(dt,dd); grid.appendChild(item);
        }
        const details = document.createElement('details'), summary = document.createElement('summary'); summary.textContent='Memori, throughput dan kompleksitas'; details.appendChild(summary);
        for (const line of ['Puncak alokasi Python: '+number(metrics.peak_memory_kib)+' KiB', 'Throughput masukan: '+number(metrics.throughput_mb_s)+' MB/s', 'Kompleksitas: '+metrics.complexity, 'Memori teoretis: '+metrics.memory_complexity, metrics.explanation, metrics.measurement_note]) {
            const p=document.createElement('p'); p.textContent=line; details.appendChild(p);
        }
        panel.append(title,grid,details); panel.hidden=false;
    }
    window.CryptoLabMetrics=Object.freeze({clear,render});
    function init() {
        const preview=document.getElementById('cxPreview'); if(!preview)return;
        panel=document.createElement('section'); panel.id='labOperationMetrics';panel.className='lm-panel';panel.hidden=true;
        document.getElementById('cxOutput').after(panel);
        const copy=document.createElement('button');copy.type='button';copy.className='cx-secondary';copy.textContent='Salin hasil';
        copy.addEventListener('click',async()=>{
            try {
                const text=document.getElementById('cxOutput').textContent;
                if(!text)return;
                if(navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
                else {
                    const field=document.createElement('textarea');field.value=text;field.style.cssText='position:fixed;opacity:0';document.body.appendChild(field);field.select();
                    const ok=document.execCommand('copy');field.remove();if(!ok)throw new Error('Gunakan seleksi teks dan Ctrl+C.');
                }
                document.getElementById('cxStatus').textContent='Berhasil disalin';
            } catch(error){document.getElementById('cxStatus').textContent=error.message||'Salin hasil gagal.';}
        });
        document.getElementById('cxDownload').after(copy);
        // Crack V6 retains its own fetch/Shadow DOM behavior; only file input is added.
        const text=document.getElementById('crackCiphertext'),run=document.getElementById('crackButton');
        const label=document.createElement('label');label.className='lm-crack-upload';label.textContent='Unggah ciphertext .txt';
        const input=document.createElement('input');input.type='file';input.accept='.txt,text/plain';label.appendChild(input);text.after(label);
        input.addEventListener('change',async()=>{
            const file=input.files?.[0];if(!file)return;run.disabled=true;
            try {
                if(!file.name.toLowerCase().endsWith('.txt')||file.size>2*1024*1024)throw new Error('Pilih .txt UTF-8 maksimum 2 MB.');
                const value=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());
                if(!value.trim()||value.length>20000)throw new Error('Crack menerima 1–20.000 karakter.');
                text.value=value;document.getElementById('cxStatus').textContent='';
                label.firstChild.textContent='Ciphertext dimuat: '+file.name+' ';
            } catch(error){label.firstChild.textContent=(error.message||'File gagal dibaca')+' ';}
            finally{run.disabled=false;input.value='';}
        });
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
