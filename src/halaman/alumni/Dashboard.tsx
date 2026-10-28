/* =============================================================================
   /alumni — beranda alumni booth.

   Alumni itu tamu, bukan panitia. Mereka datang dengan biaya sendiri, duduk
   seharian di satu meja, dan tidak mendapat apa pun kalau harinya tidak dibuat
   berharga. Karena itu halaman ini bukan cuma tombol scan.

   Tiga hal yang harus ada di layar pertama, karena alumni tidak pernah ikut
   briefing panitia:

     1. Di mana mejanya. Tanpa ini mereka berputar-putar di hari pertama.
     2. Siapa LO yang bisa dihubungi kalau ada apa-apa.
     3. Apa yang harus dikerjakan, berurutan.

   Statistik yang ditampilkan HANYA booth-nya sendiri. Tidak ada rata-rata,
   tidak ada perbandingan, tidak ada peringkat antaralumni. Booth jurusan yang
   sepi bukan salah orang yang menjaganya, dan membandingkan mereka akan
   merusak satu-satunya hubungan yang paling ingin kita jaga untuk tahun depan.
============================================================================= */

import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useMuat, useMuatUlangBerkala } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

interface BoothAlumni {
  id?: number;
  nama_tampilan: string;
  lokasi: string | null;
  status?: string;
  events?: { nama: string } | null;
  acara?: string | null;
}

interface Ringkas {
  nama?: string;
  kampus?: string;
  jurusan?: string;
  angkatan?: number | null;
  foto_url?: string | null;
  profil_lengkap: boolean;
  booth: BoothAlumni[];
  pengunjung_hari_ini: number;
}

interface Sambutan {
  lo: { nama: string; email?: string }[];
  langkah: string[];
}

interface Statistik {
  booth: string[];
  hari_ini: number;
  total: number;
  jam_ramai: { jam: string; jumlah: number }[];
  asal_sekolah: { sekolah: string; jumlah: number }[];
}

interface Isi {
  ringkas: Ringkas | null;
  sambutan: Sambutan | null;
  statistik: Statistik | null;
  hematNyala: boolean;
}

export default function DashboardAlumni() {
  const { data, memuat, error, muatUlang } = useMuat<Isi>(async (signal) => {
    const ringkas = await api.get<Ringkas>('/alumni/dashboard', { signal });

    // Dua ini boleh gagal sendiri-sendiri. Beranda alumni tetap berguna
    // walaupun statistiknya sedang dimatikan Mode Hemat.
    const [sambutan, statistik] = await Promise.all([
      api.get<Sambutan>('/alumni/sambutan', { signal }).catch(() => null),
      api.get<Statistik | null>('/alumni/statistik', { signal }).catch(() => null),
    ]);

    return {
      ringkas,
      sambutan,
      statistik: statistik ?? null,
      hematNyala: statistik === null,
    };
  }, []);

  useMuatUlangBerkala(muatUlang, 90_000);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const r = data?.ringkas;
  if (!r) return <Kosong judul="Data alumni tidak ditemukan" />;

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-10">
      {/* Kepala, mengikuti pola Dashboard peserta: sampul, foto bulat
          menumpuk, nama besar. */}
      <header>
        <div className="h-32 w-full overflow-hidden rounded-[2rem]">
          <img src="/latar-air.jpg" alt="" className="h-full w-full object-cover" />
        </div>

        <div className="-mt-10 flex items-end gap-4 px-1">
          {r.foto_url ? (
            <img
              src={r.foto_url}
              alt=""
              className="h-20 w-20 shrink-0 rounded-full border-4 border-white object-cover"
            />
          ) : (
            <span className="h-20 w-20 shrink-0 rounded-full border-4 border-white bg-slate-200" />
          )}
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="judul-tebal truncate text-2xl">{r.nama ?? 'Alumni'}</h1>
            <p className="truncate text-sm font-bold text-slate-700">
              {[r.kampus, r.jurusan, r.angkatan].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </header>

      {!r.profil_lengkap && (
        <section className="kartu p-4 ring-2 ring-hatihati-600/40">
          <p className="font-bold">Profilmu belum lengkap</p>
          <p className="mt-1 text-sm text-slate-600">
            Peserta melihat foto dan perkenalanmu di halaman kampus sebelum
            mendatangi boothmu. Tanpa itu mejamu cuma nama kampus.
          </p>
        </section>
      )}

      {/* Meja. Satu alumni bisa menjaga dua booth berbeda di dua acara, dan
          dua-duanya ditampilkan: yang cuma melihat satu akan menunggu di
          tempat yang salah. */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Meja Kamu
        </h2>
        {r.booth.length === 0 ? (
          <Kosong
            judul="Belum ditugaskan ke booth"
            keterangan="Hubungi panitia Divisi Acara."
          />
        ) : (
          <ul className="mt-2 space-y-2">
            {r.booth.map((b, i) => (
              <li key={b.id ?? i} className="kartu p-4 ring-1 ring-slate-200">
                <p className="font-black">{b.nama_tampilan}</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  {[b.events?.nama ?? b.acara, b.lokasi].filter(Boolean).join(' · ') ||
                    'Lokasi menyusul'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        to="/scanner/booth"
        className="tombol-utama flex items-center justify-center px-6 py-4 text-lg"
      >
        MULAI SCAN
      </Link>

      {/* Angka booth sendiri saja. */}
      <section className="kartu p-5 ring-1 ring-slate-200">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Booth Kamu Hari Ini
        </h2>

        {data?.hematNyala ? (
          <p className="mt-2 text-sm text-slate-500">
            Statistik sementara dimatikan panitia supaya scanner tetap cepat.
          </p>
        ) : (
          <>
            <div className="mt-2 flex gap-6">
              <p>
                <span className="block text-3xl font-black tabular-nums">
                  {data?.statistik?.hari_ini ?? r.pengunjung_hari_ini}
                </span>
                <span className="text-xs font-bold text-slate-500">hari ini</span>
              </p>
              <p>
                <span className="block text-3xl font-black tabular-nums">
                  {data?.statistik?.total ?? 0}
                </span>
                <span className="text-xs font-bold text-slate-500">total</span>
              </p>
            </div>

            {(data?.statistik?.jam_ramai ?? []).length > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                Jam ramai:{' '}
                {data!.statistik!.jam_ramai
                  .map((j) => `${j.jam} (${j.jumlah})`)
                  .join(', ')}
              </p>
            )}

            {(data?.statistik?.asal_sekolah ?? []).length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-bold text-slate-500">
                  Sekolah yang paling banyak datang
                </p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {data!.statistik!.asal_sekolah.slice(0, 5).map((s) => (
                    <li key={s.sekolah} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{s.sekolah}</span>
                      <span className="shrink-0 font-bold tabular-nums">
                        {s.jumlah}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      {/* Sambutan: LO dan langkah-langkah. */}
      {data?.sambutan && (
        <section className="kartu p-5 ring-1 ring-slate-200">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Yang Perlu Kamu Tahu
          </h2>

          {data.sambutan.lo.length > 0 && (
            <p className="mt-2 text-sm">
              LO pendampingmu:{' '}
              <span className="font-bold">
                {data.sambutan.lo.map((l) => l.nama).join(', ')}
              </span>
            </p>
          )}

          {data.sambutan.langkah.length > 0 && (
            <ol className="mt-3 space-y-1.5 text-sm text-slate-700">
              {data.sambutan.langkah.map((l, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-merek-navy text-xs font-black text-white">
                    {i + 1}
                  </span>
                  <span className="min-w-0">{l}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/alumni/pengunjung"
          className="kartu p-4 text-center font-bold ring-1 ring-slate-200"
        >
          Daftar Pengunjung
        </Link>
        <Link
          to="/alumni/sertifikat"
          className="kartu p-4 text-center font-bold ring-1 ring-slate-200"
        >
          Sertifikat
        </Link>
      </div>
    </div>
  );
}
