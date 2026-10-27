/* =============================================================================
   Bingkai luar aplikasi.

   Ini jawaban atas pertanyaan "kenapa berantakan di HP". Prototipe pertama
   memasang satu baris tab berisi Beranda, Dashboard, Scanner, Bayar, Admin.
   Tujuh tombol tidak muat di layar 360px, jadi barisnya berubah jadi strip
   yang digeser, dan itu yang terlihat berantakan.

   Tapi memperkecilnya bukan jawabannya. Di aplikasi yang sebenarnya tab itu
   memang tidak ada: sesudah login, server mengirim `arahkan_ke`, dan tiap
   orang cuma melihat halaman yang jadi haknya. Peserta tidak pernah melihat
   Scanner atau Admin.

   Jadi:
     - peserta  -> menu bawah, maksimal empat
     - panitia  -> tidak ada menu sama sekali di halaman scanner; layarnya
                   dipakai satu tangan di tengah antrean dan setiap piksel
                   yang bukan kamera itu beban
     - admin    -> dibuka di laptop, tidak dipaksa rapi di HP
============================================================================= */

import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSesi } from '../lib/sesi';
import { keluar } from '../lib/supabase';

interface Menu {
  ke: string;
  label: string;
}

const MENU_PESERTA: Menu[] = [
  { ke: '/dashboard', label: 'Beranda' },
  { ke: '/schedule', label: 'Jadwal' },
  { ke: '/campuses', label: 'Kampus' },
  { ke: '/passport', label: 'Paspor' },
];

export function Kerangka() {
  const { pengguna, masuk } = useSesi();
  const { pathname } = useLocation();

  // Scanner mengambil seluruh layar sendiri. Tidak ada header, tidak ada menu.
  const layarPenuh = pathname.startsWith('/scan');
  if (layarPenuh) return <Outlet />;

  const peserta = pengguna?.peran === 'PESERTA';

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to={masuk ? '/dashboard' : '/'} className="flex items-center gap-2">
            <span className="rounded-lg bg-linear-to-r from-merek-magenta to-merek-pink px-2 py-1 text-sm font-black text-white">
              CGTK
            </span>
            <span className="text-xs font-semibold text-slate-500">2027</span>
          </Link>

          {masuk ? (
            <button
              type="button"
              onClick={() => void keluar()}
              className="text-xs font-semibold text-slate-500 underline"
            >
              Keluar
            </button>
          ) : (
            <Link
              to="/masuk"
              className="tombol-utama px-4 py-2 text-xs"
            >
              Masuk
            </Link>
          )}
        </div>
      </header>

      {/* pb-24 menyisakan ruang untuk menu bawah supaya isi halaman tidak
          tertutup di layar pendek. */}
      <main className={`mx-auto max-w-5xl px-4 py-5 ${peserta ? 'pb-24' : 'pb-8'}`}>
        <Outlet />
      </main>

      {peserta && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900">
          <ul className="mx-auto flex max-w-lg">
            {MENU_PESERTA.map((m) => (
              <li key={m.ke} className="flex-1">
                <NavLink
                  to={m.ke}
                  className={({ isActive }) =>
                    `flex min-h-14 flex-col items-center justify-center text-xs font-bold ${
                      isActive
                        ? 'text-utama-600 dark:text-utama-100'
                        : 'text-slate-400'
                    }`
                  }
                >
                  {m.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
