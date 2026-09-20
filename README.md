# Web App CGTK 2027 — Frontend

React + TypeScript + Vite + Tailwind. Satu aplikasi untuk semua halaman.

Kalau ada yang belum jelas setelah baca ini, baru tanya aku. Sebagian besar
pertanyaan jawabannya sudah ada di sini atau di `04-API-CONTRACT.md`.

---

## Mulai dari sini

```bash
npm install
cp .env.example .env     # isinya minta ke Rafly
npm run dev              # buka http://localhost:5173
```

Kalau `npm run dev` langsung mati sambil bilang `VITE_SUPABASE_URL belum diisi`,
berarti `.env` belum dibuat atau masih kosong. Itu memang sengaja, supaya
ketahuan sekarang, bukan nanti pas halamannya sudah jadi setengah.

`npm run cek` untuk memeriksa TypeScript tanpa menjalankan apa pun.
`npm run build` untuk memastikan benar-benar bisa dibangun. **Jalankan ini
sebelum bikin Pull Request.**

---

## Isi foldernya

```
src/
├── lib/
│   ├── api.ts         satu-satunya pintu ke backend
│   ├── supabase.ts    login Google, cuma itu
│   ├── sesi.tsx       siapa yang sedang masuk
│   └── kait.ts        useMuat + useMuatUlangBerkala
├── types/api.ts       bentuk data yang dipakai bareng
├── komponen/          Memuat, PesanError, Kosong, Kerangka, WajibLogin
├── halaman/
│   ├── rijal/         ← contoh lengkap ada di sini
│   ├── fariz/
│   └── haqi/
└── App.tsx            peta semua alamat + siapa pemiliknya
```

**Baca `src/halaman/rijal/HalamanInfo.tsx` dulu sebelum mulai.** Itu contoh
utuh satu halaman, dari ambil data sampai menangani gagal. Sebagian besar
halaman bentuknya sama.

---

## Empat aturan yang nggak bisa ditawar

### 1. Data lewat `api`, bukan lewat `supabase`

```ts
// SALAH, dan pasti ditolak 401
const { data } = await supabase.from('universities').select();

// BENAR
const kampus = await api.get<Kampus[]>('/universities');
```

Supabase di sini **cuma untuk login Google**. Semua tabel sudah dikunci Row
Level Security, jadi mengambil data langsung dari browser pasti gagal, dan
gagalnya tidak menjelaskan apa-apa.

`api.get` juga sudah membongkar amplop jawabannya, jadi yang kamu terima
langsung isinya, bukan `{ sukses, data }`.

### 2. Tampilkan pesan error apa adanya

```tsx
// SALAH
catch { setError('Terjadi kesalahan'); }

// BENAR
catch (e) { setError(pesanDari(e)); }
```

Pesan dari server itu yang memberi tahu peserta harus berbuat apa. Kalau
ditutup kalimat umum, mereka cuma tahu gagal tanpa tahu kenapa, lalu chat
panitia satu per satu di hari-H.

### 3. Tidak ada angka atau teks tetap di dalam program

Harga tiket, nilai XP, jadwal, isi FAQ, pertanyaan form, data sponsor,
semuanya datang dari database supaya panitia bisa mengubahnya sendiri.

```tsx
// SALAH
const FAQ = 'Apa itu CGTK? CGTK adalah...';

// BENAR
const halaman = await api.get<Halaman>('/pages/faq');
```

Pull Request yang melanggar ini ditolak.

### 4. Status sesi dari `status`, bukan dari jam

```ts
// SALAH
const live = sekarang >= sesi.jam_mulai && sekarang <= sesi.jam_selesai;

// BENAR
const live = sesi.status === 'ACTIVE';
```

Jadwal acara pasti bergeser di lapangan, telat dua puluh menit itu normal.
Kalau badge LIVE dihitung dari jam, badge-nya salah setiap kali jadwal geser,
dan peserta datang ke ruangan yang salah.

---

## Muat ulang berkala

Halaman yang datanya bisa berubah sendiri (jadwal, pengumuman, statistik)
disegarkan berkala, **tapi berhenti kalau layarnya tidak sedang dibuka**:

```tsx
const { data, muatUlang } = useMuat(...);
useMuatUlangBerkala(muatUlang, 60_000);
```

`useMuatUlangBerkala` sudah mengurus `document.hidden` untuk kamu. Jangan
pakai `setInterval` sendiri. Kalau HP peserta ada di saku dan halaman tetap
memanggil API tiap menit, baterai dan kuota mereka habis percuma.

---

## Cara kerja di Git

```
main
 └─ feat/nama-kamu/apa-yang-dikerjain
```

| Aturan | Isi |
|---|---|
| Jangan push langsung ke `main` | selalu lewat Pull Request |
| Nama branch | `feat/rijal/direktori-kampus` |
| Satu PR satu halaman | PR isi empat halaman tidak bisa direview benar |
| Sebelum bikin PR | jalankan `npm run build` sampai lolos |
| Yang review | Rafly |

Kenapa satu PR satu halaman: kalau satu PR isinya empat halaman, aku tidak
bisa menolak satu tanpa ikut menahan tiga lainnya.

---

## Yang bebas kalian pilih

Komponen UI, ikon, pustaka tanggal, pengelola state. Tapi **satu tim satu
pilihan**. Kalau Fariz pakai satu dan Haqi pakai yang lain, halaman kalian
tidak akan nyambung. Sepakati di grup, lalu tulis di sini.

Sudah dipilihkan: router pakai `react-router-dom`, jangan diganti.

---

## Kunci dan rahasia

`VITE_SUPABASE_ANON_KEY` aman ada di browser, itu memang gunanya. Yang **tidak
boleh** sampai ke sini itu `service_role`, JWT secret, dan alamat database.

Kalau kalian merasa butuh salah satu dari itu di frontend, berarti endpoint-nya
yang kurang. Bilang ke aku, jangan diakalin.

`.env` sudah masuk `.gitignore`. Jangan dikeluarkan dari situ.

---

## Rujukan

| Butuh apa | Lihat di |
|---|---|
| Bentuk semua endpoint dan contoh jawabannya | `04-API-CONTRACT.md` |
| Ketentuan teknis dan pembagian tugas | `06-KETENTUAN-TEKNIS.md` |
| Lembar tugas masing-masing | `tugas/TUGAS-*.md` |
| Peta halaman dan hak akses | `02-DIAGRAM.md` no. 4 dan 27 |

---

## Kontak

Rafly Pratama Hudzaifah Al Syahbani
WhatsApp [+62 895-2353-4113](https://wa.me/6289523534113)
