/* =============================================================================
   Supabase dipakai UNTUK LOGIN SAJA.

   Jangan pernah mengambil data lewat  supabase.from(...).select() .
   Tabelnya sudah dikunci Row Level Security, jadi hasilnya pasti 401 dan kamu
   akan bingung mencari sebabnya. Semua data lewat src/lib/api.ts.
============================================================================= */

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    'VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum diisi. ' +
      'Salin .env.example jadi .env, isi nilainya, lalu jalankan ulang npm run dev.',
  );
}

export const supabase = createClient(url, anon);

/** Tombol "Masuk dengan Google". Sesudah ini browser pindah ke Google. */
export function masukDenganGoogle(kembaliKe = window.location.origin) {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: kembaliKe },
  });
}

export function keluar() {
  return supabase.auth.signOut();
}
