# Portofolio Satrio Puji Danutirto

Web portofolio statis (HTML, CSS, JavaScript murni, tanpa build step) yang siap di-deploy ke **GitHub Pages**.

```
.
├── index.html                      # semua konten halaman
├── .nojekyll                       # supaya GitHub Pages menyajikan file apa adanya
└── assets/
    ├── css/style.css               # warna, tipografi, layout (token warna ada di :root)
    ├── js/main.js                  # tema gelap/terang, menu mobile, visual interaktif di hero
    ├── favicon.svg
    └── CV_Satrio_Puji_Danutirto.pdf
```

## Deploy ke GitHub Pages

### Opsi A: alamat utama `https://hokimastah.github.io` (disarankan)

1. Di GitHub, buat repository **public** baru bernama persis `Hokimastah.github.io`.
2. Upload semua isi folder ini ke repository tersebut:
   - **Lewat browser:** buka repo, klik **Add file → Upload files**, lalu seret semua file dan folder (termasuk `.nojekyll`). Klik **Commit changes**.
   - **Lewat terminal:**
     ```bash
     cd portfolio
     git init
     git add .
     git commit -m "Add portfolio site"
     git branch -M main
     git remote add origin https://github.com/Hokimastah/Hokimastah.github.io.git
     git push -u origin main
     ```
3. Buka **Settings → Pages**. Pada **Build and deployment**, pilih **Source: Deploy from a branch**, branch **main**, folder **/ (root)**, lalu **Save**.
4. Tunggu 1 sampai 2 menit, lalu buka `https://hokimastah.github.io`.

### Opsi B: nama repository bebas

Buat repo dengan nama apa pun (misalnya `portfolio`) dan ikuti langkah yang sama. Situs akan tampil di `https://hokimastah.github.io/portfolio/`. Semua path di situs ini relatif, jadi tidak ada yang perlu diubah.

> Catatan: file `.nojekyll` diawali titik, sehingga bisa tersembunyi di File Explorer/Finder. Pastikan file ini ikut ter-upload.

## Mengubah konten

| Yang ingin diubah | Lokasi |
| --- | --- |
| Teks, proyek, pengalaman, tautan | `index.html` (setiap bagian diberi komentar seperti `<!-- Experience -->`) |
| Warna tema terang/gelap | `assets/css/style.css`, blok `:root` di bagian atas |
| Font | tag `<link>` Google Fonts di `index.html` dan variabel `--font-display` / `--font-body` |
| CV | ganti `assets/CV_Satrio_Puji_Danutirto.pdf` dengan file baru bernama sama |
| Visual hero (jumlah kelas, sesi) | konstanta `SESSIONS` dan `PER_CLASS` di `assets/js/main.js` |

**Menambah proyek baru:** salin satu blok `<article class="project">…</article>` di bagian *Selected work*, lalu ganti isinya.

**Menyembunyikan nomor WhatsApp:** hapus baris `<li><a href="https://wa.me/...">WhatsApp</a></li>` di bagian *Contact*.

## Uji di komputer sendiri

Cukup buka `index.html` di browser. Atau jalankan server lokal:

```bash
python -m http.server 8000
# lalu buka http://localhost:8000
```

## Fitur

- Responsif dari ponsel 320 px sampai layar lebar
- Tema gelap/terang otomatis mengikuti sistem, dengan tombol untuk mengganti
- Visual interaktif SAWIT-Net di hero: tambahkan kelas baru dan bandingkan *fine-tune* biasa dengan SAWIT-Net
- Bisa dipakai dengan keyboard, fokus terlihat jelas, dan menghormati pengaturan *reduced motion*
- Tanpa framework dan tanpa build step, sehingga cepat dimuat dan mudah diedit
