"""CryptoZar compatibility profile, isolated from Crypto Detective cipher core.
Pure algorithm functions adapted with attribution from CryptoZar by
Andika Novanda Putra (245314084), supplied by the project owner.
No GUI, assets, file access or benchmark code from that application is imported.
"""
import math
import re
import secrets
ALFABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
def normalisasi(teks):
    """Huruf besar saja, hanya A-Z (spasi, angka, tanda baca dibuang)."""
    return "".join(c for c in teks.upper() if "A" <= c <= "Z")

def huruf_ke_angka(teks):
    return [ord(c) - 65 for c in teks]

def angka_ke_huruf(angka):
    return "".join(chr(a + 65) for a in angka)

def caesar_enkripsi(teks, k):
    k %= 26
    return "".join(chr((ord(c) - 65 + k) % 26 + 65) for c in normalisasi(teks))

def caesar_dekripsi(cipher, k):
    return caesar_enkripsi(cipher, -k)

def _geseran_vigenere(kunci):
    kunci = normalisasi(kunci)
    if not kunci:
        raise ValueError("Kunci Vigenere harus berisi minimal satu huruf A-Z.")
    return [ord(c) - 65 for c in kunci]

def vigenere_enkripsi(teks, kunci, arah=1):
    g = _geseran_vigenere(kunci)
    m = len(g)
    return "".join(
        chr((ord(c) - 65 + arah * g[i % m]) % 26 + 65)
        for i, c in enumerate(normalisasi(teks))
    )

def vigenere_dekripsi(cipher, kunci):
    return vigenere_enkripsi(cipher, kunci, arah=-1)

def playfair_tabel(kunci):
    kunci = normalisasi(kunci).replace("J", "I")
    urut = []
    for c in kunci + ALFABET:
        if c != "J" and c not in urut:
            urut.append(c)
    return urut

def playfair_digraf(teks):
    teks = normalisasi(teks).replace("J", "I")
    pasangan = []
    i = 0
    while i < len(teks):
        a = teks[i]
        pengisi = "X" if a != "X" else "Q"
        if i + 1 < len(teks):
            b = teks[i + 1]
            if a == b:
                pasangan.append((a, pengisi))
                i += 1
            else:
                pasangan.append((a, b))
                i += 2
        else:
            pasangan.append((a, pengisi))
            i += 1
    return pasangan

def _playfair_geser(pasangan, tabel, arah):
    pos = {c: divmod(i, 5) for i, c in enumerate(tabel)}
    hasil = []
    for a, b in pasangan:
        (r1, c1), (r2, c2) = pos[a], pos[b]
        if r1 == r2:                       # satu baris: geser kolom
            hasil.append(tabel[r1 * 5 + (c1 + arah) % 5])
            hasil.append(tabel[r2 * 5 + (c2 + arah) % 5])
        elif c1 == c2:                     # satu kolom: geser baris
            hasil.append(tabel[((r1 + arah) % 5) * 5 + c1])
            hasil.append(tabel[((r2 + arah) % 5) * 5 + c2])
        else:                              # persegi panjang: tukar kolom
            hasil.append(tabel[r1 * 5 + c2])
            hasil.append(tabel[r2 * 5 + c1])
    return "".join(hasil)

def playfair_enkripsi(teks, kunci):
    return _playfair_geser(playfair_digraf(teks), playfair_tabel(kunci), +1)

def playfair_dekripsi(cipher, kunci):
    c = normalisasi(cipher).replace("J", "I")
    if len(c) % 2:
        raise ValueError("Ciphertext Playfair harus berjumlah huruf genap.")
    pasangan = [(c[i], c[i + 1]) for i in range(0, len(c), 2)]
    return _playfair_geser(pasangan, playfair_tabel(kunci), -1)

def determinan(M):
    n = len(M)
    if n == 1:
        return M[0][0]
    if n == 2:
        return M[0][0] * M[1][1] - M[0][1] * M[1][0]
    total = 0
    for j in range(n):
        minor = [baris[:j] + baris[j + 1:] for baris in M[1:]]
        total += ((-1) ** j) * M[0][j] * determinan(minor)
    return total

def invers_matriks_mod26(M):
    n = len(M)
    det = determinan(M) % 26
    det_inv = pow(det, -1, 26)
    adj = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            minor = [baris[:j] + baris[j + 1:] for k, baris in enumerate(M) if k != i]
            kofaktor = ((-1) ** (i + j)) * determinan(minor)
            adj[j][i] = kofaktor
    return [[(det_inv * adj[i][j]) % 26 for j in range(n)] for i in range(n)]

def hill_parse_kunci(teks):
    try:
        angka = [int(x) for x in teks.replace(",", " ").split()]
    except ValueError:
        raise ValueError("Kunci Hill harus berupa angka yang dipisah spasi, contoh: 3 3 2 5")
    n = math.isqrt(len(angka))
    if n * n != len(angka) or n not in (2, 3):
        raise ValueError("Kunci Hill harus 4 angka (matriks 2x2) atau 9 angka (matriks 3x3).")
    M = [[a % 26 for a in angka[i * n:(i + 1) * n]] for i in range(n)]
    det = determinan(M) % 26
    if math.gcd(det, 26) != 1:
        raise ValueError(
            f"Matriks tidak memiliki invers mod 26 (determinan = {det}; harus koprima dengan 26)."
        )
    return M

def _hill_proses(angka, M):
    n = len(M)
    hasil = []
    for i in range(0, len(angka), n):
        blok = angka[i:i + n]
        for r in range(n):
            hasil.append(sum(M[r][c] * blok[c] for c in range(n)) % 26)
    return hasil

def hill_enkripsi(teks, M):
    n = len(M)
    t = normalisasi(teks)
    if len(t) % n:
        t += "X" * (n - len(t) % n)        # padding X sampai kelipatan n
    return angka_ke_huruf(_hill_proses(huruf_ke_angka(t), M))

def hill_dekripsi(cipher, M):
    c = normalisasi(cipher)
    if len(c) % len(M):
        raise ValueError(f"Jumlah huruf ciphertext harus kelipatan {len(M)}.")
    return angka_ke_huruf(_hill_proses(huruf_ke_angka(c), invers_matriks_mod26(M)))

def xor_bytes(a, b):
    if len(a) != len(b):
        raise ValueError(f"Panjang byte harus sama ({len(a)} berbanding {len(b)}).")
    return bytes(x ^ y for x, y in zip(a, b))

def otp_buat_kunci(n):
    return secrets.token_bytes(n)

def keystream_lcg(seed, n):
    x = seed % 256
    hasil = bytearray(n)
    for i in range(n):
        x = (5 * x + 1) % 256
        hasil[i] = x
    return bytes(hasil)

def operation(mode: str, algorithm: str, text: str, key=None) -> dict:
    if mode not in ('encrypt', 'decrypt') or algorithm not in ('caesar','vigenere','playfair','hill','otp','stream'):
        raise ValueError('Profil Dika membutuhkan metode konkret dari enam algoritma.')
    encrypt = mode == 'encrypt'
    if not isinstance(text, str) or not text.strip():
        raise ValueError('Pesan tidak boleh kosong.')
    if not encrypt and (key is None or str(key).strip() == ''):
        raise ValueError('Dekripsi membutuhkan key pengirim.')
    if key is None or str(key).strip() == '':
        key = {'caesar': lambda: secrets.randbelow(25)+1,
               'vigenere': lambda: ''.join(secrets.choice(ALFABET) for _ in range(8)),
               'playfair': lambda: ''.join(secrets.choice(ALFABET) for _ in range(8)),
               'hill': lambda: '3 3 2 5',
               'otp': lambda: secrets.token_bytes(len(text.encode('utf-8'))).hex(),
               'stream': lambda: secrets.randbelow(256)}[algorithm]()
    notes = ['Profil CryptoZar Dika; cocokkan profil, metode dan key di kedua aplikasi.']
    if algorithm in ('otp','stream'):
        try:
            data = text.encode('utf-8') if encrypt else bytes.fromhex(''.join(text.lstrip('\ufeff').split()))
        except ValueError as exc:
            raise ValueError('Ciphertext profil Dika harus Hex lengkap (dua digit per byte).') from exc
        if algorithm == 'otp':
            try: pad = bytes.fromhex(''.join(str(key).lstrip('\ufeff').split()))
            except ValueError as exc: raise ValueError('Key OTP Dika harus berupa Hex.') from exc
            output = xor_bytes(data, pad)
            key = pad.hex()
            notes.append('OTP: key acak sepanjang byte pesan, jangan digunakan ulang.')
        else:
            if not re.fullmatch(r'[+-]?\d+', str(key).strip()):
                raise ValueError('Seed Stream LCG harus integer, bukan password.')
            key = int(str(key).strip()) % 256
            output = xor_bytes(data, keystream_lcg(key, len(data)))
            notes.append('LCG hanya untuk pembelajaran: 256 seed, tidak aman untuk data sensitif.')
        # Strict UTF-8 avoids silently replacing undecodable plaintext with U+FFFD.
        try: output = output.hex() if encrypt else output.decode('utf-8')
        except UnicodeDecodeError as exc:
            raise ValueError('Hasil bukan UTF-8; periksa profil, ciphertext dan key.') from exc
    else:
        if not normalisasi(text): raise ValueError('Pesan harus mengandung huruf A-Z.')
        notes.append('Huruf dibesarkan; spasi, angka dan tanda baca dihapus. Padding tetap dipertahankan.')
        if algorithm == 'caesar':
            if not re.fullmatch(r'[+-]?\d+', str(key).strip()): raise ValueError('Key Caesar harus integer.')
            key = int(str(key).strip()) % 26
            output = (caesar_enkripsi if encrypt else caesar_dekripsi)(text,key)
        elif algorithm in ('vigenere','playfair'):
            key = normalisasi(str(key))
            if not key: raise ValueError('Key harus mengandung huruf A-Z.')
            function = {('vigenere',True):vigenere_enkripsi,('vigenere',False):vigenere_dekripsi,
                        ('playfair',True):playfair_enkripsi,('playfair',False):playfair_dekripsi}[(algorithm,encrypt)]
            output = function(text,key)
            if algorithm == 'playfair': notes.append('J menjadi I; filler X, atau Q jika huruf sebelumnya X.')
        else:
            raw = str(key)
            # Flexible separators, while rejecting decimal and unexpected tokens.
            if not re.fullmatch(r'[\s,;\[\](){}+\-0-9]+', raw): raise ValueError('Hill: gunakan 4 atau 9 integer.')
            tokens = re.findall(r'[+-]?\d+',raw)
            matrix = hill_parse_kunci(' '.join(tokens))
            key = ' '.join(str(x) for row in matrix for x in row)
            output = (hill_enkripsi if encrypt else hill_dekripsi)(text,matrix)
            notes.append(f'Hill {len(matrix)}×{len(matrix)}, vektor kolom, padding X.')
    return {'success':True, 'algorithm':algorithm, 'profile':'cryptozar-dika', 'key':key,
            'ciphertext' if encrypt else 'plaintext':output, 'notes':notes}
