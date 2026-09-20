import type { ReactNode } from 'react';
import { useSesi } from '../lib/sesi';
import { Memuat } from './Keadaan';
import { masukDenganGoogle } from '../lib/supabase';

/**
 * Bungkus halaman yang butuh login.
 *
 * Ini cuma penjaga tampilan, BUKAN penjaga keamanan. Yang benar-benar menolak
 * orang tanpa hak itu backend. Jangan pernah menaruh data rahasia di dalam
 * komponen ini dengan anggapan orang lain tidak bisa melihatnya.
 */
export function WajibLogin({ children }: { children: ReactNode }) {
  const { memuat, masuk } = useSesi();

  if (memuat) return <Memuat pesan="Memeriksa sesi..." />;

  if (!masuk) {
    return (
      <div className="py-16 text-center">
        <p className="text-slate-600 dark:text-slate-300">
          Halaman ini perlu kamu masuk dulu.
        </p>
        <button
          type="button"
          onClick={() => void masukDenganGoogle()}
          className="mt-4 min-h-11 rounded-md bg-slate-900 px-6 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900"
        >
          Masuk dengan Google
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
