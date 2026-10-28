/* =============================================================================
   / — halaman depan, satu-satunya yang dilihat orang sebelum punya akun.

   Semua angka dan teks di sini datang dari server, tidak satu pun ditulis di
   program: harga tiket, batas akhir, rangkaian acara, dan sponsor. Itu yang
   membuat panitia bisa mengubahnya sendiri tanpa menghubungi anak web, dan
   itu juga syarat supaya pendaftaran bisa ditutup tanpa deploy ulang.

   Kalau `registrasi_dibuka` bernilai salah, tombol daftarnya tidak boleh tetap
   mengajak mendaftar. Di prototipe pertama saklar itu sudah dibaca tapi tidak
   pernah dipakai.
============================================================================= */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat } from '../../komponen/Keadaan';
import { useSesi } from '../../lib/sesi';
import type { Acara } from '../../types/api';

interface Sponsor {
  id: number;
  nama: string;
  logo_url: string;
  tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'MEDIA_PARTNER';
  url: string | null;
}

/** Server sudah mengelompokkan sponsor per tier, jadi tidak perlu disaring
 *  lagi di sini. Bentuknya objek, bukan daftar datar. */
type SponsorPerTier = Record<Sponsor['tier'], Sponsor[]>;

interface Isi {
  pengaturan: Record<string, unknown>;
  acara: Acara[];
  sponsor: SponsorPerTier;
}

// Empat tier, sesuai yang diterima database. Mockup baru menggambar tiga;
// Media Partner ikut di sini supaya Divisi Pendanaan tidak kehabisan tempat
// waktu menjualnya.
const TIER: { kunci: Sponsor['tier']; label: string; tinggi: string; kolom: string }[] = [
  { kunci: 'PLATINUM', label: 'Platinum', tinggi: 'h-20', kolom: 'grid-cols-2' },
  { kunci: 'GOLD', label: 'Gold', tinggi: 'h-16', kolom: 'grid-cols-3' },
  { kunci: 'SILVER', label: 'Silver', tinggi: 'h-12', kolom: 'grid-cols-4' },
  { kunci: 'MEDIA_PARTNER', label: 'Media Partner', tinggi: 'h-12', kolom: 'grid-cols-4' },
];

export default function Landing() {
  const { masuk } = useSesi();
  const [slide, setSlide] = useState(0);
  const { data, memuat } = useMuat<Isi>(async (signal) => {
    const [pengaturan, acara, sponsor] = await Promise.all([
      api
        .get<Record<string, unknown>>('/settings/publik', { signal, tanpaLogin: true })
        .catch(() => ({}) as Record<string, unknown>),
      api.get<Acara[]>('/events', { signal, tanpaLogin: true }).catch(() => []),
      api
        .get<SponsorPerTier>('/sponsors', { signal, tanpaLogin: true })
        .catch(() => ({}) as SponsorPerTier),
    ]);
    return { pengaturan, acara: acara ?? [], sponsor: sponsor ?? ({} as SponsorPerTier) };
  }, []);

  if (memuat) return <Memuat />;

  const harga = data?.pengaturan?.harga_tampil as string | undefined;
  const batas = data?.pengaturan?.batas_akhir_pembayaran as string | undefined;
  const dibuka = data?.pengaturan?.registrasi_dibuka !== false;

  const namaAcara = (data?.acara ?? []).map((a) => a.nama).filter(Boolean);

  return (
    <div className="pb-14">
      {/* -------------------------------------------------------------------
          Hero. Fotonya dipotong dari mockup Figma, dan logo CGTK menumpuk di
          tepi bawahnya persis seperti di gambar.

          Panah kiri-kanan di mockup itu carousel. Fotonya cuma ada satu, jadi
          yang digeser adalah nama rangkaian acara dari server. Panah yang
          tidak melakukan apa-apa lebih buruk daripada tidak ada panah.
      ------------------------------------------------------------------- */}
      <section className="relative">
        <div className="relative h-[46vw] max-h-80 min-h-44 w-full overflow-hidden">
          <img
            src="/hero-kampoeng.jpg"
            alt=""
            className="h-full w-full object-cover"
          />

          {namaAcara.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Sebelumnya"
                onClick={() => setSlide((n) => (n - 1 + namaAcara.length) % namaAcara.length)}
                className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 text-white"
              >
                &#8249;
              </button>
              <button
                type="button"
                aria-label="Berikutnya"
                onClick={() => setSlide((n) => (n + 1) % namaAcara.length)}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 text-white"
              >
                &#8250;
              </button>
            </>
          )}

          {namaAcara[slide] && (
            <p className="absolute inset-x-0 bottom-3 px-14 text-center text-sm font-bold text-white drop-shadow">
              {namaAcara[slide]}
            </p>
          )}
        </div>

        <img
          src="/logo-cgtk.png"
          alt="CGTK"
          className="relative z-10 mx-auto -mt-10 w-48 max-w-[55%] sm:w-64"
        />
      </section>

      {/* Tulisan raksasa Campus Goes To Kampoeng di belakang isi halaman,
          seperti di mockup. aria-hidden: buat pembaca layar ini cuma
          pengulangan nama acara yang sudah disebut di tempat lain. */}
      <div className="relative overflow-hidden px-6 pt-4">
        <p
          aria-hidden
          className="pointer-events-none absolute -left-6 top-6 select-none text-[22vw] font-black leading-[0.82] tracking-tight text-slate-900/[0.045] sm:text-[9rem]"
        >
          Campus
          <br />
          Goes
          <br />
          To
          <br />
          Kampoeng
        </p>

        <div className="relative mx-auto max-w-5xl">
          <h1 className="judul-tebal text-[2.7rem] sm:text-6xl">Selamat Datang !</h1>

          <p className="mt-2 max-w-sm text-base leading-snug text-slate-700">
            {masuk
              ? 'Senang kamu kembali. Lanjutkan dari dashboard kamu.'
              : 'Sepertinya anda belum memiliki akun silahkan masuk atau daftar'}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {masuk ? (
              <Link to="/dashboard" className="tombol-utama px-7 py-3 text-[15px]">
                Buka Dashboard &gt;
              </Link>
            ) : dibuka ? (
              <Link to="/masuk" className="tombol-utama px-7 py-3 text-[15px]">
                Masuk atau Daftar &gt;
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-full bg-slate-200 px-7 py-3 text-[15px] font-bold text-slate-500">
                Pendaftaran Ditutup
              </span>
            )}

            <Link
              to="/cek-status"
              className="rounded-full border border-slate-300 px-7 py-3 text-[15px] font-bold text-slate-700"
            >
              Cek Status
            </Link>
          </div>

          {(harga || batas) && (
            <p className="mt-4 text-sm text-slate-500">
              {harga && <span className="font-bold text-merek-magenta">{harga}</span>}
              {harga && batas && ' · '}
              {batas && <>Pendaftaran ditutup {batas}</>}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-5xl space-y-12 px-4">
      {(data?.acara ?? []).length > 0 && (
        <section>
          <h2 className="text-lg font-bold">Rangkaian Acara</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(data?.acara ?? [])
              .sort((a, b) => a.urutan - b.urutan)
              .map((a) => (
                <li
                  key={a.id}
                  className="kartu ring-1 ring-slate-200 p-4 dark:border-slate-800"
                >
                  <span className="rounded bg-utama-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-utama-700 dark:bg-utama-900/40 dark:text-utama-100">
                    Acara {a.urutan}
                  </span>
                  <h3 className="mt-2 font-bold">{a.nama}</h3>
                  {a.tanggal && (
                    <p className="mt-0.5 text-xs text-slate-500">{a.tanggal}</p>
                  )}
                </li>
              ))}
          </ul>
        </section>
      )}

      {Object.values(data?.sponsor ?? {}).some((v) => v.length > 0) && (
        <section>
          <h2 className="text-lg font-bold">Didukung Oleh</h2>
          <div className="mt-4 space-y-6">
            {TIER.map((t) => {
              const isi = data?.sponsor?.[t.kunci] ?? [];
              if (isi.length === 0) return null;
              return (
                <div key={t.kunci}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t.label}
                  </p>
                  <div className={`grid gap-3 ${t.kolom}`}>
                    {isi.map((s) => (
                      <div
                        key={s.id}
                        className={`flex ${t.tinggi} items-center justify-center rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800`}
                      >
                        <img
                          src={s.logo_url}
                          alt={s.nama}
                          loading="lazy"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
