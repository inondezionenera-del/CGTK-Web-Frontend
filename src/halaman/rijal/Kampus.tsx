/* =============================================================================
   /campuses — direktori kampus.

   Tiga saringan: pencarian, jenis, dan rumpun. Semuanya dikerjakan server,
   bukan disaring di browser, karena daftar kampusnya bisa panjang dan HP
   peserta tidak perlu mengunduh semuanya untuk menampilkan enam.

   Satu hal yang mudah salah: ada kampus yang kolom `jenis`-nya masih kosong,
   dan itu wajar karena Divisi Acara belum tentu tahu waktu memasukkannya.
   Kampus seperti itu tetap muncul di "Semua" tapi hilang begitu disaring.
   Karena itu tombol saringnya TIDAK boleh disembunyikan hanya karena ada yang
   kosong, dan hasil kosong perlu dijelaskan, bukan dibiarkan jadi layar putih.
============================================================================= */

import { useState } from 'react';
import { api } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';
import type { Kampus as DataKampus, JenisKampus } from '../../types/api';

const JENIS: { nilai: JenisKampus | ''; label: string }[] = [
  { nilai: '', label: 'Semua' },
  { nilai: 'NEGERI', label: 'Negeri' },
  { nilai: 'SWASTA', label: 'Swasta' },
  { nilai: 'KEDINASAN', label: 'Kedinasan' },
];

export default function Kampus() {
  const [cari, setCari] = useState('');
  const [jenis, setJenis] = useState<JenisKampus | ''>('');
  const [rumpun, setRumpun] = useState('');

  // Daftar rumpun diambil dari server, tidak ditulis di program: kalau Divisi
  // Acara menambah rumpun baru, pilihannya ikut bertambah sendiri.
  const { data: daftarRumpun } = useMuat<string[]>(
    (signal) => api.get<string[]>('/majors/rumpun', { signal }),
    [],
  );

  const { data, memuat, error, muatUlang } = useMuat<DataKampus[]>(
    (signal) => {
      const q = new URLSearchParams();
      if (cari.trim()) q.set('cari', cari.trim());
      if (jenis) q.set('jenis', jenis);
      if (rumpun) q.set('rumpun', rumpun);
      const s = q.toString();
      return api.get<DataKampus[]>(`/universities${s ? `?${s}` : ''}`, { signal });
    },
    [cari, jenis, rumpun],
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      <header>
        <h1 className="judul-tebal text-[2rem]">Direktori Kampus</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kampus yang hadir di CGTK 2027 dan alumni yang menunggu di boothnya.
        </p>
      </header>

      <input
        value={cari}
        onChange={(e) => setCari(e.target.value)}
        placeholder="Cari kampus..."
        className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {JENIS.map((j) => (
          <button
            key={j.label}
            type="button"
            onClick={() => setJenis(j.nilai)}
            className={`shrink-0 rounded-xl px-4 text-sm font-bold ${
              jenis === j.nilai
                ? 'tombol-utama'
                : 'border border-slate-300 dark:border-slate-700'
            }`}
          >
            {j.label}
          </button>
        ))}

        <select
          value={rumpun}
          onChange={(e) => setRumpun(e.target.value)}
          className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Semua Rumpun</option>
          {(daftarRumpun ?? []).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {memuat ? (
        <Memuat />
      ) : error ? (
        <PesanError pesan={error} coba={() => muatUlang(false)} />
      ) : (data ?? []).length === 0 ? (
        <Kosong
          judul="Tidak ada kampus yang cocok"
          keterangan={
            jenis || rumpun
              ? 'Coba longgarkan saringannya. Sebagian kampus belum diisi jenisnya, jadi tidak ikut muncul waktu disaring.'
              : 'Data kampus belum dimasukkan panitia.'
          }
        />
      ) : (
        <>
          <p className="text-xs text-slate-500">{(data ?? []).length} kampus</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {(data ?? []).map((k) => (
              <li
                key={k.id}
                className="kartu ring-1 ring-slate-200 p-4 dark:border-slate-800"
              >
                <div className="flex items-start gap-3">
                  {k.logo_url ? (
                    <img
                      src={k.logo_url}
                      alt=""
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-xl object-contain"
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white"
                      style={{ background: k.warna_khas ?? '#1b3a5c' }}
                    >
                      {k.singkatan.slice(0, 3)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-bold">{k.singkatan}</p>
                    <p className="truncate text-xs text-slate-500">{k.nama}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {k.kota && <span className="text-slate-500">{k.kota}</span>}
                  {k.jenis && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {k.jenis.charAt(0) + k.jenis.slice(1).toLowerCase()}
                    </span>
                  )}
                  {k.akreditasi && (
                    <span className="rounded bg-berhasil-50 px-2 py-0.5 font-semibold text-berhasil-700 dark:bg-berhasil-700/10">
                      {k.akreditasi}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs font-semibold text-utama-700 dark:text-utama-100">
                  {k.jumlah_alumni > 0
                    ? `${k.jumlah_alumni} alumni hadir`
                    : 'Alumni menyusul'}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
