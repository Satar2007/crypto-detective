/* Crypto Detective Lab: technical variants, no sender profiles. Raw text uses UTF-8/Base64 transport. */
(() => {
'use strict';
const METHODS={caesar:'Caesar',vigenere:'Vigenère',playfair:'Playfair',hill:'Hill',otp:'One-Time Pad',stream:'Stream Cipher'};
const LABELS={'caesar':'Caesar · bentuk teks asli','caesar-az':'Caesar · A–Z kapital','vigenere':'Vigenère · bentuk teks asli','vigenere-az':'Vigenère · A–Z kapital','playfair':'Playfair · filler X','playfair-xq':'Playfair · filler X/Q','hill':'Hill 2×2','hill-matrix':'Hill 2×2 / 3×3','otp-byte':'OTP XOR byte','otp-alpha':'OTP alfabet A–Z','otp-text':'OTP XOR karakter','stream-sha256':'Stream SHA-256 counter','stream-rc4':'Stream RC4 karakter','stream-rc4-byte':'Stream RC4 byte UTF-8','stream-lcg':'Stream LCG'};
const CHOICES={caesar:['caesar','caesar-az'],vigenere:['vigenere','vigenere-az'],playfair:['playfair-xq','playfair'],hill:['hill','hill-matrix'],otp:['otp-byte','otp-text','otp-alpha'],stream:['stream-sha256','stream-rc4','stream-lcg','stream-rc4-byte']};
const bytes=value=>new TextEncoder().encode(value);
function to64(value){let binary='';const data=bytes(value);for(let i=0;i<data.length;i+=16384)binary+=String.fromCharCode(...data.subarray(i,i+16384));return btoa(binary);}
function from64(value){return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Uint8Array.from(atob(value),c=>c.charCodeAt(0)));}
function formats(value){const out=[];for(const format of ['hex','base64'])try{out.push({format,binary:window.CryptoOTPFormat.decode(value,format,'Data')});}catch{}return out;}
function rawKey(variant,key){return ['otp-text','stream-rc4','stream-rc4-byte','stream-sha256'].includes(variant)?key:key.trim();}
async function process({mode,variant,text,key='',cipherFormat='base64',keyFormat='base64',record=false,signal}){
 if(!LABELS[variant]||!['encrypt','decrypt'].includes(mode))throw new Error('Metode/operasi tidak dikenal.');
 if(text===''||bytes(text).length>(mode==='encrypt'?2:6)*1024*1024)throw new Error('Pesan kosong atau melebihi batas 2 MB plaintext / 6 MB ciphertext.');
 key=rawKey(variant,String(key));if(mode==='decrypt'&&key==='')throw new Error('Masukkan atau upload key pengirim.');
 const controller=new AbortController(),abort=()=>controller.abort();if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,125000);
 try{
  const response=await fetch('/api/coursework/interop',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({mode,variant,text_b64:to64(text),key_b64:to64(key),cipher_format:['hex','base64'].includes(cipherFormat)?cipherFormat:'base64',key_format:['hex','base64'].includes(keyFormat)?keyFormat:'base64',record})});
  let answer;try{answer=await response.json();}catch{throw new Error('Server tidak memberikan JSON. Periksa Laragon dan engine Python.');}
  if(!response.ok||!answer.success){let message=answer.message||answer.detail||'Operasi gagal.';if(answer.errors)message=Object.values(answer.errors).flat()[0]||message;const error=new Error(String(message));error.status=response.status;throw error;}
  return {output:from64(answer.output_b64),key:from64(answer.key_b64),algorithm:answer.algorithm,variant,label:LABELS[variant],cipherFormat,keyFormat,metrics:answer.metrics,operationId:answer.operation_id,notes:(answer.notes||[]).join(' ')};
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
function buildPlans(text,key,{method='auto'}={}){
 if(text===''||key==='')throw new Error('Masukkan pesan dan key. Auto ini bukan crack tanpa key.');
 const plans=[],clean=text.replace(/[\s\uFEFF]/gu,''),numbers=key.match(/[+-]?\d+/g)||[],add=(variant,cipherFormat='base64',keyFormat='base64')=>plans.push({variant,cipherFormat,keyFormat});
 const chosen=m=>method==='auto'||method===m;
 if(chosen('caesar')&&/^[+-]?\d+$/.test(key.trim())){add('caesar');add('caesar-az');}
 if(chosen('vigenere')&&/[a-z]/i.test(key)&&/[a-z]/i.test(text)){add('vigenere');add('vigenere-az');}
 if(chosen('playfair')&&/^[a-z]+$/i.test(key.trim())&&/^[a-z]+$/i.test(clean)&&clean.length%2===0){add('playfair');add('playfair-xq');}
 if(chosen('hill')&&[4,9].includes(numbers.length)&&/^[a-z]+$/i.test(clean)){if(numbers.length===4)add('hill');add('hill-matrix');}
 const ciphers=formats(text),pads=formats(key);
 if(chosen('otp')){
  for(const c of ciphers)for(const k of pads)if(c.binary.length===k.binary.length)add('otp-byte',c.format,k.format);
  const letters=key.replace(/[\s\uFEFF]/gu,'');if(/^[a-z]+$/i.test(clean)&&/^[a-z]+$/i.test(letters)&&clean.length===letters.length)add('otp-alpha');
  if(Array.from(key).length>=Array.from(text).length)add('otp-text','raw','text');
 }
 if(chosen('stream')){
  add('stream-rc4','raw','text');
  for(const c of ciphers){add('stream-sha256',c.format,'text');add('stream-rc4-byte',c.format,'text');if(/^[+-]?\d+$/.test(key.trim()))add('stream-lcg',c.format,'text');}
 }
 const alternatives=[];if(key!==key.trim()&&key.trim()!==''){for(const plan of plans)if(['otp-text','stream-rc4','stream-rc4-byte','stream-sha256'].includes(plan.variant))alternatives.push({...plan,key:key.trim(),keyInterpretation:'Whitespace tepi key diabaikan'});}return [...plans,...alternatives];
}
function plausibility(text){const list=Array.from(text);if(!list.length)return 0;return list.filter(c=>{const n=c.codePointAt(0);return n>=32&&n!==127&&!(n>=128&&n<160)||['\n','\r','\t'].includes(c);}).length/list.length;}
async function analyze(options,onProgress=()=>{}){
 const plans=buildPlans(options.text,options.key,options),candidates=[],failures=[];
 for(let i=0;i<plans.length;i++){
  if(options.signal?.aborted)throw new DOMException('Dibatalkan','AbortError');const plan=plans[i];onProgress(i+1,plans.length,LABELS[plan.variant]);
  try{const r=await process({...options,...plan,mode:'decrypt',record:false});r.readability=plausibility(r.output);if(plan.keyInterpretation)r.notes+=' '+plan.keyInterpretation+'.';candidates.push(r);}
  catch(e){if(e.name==='AbortError'||!e.status||e.status>=500||[401,403,419,429].includes(e.status))throw e;failures.push({label:LABELS[plan.variant],message:e.message});}
 }
 // Same output is presented once, without claiming which variant the sender used.
 const unique=[];for(const r of candidates){const same=unique.find(x=>x.output===r.output);if(same){same.matches.push(r.label);}else unique.push({...r,matches:[r.label]});}
 unique.sort((a,b)=>b.readability-a.readability);return {candidates:unique,failures,attempts:plans.length};
}
function randomLetters(n){let value='';while(value.length<n){for(const x of crypto.getRandomValues(new Uint8Array(256)))if(x<234&&value.length<n)value+=String.fromCharCode(65+x%26);}return value;}
function randomBytes(n){const data=new Uint8Array(n);for(let i=0;i<n;i+=65536)crypto.getRandomValues(data.subarray(i,Math.min(i+65536,n)));return data;}
function generateKey(variant,text,keyFormat='base64'){
 const integer=()=>crypto.getRandomValues(new Uint32Array(1))[0]%26;
 if(variant.startsWith('caesar'))return String(1+crypto.getRandomValues(new Uint8Array(1))[0]%25);
 if(variant.startsWith('vigenere')||variant.startsWith('playfair'))return randomLetters(12);
 if(variant==='hill'||variant==='hill-matrix'){
  const n=variant==='hill'?2:3;while(true){const a=Array.from({length:n*n},integer);const det=n===2?a[0]*a[3]-a[1]*a[2]:a[0]*(a[4]*a[8]-a[5]*a[7])-a[1]*(a[3]*a[8]-a[5]*a[6])+a[2]*(a[3]*a[7]-a[4]*a[6]);const d=((det%26)+26)%26;if(d%2&&d%13)return a.join(',');}
 }
 if(variant==='stream-lcg')return String(crypto.getRandomValues(new Uint8Array(1))[0]);
 if(variant.startsWith('stream'))return randomLetters(24);
 if(text==='')throw new Error('Masukkan plaintext dahulu agar panjang key tepat.');
 if(variant==='otp-alpha'){const clean=text.replace(/[\s\uFEFF]/gu,'').toUpperCase();if(!/^[A-Z]+$/.test(clean))throw new Error('OTP alfabet hanya menerima huruf A–Z dan whitespace.');return randomLetters(clean.length);}
 if(variant==='otp-text')return randomLetters(Array.from(text).length);
 const data=randomBytes(bytes(text).length);if(keyFormat==='hex')return Array.from(data,b=>b.toString(16).padStart(2,'0')).join('');let bin='';for(let i=0;i<data.length;i+=16384)bin+=String.fromCharCode(...data.subarray(i,i+16384));return btoa(bin);
}
window.CryptoCompatibilityV1=Object.freeze({process,analyze,buildPlans,formats,generateKey,to64,from64});
function init(){
 const host=document.getElementById('page-lab');if(!host||document.getElementById('cdCompat'))return;
 const legacy=host.querySelector('.card');if(legacy)legacy.hidden=true;
 const card=document.createElement('article');card.id='cdCompat';card.className='cx-workspace';
 card.innerHTML=`<header class="cx-head"><div><span class="cx-eyebrow">CRYPTO DETECTIVE</span><h2>Lab Kriptografi</h2><p>Enkripsi dan dekripsi pesan atau file. Pilih metode; format pertukaran diperiksa otomatis saat dekripsi.</p></div></header>
<div class="cx-method"><label>Operasi<select id="cxMode"><option value="encrypt">Enkripsi</option><option value="decrypt">Dekripsi</option></select></label><label>Algoritma<select id="cxMethod"><option value="caesar">Caesar</option><option value="vigenere">Vigenère</option><option value="playfair">Playfair</option><option value="hill">Hill</option><option value="otp">One-Time Pad</option><option value="stream">Stream Cipher</option><option value="auto" id="cxAutoOption">Deteksi otomatis</option></select></label></div>
<div class="cx-upload-grid"><label class="cx-upload"><span id="cxInputLabel">Plaintext .txt</span><input id="cxTextFile" type="file" accept=".txt,text/plain"><small id="cxTextName">Unggah file atau tempel pesan di bawah.</small></label><label class="cx-upload"><span>Key .txt</span><input id="cxKeyFile" type="file" accept=".txt,text/plain"><small id="cxKeyName">Gunakan key dari pesan yang sama.</small></label></div>
<div class="cx-paste-grid"><label><span id="cxTextLabel">Plaintext</span><textarea id="cxText" rows="5" spellcheck="false"></textarea></label><label>Key<textarea id="cxKey" rows="5" spellcheck="false"></textarea><button id="cxGenerate" type="button" class="cx-secondary">Generate key</button></label></div>
<div id="cxByteVariants" class="cx-method"><label>Varian enkripsi<select id="cxByteVariant"></select></label><label id="cxOutputFormatWrap">Format ciphertext<select id="cxOutputFormat"><option value="base64">Base64</option><option value="hex">Hex</option></select></label><label id="cxPadFormatWrap">Format key OTP<select id="cxPadFormat"><option value="base64">Base64</option><option value="hex">Hex</option></select></label></div>
<details id="cxAdvanced" class="cx-details"><summary>Pengaturan lanjutan</summary><label>Aturan enkripsi<select id="cxRule"></select></label></details>
<p id="cxGuide" class="cx-hint"></p><div class="cx-actions"><button id="cxRun" type="button" class="cx-primary">Enkripsi</button><button id="cxCancel" type="button" class="cx-secondary" hidden>Batalkan</button><span id="cxFileStatus" role="status"></span></div><p id="cxStatus" class="cx-status" role="status" aria-live="polite"></p>
<section id="cxResults" class="cx-results" hidden><div class="cx-result-head"><h3 id="cxResultsTitle">Hasil</h3><span id="cxResultCount"></span></div><p id="cxCandidateHint" class="cx-hint"></p><div id="cxCandidates" class="cx-candidates"></div><details id="cxMore" class="cx-details" hidden><summary>Kandidat lainnya</summary><div id="cxMoreCandidates" class="cx-candidates"></div></details><div id="cxPreview" hidden><p id="cxSelectedMeta" class="cx-selected-meta"></p><pre id="cxOutput" tabindex="0"></pre><div class="cx-actions"><button id="cxDownload" type="button" class="cx-primary" disabled>Unduh hasil .txt</button><button id="cxDownloadKey" type="button" class="cx-secondary" disabled>Unduh key .txt</button></div><details class="cx-details"><summary>Detail pemrosesan</summary><p>Key yang digunakan: <code id="cxResolvedKey"></code></p><p id="cxNotes"></p></details></div></section><details id="cxDiagnostics" class="cx-details" hidden><summary>Pemeriksaan yang tidak berhasil</summary><div id="cxFailures"></div></details>`;
 host.prepend(card);const q=id=>document.getElementById(id);let selected=null,controller=null,uploadedText=null,uploadedKey=null,lastMethod='';
 const text=()=>uploadedText??q('cxText').value,key=()=>uploadedKey??q('cxKey').value;
 function reset(){selected=null;q('cxResults').hidden=q('cxPreview').hidden=q('cxDiagnostics').hidden=true;q('cxCandidates').replaceChildren();q('cxMoreCandidates').replaceChildren();q('cxMore').hidden=true;q('cxFailures').replaceChildren();q('cxStatus').textContent='';q('cxDownload').disabled=q('cxDownloadKey').disabled=true;window.CryptoLabMetrics?.clear();}
 function optionList(el,list){el.replaceChildren();for(const variant of list){const o=document.createElement('option');o.value=variant;o.textContent=LABELS[variant];el.appendChild(o);}el.value=list[0];}
 function currentVariant(){return ['otp','stream'].includes(q('cxMethod').value)?q('cxByteVariant').value:q('cxRule').value;}
 function guide(){
  const enc=q('cxMode').value==='encrypt';q('cxAutoOption').disabled=enc;q('cxAutoOption').hidden=enc;if(enc&&q('cxMethod').value==='auto')q('cxMethod').value='caesar';const method=q('cxMethod').value;
  if(method!==lastMethod){optionList(q('cxByteVariant'),CHOICES[method]||CHOICES.otp);optionList(q('cxRule'),CHOICES[method]||CHOICES.caesar);lastMethod=method;}
  const v=currentVariant(),raw=['otp-text','stream-rc4'].includes(v),byte=['otp-byte','stream-sha256','stream-lcg','stream-rc4-byte'].includes(v);
  q('cxByteVariants').hidden=!enc||!['otp','stream'].includes(method);q('cxAdvanced').hidden=!enc||['otp','stream','auto'].includes(method);q('cxOutputFormatWrap').hidden=!byte;q('cxPadFormatWrap').hidden=v!=='otp-byte';q('cxGenerate').hidden=!enc;
  q('cxInputLabel').textContent=q('cxTextLabel').textContent=enc?'Plaintext':'Ciphertext';q('cxRun').textContent=enc?'Enkripsi':'Dekripsi';
  q('cxGuide').textContent=!enc?'Format dan varian yang didukung diperiksa otomatis. Pilih kandidat setelah mencocokkan dengan pengirim; ini bukan crack tanpa key.':raw?'Keluaran berupa karakter mentah; file harus disimpan utuh. Key teks dihitung per karakter.':v==='otp-byte'?'Key OTP harus sama panjang dalam byte. Generate membuat key acak; jangan gunakan ulang.':v==='otp-alpha'?'A=0, modulo 26; key sepanjang huruf pesan. Spasi dihapus.':v==='stream-lcg'?'LCG memakai seed integer; hanya 256 seed, untuk pembelajaran.':v.startsWith('stream')?'Penerima harus memakai varian Stream yang sama. RC4 dan SHA-256 counter berbeda.':'Aturan default tersedia; sesuaikan pengaturan lanjutan bila aplikasi penerima memakai normalisasi/filler berbeda.';
 }
 const controls=()=>Array.from(card.querySelectorAll('input,textarea,select,button')).filter(e=>!['cxDownload','cxDownloadKey','cxCancel'].includes(e.id));
 function busy(value){controls().forEach(e=>e.disabled=value);q('cxCancel').hidden=!value;card.setAttribute('aria-busy',String(value));if(!value)guide();}
 for(const id of ['cxMode','cxMethod','cxByteVariant','cxRule','cxOutputFormat','cxPadFormat','cxText','cxKey'])q(id).addEventListener(['cxText','cxKey'].includes(id)?'input':'change',()=>{if(id==='cxText')uploadedText=null;if(id==='cxKey')uploadedKey=null;reset();guide();});
 for(const [fileId,fieldId,nameId] of [['cxTextFile','cxText','cxTextName'],['cxKeyFile','cxKey','cxKeyName']])q(fileId).addEventListener('change',async()=>{
  const file=q(fileId).files?.[0];if(!file)return;reset();busy(true);q('cxCancel').hidden=true;
  try{const max=fieldId==='cxText'&&q('cxMode').value==='encrypt'?2:6;if(!file.name.toLowerCase().endsWith('.txt')||file.size>max*1024*1024)throw new Error(`Pilih .txt UTF-8 maksimum ${max} MB.`);const value=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(await file.arrayBuffer());if(value==='')throw new Error('File kosong.');q(fieldId).value=value;if(fieldId==='cxText')uploadedText=value;else uploadedKey=value;q(nameId).textContent=file.name+' · '+file.size+' B';q('cxFileStatus').textContent='File dimuat utuh.';}
  catch(e){q('cxFileStatus').textContent=e.message;}finally{busy(false);q(fileId).value='';}
 });
 q('cxGenerate').addEventListener('click',()=>{try{reset();uploadedKey=null;q('cxKey').value=generateKey(currentVariant(),text(),q('cxPadFormat').value);q('cxFileStatus').textContent='Key dibuat. Simpan key bersama ciphertext untuk penerima.';}catch(e){q('cxStatus').textContent=e.message;}});
 function choose(r){selected=r;q('cxPreview').hidden=false;q('cxSelectedMeta').textContent=(r.matches||[r.label]).join(' / ');q('cxOutput').textContent=r.output;q('cxResolvedKey').textContent=r.key;q('cxNotes').textContent=r.notes+(r.operationId?' Operasi tersimpan di Riwayat.':' Pemeriksaan kandidat tidak menambah Riwayat.');q('cxDownload').disabled=q('cxDownloadKey').disabled=false;window.CryptoLabMetrics?.render(r.metrics);}
 function render(data,enc){q('cxResults').hidden=!data.candidates.length;q('cxResultsTitle').textContent=enc?'Hasil enkripsi':'Kandidat plaintext';q('cxResultCount').textContent=enc?'':data.candidates.length+' kandidat';q('cxCandidateHint').textContent=enc?'Unduh ciphertext dan key. Beri tahu penerima varian yang digunakan.':'Pilih hasil yang sesuai dengan pesan pengirim. Kandidat terbaca belum membuktikan key benar.';q('cxDownload').textContent=enc?'Unduh ciphertext .txt':'Unduh plaintext .txt';
  if(enc&&data.candidates.length)choose(data.candidates[0]);else for(const [index,r] of data.candidates.entries()){const label=document.createElement('label');label.className='cx-candidate';const radio=document.createElement('input');radio.type='radio';radio.name='cxCandidate';const content=document.createElement('span'),title=document.createElement('strong'),preview=document.createElement('span');title.textContent=r.matches.join(' / ');preview.textContent=r.output.slice(0,140).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g,'·');preview.className='cx-candidate-preview';content.append(title,preview);label.append(radio,content);if(index<3)q('cxCandidates').appendChild(label);else{q('cxMore').hidden=false;q('cxMoreCandidates').appendChild(label);}radio.addEventListener('change',()=>choose(r));}
  if(data.failures.length){q('cxDiagnostics').hidden=false;for(const r of data.failures){const p=document.createElement('p');p.textContent=r.label+': '+r.message;q('cxFailures').appendChild(p);}}
  q('cxStatus').textContent=enc?'Enkripsi selesai. Hasil dan metrik tersedia.':data.candidates.length?`${data.attempts} kemungkinan diperiksa. Pilih kandidat untuk melihat metrik dan mengunduh hasil.`:'Tidak ada hasil dengan aturan yang didukung. Periksa ciphertext dan key.';
 }
 q('cxCancel').addEventListener('click',()=>controller?.abort());
 q('cxRun').addEventListener('click',async()=>{reset();busy(true);controller=new AbortController();try{const enc=q('cxMode').value==='encrypt',options={text:text(),key:key(),signal:controller.signal};if(enc){const r=await process({...options,mode:'encrypt',variant:currentVariant(),cipherFormat:q('cxOutputFormat').value,keyFormat:q('cxPadFormat').value,record:true});render({candidates:[r],failures:[],attempts:1},true);}else render(await analyze({...options,method:q('cxMethod').value},(i,n,label)=>q('cxStatus').textContent=`Memeriksa ${i}/${n}: ${label}…`),false);}catch(e){reset();q('cxStatus').textContent=e.name==='AbortError'?'Proses dibatalkan atau batas waktu terlewati.':e.message;}finally{controller=null;busy(false);}});
 function download(name,value){const url=URL.createObjectURL(new Blob([value],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 q('cxDownload').addEventListener('click',()=>{if(selected)download(selected.variant+(q('cxMode').value==='encrypt'?'-ciphertext.txt':'-plaintext.txt'),selected.output);});
 q('cxDownloadKey').addEventListener('click',()=>{if(selected)download(selected.variant+'-key.txt',String(selected.key));});
 guide();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
