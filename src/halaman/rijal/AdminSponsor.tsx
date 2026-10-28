/* =============================================================================
   /admin/sponsor — Divisi Pendanaan dan PDD.

   Urutan memakai kolom angka, bukan tarik-dan-lepas. Tarik-dan-lepas terlihat
   sepele tapi termasuk yang paling makan waktu di frontend: harus jalan di HP,
   tahan ditarik cepat, dan menyimpan urutan baru. Isinya paling cuma sepuluh
   sampai dua puluh logo, dan yang benar-benar menentukan bagi sponsor itu tier
   dan ukuran logonya, bukan nomor urutnya di dalam tier.

   Empat tier, termasuk Media Partner. Mockup baru menggambar tiga.

   Penempatan Dashboard, Papan Peringkat, dan Kosmetik baru benar-benar tampil
   kalau Super Admin menyalakan slot sponsor. Itu dikatakan di formnya supaya
   Pendanaan tidak mengira pilihannya tidak tersimpan.
============================================================================= */

import { useState } from 'react';
import { api, pesanDari } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

type Tier = 'PLATINUM' | 'GOLD' | 'SILVER' | 'MEDIA_PARTNER';

interface Sponsor {
  id: number;
  nama: string;
  logo_url: string;
  tier: Tier;
  url: string | null;
  urutan: number;
  penempatan: string[];
  aktif: boolean;
}

const TIER: { nilai: Tier; label: string }[] = [
  { nilai: 'PLATINUM', label: 'Platinum' },
  { nilai: 'GOLD', label: 'Gold' },
  { nilai: 'SILVER', label: 'Silver' },
  { nilai: 'MEDIA_PARTNER', label: 'Media Partner' },
];

const PENEMPATAN = [
  { nilai: 'landing', label: 'Landing' },
  { nilai: 'footer', label: 'Footer' },
  { nilai: 'dashboard', label: 'Dashboard', butuhSaklar: true },
  { nilai: 'leaderboard', label: 'Papan Peringkat', butuhSaklar: true },
  { nilai: 'kosmetik', label: 'Halaman Kosmetik', butuhSaklar: true },
];

export default function AdminSponsor() {
  const { data, memuat, error, muatUlang } = useMuat<Sponsor[]>(
    (signal) => api.get<Sponsor[]>('/sponsors/admin', { signal }),
    [],
  );

  const [sibuk, setSibuk] = useState<number | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);

  async function ubah(s: Sponsor, perubahan: Partial<Sponsor>) {
    setSibuk(s.id);
    setGagal(null);
    try {
      await api.patch(`/sponsors/admin/${s.id}`, perubahan);
      muatUlang(false);
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(null);
    }
  }

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      <header>
        <h1 className="judul-tebal text-[2rem]">Kelola Sponsor</h1>
        <p className="mt-1 text-sm text-slate-500">
          Divisi Pendanaan dan PDD. Urutan diatur dengan angka, tier menentukan
          ukuran logonya.
        </p>
      </header>

      {gagal && <PesanError pesan={gagal} />}

      {(data ?? []).length === 0 ? (
        <Kosong
          judul="Belum ada sponsor"
          keterangan="Tambahkan lewat tombol di halaman admin."
        />
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((s) => (
            <li
              key={s.id}
              className={`kartu border p-4 ${
                s.aktif
                  ? 'border-slate-200 dark:border-slate-800'
                  : 'border-slate-200 opacity-60 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <img
                  src={s.logo_url}
                  alt=""
                  loading="lazy"
                  className="h-12 w-20 shrink-0 rounded object-contain"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{s.nama}</p>
                  <p className="text-xs text-slate-500">
                    {TIER.find((t) => t.nilai === s.tier)?.label ?? s.tier}, urutan{' '}
                    {s.urutan}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Tampil di: {(s.penempatan ?? []).join(', ') || 'belum diatur'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={sibuk === s.id}
                  onClick={() => void ubah(s, { aktif: !s.aktif })}
                  className={`shrink-0 rounded-xl px-4 text-xs font-bold ${
                    s.aktif
                      ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                      : 'tombol-utama'
                  }`}
                >
                  {s.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="text-xs font-semibold">
                  Urutan
                  <input
                    type="number"
                    defaultValue={s.urutan}
                    min={1}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (n !== s.urutan && Number.isFinite(n)) {
                        void ubah(s, { urutan: n });
                      }
                    }}
                    className="ml-2 w-20 rounded-lg border border-slate-300 px-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </label>

                <select
                  defaultValue={s.tier}
                  onChange={(e) => void ubah(s, { tier: e.target.value as Tier })}
                  className="rounded-lg border border-slate-300 px-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  {TIER.map((t) => (
                    <option key={t.nilai} value={t.nilai}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {PENEMPATAN.map((p) => {
                  const aktif = (s.penempatan ?? []).includes(p.nilai);
                  return (
                    <button
                      key={p.nilai}
                      type="button"
                      disabled={sibuk === s.id}
                      onClick={() =>
                        void ubah(s, {
                          penempatan: aktif
                            ? (s.penempatan ?? []).filter((x) => x !== p.nilai)
                            : [...(s.penempatan ?? []), p.nilai],
                        })
                      }
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        aktif
                          ? 'bg-utama-600 text-white'
                          : 'border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {p.label}
                      {p.butuhSaklar && <span className="ml-1 opacity-70">*</span>}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900">
        Penempatan bertanda * baru benar-benar tampil kalau Super Admin
        menyalakan slot sponsor. Pilihanmu tetap tersimpan sebelum itu.
      </p>
    </div>
  );
}
