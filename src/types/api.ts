/* =============================================================================
   Bentuk jawaban dari backend.

   SETIAP endpoint menjawab dengan bentuk yang sama, tanpa kecuali:

     berhasil  ->  { "sukses": true,  "data": ..., "meta": {...} }
     gagal     ->  { "sukses": false, "error": { "kode", "pesan", "detail" } }

   Perhatikan pesan error ada di  error.pesan , bukan di  pesan .
   Ini yang paling sering keliru. Tapi kalian nggak perlu mikirin itu,
   src/lib/api.ts sudah membongkarnya untuk kalian.
============================================================================= */

export interface Meta {
  halaman?: number;
  per_halaman?: number;
  total?: number;
  total_halaman?: number;
  [k: string]: unknown;
}

export interface JawabanSukses<T> {
  sukses: true;
  data: T;
  meta?: Meta;
}

export interface JawabanGagal {
  sukses: false;
  error: { kode: string; pesan: string; detail?: unknown };
}

export type Jawaban<T> = JawabanSukses<T> | JawabanGagal;

/* -----------------------------------------------------------------------------
   Tipe data yang dipakai lebih dari satu orang.
   Kalau tipe cuma dipakai di halamanmu sendiri, taruh di file halamanmu saja.
   Sumbernya 04-API-CONTRACT.md. Kalau ada yang beda, API Contract yang benar.
----------------------------------------------------------------------------- */

export type StatusSesi = 'DRAFT' | 'ACTIVE' | 'CLOSED';

export type StatusPendaftaran =
  | 'PROFIL_BELUM_LENGKAP'
  | 'MENUNGGU_PEMBAYARAN'
  | 'LUNAS'
  | 'DIBATALKAN';

export interface Halaman {
  slug: string;
  judul: string;
  isi: string;
}

export interface Acara {
  id: number;
  nama: string;
  tipe: 'PEMBUKAAN' | 'EXPO_KAMPUS' | 'EXPO_JURUSAN' | 'PENUTUPAN' | 'LAINNYA';
  tanggal: string;
  deskripsi: string | null;
  urutan: number;
}

export interface Sesi {
  id: number;
  event_id: number;
  nama: string;
  lokasi: string | null;
  jam_mulai: string | null;
  jam_selesai: string | null;
  status: StatusSesi;
  xp: number;
  wajib_presensi: boolean;
  urutan: number;
  saya_sudah_hadir?: boolean;
}

export type JenisKampus = 'NEGERI' | 'SWASTA' | 'KEDINASAN';

export interface Kampus {
  id: number;
  nama: string;
  singkatan: string;
  logo_url: string | null;
  kota: string | null;
  akreditasi: string | null;
  website: string | null;
  warna_khas: string | null;
  /** Boleh null: Divisi Acara belum tentu mengisinya. Yang null tetap tampil
   *  di tombol "Semua", cuma tidak muncul waktu disaring. */
  jenis: JenisKampus | null;
  jumlah_alumni: number;
}

/**
 * Saringan halaman direktori kampus.
 *
 *   api.get<Kampus[]>('/universities?jenis=NEGERI')
 *   api.get<Kampus[]>('/universities?rumpun=Kesehatan')
 *   api.get<Kampus[]>('/universities?cari=tekno&jenis=SWASTA')
 *
 * `rumpun` isinya nama rumpun dari `GET /majors/rumpun`, bukan dikarang di
 * program. Hasilnya kampus yang punya minimal satu jurusan di rumpun itu.
 */
export interface SaringanKampus {
  cari?: string;
  jenis?: JenisKampus;
  rumpun?: string;
}
