/* =============================================================================
   /campuses/:id — satu kampus.

   Bagian alumni ada di sini dengan sengaja. Peserta jadi tahu siapa yang
   menunggu di booth, bukan cuma melihat nama kampus. Alumni datang sukarela,
   dan menampilkan mereka dengan layak adalah bagian dari alasan mereka mau
   datang lagi tahun depan.
============================================================================= */

import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';
import type { Kampus } from '../../types/api';

interface Alumni {
  id: number;
  nama: string;
  jurusan?: string | null;
  angkatan?: number | null;
  bio?: string | null;
  foto_url?: string | null;
}

interface Jurusan {
  id: number;
  nama: string;
  rumpun?: string | null;
}

interface Materi {
  id: number;
  judul: string;
  tipe: 'FILE' | 'LINK';
  url?: string;
}

interface Isi {
  kampus: Kampus | null;
  jurusan: Jurusan[];
  alumni: Alumni[];
  materi: Materi[];
}

export default function DetailKampus() {
  const { id } = useParams();

  const { data, memuat, error, muatUlang } = useMuat<Isi>(
    async (signal) => {
      const kampus = await api
        .get<Kampus>(`/universities/${id}`, { signal, tanpaLogin: true })
        .catch(() => null);

      // Tiga permintaan sisanya boleh gagal sendiri-sendiri. Kampusnya tetap
      // bisa ditampilkan walaupun daftar materinya belum ada.
      const [jurusan, alumni, materi] = await Promise.all([
        api
          .get<Jurusan[]>(`/universities/${id}/majors`, { signal, tanpaLogin: true })
          .catch(() => []),
        api
          .get<Alumni[]>(`/representatives?university_id=${id}`, {
            signal,
            tanpaLogin: true,
          })
          .catch(() => []),
        api
          .get<Materi[]>(`/materials/universities/${id}`, { signal, tanpaLogin: true })
          .catch(() => []),
      ]);

      return {
        kampus,
        jurusan: jurusan ?? [],
        alumni: alumni ?? [],
        materi: materi ?? [],
      };
    },
    [id],
  );

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;
  if (!data?.kampus) return <Kosong judul="Kampus tidak ditemukan" />;

  const k = data.kampus;

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-10">
      <header className="kartu ring-1 ring-slate-200 p-5 dark:border-slate-800">
        <div className="flex items-start gap-4">
          {k.logo_url ? (
            <img
              src={k.logo_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-2xl object-contain"
            />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-white"
              style={{ background: k.warna_khas ?? '#1b3a5c' }}
            >
              {k.singkatan.slice(0, 3)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold">{k.nama}</h1>
            <p className="text-sm text-slate-500">
              {[k.kota, k.akreditasi].filter(Boolean).join(' · ')}
            </p>
            {k.jenis && (
              <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {k.jenis.charAt(0) + k.jenis.slice(1).toLowerCase()}
              </span>
            )}
          </div>
        </div>

        {k.website && (
          <a
            href={k.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block text-sm font-semibold text-utama-700 underline dark:text-utama-100"
          >
            Buka situs resminya
          </a>
        )}
      </header>

      {data.alumni.length > 0 && (
        <section>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Alumni yang hadir
          </h2>
          {/* Dua kolom dengan foto besar, mengikuti mockup KARTU. Alumni
              datang sukarela, dan menampilkan mereka dengan layak adalah
              bagian dari alasan mereka mau datang lagi tahun depan. */}
          <ul className="mt-2 grid grid-cols-2 gap-3">
            {data.alumni.map((a) => (
              <li key={a.id} className="kartu p-3">
                {a.foto_url ? (
                  <img
                    src={a.foto_url}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full rounded-xl bg-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-end justify-center overflow-hidden rounded-xl bg-slate-300">
                    <svg viewBox="0 0 64 64" aria-hidden className="h-4/5 w-4/5 text-slate-100" fill="currentColor">
                      <circle cx="32" cy="22" r="13" />
                      <path d="M6 64a26 26 0 0 1 52 0z" />
                    </svg>
                  </div>
                )}

                <p className="mt-2 text-sm leading-snug">
                  <span className="font-black">Nama:</span> {a.nama}
                </p>
                {a.jurusan && (
                  <p className="text-sm leading-snug">
                    <span className="font-black">Jurusan:</span> {a.jurusan}
                  </p>
                )}
                {a.angkatan && (
                  <p className="text-sm leading-snug">
                    <span className="font-black">Angkatan:</span> {a.angkatan}
                  </p>
                )}
                {a.bio && (
                  <p className="mt-1 line-clamp-3 text-xs italic text-slate-600">
                    {a.bio}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.jurusan.length > 0 && (
        <section>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Jurusan
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {data.jurusan.map((j) => (
              <li
                key={j.id}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-800"
              >
                {j.nama}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.materi.length > 0 && (
        <section>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Materi
          </h2>
          <ul className="mt-2 space-y-2">
            {data.materi.map((m) => (
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
        </section>
      )}
    </div>
  );
}
