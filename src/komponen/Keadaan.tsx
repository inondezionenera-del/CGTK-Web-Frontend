/* =============================================================================
   Tiga keadaan yang setiap halaman pasti ketemu: sedang memuat, gagal, kosong.

   Pakai yang sudah ada di sini, jangan bikin sendiri-sendiri. Kalau tiap orang
   bikin versinya masing-masing, peserta akan lihat tiga gaya "loading" yang
   berbeda di satu aplikasi yang sama.
============================================================================= */

import type { ReactNode } from 'react';

export function Memuat({ pesan = 'Memuat...' }: { pesan?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      <p className="text-sm">{pesan}</p>
    </div>
  );
}

/**
 * Tampilkan pesan dari server APA ADANYA. Jangan diganti kalimat karanganmu.
 * Pesan itu yang memberi tahu peserta harus berbuat apa, misalnya
 * "Kode registrasi tidak ditemukan" atau "Terlalu banyak percobaan".
 */
export function PesanError({ pesan, coba }: { pesan: string; coba?: () => void }) {
  return (
    <div className="mx-auto my-8 max-w-md rounded-lg border border-red-200 bg-red-50 p-5 text-center dark:border-red-900 dark:bg-red-950">
      <p className="text-sm text-red-800 dark:text-red-200">{pesan}</p>
      {coba && (
        <button
          type="button"
          onClick={coba}
          className="mt-4 min-h-11 rounded-md bg-red-600 px-5 text-sm font-medium text-white hover:bg-red-700"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}

/** Halaman kosong harus tetap menjelaskan. Jangan biarkan layar putih polos. */
export function Kosong({ judul, keterangan }: { judul: string; keterangan?: ReactNode }) {
  return (
    <div className="py-16 text-center text-slate-500">
      <p className="font-medium text-slate-700 dark:text-slate-300">{judul}</p>
      {keterangan && <p className="mt-1 text-sm">{keterangan}</p>}
    </div>
  );
}
