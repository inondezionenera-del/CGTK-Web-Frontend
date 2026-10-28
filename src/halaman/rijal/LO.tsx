/* =============================================================================
   /lo dan /lo/statistik — halaman LO Divisi Pendidikan.

   Dua-duanya BACA SAJA. Tidak ada tombol simpan, tidak ada form. LO sedang
   mendampingi orang di lapangan, bukan mengoperasikan aplikasi; makin sedikit
   yang bisa dipencet, makin kecil kemungkinan ada yang salah di tengah acara.

   Dua aturan privasi yang berbeda, dan bedanya disengaja:

   - Di halaman alumni, nomor kontak ditampilkan dan bisa langsung ditekan. LO
     memang perlu menghubungi alumni dampingannya mendadak.
   - Di halaman statistik, TIDAK ADA nama atau sekolah peserta sama sekali,
     cuma angka. Alumni boleh melihat daftar pengunjung boothnya karena mereka
     yang menindaklanjuti; LO tidak punya kepentingan ke sana.

   Satu alumni menjaga dua booth berbeda di Acara 2 dan Acara 3, jadi keduanya
   ditampilkan sekaligus. LO yang cuma melihat satu akan mencari orangnya di
   tempat yang salah.
============================================================================= */

import { api } from '../../lib/api';
import { useMuat, useMuatUlangBerkala } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

interface BoothAlumni {
  nama_tampilan: string;
  lokasi: string | null;
  status: string;
  acara?: string | null;
  sedang_aktif?: boolean;
}

interface AlumniDampingan {
  id: number;
  nama: string;
  kampus?: string | null;
  jurusan?: string | null;
  angkatan?: number | null;
  kontak?: string | null;
  foto_url?: string | null;
  booth?: BoothAlumni[];
}

export function DashboardLO() {
  const { data, memuat, error, muatUlang } = useMuat<AlumniDampingan[]>(
    (signal) => api.get<AlumniDampingan[]>('/lo/alumni', { signal }),
    [],
  );

  useMuatUlangBerkala(muatUlang, 60_000);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const daftar = data ?? [];

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-10">
      <header>
        <h1 className="judul-tebal text-[2rem]">Alumni Dampingan</h1>
        <p className="mt-1 text-sm text-slate-500">
          {daftar.length} alumni. Halaman ini hanya untuk dibaca.
        </p>
      </header>

      {daftar.length === 0 ? (
        <Kosong
          judul="Belum ada alumni dampingan"
          keterangan="Hubungi Super Admin untuk penugasannya."
        />
      ) : (
        <ul className="space-y-3">
          {daftar.map((a) => (
            <li
              key={a.id}
              className="kartu ring-1 ring-slate-200 p-4 dark:border-slate-800"
            >
              <div className="flex gap-3">
                {a.foto_url ? (
                  <img
                    src={a.foto_url}
                    alt=""
                    loading="lazy"
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold">{a.nama}</p>
                  <p className="text-sm text-slate-500">
                    {[a.kampus, a.jurusan, a.angkatan].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>

              {(a.booth ?? []).length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {(a.booth ?? []).map((b, i) => (
                    <li
                      key={i}
                      className={`rounded-xl p-2.5 text-sm ${
                        b.sedang_aktif
                          ? 'bg-berhasil-50 font-semibold dark:bg-berhasil-700/10'
                          : 'bg-slate-50 text-slate-500 dark:bg-slate-800'
                      }`}
                    >
                      {b.sedang_aktif && (
                        <span className="mr-2 rounded bg-berhasil-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                          SEKARANG
                        </span>
                      )}
                      {b.acara ? `${b.acara}: ` : ''}
                      {b.nama_tampilan}
                      {b.lokasi ? ` · ${b.lokasi}` : ''}
                    </li>
                  ))}
                </ul>
              )}

              {/* Tombol, bukan teks. LO sering perlu menghubungi alumni
                  mendadak sambil berjalan; menyalin nomor dengan tangan di
                  tengah keramaian itu yang bikin mereka menyerah. */}
              {a.kontak && (
                <div className="mt-3 flex gap-2">
                  <a
                    href={`tel:${a.kontak}`}
                    className="flex flex-1 items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold dark:border-slate-700"
                  >
                    Telepon
                  </a>
                  <a
                    href={`https://wa.me/${a.kontak.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center rounded-xl bg-berhasil-600 px-4 py-2.5 text-sm font-bold text-white"
                  >
                    WhatsApp
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface StatBooth {
  booth: string;
  status: string;
  alumni?: string[];
  hari_ini: number;
  total: number;
  jam_ramai?: { jam: string; jumlah: number }[];
}

interface StatistikIsi {
  ringkasan?: { alumni: number; pengunjung: number };
  booth: StatBooth[];
  mode_hemat?: boolean;
}

export function StatistikLO() {
  const { data, memuat, error, muatUlang } = useMuat<StatistikIsi>(
    (signal) => api.get<StatistikIsi>('/lo/statistik', { signal }),
    [],
  );

  useMuatUlangBerkala(muatUlang, 60_000);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  // Mode Hemat mematikan perhitungan berat di hari yang ramai. Ditangani
  // sebagai keadaan biasa, bukan sebagai error.
  if (data?.mode_hemat) {
    return (
      <Kosong
        judul="Statistik sementara dimatikan"
        keterangan="Panitia menyalakan Mode Hemat supaya scanner tetap cepat."
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-10">
      <header>
        <h1 className="judul-tebal text-[2rem]">Statistik Booth</h1>
        {data?.ringkasan && (
          <p className="mt-1 text-sm text-slate-500">
            {data.ringkasan.alumni} alumni, {data.ringkasan.pengunjung} pengunjung
            hari ini
          </p>
        )}
      </header>

      {(data?.booth ?? []).length === 0 ? (
        <Kosong judul="Belum ada angka" keterangan="Booth belum ada kunjungan." />
      ) : (
        <ul className="space-y-3">
          {(data?.booth ?? []).map((b, i) => (
            <li
              key={i}
              className="kartu ring-1 ring-slate-200 p-4 dark:border-slate-800"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate font-bold">{b.booth}</p>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-black ${
                    b.status === 'ACTIVE'
                      ? 'bg-berhasil-600 text-white'
                      : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {b.status === 'ACTIVE' ? 'BUKA' : 'TUTUP'}
                </span>
              </div>

              {(b.alumni ?? []).length > 0 && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {(b.alumni ?? []).join(', ')}
                </p>
              )}

              <p className="mt-3 text-sm">
                Hari ini <span className="font-black tabular-nums">{b.hari_ini}</span>
                <span className="mx-2 text-slate-300">|</span>
                Total <span className="font-black tabular-nums">{b.total}</span>
              </p>

              {(b.jam_ramai ?? []).length > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  Jam ramai:{' '}
                  {(b.jam_ramai ?? [])
                    .map((j) => `${j.jam} (${j.jumlah})`)
                    .join(', ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900">
        Halaman ini sengaja hanya menampilkan angka. Nama dan sekolah peserta
        tidak ditampilkan di sini.
      </p>
    </div>
  );
}
