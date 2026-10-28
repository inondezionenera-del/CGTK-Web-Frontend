/* =============================================================================
   /alumni/pengunjung — siapa saja yang mampir ke boothmu.

   Dua aturan privasi yang berlaku di sini, dan dua-duanya ditegakkan server,
   bukan cuma disembunyikan di layar:

     1. Hanya peserta yang mencentang izin berbagi data yang muncul sama
        sekali. Server tidak pernah mengirim sisanya, jadi jumlah di layar
        memang lebih kecil dari jumlah yang discan. Itu dijelaskan, bukan
        didiamkan, supaya alumni tidak mengira scannernya rusak.

     2. Nomor telepon peserta TIDAK pernah ditampilkan. Pesertanya di bawah
        umur. Alumni yang perlu menindaklanjuti menghubungi lewat panitia.

   Tombol bintang menandai peserta yang layak ditindaklanjuti. Itu satu-satunya
   tindakan yang bisa dilakukan alumni di halaman ini, dan sengaja begitu:
   halaman ini dibuka sambil berdiri di antara antrean.
============================================================================= */

import { useState } from 'react';
import { api, pesanDari } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

interface Pengunjung {
  visit_id: number;
  nama?: string;
  asal_sekolah: string;
  kelas: string;
  minat_jurusan: string | null;
  waktu: string;
  ditandai: boolean;
}

interface Isi {
  daftar: Pengunjung[];
  disembunyikan: number;
}

export default function PengunjungAlumni() {
  // getBerhalaman, bukan get: server mengirim jumlah yang disembunyikan di
  // meta, dan angka itu yang menjelaskan kenapa daftarnya lebih pendek dari
  // jumlah yang dipindai.
  const { data, memuat, error, muatUlang } = useMuat<Isi>(async (signal) => {
    const h = await api.getBerhalaman<Pengunjung>('/alumni/pengunjung', { signal });
    return {
      daftar: h.data,
      disembunyikan: Number((h.meta as { disembunyikan?: number }).disembunyikan ?? 0),
    };
  }, []);

  const [saring, setSaring] = useState<'semua' | 'ditandai'>('semua');
  const [sibuk, setSibuk] = useState<number | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const semua = data?.daftar ?? [];
  const tampil = saring === 'ditandai' ? semua.filter((p) => p.ditandai) : semua;
  const disembunyikan = data?.disembunyikan ?? 0;

  async function tandai(p: Pengunjung) {
    setSibuk(p.visit_id);
    setGagal(null);
    try {
      await api.patch(`/booths/visits/${p.visit_id}/tandai`, { ditandai: !p.ditandai });
      muatUlang(false);
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(null);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-10">
      <header>
        <h1 className="judul-tebal text-[2rem]">Pengunjung Booth</h1>
        <p className="mt-1 text-sm text-slate-500">
          {semua.length} peserta, {semua.filter((p) => p.ditandai).length} ditandai.
        </p>
      </header>

      {disembunyikan > 0 && (
        <p className="rounded-xl bg-slate-100 p-3 text-xs leading-relaxed text-slate-600">
          {disembunyikan} pengunjung lain tidak ditampilkan karena belum
          mengizinkan datanya dibagikan. Mereka tetap terhitung di statistik
          boothmu, jadi scannermu tidak bermasalah.
        </p>
      )}

      {gagal && <PesanError pesan={gagal} />}

      <div className="flex gap-2">
        {(['semua', 'ditandai'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSaring(t)}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-bold capitalize ${
              saring === t ? 'tombol-utama' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tampil.length === 0 ? (
        <Kosong
          judul={saring === 'ditandai' ? 'Belum ada yang ditandai' : 'Belum ada pengunjung'}
          keterangan={
            saring === 'ditandai'
              ? 'Tekan bintang di daftar semua untuk menandai peserta yang menarik.'
              : 'Pengunjung muncul di sini setiap kali kamu memindai QR peserta.'
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {tampil.map((p) => (
            <li key={p.visit_id} className="kartu flex items-center gap-3 p-4 ring-1 ring-slate-200">
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">{p.nama ?? 'Peserta'}</p>
                <p className="truncate text-sm text-slate-600">
                  {[p.asal_sekolah, p.kelas].filter(Boolean).join(' · ')}
                </p>
                {p.minat_jurusan && (
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    Minat: {p.minat_jurusan}
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={sibuk === p.visit_id}
                onClick={() => void tandai(p)}
                aria-label={p.ditandai ? 'Batalkan tanda' : 'Tandai peserta ini'}
                aria-pressed={p.ditandai}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl disabled:opacity-50 ${
                  p.ditandai
                    ? 'bg-peringatan-400 text-slate-900'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {p.ditandai ? '★' : '☆'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
