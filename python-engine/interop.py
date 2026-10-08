"""Interoperability variants; original cipher and Crack implementations are unchanged."""
import base64
import re
import secrets
from crypto_engine import CryptoService
from cryptozar_compat import operation as normalized_operation, keystream_lcg, xor_bytes
from operation_metrics import alphabet_operation

VARIANTS = {
 'caesar': 'caesar', 'caesar-az':'caesar', 'vigenere':'vigenere','vigenere-az':'vigenere',
 'playfair':'playfair','playfair-xq':'playfair','hill':'hill','hill-matrix':'hill',
 'otp-byte':'otp','otp-alpha':'otp','otp-text':'otp',
 'stream-sha256':'stream','stream-rc4':'stream','stream-rc4-byte':'stream','stream-lcg':'stream',
}
service=CryptoService()

def byte_data(value, fmt):
    clean=''.join(str(value).lstrip('\ufeff').split())
    try:
        if fmt=='hex':return bytes.fromhex(clean)
        if fmt=='base64':
            clean=clean.replace('-','+').replace('_','/')
            return base64.b64decode(clean+'='*((-len(clean))%4),validate=True)
    except (ValueError,TypeError) as exc:raise ValueError('Format byte tidak valid.') from exc
    raise ValueError('Format byte harus Hex atau Base64.')

def encode_bytes(data,fmt):
    if fmt=='hex':return data.hex()
    if fmt=='base64':return base64.b64encode(data).decode('ascii')
    raise ValueError('Format byte harus Hex atau Base64.')

def rc4_values(values,key_values):
    if not key_values:raise ValueError('Key RC4 tidak boleh kosong.')
    state=list(range(256));j=0
    for i in range(256):
        j=(j+state[i]+key_values[i%len(key_values)])%256
        state[i],state[j]=state[j],state[i]
    i=j=0;out=[]
    for value in values:
        i=(i+1)%256;j=(j+state[i])%256;state[i],state[j]=state[j],state[i]
        out.append(value^state[(state[i]+state[j])%256])
    return out

def operation(mode,variant,text,key=None,cipher_format='base64',key_format='base64'):
    if mode not in ('encrypt','decrypt') or variant not in VARIANTS:raise ValueError('Metode/varian tidak dikenal.')
    if not isinstance(text,str) or text=='':raise ValueError('Pesan kosong.')
    encrypt=mode=='encrypt';algorithm=VARIANTS[variant]
    # An empty web key means generate a key, exactly like an omitted key.
    if encrypt and key == '':
        key = None
    if not encrypt and (key is None or key==''):raise ValueError('Dekripsi memerlukan key pengirim.')
    notes=['Cocokkan hasil dengan pengirim; output terbaca bukan bukti key/metode benar.']
    if variant in ('caesar-az','vigenere-az','playfair-xq','hill-matrix'):
        r=normalized_operation(mode,algorithm,text,key);r.pop('profile',None);r['notes']=[n for n in r.get('notes',[]) if 'Profil CryptoZar' not in n];r['variant']=variant;return r
    if variant=='otp-alpha':
        r=alphabet_operation(mode,text,key);r['algorithm']='otp';r['variant']=variant;return r
    if variant in ('otp-text','stream-rc4'):
        if key is None or key=='':
            n=len(text) if variant=='otp-text' else 24
            key=''.join(chr(33+secrets.randbelow(94)) for _ in range(n))
        key=str(key)
        if variant=='otp-text':
            if len(key)<len(text):raise ValueError(f'OTP karakter membutuhkan minimal {len(text)} karakter key; tersedia {len(key)}.')
            output=''.join(chr(ord(c)^ord(key[i])) for i,c in enumerate(text))
            notes.append('XOR karakter kompatibilitas: key teks, dihitung per karakter Unicode; bukan XOR byte UTF-8. Key teks yang dipilih sendiri tidak menjamin keamanan OTP.')
        else:
            output=''.join(chr(v) for v in rc4_values([ord(c) for c in text],[ord(c) for c in key]))
            notes.append('RC4 karakter kompatibilitas; ciphertext berupa karakter mentah. RC4 untuk pembelajaran, bukan keamanan modern.')
        try:output.encode('utf-8')
        except UnicodeEncodeError as exc:raise ValueError('Kombinasi karakter/key menghasilkan surrogate yang tidak dapat disimpan sebagai UTF-8.') from exc
        if encrypt and '\r' in output:
            notes.append('Ciphertext berisi CR. Aplikasi penerima yang menormalkan baris baru dapat merusaknya; format karakter mentah perlu diuji pada file nyata.')
        notes.append('Jangan trim atau edit ciphertext. Pembaca file lain yang mengubah CR/LF dapat merusak hasil; gunakan uji round-trip file.')
    elif variant in ('otp-byte','stream-lcg','stream-rc4-byte'):
        data=text.encode('utf-8') if encrypt else byte_data(text,cipher_format)
        if variant=='otp-byte':
            pad=secrets.token_bytes(len(data)) if key is None or key=='' else byte_data(key,key_format)
            output=xor_bytes(data,pad);key=encode_bytes(pad,key_format)
            notes.append('OTP byte: key acak sepanjang byte pesan dan hanya dipakai sekali.')
        elif variant=='stream-lcg':
            if key is None or key=='':key=secrets.randbelow(256)
            if not re.fullmatch(r'[+-]?\d+',str(key).strip()):raise ValueError('LCG membutuhkan seed integer.')
            key=int(str(key).strip())%256;output=xor_bytes(data,keystream_lcg(key,len(data)))
            notes.append('LCG x=(5*x+1)%256: hanya 256 seed, untuk pembelajaran.')
        else:
            if key is None or key=='':key=secrets.token_hex(16)
            output=bytes(rc4_values(data,list(str(key).encode('utf-8'))))
            notes.append('RC4 byte UTF-8, format Hex/Base64; berbeda dari RC4 karakter untuk teks non-ASCII.')
        try:output=encode_bytes(output,cipher_format) if encrypt else output.decode('utf-8')
        except UnicodeDecodeError as exc:raise ValueError('Hasil bukan UTF-8; key atau varian tidak cocok.') from exc
    else:
        if variant=='stream-sha256' and not encrypt:text=base64.b64encode(byte_data(text,cipher_format)).decode('ascii')
        if encrypt:
            result=service.encrypt(text,algorithm,key).to_dict();output=result['ciphertext'];key=result['key']
            if variant=='stream-sha256':output=encode_bytes(base64.b64decode(output),cipher_format)
            notes.extend(result.get('notes',[]))
        else:output=service.decrypt(algorithm,text,key)
    return {'success':True,'algorithm':algorithm,'variant':variant,'key':key,
            'ciphertext' if encrypt else 'plaintext':output,'notes':notes}
