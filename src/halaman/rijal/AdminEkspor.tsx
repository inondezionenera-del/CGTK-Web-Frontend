/* =============================================================================
   /admin/ekspor — unduh data dan baca log perubahan.

   Dua hal yang dibutuhkan sesudah acara selesai, bukan selama acara:

     1. Ekspor CSV untuk laporan. Dibuka dengan Excel atau Google Sheets.
     2. Log perubahan untuk menelusuri siapa menandai apa, kapan.

   Ekspor TIDAK bisa memakai tautan biasa. Endpoint-nya ada di balik header
   Authorization, dan tag <a href> tidak membawa header apa pun, jadi yang
   terunduh justru halaman error. Berkasnya diambil dengan fetch lalu
   disodorkan sebagai blob; lihat unduh() di lib/api.ts.

   Berkas CSV-nya diawali BOM dari server, supaya Excel di Windows membaca
   nama bertanda baca Indonesia dengan benar dan tidak menampilkannya sebagai
   karakter aneh.

   Log perubahan hanya menampilkan aksi dan tabelnya, bukan isi sebelum dan
   sesudah. Isi itu bisa memuat nama dan sekolah peserta, dan layar ini dibuka
   di laptop yang kadang disambungkan ke proyektor saat rapat evaluasi.
============================================================================= */

import { useState } from 'react';
import { api, unduh, pesanDari } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

interface Audit {
  id: number;
  aksi: string;
  tabel: string | null;
  record_id: string | null;
  created_at: string;
  users?: { nama: string } | null;
}

const BERKAS = [
  { jenis: 'peserta', nama: 'Data Peserta', ket: 'Nama, email, sekolah, kelas, minat jurusan.' },
  { jenis: 'presensi', nama: 'Data Presensi', ket: 'Siapa hadir di sesi apa, jam berapa.' },
];

export default function AdminEkspor() {
  const { data, memuat, error, muatUlang } = useMuat<Audit[]>(
    (signal) => api.get<Audit[]>('/audit?per=50', { signal }).catch(() => []),
    [],
  );

  const [sibuk, setSibuk] = useState<string | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  async function ambil(jenis: string, namaBerkas: string) {
    setSibuk(jenis);
    setGagal(null);
    try {
      await unduh(`/exports/csv/${jenis}`, namaBerkas);
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(null);
    }
  }

  async function ambilLpj() {
    setSibuk('lpj');
    setGagal(null);
    try {
      await unduh('/exports/lpj', 'cgtk-lpj.json');
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <header className="text-center">
        <h1 className="judul-tebal text-[2rem]">Ekspor &amp; Log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Berkasnya terunduh langsung ke perangkat ini.
        </p>
      </header>

      {gagal && <PesanError pesan={gagal} />}

      <section className="space-y-2">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Unduh CSV
        </h2>
        {BERKAS.map((b) => (
          <button
            key={b.jenis}
            type="button"
            disabled={sibuk !== null}
            onClick={() => void ambil(b.jenis, `cgtk-${b.jenis}.csv`)}
            className="kartu flex w-full items-center gap-3 p-4 text-left ring-1 ring-slate-200 disabled:opacity-60"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-black">{b.nama}</span>
              <span className="block text-sm text-slate-600">{b.ket}</span>
            </span>
            <span className="shrink-0 text-xs font-black text-merek-magenta">
              {sibuk === b.jenis ? 'MENGUNDUH' : 'CSV'}
            </span>
          </button>
        ))}

        <button
          type="button"
          disabled={sibuk !== null}
          onClick={() => void ambilLpj()}
          className="kartu flex w-full items-center gap-3 p-4 text-left ring-1 ring-slate-200 disabled:opacity-60"
        >
          <span className="min-w-0 flex-1">
            <span className="block font-black">Data LPJ</span>
            <span className="block text-sm text-slate-600">
              Semua angka untuk laporan pertanggungjawaban, dalam satu berkas.
              Tidak ada data pembayaran: Administrasi memegang pembukuannya
              sendiri.
            </span>
          </span>
          <span className="shrink-0 text-xs font-black text-merek-magenta">
            {sibuk === 'lpj' ? 'MENGUNDUH' : 'JSON'}
          </span>
        </button>
      </section>

      <section>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Log Perubahan Terakhir
        </h2>
        {(data ?? []).length === 0 ? (
          <Kosong
            judul="Belum ada yang tercatat"
            keterangan="Setiap penandaan lunas, pembekuan peringkat, dan undangan alumni tercatat di sini."
          />
        ) : (
          <ul className="mt-2 space-y-1.5">
            {(data ?? []).map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-xl bg-slate-100 px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">
                    {a.aksi.replace(/_/g, ' ')}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {a.users?.nama ?? 'sistem'}
                    {a.tabel ? ` · ${a.tabel}` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-slate-400">
                  {waktu(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function waktu(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}
