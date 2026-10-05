/* Hill key input adapter. The existing Python cipher remains authoritative. */
(() => {
    'use strict';
    const compact = text => String(text).replace(/[\s\uFEFF]/gu,'');
    function parse(value) {
        const text = String(value).trim();
        if (!text) return {kind:'empty'};
        if (text.length > 20000) return {kind:'error',message:'Key terlalu panjang. Masukkan empat integer.'};
        if (/^\d{4}$/.test(text)) return {kind:'ambiguous',digits:Array.from(text),message:`${text} terbaca sebagai satu bilangan. Gunakan tombol di bawah jika maksudnya empat digit terpisah.`};
        // Matrix labels and common LaTeX wrappers are presentation, not values.
        const clean = text.replace(/^matriks\s*:?\s*/i,'').replace(/\\(?:begin|end)\{(?:p|b|B|v|V)?matrix\}/g,'');
        if (!/^[\d\s\[\](){};,|:&\\+\-]+$/.test(clean)) return {kind:'error',message:'Format tidak dikenali. Gunakan empat integer dengan spasi, koma, titik koma, atau bentuk matriks.'};
        const numbers = clean.match(/[+-]?\d+/g) || [];
        const residue = clean.replace(/[+-]?\d+/g,'');
        if (numbers.length !== 4 || /[+\-]/.test(residue)) return {kind:'error',message:'Hill 2×2 membutuhkan tepat empat integer. Contoh: 3 3 2 5.'};
        if (numbers.some(n => n.replace(/^[+-]/,'').length > 64)) return {kind:'error',message:'Setiap elemen maksimum 64 digit; masukkan nilai modulo 26 untuk bilangan lebih besar.'};
        const ints = numbers.map(n=>BigInt(n)), mod = n => Number((n % 26n + 26n) % 26n);
        const parts = ints.map(mod), determinant = ints[0]*ints[3]-ints[1]*ints[2], detMod = mod(determinant);
        let a = detMod, b = 26; while (b) [a,b] = [b,a%b];
        return {kind:'matrix',parts,key:parts.join(' '),detMod,gcd:a,valid:a===1,normalized:numbers.some((n,i)=>BigInt(n)!==BigInt(parts[i]))};
    }
    function generate() {
        for (let attempt = 0; attempt < 512; attempt++) {
            const values = [], buffer = new Uint8Array(32); crypto.getRandomValues(buffer);
            for (const value of buffer) if (value < 234 && values.length < 4) values.push(value%26);
            if (values.length === 4) {const result = parse(values.join(' ')); if (result.valid) return result.key;}
        }
        throw new Error('Belum dapat membuat matriks valid. Coba lagi.');
    }
    window.CryptoHillInput = Object.freeze({parse,generate});
    const configurations = [
        ['encryptAlgorithm','encryptKey','encryptButton',null,'encrypt'],
        ['decryptAlgorithm','decryptKey','decryptButton',null,'decrypt'],
        ['simulationAlgorithm','simulationKey','simulationButton',null,'encrypt'],
        ['cdFileAlgorithm','cdFileKey','cdRunFile','cdFileMode',null],
        ['cxVariant','cxKey','cxRun','cxMode',null]
    ];
    function setup([algorithmId,keyId,buttonId,modeId,fixedMode]) {
        const q = id=>document.getElementById(id), algorithm=q(algorithmId), key=q(keyId), run=q(buttonId);
        if (!algorithm || !key || !run || q(keyId+'Hill')) return;
        const prefix=keyId+'Hill';
        const widget=document.createElement('section');widget.id=prefix;widget.className='cd-hill-key';widget.hidden=true;
        widget.setAttribute('aria-label','Editor key Hill 2×2');
        widget.innerHTML=`<div class="hk-editor" id="${prefix}Editor"><div class="hk-heading"><strong>Matriks key 2×2</strong><span>Urutan baris: a, b, c, d</span></div><div class="hk-grid"><label for="${prefix}A">a<input id="${prefix}A" type="text" inputmode="numeric" maxlength="65" autocomplete="off" aria-describedby="${prefix}Status"></label><label for="${prefix}B">b<input id="${prefix}B" type="text" inputmode="numeric" maxlength="65" autocomplete="off" aria-describedby="${prefix}Status"></label><label for="${prefix}C">c<input id="${prefix}C" type="text" inputmode="numeric" maxlength="65" autocomplete="off" aria-describedby="${prefix}Status"></label><label for="${prefix}D">d<input id="${prefix}D" type="text" inputmode="numeric" maxlength="65" autocomplete="off" aria-describedby="${prefix}Status"></label></div><div class="hk-actions"><button type="button" id="${prefix}Generate">Generate key valid</button><button type="button" id="${prefix}Clear">Kosongkan</button></div><details id="${prefix}Paste"><summary>Tempel atau upload key</summary><label for="${prefix}Raw" class="hk-raw-label">Empat integer / matriks<textarea id="${prefix}Raw" rows="2" maxlength="20000" spellcheck="false" placeholder="3 3 2 5 atau [[3,3],[2,5]]"></textarea></label><label for="${prefix}File" id="${prefix}FileLabel" class="hk-file-label">Key .txt<input id="${prefix}File" type="file" accept=".txt,text/plain"></label><p id="${prefix}FileStatus" class="hk-file-status" role="status" aria-live="polite"></p></details></div><p id="${prefix}Status" class="hk-status" role="status" aria-live="polite"></p><button type="button" id="${prefix}Interpret" class="hk-interpret" hidden></button>`;
        if(keyId==='cxKey')q('cxGuide').insertAdjacentElement('beforebegin',widget);
        else (key.parentElement?.tagName==='LABEL' ? key.parentElement : key).insertAdjacentElement('afterend',widget);
        const cells=['A','B','C','D'].map(s=>q(prefix+s)), raw=q(prefix+'Raw'), status=q(prefix+'Status'), interpretation=q(prefix+'Interpret');
        const oldLabel=document.querySelector(`label[for="${keyId}"]`);
        const oldHelper=widget.nextElementSibling?.classList.contains('cd-v2-helper') ? widget.nextElementSibling : keyId==='cdFileKey' ? q('cdFileKeyHelp') : null;
        const oldUpload={encryptKey:'labEncryptKeyUpload',decryptKey:'otpTextKeyUpload',cdFileKey:'otpFileKeyUpload'}[keyId];
        const oldUploadBox=oldUpload ? q(oldUpload)?.parentElement : null;
        let writing=false,loading=false,current=parse(key.value);
        const mode=()=>modeId ? q(modeId).value : fixedMode;
        function invalidate() {
            const resultId={encryptKey:'encryptResult',decryptKey:'decryptResult',simulationKey:'simulationResult'}[keyId];
            if (resultId && q(resultId)) q(resultId).textContent='Key berubah. Jalankan ulang proses untuk hasil baru.';
            const actions=keyId==='encryptKey' ? ['cdCopyCiphertext','cdCopyEncryptKey','cdSendDecrypt','cdDownloadEncrypt'] : keyId==='decryptKey' ? ['cdCopyPlaintext','cdDownloadDecrypt'] : [];
            actions.forEach(id=>{if(q(id))q(id).disabled=true;});
        }
        function notify(value) {
            writing=true;key.value=value;
            try {key.dispatchEvent(new Event('input',{bubbles:true}));} finally {writing=false;}
            invalidate();
        }
        function paint() {
            const hill=algorithm.value==='hill',suggestion=algorithm.value==='auto' && current.kind==='ambiguous';
            widget.hidden=!(hill||suggestion);q(prefix+'Editor').hidden=!hill;key.hidden=hill;
            if(oldLabel){oldLabel.htmlFor=hill ? prefix+'A' : keyId; if(keyId==='cxKey')oldLabel.hidden=hill;}
            q(prefix+'FileLabel').hidden=keyId==='cxKey';
            if(oldHelper)oldHelper.hidden=hill;
            if(oldUploadBox)oldUploadBox.hidden=hill;
            q(prefix+'Generate').hidden=mode()==='decrypt';
            interpretation.hidden=current.kind!=='ambiguous';
            if(current.kind==='ambiguous'){
                interpretation.textContent='Gunakan sebagai '+current.digits.join(' · ')+(suggestion ? ' (Hill)' : '');
                status.textContent=suggestion ? 'Key empat digit bisa berarti shift Caesar atau matriks Hill. Pilih interpretasi Hill hanya jika itu maksud pengirim.' : current.message;
            }else if(current.kind==='empty')status.textContent=mode()==='decrypt' ? 'Decrypt membutuhkan matriks key dari pengirim.' : 'Key kosong: engine akan membuat matriks valid saat encrypt.';
            else if(current.kind==='error')status.textContent=current.message;
            else status.textContent=`Key: ${current.key} · det mod 26 = ${current.detMod} · gcd = ${current.gcd}. `+(current.valid ? 'Matriks valid.' : 'Tidak invertible; pilih matriks lain.')+(current.normalized ? ' Elemen dinormalisasi modulo 26.' : '');
            status.classList.toggle('hk-invalid',current.kind==='error'||(current.kind==='matrix'&&!current.valid)||(current.kind==='empty'&&mode()==='decrypt'));
        }
        function read(value,fill=true) {
            current=parse(value);raw.value=value;
            if(fill)cells.forEach((cell,i)=>cell.value=current.kind==='matrix' ? String(current.parts[i]) : '');
            paint();
        }
        function publish(value,fill=true) {
            read(value,fill);
            notify(current.kind==='matrix' ? current.key : value);
        }
        cells.forEach(cell=>cell.addEventListener('input',()=>{
            const values=cells.map(e=>e.value.trim());
            if(values.every(v=>!v))publish('',false);
            else if(values.some(v=>!v||!/^[-+]?\d+$/.test(v))){
                current={kind:'error',message:'Lengkapi empat kotak dengan bilangan bulat.'};raw.value=values.join(' ');notify(raw.value);paint();
            }else publish(values.join(' '),false);
        }));
        raw.addEventListener('input',()=>publish(raw.value));
        key.addEventListener('input',()=>{if(!writing){read(key.value);if(algorithm.value==='hill'&&current.kind==='matrix')notify(current.key);invalidate();}});
        key.addEventListener('change',()=>{if(!writing)read(key.value);});
        algorithm.addEventListener('change',()=>{read(key.value);if(algorithm.value==='hill'&&current.kind==='matrix')notify(current.key);});
        if(modeId)q(modeId).addEventListener('change',()=>read(key.value));
        interpretation.addEventListener('click',()=>{
            const result=parse(key.value);if(result.kind!=='ambiguous')return;
            if(algorithm.value!=='hill'){algorithm.value='hill';algorithm.dispatchEvent(new Event('change',{bubbles:true}));}
            publish(result.digits.join(' '));
        });
        q(prefix+'Generate').addEventListener('click',()=>{try{publish(generate());}catch(e){status.textContent=e.message;}});
        q(prefix+'Clear').addEventListener('click',()=>publish(''));
        const controls=Array.from(widget.querySelectorAll('input,textarea,button'));
        function syncBusy(){const busy=loading||run.disabled||run.classList.contains('loading');controls.forEach(e=>e.disabled=busy);}
        new MutationObserver(syncBusy).observe(run,{attributes:true,attributeFilter:['disabled','class']});
        q(prefix+'File').addEventListener('change',async()=>{
            const upload=q(prefix+'File'),file=upload.files?.[0];if(!file)return;
            loading=true;syncBusy();invalidate();q(prefix+'FileStatus').textContent='';
            // Capture guard also prevents requests until reading completes.
            try{
                if(!file.name.toLowerCase().endsWith('.txt')||file.size>2*1024*1024)throw new Error('Pilih file .txt UTF-8 maksimum 2 MB.');
                const text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()).trim();
                if(!compact(text)||text.length>20000)throw new Error('File key kosong atau melebihi 20.000 karakter.');
                publish(text);q(prefix+'FileStatus').textContent=file.name+' dimuat.';
                if(current.kind==='error'||current.kind==='ambiguous')q(prefix+'Paste').open=true;
            }catch(e){q(prefix+'FileStatus').textContent=e.message;}
            finally{loading=false;upload.value='';syncBusy();}
        });
        run.addEventListener('click',event=>{
            if(algorithm.value!=='hill')return;
            if(!loading)read(key.value,false);
            const valid=!loading&&((current.kind==='matrix'&&current.valid)||(current.kind==='empty'&&mode()!=='decrypt'));
            if(!valid){event.preventDefault();event.stopImmediatePropagation();if(loading)status.textContent='Tunggu file key selesai dibaca.';else paint();status.focus();return;}
            if(current.kind==='matrix'){
                writing=true;key.value=current.key;writing=false;cells.forEach((cell,i)=>cell.value=String(current.parts[i]));
            }
        },{capture:true});
        status.tabIndex=-1;read(key.value);syncBusy();
    }
    function init(){configurations.forEach(setup);}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
