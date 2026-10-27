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

import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat } from '../../komponen/Keadaan';
import type { Acara } from '../../types/api';

interface Sponsor {
  id: number;
  nama: string;
  logo_url: string;
  tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'MEDIA_PARTNER';
  url: string | null;
}

interface Isi {
  pengaturan: Record<string, unknown>;
  acara: Acara[];
  sponsor: Sponsor[];
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
  const { data, memuat } = useMuat<Isi>(async (signal) => {
    const [pengaturan, acara, sponsor] = await Promise.all([
      api
        .get<Record<string, unknown>>('/settings/publik', { signal, tanpaLogin: true })
        .catch(() => ({}) as Record<string, unknown>),
      api.get<Acara[]>('/events', { signal, tanpaLogin: true }).catch(() => []),
      api.get<Sponsor[]>('/sponsors', { signal, tanpaLogin: true }).catch(() => []),
    ]);
    return { pengaturan, acara: acara ?? [], sponsor: sponsor ?? [] };
  }, []);

  if (memuat) return <Memuat />;

  const harga = data?.pengaturan?.harga_tampil as string | undefined;
  const batas = data?.pengaturan?.batas_akhir_pembayaran as string | undefined;
  const dibuka = data?.pengaturan?.registrasi_dibuka !== false;

  return (
    <div className="space-y-12 pb-10">
      <section className="kartu overflow-hidden border border-slate-200 text-center dark:border-slate-800">
        <div className="bg-linear-to-br from-merek-navy via-merek-magenta to-merek-oranye px-6 py-14">
          <p className="text-3xl font-black tracking-tight text-white sm:text-5xl">
            CGTK 2027
          </p>
          <p className="mt-3 text-sm font-semibold text-white/90">
            Campus Goes To Kampoeng
          </p>
        </div>

        <div className="px-6 py-8">
          <h1 className="text-2xl font-black sm:text-3xl">
            Cari tahu kampus dan jurusan yang benar-benar cocok
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-slate-600 dark:text-slate-300">
            Ikut kuis minat, datangi booth kampus dan jurusan, ngobrol langsung
            dengan alumninya, dan kumpulkan XP.
          </p>

          {harga && (
            <p className="mt-6 text-2xl font-black text-utama-700 dark:text-utama-100">
              {harga}
            </p>
          )}
          {batas && (
            <p className="mt-1 text-xs text-slate-500">
              Pendaftaran ditutup {batas}
            </p>
          )}

          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {dibuka ? (
              <Link to="/masuk" className="tombol-utama w-full px-8 py-3.5 sm:w-auto">
                Daftar Sekarang
              </Link>
            ) : (
              <span className="w-full cursor-not-allowed rounded-2xl bg-slate-200 px-8 py-3.5 font-bold text-slate-500 sm:w-auto dark:bg-slate-800">
                Pendaftaran Ditutup
              </span>
            )}
            <Link
              to="/cek-status"
              className="w-full rounded-2xl border border-slate-300 px-8 py-3.5 font-bold sm:w-auto dark:border-slate-700"
            >
              Cek Status
            </Link>
          </div>
        </div>
      </section>

      {(data?.acara ?? []).length > 0 && (
        <section>
          <h2 className="text-lg font-bold">Rangkaian Acara</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(data?.acara ?? [])
              .sort((a, b) => a.urutan - b.urutan)
              .map((a) => (
                <li
                  key={a.id}
                  className="kartu border border-slate-200 p-4 dark:border-slate-800"
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

      {(data?.sponsor ?? []).length > 0 && (
        <section>
          <h2 className="text-lg font-bold">Didukung Oleh</h2>
          <div className="mt-4 space-y-6">
            {TIER.map((t) => {
              const isi = (data?.sponsor ?? []).filter((s) => s.tier === t.kunci);
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
  );
}
