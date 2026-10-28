/* =============================================================================
   /admin/pengumuman — kirim pengumuman ke semua peserta.

   Peserta sudah bisa MEMBACA pengumuman sejak awal, tapi tidak ada satu pun
   layar untuk MENGIRIMNYA. Jadi fiturnya setengah: panitia yang perlu
   mengumumkan sesuatu di tengah acara tidak punya cara selain berteriak.

   Dua tingkat, dan bedanya besar di layar peserta:

     BIASA   muncul di daftar pengumuman, menunggu dibuka.
     DARURAT muncul sebagai lapisan yang menutupi layar peserta, di halaman
             apa pun yang sedang dia buka.

   Karena itu DARURAT selalu minta konfirmasi sekali lagi. Lima ratus HP yang
   tiba-tiba tertutup pengumuman "tes 123" tidak bisa ditarik kembali.

   Pengumuman tidak bisa dihapus dari sini, cuma dinonaktifkan. Yang pernah
   terkirim tetap tercatat, dan itu yang dibutuhkan waktu menyusun LPJ.
============================================================================= */

import { useState } from 'react';
import { api, pesanDari } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

interface Pengumuman {
  id: number;
  judul: string;
  isi: string;
  tingkat: 'BIASA' | 'DARURAT';
  aktif?: boolean;
  created_at: string;
}

export default function AdminPengumuman() {
  const { data, memuat, error, muatUlang } = useMuat<Pengumuman[]>(
    (signal) => api.get<Pengumuman[]>('/announcements', { signal }),
    [],
  );

  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [tingkat, setTingkat] = useState<'BIASA' | 'DARURAT'>('BIASA');
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);
  const [terkirim, setTerkirim] = useState<string | null>(null);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const siap = judul.trim().length >= 2 && isi.trim().length >= 2;

  async function kirim() {
    setSibuk(true);
    setGagal(null);
    setTerkirim(null);
    try {
      await api.post('/announcements/admin', {
        judul: judul.trim(),
        isi: isi.trim(),
        tingkat,
      });
      setTerkirim(judul.trim());
      setJudul('');
      setIsi('');
      setTingkat('BIASA');
      setKonfirmasi(false);
      muatUlang(false);
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(false);
    }
  }

  async function matikan(p: Pengumuman) {
    setGagal(null);
    try {
      await api.patch(`/announcements/admin/${p.id}`, { aktif: false });
      muatUlang(false);
    } catch (e) {
      setGagal(pesanDari(e));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <header className="text-center">
        <h1 className="judul-tebal text-[2rem]">Kirim Pengumuman</h1>
        <p className="mt-1 text-sm text-slate-500">
          Peserta menerimanya paling lama tiga puluh detik setelah dikirim.
        </p>
      </header>

      {gagal && <PesanError pesan={gagal} />}

      {terkirim && (
        <p className="kartu p-4 text-sm font-bold text-berhasil-700 ring-2 ring-berhasil-600/40">
          Terkirim: {terkirim}
        </p>
      )}

      <section className="kartu space-y-4 p-5 ring-1 ring-slate-200">
        <div>
          <label htmlFor="judul" className="text-sm font-black">
            Judul
          </label>
          <input
            id="judul"
            value={judul}
            maxLength={160}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Sesi Sharing Kampus dimulai 10 menit lagi"
            className="isian mt-1 outline-none focus:ring-2 focus:ring-merek-magenta/40"
          />
        </div>

        <div>
          <label htmlFor="isi" className="text-sm font-black">
            Isi
          </label>
          <textarea
            id="isi"
            rows={4}
            value={isi}
            maxLength={2000}
            onChange={(e) => setIsi(e.target.value)}
            placeholder="Semua peserta diharap menuju Aula Utama."
            className="isian mt-1 outline-none focus:ring-2 focus:ring-merek-magenta/40"
          />
          <p className="mt-1 text-right text-xs text-slate-400">
            {isi.length}/2000
          </p>
        </div>

        <div>
          <p className="text-sm font-black">Tingkat</p>
          <div className="mt-1.5 flex gap-2">
            {(['BIASA', 'DARURAT'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTingkat(t);
                  setKonfirmasi(false);
                }}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-black ${
                  tingkat === t
                    ? t === 'DARURAT'
                      ? 'bg-bahaya-600 text-white'
                      : 'tombol-utama'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            {tingkat === 'DARURAT'
              ? 'Menutupi layar semua peserta di halaman mana pun yang sedang mereka buka.'
              : 'Masuk ke daftar pengumuman. Peserta membukanya sendiri.'}
          </p>
        </div>

        {/* Konfirmasi kedua khusus DARURAT. */}
        {tingkat === 'DARURAT' && siap && !konfirmasi ? (
          <button
            type="button"
            onClick={() => setKonfirmasi(true)}
            className="w-full rounded-full bg-bahaya-600 px-6 py-3.5 font-black text-white"
          >
            Lanjut, ini pengumuman darurat
          </button>
        ) : (
          <button
            type="button"
            disabled={!siap || sibuk}
            onClick={() => void kirim()}
            className={`w-full px-6 py-3.5 font-black disabled:opacity-50 ${
              tingkat === 'DARURAT'
                ? 'rounded-full bg-bahaya-600 text-white'
                : 'tombol-utama'
            }`}
          >
            {sibuk
              ? 'Mengirim...'
              : tingkat === 'DARURAT'
                ? 'Kirim sekarang ke semua peserta'
                : 'Kirim Pengumuman'}
          </button>
        )}
      </section>

      <section>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Sudah Terkirim
        </h2>
        {(data ?? []).length === 0 ? (
          <Kosong
            judul="Belum ada pengumuman"
            keterangan="Yang kamu kirim akan muncul di sini."
          />
        ) : (
          <ul className="mt-2 space-y-2">
            {(data ?? []).map((p) => (
              <li key={p.id} className="kartu p-4 ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black">{p.judul}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">
                      {p.isi}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${
                      p.tingkat === 'DARURAT'
                        ? 'bg-bahaya-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {p.tingkat}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => void matikan(p)}
                  className="mt-3 text-xs font-bold text-slate-500 underline"
                >
                  Hentikan tampilkan
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
