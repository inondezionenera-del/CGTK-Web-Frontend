/* =============================================================================
   /cek-status — publik, tanpa login.

   Pembayaran terjadi di luar web dan dicatat manual, jadi selalu ada jeda
   antara peserta membayar dan statusnya berubah. Peserta yang membayar jam
   sebelas malam butuh cara memastikannya sendiri, tanpa harus menghubungi
   panitia satu per satu.

   Halaman ini bisa dibuka siapa pun yang memegang sebuah kode, jadi yang
   ditampilkan sengaja setipis mungkin: nama yang sudah disingkat dan statusnya.
   Tidak ada email, tidak ada sekolah, tidak ada nomor HP. Server juga membatasi
   percobaan per menit supaya kodenya tidak bisa ditebak satu per satu; kalau
   batas itu kena, pesannya datang dari server dan ditampilkan apa adanya.
============================================================================= */

import { useState } from 'react';
import { api, pesanDari } from '../../lib/api';
import type { StatusPublik, StatusPendaftaran } from '../../types/api';

const TAMPILAN: Record<
  StatusPendaftaran,
  { label: string; kelas: string; ikon: string }
> = {
  PROFIL_BELUM_LENGKAP: {
    label: 'Profil Belum Lengkap',
    kelas: 'border-hatihati-600 bg-hatihati-50 dark:bg-hatihati-700/10',
    ikon: '!',
  },
  MENUNGGU_PEMBAYARAN: {
    label: 'Menunggu Pembayaran',
    kelas: 'border-peringatan-400 bg-peringatan-50 dark:bg-peringatan-900/20',
    ikon: '...',
  },
  LUNAS: {
    label: 'Lunas',
    kelas: 'border-berhasil-600 bg-berhasil-50 dark:bg-berhasil-700/10',
    ikon: 'OK',
  },
  DIBATALKAN: {
    label: 'Dibatalkan',
    kelas: 'border-bahaya-600 bg-bahaya-50 dark:bg-bahaya-700/10',
    ikon: 'X',
  },
};

export default function CekStatus() {
  const [kode, setKode] = useState('');
  const [hasil, setHasil] = useState<StatusPublik | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jalan, setJalan] = useState(false);

  async function cek(e: React.FormEvent) {
    e.preventDefault();
    const bersih = kode.trim().toUpperCase();
    if (!bersih) return;

    setJalan(true);
    setError(null);
    setHasil(null);
    try {
      setHasil(
        await api.get<StatusPublik>(
          `/cek-status?kode=${encodeURIComponent(bersih)}`,
          { tanpaLogin: true },
        ),
      );
    } catch (err) {
      // Pesan dari server ditampilkan apa adanya: dia yang tahu bedanya kode
      // tidak ditemukan dan terlalu sering mencoba.
      setError(pesanDari(err));
    } finally {
      setJalan(false);
    }
  }

  const t = hasil ? TAMPILAN[hasil.status] : null;

  return (
    <div className="mx-auto max-w-md space-y-5 pb-10">
      <header>
        <h1 className="judul-tebal text-[2rem]">Cek Status Pendaftaran</h1>
        <p className="mt-1 text-sm text-slate-500">
          Masukkan kode registrasimu. Tidak perlu masuk akun.
        </p>
      </header>

      <form onSubmit={cek} className="space-y-3">
        <input
          value={kode}
          onChange={(e) => setKode(e.target.value)}
          placeholder="CGTK-XXXXXX"
          autoComplete="off"
          spellCheck={false}
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40 text-center font-mono text-lg uppercase tracking-widest"
        />
        <button
          type="submit"
          disabled={jalan || !kode.trim()}
          className="w-full rounded-2xl bg-utama-600 px-6 font-bold text-white transition hover:bg-utama-700 disabled:opacity-50"
        >
          {jalan ? 'Mengecek...' : 'Cek Status'}
        </button>
      </form>

      {error && (
        <div className="rounded-2xl border border-bahaya-600 bg-bahaya-50 p-4 text-sm text-bahaya-700 dark:bg-bahaya-700/10">
          {error}
        </div>
      )}

      {hasil && t && (
        <div className={`rounded-3xl border-2 p-6 text-center ${t.kelas}`}>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {t.ikon}
          </p>
          <p className="mt-1 text-xl font-black">{t.label}</p>
          <p className="mt-3 text-sm font-semibold">{hasil.nama}</p>
          <p className="font-mono text-xs text-slate-500">
            {hasil.kode_registrasi}
          </p>
          {hasil.pesan && (
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {hasil.pesan}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
