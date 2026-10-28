/* =============================================================================
   /passport — paspor kampus dan jurusan.

   DIPERBAIKI sesudah halaman ini dibuka di browser sungguhan dan ternyata
   kosong melompong. Penyebabnya bukan data kosong: halamannya crash.

   GET /booths/passport/saya mengembalikan OBJEK berisi dua paspor,
   { paspor_kampus: { acara, terkumpul, total, booth: [...] }, paspor_jurusan:
   { ... } }, bukan array datar. Versi sebelumnya memperlakukannya sebagai
   array lalu memanggil .filter(), dan di browser itu melempar
   "(i ?? []).filter is not a function" yang membuat seluruh halaman tidak
   dirender sama sekali.

   Ini kesalahan yang sama persis dengan yang pernah terjadi di /sponsors.
   Typecheck tidak bisa menangkapnya: yang dijanjikan tipe di frontend tidak
   diperiksa terhadap apa yang benar-benar dikirim server.

   Dua tab, bukan satu daftar. Acara 2 boothnya per kampus, Acara 3 per
   jurusan, dan peserta perlu tahu dia sudah mengumpulkan berapa di
   masing-masing. Angka terkumpul dan total dipakai apa adanya dari server,
   bukan dihitung ulang di sini.

   Booth yang sudah tutup TETAP ditampilkan, abu-abu. Kalau dihilangkan, jumlah
   kotaknya berubah-ubah sepanjang acara dan peserta tidak pernah tahu dia
   melewatkan apa. Yang hilang diam-diam selalu terasa seperti kesalahan
   aplikasi, bukan seperti kesempatan yang lewat.
============================================================================= */

import { useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong, Terkunci } from '../../komponen/Keadaan';

interface KotakBooth {
  id: number;
  nama: string;
  lokasi: string | null;
  logo_url: string | null;
  dikunjungi: boolean;
  xp_didapat: number | null;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  abu_abu: boolean;
}

interface SatuPaspor {
  acara: string | null;
  terkumpul: number;
  total: number;
  booth: KotakBooth[];
}

interface Isi {
  paspor_kampus?: SatuPaspor | null;
  paspor_jurusan?: SatuPaspor | null;
}

const TAB = [
  { kunci: 'paspor_kampus' as const, label: 'Paspor Kampus' },
  { kunci: 'paspor_jurusan' as const, label: 'Paspor Jurusan' },
];

export default function Paspor() {
  const { data, memuat, error, kode, muatUlang } = useMuat<Isi>(
    (signal) => api.get<Isi>('/booths/passport/saya', { signal }),
    [],
  );

  const [tab, setTab] = useState<'paspor_kampus' | 'paspor_jurusan'>('paspor_kampus');
  const [cari, setCari] = useState('');

  const paspor: SatuPaspor | null = data?.[tab] ?? null;

  // Array.isArray dipasang sengaja, bukan cuma ?? []. Kalau bentuk jawaban
  // server berubah lagi, halamannya menampilkan keadaan kosong yang rapi, bukan
  // layar putih tanpa penjelasan apa pun.
  const semua = useMemo(
    () => (Array.isArray(paspor?.booth) ? paspor.booth : []),
    [paspor],
  );

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return q ? semua.filter((b) => (b.nama ?? '').toLowerCase().includes(q)) : semua;
  }, [semua, cari]);

  if (memuat) return <Memuat />;

  // Peserta yang belum lunas bukan sedang mengalami error. Sebelum ini dia
  // melihat kartu merah "Peserta belum menyelesaikan pembayaran" dengan tombol
  // Coba Lagi, yang tidak akan pernah berhasil karena yang kurang bukan
  // permintaannya, melainkan pembayarannya.
  if (kode === 'BELUM_BAYAR') {
    return (
      <Terkunci
        judul="Paspor terbuka sesudah pembayaran"
        keterangan="Paspor Kampus dan Paspor Jurusan mulai mengumpulkan stempel begitu panitia menandai pembayaranmu lunas. Kodemu tetap tersimpan, tidak perlu mendaftar ulang."
        ke="/bayar"
        labelTombol="Lihat Cara Bayar"
      />
    );
  }

  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const terkumpul = paspor?.terkumpul ?? semua.filter((b) => b.dikunjungi).length;
  const total = paspor?.total ?? semua.length;

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      <header>
        <h1 className="judul-tebal text-[2rem]">Paspor</h1>
        <p className="mt-1 text-sm text-slate-500">
          {paspor?.acara ? `${paspor.acara} · ` : ''}booth yang sudah kamu datangi.
        </p>
      </header>

      <div className="flex gap-2">
        {TAB.map((t) => (
          <button
            key={t.kunci}
            type="button"
            onClick={() => {
              setTab(t.kunci);
              setCari('');
            }}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-black ${
              tab === t.kunci ? 'tombol-utama' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {total > 0 && (
        <div className="kartu p-4 ring-1 ring-slate-200">
          <p className="text-sm font-bold">
            Terkumpul {terkumpul} dari {total}
          </p>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-berhasil-600 transition-all"
              style={{ width: `${total ? (terkumpul / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Pencarian muncul sendiri hanya kalau memang banyak. */}
      {semua.length > 20 && (
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari booth..."
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
        />
      )}

      {tampil.length === 0 ? (
        <Kosong
          judul={cari ? 'Tidak ada yang cocok' : 'Belum ada booth'}
          keterangan={
            cari
              ? 'Coba potongan namanya saja.'
              : 'Divisi Acara belum membuka booth untuk bagian ini.'
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tampil.map((b) => {
            const tutup = b.abu_abu || b.status === 'CLOSED';
            return (
              <li
                key={b.id}
                className={`kartu p-3 text-center ${
                  b.dikunjungi
                    ? 'bg-berhasil-50 ring-2 ring-berhasil-600'
                    : tutup
                      ? 'bg-slate-100 opacity-70 ring-1 ring-slate-200'
                      : 'ring-1 ring-slate-200'
                }`}
              >
                <p className="text-2xl" aria-hidden>
                  {b.dikunjungi ? '✓' : tutup ? '■' : '□'}
                </p>
                <p className="mt-1 truncate text-xs font-black">{b.nama}</p>
                {b.lokasi && (
                  <p className="truncate text-[11px] text-slate-400">{b.lokasi}</p>
                )}
                {b.dikunjungi && b.xp_didapat ? (
                  <p className="text-[11px] font-black text-berhasil-700">
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
