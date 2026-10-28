/* =============================================================================
   /admin/pendaftaran — siapa yang sudah membayar, dan siapa yang belum.

   Ini pertanyaan yang paling sering ditanyakan panitia, dan sebelum halaman
   ini ada jawabannya cuma bisa didapat dengan mengekspor CSV lalu membukanya
   di Excel. Layar Tandai Lunas yang sudah ada sengaja hanya menampilkan yang
   MENUNGGU, jadi yang sudah lunas justru tidak kelihatan di mana pun.

   Pembayaran di sistem ini MANUAL. Tidak ada payment gateway dan tidak ada
   status yang datang sendiri: panitia Administrasi yang menandai sesudah
   mencocokkan dengan catatan mereka. Karena itu kolom "ditandai oleh" dan
   waktunya ditampilkan di tiap baris, bukan disembunyikan di log. Kalau ada
   yang janggal sesudah acara, itu yang dibaca.

   Yang TIDAK ditampilkan: nomor telepon dan email peserta. Pesertanya di bawah
   umur dan layar ini tidak membutuhkannya untuk mengerjakan tugasnya. Server
   juga tidak mengirimkannya.

   Menandai lunas dilakukan di halaman Tandai Lunas, bukan di sini. Halaman ini
   untuk MELIHAT; satu layar yang sekaligus bisa mengubah status sambil digulir
   cepat adalah cara paling mudah menandai orang yang salah.
============================================================================= */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

interface Bayar {
  ditandai_at: string | null;
  ditandai_oleh: string | null;
  catatan: string | null;
  dibatalkan: boolean;
}

interface BarisPeserta {
  id: string;
  kode_registrasi: string;
  nama: string;
  asal_sekolah: string | null;
  kelas: string | null;
  status: string;
  profil_lengkap: boolean;
  daftar_at: string;
  bayar: Bayar | null;
}

interface Hitungan {
  total: number;
  profil_belum_lengkap: number;
  menunggu_pembayaran: number;
  lunas: number;
  dibatalkan: number;
}

interface Isi {
  baris: BarisPeserta[];
  total: number;
  hitungan: Hitungan | null;
}

const SARINGAN = [
  { nilai: '', label: 'Semua' },
  { nilai: 'LUNAS', label: 'Lunas' },
  { nilai: 'MENUNGGU_PEMBAYARAN', label: 'Menunggu' },
  { nilai: 'PROFIL_BELUM_LENGKAP', label: 'Belum lengkap' },
  { nilai: 'DIBATALKAN', label: 'Dibatalkan' },
];

export default function AdminPendaftaran() {
  const [status, setStatus] = useState('');
  const [cari, setCari] = useState('');
  const [kirimCari, setKirimCari] = useState('');
  const [hal, setHal] = useState(1);

  const { data, memuat, error, muatUlang } = useMuat<Isi>(
    async (signal) => {
      const q = new URLSearchParams({ hal: String(hal), per: '25' });
      if (status) q.set('status', status);
      if (kirimCari) q.set('cari', kirimCari);

      const [daftar, hitungan] = await Promise.all([
        api.getBerhalaman<BarisPeserta>(`/payments/admin/peserta?${q}`, { signal }),
        api.get<Hitungan>('/payments/admin/hitungan', { signal }).catch(() => null),
      ]);

      return {
        baris: daftar.data,
        total: Number((daftar.meta as { total?: number }).total ?? 0),
        hitungan,
      };
    },
    [status, kirimCari, hal],
  );

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const h = data?.hitungan;
  const baris = data?.baris ?? [];
  const totalHal = Math.max(1, Math.ceil((data?.total ?? 0) / 25));

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10">
      <header>
        <h1 className="judul-tebal text-[2rem]">Pendaftaran &amp; Pembayaran</h1>
        <p className="mt-1 text-sm text-slate-500">
          Semua pendaftar dan status pembayarannya. Pembayaran ditandai manual
          oleh panitia.
        </p>
      </header>

      {h && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Angka nilai={h.total} label="Total daftar" />
          <Angka nilai={h.lunas} label="Lunas" warna="text-berhasil-700" />
          <Angka
            nilai={h.menunggu_pembayaran}
            label="Menunggu bayar"
            warna="text-hatihati-700"
            sorot={h.menunggu_pembayaran > 0}
          />
          <Angka nilai={h.profil_belum_lengkap} label="Belum lengkap" />
          <Angka nilai={h.dibatalkan} label="Dibatalkan" />
        </div>
      )}

      {/* Saringan dan pencarian */}
      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {SARINGAN.map((s) => (
            <button
              key={s.nilai || 'semua'}
              type="button"
              onClick={() => {
                setStatus(s.nilai);
                setHal(1);
              }}
              className={`rounded-full px-4 py-2 text-sm font-black ${
                status === s.nilai ? 'tombol-utama' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setKirimCari(cari.trim());
            setHal(1);
          }}
          className="flex gap-2"
        >
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari kode registrasi, misalnya CGTK-K7M2QX"
            aria-label="Cari kode registrasi"
            className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
          />
          <button type="submit" className="tombol-utama shrink-0 px-6 text-sm">
            Cari
          </button>
          {kirimCari && (
            <button
              type="button"
              onClick={() => {
                setCari('');
                setKirimCari('');
                setHal(1);
              }}
              className="shrink-0 rounded-full bg-slate-100 px-5 text-sm font-black text-slate-700"
            >
              Hapus
            </button>
          )}
        </form>
        <p className="text-xs text-slate-500">
          Pencarian memakai kode registrasi, bukan nama. Kode itu yang ditulis
          peserta di form pembayaran, jadi itu yang dipegang Administrasi.
        </p>
      </section>

      {baris.length === 0 ? (
        <Kosong
          judul="Tidak ada yang cocok"
          keterangan={
            kirimCari
              ? 'Coba potongan kodenya saja, atau hapus pencarian.'
              : 'Belum ada pendaftar dengan status ini.'
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {baris.map((b) => (
            <li key={b.id} className="kartu p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-black">{b.nama}</p>
                  <p className="truncate text-sm text-slate-600">
                    {[b.asal_sekolah, b.kelas].filter(Boolean).join(' · ') ||
                      'Data peserta belum diisi'}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-slate-400">
                    {b.kode_registrasi} &middot; daftar {tanggal(b.daftar_at)}
                  </p>
                </div>
                <LencanaStatus status={b.status} />
              </div>

              {/* Jejak penandaan. Ini yang membuat tiap pembayaran bisa
                  ditelusuri tanpa membuka log audit. */}
              {b.bayar?.ditandai_at && (
                <p className="mt-2 rounded-xl bg-berhasil-50 p-2.5 text-xs leading-relaxed text-berhasil-700">
                  Ditandai lunas {tanggal(b.bayar.ditandai_at)}
                  {b.bayar.ditandai_oleh ? ` oleh ${b.bayar.ditandai_oleh}` : ''}
                  {b.bayar.catatan ? ` — ${b.bayar.catatan}` : ''}
                  {b.bayar.dibatalkan ? ' (penandaan ini dibatalkan)' : ''}
                </p>
              )}

              {b.status === 'PROFIL_BELUM_LENGKAP' && (
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Halaman pembayaran belum terbuka untuk dia sampai data
                  pesertanya lengkap.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {totalHal > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Halaman">
          <button
            type="button"
            disabled={hal <= 1}
            onClick={() => setHal((n) => Math.max(1, n - 1))}
            className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-700 disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <span className="text-sm font-bold text-slate-500">
            Halaman {hal} dari {totalHal}
          </span>
          <button
            type="button"
            disabled={hal >= totalHal}
            onClick={() => setHal((n) => n + 1)}
            className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-700 disabled:opacity-40"
          >
            Berikutnya
          </button>
        </nav>
      )}

      <div className="flex flex-wrap gap-3">
        <Link to="/admin/lunas" className="tombol-utama px-6 py-3 text-sm">
          Tandai Lunas
        </Link>
        <Link
          to="/admin/ekspor"
          className="rounded-full bg-slate-100 px-6 py-3 text-sm font-black text-slate-700"
        >
          Unduh CSV
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Angka({
  nilai,
  label,
  warna,
  sorot,
}: {
  nilai: number;
  label: string;
  warna?: string;
  sorot?: boolean;
}) {
  return (
    <div
      className={`kartu p-3 ${sorot ? 'ring-2 ring-merek-magenta' : 'ring-1 ring-slate-200'}`}
    >
      <p className={`judul-tebal text-2xl tabular-nums ${warna ?? ''}`}>{nilai}</p>
      <p className="mt-0.5 text-[11px] font-bold leading-tight text-slate-500">
        {label}
      </p>
    </div>
  );
}

function LencanaStatus({ status }: { status: string }) {
  const peta: Record<string, { teks: string; kelas: string }> = {
    LUNAS: { teks: 'Lunas', kelas: 'bg-berhasil-600 text-white' },
    MENUNGGU_PEMBAYARAN: { teks: 'Menunggu', kelas: 'bg-peringatan-400 text-slate-900' },
    PROFIL_BELUM_LENGKAP: { teks: 'Belum lengkap', kelas: 'bg-slate-200 text-slate-700' },
    DIBATALKAN: { teks: 'Dibatalkan', kelas: 'bg-bahaya-600 text-white' },
  };
  const t = peta[status] ?? { teks: status, kelas: 'bg-slate-200 text-slate-700' };
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${t.kelas}`}>
      {t.teks}
    </span>
  );
}

function tanggal(iso: string | null): string {
  if (!iso) return '-';
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
