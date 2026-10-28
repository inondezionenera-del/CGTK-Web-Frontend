/* =============================================================================
   /alumni/sertifikat — sertifikat dan rekap alumni, dalam satu halaman.

   Alumni datang dengan biaya sendiri dan tidak dibayar. Sertifikat ini satu
   hal konkret yang mereka bawa pulang, dan yang membuat mereka mau diundang
   lagi tahun depan. Jadi dia bukan tempelan: dibuat supaya layak dicetak dan
   layak diunggah ke LinkedIn.

   Dicetak lewat window.print dengan aturan @media print, bukan dengan membuat
   PDF di server. Server tidak punya pustaka PDF, dan menambahkannya cuma untuk
   satu halaman ini berarti satu ketergantungan lagi yang harus dijaga sampai
   hari acara. Hasil cetak browser ke PDF sudah setara.

   Rekap ditaruh di halaman yang sama dan baru muncul kalau angkanya sudah ada.
   Sebelum acara dimulai semuanya nol, dan halaman penuh angka nol terlihat
   seperti halaman yang rusak.
============================================================================= */

import { api } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError } from '../../komponen/Keadaan';

interface Sertifikat {
  nama?: string;
  kampus?: string;
  jurusan?: string;
  booth_dijaga: string[];
  jumlah_peserta_ditemui: number;
  tanggal: string;
  nomor_sertifikat: string;
}

interface Rekap {
  total_ditemui: number;
  menjadikan_kampus_ini_pilihan: number;
  per_booth: { booth: string; pengunjung: number }[];
  sekolah_teratas: { nama: string; jumlah: number }[];
}

interface Isi {
  sertifikat: Sertifikat;
  rekap: Rekap | null;
}

export default function SertifikatAlumni() {
  const { data, memuat, error, muatUlang } = useMuat<Isi>(async (signal) => {
    const sertifikat = await api.get<Sertifikat>('/alumni/sertifikat', { signal });
    const rekap = await api.get<Rekap>('/alumni/rekap', { signal }).catch(() => null);
    return { sertifikat, rekap };
  }, []);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;
  if (!data) return null;

  const s = data.sertifikat;
  const r = data.rekap;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <header className="print:hidden">
        <h1 className="judul-tebal text-[2rem]">Sertifikat</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tekan Cetak lalu pilih Simpan sebagai PDF kalau mau menyimpannya.
        </p>
      </header>

      {/* ------------------------------------------------------------------
          Lembar sertifikat. Ukuran dan jarak ditulis dalam satuan cetak
          supaya hasil di kertas tidak berbeda dari yang terlihat di layar.
      ------------------------------------------------------------------ */}
      <article className="kartu relative overflow-hidden p-8 text-center ring-4 ring-merek-navy print:ring-2">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
          <img src="/latar-air.jpg" alt="" className="h-full w-full object-cover" />
        </div>

        <div className="relative">
          <img src="/logo-cgtk.png" alt="CGTK" className="mx-auto w-32" />

          <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Sertifikat Penghargaan
          </p>

          <p className="mt-5 text-sm text-slate-600">Diberikan kepada</p>
          <p className="judul-tebal mt-1 text-3xl">{s.nama ?? 'Alumni'}</p>
          <p className="mt-1 text-sm font-bold text-slate-700">
            {[s.kampus, s.jurusan].filter(Boolean).join(' · ')}
          </p>

          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-slate-700">
            atas kesediaannya hadir sebagai alumni narasumber pada{' '}
            <span className="font-bold">Campus Goes To Kampoeng 2027</span>
            {s.booth_dijaga.length > 0 && (
              <>
                {' '}
                dan menjaga {s.booth_dijaga.join(', ')}
              </>
            )}
            {s.jumlah_peserta_ditemui > 0 && (
              <>
                , menemui{' '}
                <span className="font-bold">{s.jumlah_peserta_ditemui}</span> peserta
              </>
            )}
            .
          </p>

          <div className="mt-8 flex items-end justify-between text-left text-xs text-slate-500">
            <p>
              Nomor
              <br />
              <span className="font-mono font-bold text-slate-700">
                {s.nomor_sertifikat}
              </span>
            </p>
            <p className="text-right">
              Pamekasan, {s.tanggal}
              <br />
              <span className="font-bold text-slate-700">Panitia CGTK 2027</span>
            </p>
          </div>
        </div>
      </article>

      <button
        type="button"
        onClick={() => window.print()}
        className="tombol-utama w-full px-6 py-3.5 print:hidden"
      >
        Cetak Sertifikat
      </button>

      {/* Rekap. Hanya muncul kalau sudah ada yang datang. */}
      {r && r.total_ditemui > 0 && (
        <section className="kartu p-5 ring-1 ring-slate-200 print:hidden">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Rekap Kamu
          </h2>

          <div className="mt-2 flex flex-wrap gap-6">
            <p>
              <span className="block text-3xl font-black tabular-nums">
                {r.total_ditemui}
              </span>
              <span className="text-xs font-bold text-slate-500">peserta ditemui</span>
            </p>
            <p>
              <span className="block text-3xl font-black tabular-nums text-merek-magenta">
                {r.menjadikan_kampus_ini_pilihan}
              </span>
              <span className="text-xs font-bold text-slate-500">
                menjadikan kampusmu pilihan
              </span>
            </p>
          </div>

          {r.per_booth.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm">
              {r.per_booth.map((b) => (
                <li key={b.booth} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">{b.booth}</span>
                  <span className="shrink-0 font-bold tabular-nums">
                    {b.pengunjung}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {r.sekolah_teratas.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-500">Sekolah teratas</p>
              <ul className="mt-1 space-y-0.5 text-sm">
                {r.sekolah_teratas.map((x) => (
                  <li key={x.nama} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">{x.nama}</span>
                    <span className="shrink-0 font-bold tabular-nums">{x.jumlah}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
