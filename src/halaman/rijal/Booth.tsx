/* =============================================================================
   /booths dan /booths/:id

   Tab per acara, karena booth Expo Kampus dan Expo Jurusan bentuknya berbeda.
   Booth yang sudah tutup tetap ditampilkan abu-abu, tidak dihapus.

   Di halaman detail, materi yang masih terkunci TETAP ditampilkan: kartu dengan
   gembok dan jumlahnya. Itu yang mendorong peserta benar-benar mendatangi
   boothnya, bukan melihatnya dari jauh. Menyembunyikannya menghilangkan
   satu-satunya alasan mereka ke sana.
============================================================================= */

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

interface Booth {
  id: number;
  nama_tampilan: string;
  booth_type: 'KAMPUS' | 'JURUSAN';
  lokasi: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  jumlah_alumni?: number;
  jumlah_materi?: number;
}

export function DaftarBooth() {
  const { data, memuat, error, muatUlang } = useMuat<Booth[]>(
    (signal) => api.get<Booth[]>('/booths', { signal, tanpaLogin: true }),
    [],
  );

  const [tab, setTab] = useState<'KAMPUS' | 'JURUSAN'>('KAMPUS');
  const isi = useMemo(
    () => (data ?? []).filter((b) => b.booth_type === tab),
    [data, tab],
  );

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      <header>
        <h1 className="text-2xl font-bold">Daftar Booth</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cek kampus atau jurusan apa ada di booth mana.
        </p>
      </header>

      <div className="flex gap-2">
        {(['KAMPUS', 'JURUSAN'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl px-4 text-sm font-bold ${
              tab === t
                ? 'tombol-utama'
                : 'border border-slate-300 dark:border-slate-700'
            }`}
          >
            Expo {t === 'KAMPUS' ? 'Kampus' : 'Jurusan'}
          </button>
        ))}
      </div>

      {isi.length === 0 ? (
        <Kosong
          judul="Belum ada booth"
          keterangan="Divisi Acara belum membuatnya."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {isi.map((b) => (
            <li key={b.id}>
              <Link
                to={`/booths/${b.id}`}
                className={`kartu block border border-slate-200 p-4 dark:border-slate-800 ${
                  b.status === 'CLOSED' ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-bold">{b.nama_tampilan}</p>
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
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {b.lokasi ?? 'Lokasi menyusul'}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {b.jumlah_alumni ?? 0} alumni, {b.jumlah_materi ?? 0} materi
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface Materi {
  id: number;
  judul: string;
  tipe: 'FILE' | 'LINK';
  url?: string;
}

interface DetailIsi {
  booth: Booth;
  alumni?: { id: number; nama: string; kampus?: string }[];
  sudah_di_booth?: boolean;
  publik?: Materi[];
  di_booth?: { jumlah: number; terkunci: boolean; daftar?: Materi[] };
}

export function DetailBooth() {
  const { id } = useParams();

  const { data, memuat, error, muatUlang } = useMuat<DetailIsi>(
    (signal) => api.get<DetailIsi>(`/booths/${id}`, { signal }),
    [id],
  );

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;
  if (!data?.booth) return <Kosong judul="Booth tidak ditemukan" />;

  const terkunci = Boolean(data.di_booth?.terkunci) && !data.sudah_di_booth;
  const jumlahTerkunci = data.di_booth?.jumlah ?? 0;
  const publik = data.publik ?? [];
  const dibuka = data.di_booth?.daftar ?? [];

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-10">
      <header className="kartu border border-slate-200 p-5 dark:border-slate-800">
        <h1 className="text-xl font-bold">{data.booth.nama_tampilan}</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {data.booth.lokasi ?? 'Lokasi menyusul'}
        </p>
        <span
          className={`mt-3 inline-block rounded px-2 py-0.5 text-[11px] font-black ${
            data.booth.status === 'ACTIVE'
              ? 'bg-berhasil-600 text-white'
              : 'bg-slate-300 text-slate-700'
          }`}
        >
          {data.booth.status === 'ACTIVE' ? 'BUKA' : 'TUTUP'}
        </span>
      </header>

      {(data.alumni ?? []).length > 0 && (
        <section>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Alumni di booth ini
          </h2>
          <ul className="mt-2 space-y-2">
            {(data.alumni ?? []).map((a) => (
              <li
                key={a.id}
                className="kartu border border-slate-200 p-3 dark:border-slate-800"
              >
                <p className="font-bold">{a.nama}</p>
                {a.kampus && <p className="text-xs text-slate-500">{a.kampus}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Materi
        </h2>

        <ul className="mt-2 space-y-2">
          {[...publik, ...dibuka].map((m) => (
            <li key={m.id}>
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="kartu flex items-center justify-between border border-slate-200 p-3 dark:border-slate-800"
              >
                <span className="min-w-0 truncate text-sm font-bold">{m.judul}</span>
                <span className="shrink-0 text-xs text-utama-700 underline dark:text-utama-100">
                  Buka {m.tipe === 'LINK' ? 'tautan' : 'berkas'}
                </span>
              </a>
            </li>
          ))}
        </ul>

        {terkunci && jumlahTerkunci > 0 && (
          <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-2xl" aria-hidden>
              &#128274;
            </p>
            <p className="mt-1 text-sm font-bold">
              {jumlahTerkunci} materi terkunci
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Scan QR di meja booth untuk membukanya.
            </p>
            <Link
              to="/scan-booth"
              className="tombol-utama mt-4 inline-block px-5 py-2.5 text-sm"
            >
              Buka Scanner
            </Link>
          </div>
        )}

        {publik.length === 0 && dibuka.length === 0 && !terkunci && (
          <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900">
            Alumni belum mengunggah materi untuk booth ini.
          </p>
        )}
      </section>
    </div>
  );
}
