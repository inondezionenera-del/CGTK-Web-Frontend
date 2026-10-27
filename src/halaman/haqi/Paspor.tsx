/* =============================================================================
   /passport — paspor kampus dan jurusan.

   Dua tab, bukan satu daftar. Acara 2 boothnya per kampus, Acara 3 per jurusan,
   dan peserta perlu tahu dia sudah mengumpulkan berapa di masing-masing.

   Booth yang sudah tutup TETAP ditampilkan, abu-abu. Kalau dihilangkan, jumlah
   kotaknya berubah-ubah sepanjang acara dan peserta tidak pernah tahu dia
   melewatkan apa. Yang hilang diam-diam selalu terasa seperti kesalahan
   aplikasi, bukan seperti kesempatan yang lewat.

   Dirancang tahan sampai enam puluh booth: Divisi Acara belum memastikan
   jumlahnya, jadi grid-nya menyesuaikan lebar layar dan kotak pencarian muncul
   sendiri begitu isinya lebih dari dua puluh.
============================================================================= */

import { useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

interface KotakBooth {
  booth_id: number;
  nama_tampilan: string;
  booth_type: 'KAMPUS' | 'JURUSAN';
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  dikunjungi: boolean;
  xp_didapat?: number | null;
}

export default function Paspor() {
  const { data, memuat, error, muatUlang } = useMuat<KotakBooth[]>(
    (signal) => api.get<KotakBooth[]>('/booths/passport/saya', { signal }),
    [],
  );

  const [tab, setTab] = useState<'KAMPUS' | 'JURUSAN'>('KAMPUS');
  const [cari, setCari] = useState('');

  const isiTab = useMemo(
    () => (data ?? []).filter((b) => b.booth_type === tab),
    [data, tab],
  );

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return q
      ? isiTab.filter((b) => b.nama_tampilan.toLowerCase().includes(q))
      : isiTab;
  }, [isiTab, cari]);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const terkumpul = isiTab.filter((b) => b.dikunjungi).length;

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      <header>
        <h1 className="text-2xl font-bold">Paspor</h1>
        <p className="mt-1 text-sm text-slate-500">
          Booth yang sudah kamu datangi.
        </p>
      </header>

      <div className="flex gap-2">
        {(['KAMPUS', 'JURUSAN'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl px-4 text-sm font-bold ${
              tab === t ? 'tombol-utama' : 'border border-slate-300 dark:border-slate-700'
            }`}
          >
            Paspor {t === 'KAMPUS' ? 'Kampus' : 'Jurusan'}
          </button>
        ))}
      </div>

      {isiTab.length > 0 && (
        <div className="kartu border border-slate-200 p-4 dark:border-slate-800">
          <p className="text-sm font-bold">
            Terkumpul {terkumpul} dari {isiTab.length}
          </p>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-berhasil-600 transition-all"
              style={{
                width: `${isiTab.length ? (terkumpul / isiTab.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Pencarian muncul sendiri hanya kalau memang banyak. */}
      {isiTab.length > 20 && (
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari booth..."
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
        />
      )}

      {tampil.length === 0 ? (
        <Kosong
          judul="Belum ada booth"
          keterangan="Divisi Acara belum membuat booth untuk bagian ini."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tampil.map((b) => {
            const tutup = b.status === 'CLOSED';
            return (
              <li
                key={b.booth_id}
                className={`kartu border p-3 text-center ${
                  b.dikunjungi
                    ? 'border-berhasil-600 bg-berhasil-50 dark:bg-berhasil-700/10'
                    : tutup
                      ? 'border-slate-200 bg-slate-100 opacity-60 dark:border-slate-800 dark:bg-slate-800'
                      : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <p className="text-2xl" aria-hidden>
                  {b.dikunjungi ? '✓' : tutup ? '■' : '□'}
                </p>
                <p className="mt-1 truncate text-xs font-bold">{b.nama_tampilan}</p>
                {b.dikunjungi && b.xp_didapat ? (
                  <p className="text-[11px] font-semibold text-berhasil-700">
                    +{b.xp_didapat} XP
                  </p>
                ) : tutup ? (
                  <p className="text-[11px] text-slate-400">Sudah tutup</p>
                ) : (
                  <p className="text-[11px] text-slate-400">Belum</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
