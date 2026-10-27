/* =============================================================================
   Bingkai luar aplikasi.

   Disusun ulang mengikuti mockup Figma. Yang berubah paling kelihatan: menunya
   pindah dari bawah ke atas. Di semua gambar mockup, tiap layar punya satu bar
   putih di paling atas berisi foto profil bulat, ikon obor, lalu tiga tautan.
   Versi sebelumnya memakai menu melayang di bawah layar, dan itu alasan
   terbesar kenapa hasilnya terasa bukan desain yang sama walaupun warnanya
   sudah benar.

   Satu hal yang SENGAJA tidak sama persis. Di mockup ketiga tautannya selalu
   Beranda, Dashboard, Scanner, untuk semua orang. Scanner cuma boleh dibuka
   panitia; kalau peserta menekannya dia dapat halaman yang menolaknya. Jadi
   bentuknya dipertahankan, tiga tautan di tempat yang sama, tapi isinya
   mengikuti peran. Peserta melihat Paspor di slot ketiga.

   Halaman scanner tetap mengambil seluruh layar tanpa bar apa pun. Layar itu
   dipakai satu tangan di tengah antrean, dan setiap piksel yang bukan kamera
   adalah beban.
============================================================================= */

import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSesi } from '../lib/sesi';
import { keluar } from '../lib/supabase';

interface Menu {
  ke: string;
  label: string;
}

const MENU_PESERTA: Menu[] = [
  { ke: '/', label: 'Beranda' },
  { ke: '/dashboard', label: 'Dashboard' },
  { ke: '/passport', label: 'Paspor' },
];

const MENU_PANITIA: Menu[] = [
  { ke: '/', label: 'Beranda' },
  { ke: '/dashboard', label: 'Dashboard' },
  { ke: '/scan', label: 'Scanner' },
];

const MENU_TAMU: Menu[] = [
  { ke: '/', label: 'Beranda' },
  { ke: '/schedule', label: 'Jadwal' },
  { ke: '/campuses', label: 'Kampus' },
];

export function Kerangka() {
  const { pengguna, masuk } = useSesi();
  const { pathname } = useLocation();

  if (pathname.startsWith('/scan')) return <Outlet />;

  // Tiga halaman ini di mockup memakai latar penuh sampai ke tepi layar:
  // Landing dengan foto hero, Login dan Daftar dengan latar air. Sisanya
  // tetap memakai lebar dan jarak tepi yang sama seperti sebelumnya, supaya
  // tidak ada halaman lain yang ikut berubah tata letaknya.
  const penuh = ['/', '/masuk', '/daftar'].includes(pathname);

  const peserta = pengguna?.peran === 'PESERTA';
  const menu = !masuk ? MENU_TAMU : peserta ? MENU_PESERTA : MENU_PANITIA;

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <header className="sticky top-0 z-30 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          {/* Foto profil. Tanpa foto tetap lingkaran abu-abu, persis seperti
              di mockup, bukan ruang kosong yang membuat bar-nya terlihat
              timpang. */}
          <Link
            to={masuk ? '/dashboard' : '/masuk'}
            aria-label={masuk ? 'Profil' : 'Masuk'}
            className="shrink-0"
          >
            <span className="block h-9 w-9 rounded-full bg-slate-200" />
          </Link>

          <img
            src="/obor.png"
            alt=""
            aria-hidden
            className="h-6 w-auto shrink-0"
          />

          <nav className="ml-auto flex items-center gap-5 sm:gap-10">
            {menu.map((m) => (
              <NavLink
                key={m.ke}
                to={m.ke}
                end={m.ke === '/'}
                className={({ isActive }) =>
                  `text-[13px] font-bold sm:text-sm ${
                    isActive ? 'text-merek-magenta' : 'text-slate-900'
                  }`
                }
              >
                {m.label}
              </NavLink>
            ))}

            {masuk && (
              <button
                type="button"
                onClick={() => void keluar()}
                className="text-[13px] font-semibold text-slate-400 sm:text-sm"
              >
                Keluar
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className={penuh ? '' : 'mx-auto max-w-5xl px-4 py-5'}>
        <Outlet />
      </main>
    </div>
  );
}
