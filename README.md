# Purple Store Buyer Finder ♡

Dashboard monitoring tweet calon pembeli dengan React + Vite + Netlify Functions + TwitterAPI.io.

## Fitur
- Dashboard ringkasan dan kartu tweet
- Pencarian tweet melalui backend Netlify Function
- Filter keyword, hashtag, aplikasi, tanggal, dan status
- Pengaturan hashtag, keyword, aplikasi, template balasan
- Status Baru / Selesai / Diabaikan
- Deduplikasi berdasarkan tweet ID
- localStorage untuk pengaturan dan status lokal
- API key hanya dibaca di backend dari `TWITTERAPI_KEY`
- Mode demo berlabel, bila API belum terhubung

## Penting soal API
Function memakai endpoint pencarian lanjutan TwitterAPI.io:
`https://api.twitterapi.io/twitter/tweet/advanced_search`

Penyedia dapat mengubah parameter dan struktur respons. Function memeriksa beberapa kemungkinan field respons dan mengembalikan pesan error jika tidak dapat membaca hasil. Verifikasi dokumentasi terkini di https://docs.twitterapi.io/ jika respons API berbeda.

## Deploy ke Netlify
1. Buat repository GitHub dan upload seluruh isi folder proyek ini.
2. Import repository tersebut di Netlify.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Di Netlify → Site configuration / Environment variables, tambahkan:
   - Key: `TWITTERAPI_KEY`
   - Value: API key TwitterAPI.io milikmu
6. Deploy ulang.
7. Buka website → Settings → Test koneksi API → lakukan pencarian.

Jangan menaruh API key di React, source code frontend, localStorage, atau repository GitHub.

## Jalankan lokal
Instal Node.js LTS, lalu dari folder proyek:

```bash
npm install
npx netlify-cli dev
```

Tambahkan `TWITTERAPI_KEY` di environment lokal (atau file `.env` lokal yang tidak di-commit). Netlify CLI diperlukan supaya route function `/api/search-tweets` tersedia. `npm run dev` saja hanya menjalankan frontend dan tidak menjalankan Netlify Functions.

## Penyimpanan
localStorage menyimpan pengaturan, template, status, dan tweet yang sudah diambil di browser/perangkat yang sama. Tidak ada sinkronisasi antarperangkat dan tidak ada database. Data demo diberi label dan tidak dicampur dengan hasil API asli.

## Catatan
- Refresh otomatis default mati untuk mencegah kredit API terpakai tanpa sadar.
- Refresh manual tersedia; interval otomatis bisa diaktifkan di Settings.
- Tidak ada auto-reply/auto-comment.
- Hasil pencarian tergantung dukungan query dan kuota akun TwitterAPI.io.
