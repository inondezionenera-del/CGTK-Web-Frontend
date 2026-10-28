/* =============================================================================
   /admin/halaman — isi FAQ, Tentang, dan Ketentuan.

   Ketiganya saat ini berisi teks contoh empat belas karakter. Peserta yang
   membuka FAQ sekarang menemukan halaman yang jelas belum ditulis, dan itu
   hal pertama yang mereka lihat kalau bingung soal pembayaran.

   Ditulis dengan Markdown sederhana, dan yang penting dijelaskan di layar,
   bukan di dokumentasi yang tidak akan dibaca siapa pun: setiap baris yang
   diawali tanda pagar menjadi satu kartu pertanyaan di halaman FAQ. Tanpa
   penjelasan itu panitia akan menulis satu blok panjang, dan FAQ-nya jadi
   satu kartu raksasa.

   Ada pratinjau di sebelahnya, memakai pemecah yang sama persis dengan
   halaman aslinya, supaya tidak ada kejutan sesudah disimpan.
============================================================================= */

import { useState } from 'react';
import { api, pesanDari } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError } from '../../komponen/Keadaan';

interface Ringkas {
  slug: string;
  judul: string;
}

interface Halaman {
  slug: string;
  judul: string;
  isi: string;
  updated_at: string | null;
}

export default function AdminHalaman() {
  const { data, memuat, error, muatUlang } = useMuat<Ringkas[]>(
    (signal) => api.get<Ringkas[]>('/pages', { signal }),
    [],
  );

  const [slug, setSlug] = useState<string | null>(null);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const daftar = data ?? [];
  const terpilih = slug ?? daftar[0]?.slug ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <header className="text-center">
        <h1 className="judul-tebal text-[2rem]">Halaman Info</h1>
        <p className="mt-1 text-sm text-slate-500">
          Yang kamu tulis di sini langsung dibaca peserta.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {daftar.map((h) => (
          <button
            key={h.slug}
            type="button"
            onClick={() => setSlug(h.slug)}
            className={`rounded-full px-5 py-2 text-sm font-black ${
              terpilih === h.slug ? 'tombol-utama' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {h.judul}
          </button>
        ))}
      </div>

      {terpilih && <Penyunting key={terpilih} slug={terpilih} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Penyunting({ slug }: { slug: string }) {
  const { data, memuat, error, muatUlang } = useMuat<Halaman>(
    (signal) => api.get<Halaman>(`/pages/${slug}`, { signal }),
    [slug],
  );

  const [judul, setJudul] = useState<string | null>(null);
  const [isi, setIsi] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);
  const [tersimpan, setTersimpan] = useState(false);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;
  if (!data) return null;

  const judulKini = judul ?? data.judul;
  const isiKini = isi ?? data.isi ?? '';
  const berubah = judulKini !== data.judul || isiKini !== (data.isi ?? '');

  // Pemecah yang sama dengan HalamanInfo, supaya hitungan kartu di pratinjau
  // sama persis dengan yang akan dilihat peserta.
  const jumlahKartu = isiKini
    .split('\n')
    .filter((b) => /^\s{0,3}#{1,6}\s+\S/.test(b)).length;

  async function simpan() {
    setSibuk(true);
    setGagal(null);
    setTersimpan(false);
    try {
      await api.patch(`/pages/admin/${slug}`, { judul: judulKini, isi: isiKini });
      setTersimpan(true);
      muatUlang(false);
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(false);
    }
  }

  return (
    <section className="kartu space-y-4 p-5 ring-1 ring-slate-200">
      <div>
        <label htmlFor="judul-halaman" className="text-sm font-black">
          Judul
        </label>
        <input
          id="judul-halaman"
          value={judulKini}
          maxLength={160}
          onChange={(e) => setJudul(e.target.value)}
          className="isian mt-1 outline-none focus:ring-2 focus:ring-merek-magenta/40"
        />
      </div>

      <div>
        <label htmlFor="isi-halaman" className="text-sm font-black">
          Isi
        </label>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
          Baris yang diawali <span className="font-mono font-bold">#</span>{' '}
          menjadi satu pertanyaan. Baris di bawahnya menjadi jawabannya. Pakai{' '}
          <span className="font-mono font-bold">-</span> untuk poin dan{' '}
          <span className="font-mono font-bold">**tebal**</span> untuk menebalkan.
        </p>
        <textarea
          id="isi-halaman"
          rows={14}
          value={isiKini}
          onChange={(e) => setIsi(e.target.value)}
          placeholder={
            '# Berapa biaya pendaftarannya?\n' +
            'Rp25.000, sudah termasuk snack dan sertifikat.\n\n' +
            '# Bagaimana cara membayarnya?\n' +
            '- Buka halaman Bayar di akunmu\n' +
            '- Salin kode pendaftaranmu\n' +
            '- Tulis kode itu di form pembayaran'
          }
          className="isian mt-1.5 font-mono text-sm outline-none focus:ring-2 focus:ring-merek-magenta/40"
        />
        <p className="mt-1 flex justify-between text-xs text-slate-400">
          <span>
            {jumlahKartu > 0
              ? `${jumlahKartu} pertanyaan terdeteksi`
              : 'Belum ada baris berawalan # — semuanya akan jadi satu kartu'}
          </span>
          <span>{isiKini.length} karakter</span>
        </p>
      </div>

      {gagal && <PesanError pesan={gagal} />}
      {tersimpan && !berubah && (
        <p className="text-sm font-bold text-berhasil-700">Tersimpan.</p>
      )}

      <button
        type="button"
        disabled={!berubah || sibuk}
        onClick={() => void simpan()}
        className="tombol-utama w-full px-6 py-3.5 disabled:opacity-50"
      >
        {sibuk ? 'Menyimpan...' : 'Simpan'}
      </button>
    </section>
  );
}
