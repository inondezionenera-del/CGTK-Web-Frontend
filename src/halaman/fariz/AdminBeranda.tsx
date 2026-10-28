/* =============================================================================
   /admin — dashboard panitia.

   Sebelumnya halaman ini cuma daftar tautan, karena memang belum ada endpoint
   yang bisa memberi angkanya. Sekarang ada GET /admin/ringkasan, dan seluruh
   angka di sini dari sana. Tidak ada satu pun yang ditulis di program.

   Urutannya disusun dari apa yang dikerjakan panitia saat membuka halaman ini
   di tengah acara, bukan dari apa yang paling mudah dihitung:

   1. Apa yang butuh tindakan SEKARANG. Setelan pembayaran yang kosong, booth
      yang masih DRAFT, alumni yang belum pernah masuk, sesi yang semuanya
      tertutup. Tidak satu pun memunculkan error di mana pun, jadi tanpa
      ditulis di sini tidak akan ada yang sadar sampai peserta mengeluh.
   2. Angka hari ini: presensi, kunjungan booth, sesi yang sedang hidup.
   3. Angka pendaftaran dan pembayaran.
   4. Baru alatnya.

   Kartu alat disaring dengan daftar izin dari server. Menyembunyikan kartu
   BUKAN pengamanan; setiap endpoint di baliknya menolak 403 sendiri.
============================================================================= */

import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useMuat, useMuatUlangBerkala } from '../../lib/kait';
import { Memuat, PesanError } from '../../komponen/Keadaan';
import { useSesi } from '../../lib/sesi';
import { useIzin } from '../../lib/izin';

interface SesiHidup {
  id: number;
  nama: string;
  lokasi: string | null;
}

interface Ringkasan {
  pendaftaran: { total: number; lunas: number; menunggu: number; dibatalkan: number };
  hari_ini: { presensi: number; kunjungan_booth: number };
  booth: { aktif: number; draf: number };
  sesi: { aktif: number; draf: number; sedang_hidup: SesiHidup[] };
  alumni: { aktif: number; diundang: number };
  perlu_perhatian: {
    setelan_bayar_kosong: string[];
    booth_draf: number;
    alumni_belum_masuk: number;
  };
}

interface Alat {
  ke: string;
  nama: string;
  ket: string;
  izin: string[];
}

const ALAT: Alat[] = [
  { ke: '/admin/pengaturan', nama: 'Pengaturan', ket: 'Harga, batas akhir, link pembayaran, Mode Hemat.', izin: ['ATUR_PEMBAYARAN', 'PENGATURAN_SISTEM', 'ATUR_XP', 'KELOLA_FORM', 'KELOLA_JADWAL'] },
  { ke: '/admin/lunas', nama: 'Tandai Lunas', ket: 'Centang peserta yang sudah membayar.', izin: ['TANDAI_LUNAS'] },
  { ke: '/admin/jadwal', nama: 'Saklar Sesi', ket: 'Buka dan tutup sesi. Scanner ikut terkunci.', izin: ['SAKLAR_SESI', 'KELOLA_JADWAL'] },
  { ke: '/admin/alumni', nama: 'Undang Alumni', ket: 'Tanpa alumni, booth kampus tidak punya penjaga.', izin: ['UNDANG_ALUMNI'] },
  { ke: '/admin/booth', nama: 'Kelola Booth', ket: 'Buat booth dari alumni, lalu buka.', izin: ['KELOLA_BOOTH'] },
  { ke: '/admin/lo', nama: 'Tugaskan LO', ket: 'Tanpa penugasan, dashboard LO kosong.', izin: ['UNDANG_ALUMNI'] },
  { ke: '/admin/kampus', nama: 'Kampus & Jurusan', ket: 'Data induk untuk kuis, booth, dan alumni.', izin: ['KELOLA_MASTER'] },
  { ke: '/admin/pengumuman', nama: 'Kirim Pengumuman', ket: 'Sampai ke layar peserta dalam hitungan detik.', izin: ['KIRIM_PENGUMUMAN'] },
  { ke: '/admin/halaman', nama: 'Halaman Info', ket: 'Isi FAQ, Tentang, dan Ketentuan.', izin: ['KELOLA_KONTEN'] },
  { ke: '/admin/sponsor', nama: 'Kelola Sponsor', ket: 'Logo, tier, urutan, penempatan.', izin: ['KELOLA_SPONSOR'] },
  { ke: '/admin/form', nama: 'Formulir Pendaftaran', ket: 'Pertanyaan tambahan saat mendaftar.', izin: ['KELOLA_FORM'] },
  { ke: '/admin/booths/poster', nama: 'Poster Booth', ket: 'Cetak QR semua booth sekaligus.', izin: ['KELOLA_BOOTH'] },
  { ke: '/admin/pemenang', nama: 'Pemenang', ket: 'Bekukan, periksa, lalu sahkan.', izin: ['BEKUKAN_LEADERBOARD', 'SAHKAN_PEMENANG'] },
  { ke: '/admin/ekspor', nama: 'Ekspor & Log', ket: 'Unduh CSV dan baca log perubahan.', izin: ['EKSPOR_LPJ', 'LIHAT_AUDIT'] },
];

export default function AdminBeranda() {
  const { pengguna, masuk } = useSesi();
  const izin = useIzin(masuk);

  const { data, memuat, error, muatUlang } = useMuat<Ringkasan | null>(
    (signal) => api.get<Ringkasan>('/admin/ringkasan', { signal }).catch(() => null),
    [],
  );

  // Dibuka di laptop meja panitia sepanjang acara, jadi disegarkan sendiri.
  // useMuatUlangBerkala berhenti waktu tab-nya tidak dilihat.
  useMuatUlangBerkala(muatUlang, 60_000);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const superAdmin = pengguna?.peran === 'SUPER_ADMIN';
  const alat = ALAT.filter((a) => superAdmin || a.izin.some((i) => izin.includes(i)));

  const r = data;
  const perhatian: { teks: string; ke: string }[] = [];
  if (r) {
    if (r.perlu_perhatian.setelan_bayar_kosong.length > 0) {
      perhatian.push({
        teks: `${r.perlu_perhatian.setelan_bayar_kosong.length} setelan pembayaran masih kosong, jadi halaman bayar peserta belum bisa dipakai`,
        ke: '/admin/pengaturan',
      });
    }
    if (r.perlu_perhatian.booth_draf > 0) {
      perhatian.push({
        teks: `${r.perlu_perhatian.booth_draf} booth masih DRAFT, belum terlihat peserta dan belum bisa dipindai`,
        ke: '/admin/booth',
      });
    }
    if (r.alumni.aktif === 0) {
      perhatian.push({
        teks: 'Belum ada alumni aktif, jadi booth kampus belum punya penjaga',
        ke: '/admin/alumni',
      });
    } else if (r.perlu_perhatian.alumni_belum_masuk > 0) {
      perhatian.push({
        teks: `${r.perlu_perhatian.alumni_belum_masuk} alumni sudah diundang tapi belum pernah masuk`,
        ke: '/admin/alumni',
      });
    }
    if (r.sesi.aktif === 0) {
      perhatian.push({
        teks: 'Tidak ada sesi yang terbuka, jadi scanner presensi terkunci untuk semua panitia',
        ke: '/admin/jadwal',
      });
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <header>
        <h1 className="judul-tebal text-[2rem]">Dashboard Panitia</h1>
        <p className="mt-1 text-sm text-slate-500">
          {/* Pemisah cuma muncul kalau namanya memang ada. Tanpa penjaga ini
              layarnya menampilkan titik menggantung di awal kalimat. */}
          {pengguna?.nama ? `${pengguna.nama} · ` : ''}
          angka disegarkan sendiri tiap menit
        </p>
      </header>

      {perhatian.length > 0 && (
        <section className="kartu p-5 ring-2 ring-hatihati-600/40">
          <h2 className="text-xs font-black uppercase tracking-wider text-hatihati-700">
            Perlu Tindakan
          </h2>
          <ul className="mt-2 space-y-2">
            {perhatian.map((p) => (
              <li key={p.ke + p.teks}>
                <Link
                  to={p.ke}
                  className="flex items-start gap-2 text-sm font-bold leading-snug text-slate-800"
                >
                  <span aria-hidden className="mt-0.5 shrink-0 text-hatihati-700">
                    &#9888;
                  </span>
                  <span className="min-w-0 underline decoration-slate-300">
                    {p.teks}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r ? (
        <>
          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Hari Ini
            </h2>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Angka nilai={r.hari_ini.presensi} label="Presensi sesi" />
              <Angka nilai={r.hari_ini.kunjungan_booth} label="Kunjungan booth" />
              <Angka nilai={r.sesi.aktif} label="Sesi terbuka" sorot={r.sesi.aktif > 0} />
              <Angka nilai={r.booth.aktif} label="Booth terbuka" />
            </div>

            {r.sesi.sedang_hidup.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {r.sesi.sedang_hidup.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-berhasil-50 px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm font-bold">
                      {s.nama}
                      {s.lokasi ? ` · ${s.lokasi}` : ''}
                    </span>
                    <span className="shrink-0 rounded-md bg-berhasil-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                      Live
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Pendaftaran
            </h2>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Angka nilai={r.pendaftaran.total} label="Total mendaftar" />
              <Angka nilai={r.pendaftaran.lunas} label="Sudah lunas" />
              <Angka
                nilai={r.pendaftaran.menunggu}
                label="Menunggu bayar"
                sorot={r.pendaftaran.menunggu > 0}
              />
              <Angka nilai={r.alumni.aktif} label="Alumni aktif" />
            </div>

            {r.pendaftaran.total > 0 && (
              <div className="mt-3">
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="bg-berhasil-600"
                    style={{ width: `${(r.pendaftaran.lunas / r.pendaftaran.total) * 100}%` }}
                  />
                  <div
                    className="bg-peringatan-400"
                    style={{ width: `${(r.pendaftaran.menunggu / r.pendaftaran.total) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {Math.round((r.pendaftaran.lunas / r.pendaftaran.total) * 100)}% pendaftar
                  sudah lunas
                  {r.pendaftaran.dibatalkan > 0 && `, ${r.pendaftaran.dibatalkan} dibatalkan`}
                </p>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="kartu p-5 ring-1 ring-slate-200">
          <p className="text-sm leading-relaxed text-slate-600">
            Ringkasan angka tidak bisa dimuat untuk akunmu. Alat di bawah tetap
            bisa dipakai sesuai izinmu.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Alat ({alat.length})
        </h2>
        <ul className="mt-2 grid gap-3 sm:grid-cols-2">
          {alat.map((a) => (
            <li key={a.ke}>
              <Link
                to={a.ke}
                className="kartu flex h-full items-center gap-3 p-4 ring-1 ring-slate-200"
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
      </section>
    </div>
  );
}

function Angka({
  nilai,
  label,
  sorot,
}: {
  nilai: number;
  label: string;
  sorot?: boolean;
}) {
  return (
    <div
      className={`kartu p-4 ${sorot ? 'ring-2 ring-merek-magenta' : 'ring-1 ring-slate-200'}`}
    >
      <p className="judul-tebal text-3xl tabular-nums">{nilai}</p>
      <p className="mt-0.5 text-xs font-bold leading-tight text-slate-500">{label}</p>
    </div>
  );
}
