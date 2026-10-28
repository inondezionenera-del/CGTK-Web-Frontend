/* =============================================================================
   /admin — beranda panitia.

   Sebelum halaman ini ada, /admin langsung membuka Tandai Lunas, dan empat
   layar admin lainnya tidak bisa ditemukan kecuali alamatnya diketik manual.
   Itu bukan masalah kecil di hari acara: panitia yang tidak menemukan Saklar
   Sesi akan menelepon anak web, dan anak web sedang memegang scanner.

   Kartu disaring berdasarkan izin yang dikirim server, bukan berdasarkan peran
   yang ditebak di sini. Daftar izin itu juga yang dipakai backend untuk
   menolak, jadi tidak ada layar yang kelihatan tapi ditolak waktu dibuka.

   Menyembunyikan kartu BUKAN pengamanan. Setiap endpoint di baliknya tetap
   memeriksa izinnya sendiri; ini cuma supaya layarnya tidak penuh hal yang
   bukan urusan orang yang sedang membukanya.
============================================================================= */

import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';
import { useSesi } from '../../lib/sesi';

interface Alat {
  ke: string;
  nama: string;
  ket: string;
  izin: string[];
  penting?: boolean;
}

const ALAT: Alat[] = [
  {
    ke: '/admin/pengaturan',
    nama: 'Pengaturan',
    ket: 'Harga, batas akhir, link pembayaran, Mode Hemat.',
    izin: ['ATUR_PEMBAYARAN', 'PENGATURAN_SISTEM', 'ATUR_XP', 'KELOLA_FORM', 'KELOLA_JADWAL'],
    penting: true,
  },
  {
    ke: '/admin/lunas',
    nama: 'Tandai Lunas',
    ket: 'Centang peserta yang sudah membayar, atau tempel kodenya sekaligus.',
    izin: ['TANDAI_LUNAS'],
  },
  {
    ke: '/admin/jadwal',
    nama: 'Saklar Sesi',
    ket: 'Buka dan tutup sesi. Scanner panitia ikut terkunci.',
    izin: ['SAKLAR_SESI', 'KELOLA_JADWAL'],
  },
  {
    ke: '/admin/pengumuman',
    nama: 'Kirim Pengumuman',
    ket: 'Muncul di layar semua peserta dalam hitungan detik.',
    izin: ['KIRIM_PENGUMUMAN'],
  },
  {
    ke: '/admin/halaman',
    nama: 'Halaman Info',
    ket: 'Isi FAQ, Tentang, dan Ketentuan.',
    izin: ['KELOLA_KONTEN'],
  },
  {
    ke: '/admin/alumni',
    nama: 'Undang Alumni',
    ket: 'Tanpa alumni, booth kampus tidak punya penjaga.',
    izin: ['UNDANG_ALUMNI'],
    penting: true,
  },
  {
    ke: '/admin/booth',
    nama: 'Kelola Booth',
    ket: 'Buat booth dari alumni yang sudah diundang, lalu buka.',
    izin: ['KELOLA_BOOTH'],
  },
  {
    ke: '/admin/kampus',
    nama: 'Kampus & Jurusan',
    ket: 'Data induk. Dipakai kuis, booth, dan undangan alumni.',
    izin: ['KELOLA_MASTER'],
  },
  {
    ke: '/admin/ekspor',
    nama: 'Ekspor & Log',
    ket: 'Unduh CSV peserta dan presensi, baca log perubahan.',
    izin: ['EKSPOR_LPJ', 'LIHAT_AUDIT'],
  },
  {
    ke: '/admin/sponsor',
    nama: 'Kelola Sponsor',
    ket: 'Logo, tier, urutan, dan di halaman mana muncul.',
    izin: ['KELOLA_SPONSOR'],
  },
  {
    ke: '/admin/booths/poster',
    nama: 'Poster Booth',
    ket: 'Cetak QR semua booth sekaligus untuk ditempel di meja.',
    izin: ['KELOLA_BOOTH'],
  },
  {
    ke: '/admin/pemenang',
    nama: 'Pemenang',
    ket: 'Bekukan papan peringkat, periksa, lalu sahkan.',
    izin: ['BEKUKAN_LEADERBOARD', 'SAHKAN_PEMENANG'],
  },
];

export default function AdminBeranda() {
  const { pengguna } = useSesi();

  const { data, memuat, error, muatUlang } = useMuat<string[]>(
    (signal) => api.get<string[]>('/auth/izin', { signal }),
    [],
  );

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const izin = data ?? [];
  const superAdmin = pengguna?.peran === 'SUPER_ADMIN';
  const boleh = (a: Alat) => superAdmin || a.izin.some((i) => izin.includes(i));
  const tampil = ALAT.filter(boleh);

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <header className="text-center">
        <h1 className="judul-tebal text-[2rem]">Panel Panitia</h1>
        <p className="mt-1 text-sm text-slate-500">
          {pengguna?.nama ?? ''} &middot; {tampil.length} alat tersedia untukmu
        </p>
      </header>

      {tampil.length === 0 ? (
        <Kosong
          judul="Tidak ada alat untuk peranmu"
          keterangan="Kalau ini keliru, minta Super Admin memeriksa izin akunmu."
        />
      ) : (
        <ul className="space-y-3">
          {tampil.map((a) => (
            <li key={a.ke}>
              <Link
                to={a.ke}
                className={`kartu flex items-center gap-3 p-4 ${
                  a.penting ? 'ring-2 ring-merek-magenta' : 'ring-1 ring-slate-200'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-black">{a.nama}</span>
                  <span className="block text-sm leading-snug text-slate-600">
                    {a.ket}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 text-2xl text-slate-300">
                  &rsaquo;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
