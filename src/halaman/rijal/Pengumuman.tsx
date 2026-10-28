/* =============================================================================
   /announcements — riwayat pengumuman.

   Pop-up merah yang menutupi layar itu komponen lain dan hanya untuk tingkat
   DARURAT. Halaman ini daftarnya, untuk peserta yang ingin membaca ulang
   sesuatu yang sempat lewat waktu HP-nya di saku.
============================================================================= */

import { api } from '../../lib/api';
import { useMuat, useMuatUlangBerkala } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

interface Item {
  id: number;
  judul: string;
  isi: string;
  tingkat: 'BIASA' | 'DARURAT';
  dibuat_at: string;
}

export default function Pengumuman() {
  const { data, memuat, error, muatUlang } = useMuat<Item[]>(
    (signal) => api.get<Item[]>('/announcements', { signal, tanpaLogin: true }),
    [],
  );

  useMuatUlangBerkala(muatUlang, 60_000);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-10">
      <header>
        <h1 className="judul-tebal text-[2rem]">Pengumuman</h1>
        <p className="mt-1 text-sm text-slate-500">Yang terbaru di atas.</p>
      </header>

      {(data ?? []).length === 0 ? (
        <Kosong judul="Belum ada pengumuman" keterangan="Panitia belum mengirim apa pun." />
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((p) => (
            <li
              key={p.id}
              className={`kartu border p-4 ${
                p.tingkat === 'DARURAT'
                  ? 'border-bahaya-600 bg-bahaya-50 dark:bg-bahaya-700/10'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {p.tingkat === 'DARURAT' && (
                <span className="rounded bg-bahaya-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                  Darurat
                </span>
              )}
              <h2 className="mt-1 font-bold">{p.judul}</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {p.isi}
              </p>
              <p className="mt-2 text-xs text-slate-400">{waktu(p.dibuat_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function waktu(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
}
