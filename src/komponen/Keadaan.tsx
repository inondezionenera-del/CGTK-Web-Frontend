/* =============================================================================
   Tiga keadaan yang setiap halaman pasti ketemu: sedang memuat, gagal, kosong.

   Pakai yang sudah ada di sini, jangan bikin sendiri-sendiri. Kalau tiap orang
   bikin versinya masing-masing, peserta akan lihat tiga gaya "loading" yang
   berbeda di satu aplikasi yang sama.

   Ketiganya muncul di hampir setiap halaman, jadi ketiganya ikut menentukan
   apakah aplikasinya terasa sudah jadi atau belum. Versi sebelumnya berupa
   teks abu-abu di tengah layar putih, dan halaman yang datanya memang masih
   kosong jadi terlihat seperti halaman yang belum dibuat.
============================================================================= */

import type { ReactNode } from 'react';

export function Memuat({ pesan = 'Memuat...' }: { pesan?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      {/* Dua cincin: satu diam sebagai jalur, satu berputar. Satu cincin saja
          hampir tidak kelihatan di layar terang di luar ruangan. */}
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-merek-magenta" />
      </div>
      <p className="text-sm font-bold text-slate-500">{pesan}</p>
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
    <div className="kartu mx-auto my-6 max-w-md p-6 text-center ring-2 ring-bahaya-600/30">
      <p className="text-3xl" aria-hidden>
        &#9888;
      </p>
      <p className="mt-2 text-sm font-bold leading-relaxed text-bahaya-700">
        {pesan}
      </p>
      {coba && (
        <button
          type="button"
          onClick={coba}
          className="tombol-utama mt-5 px-7 py-2.5 text-sm"
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
    <div className="kartu mx-auto my-6 max-w-md p-8 text-center ring-1 ring-slate-200">
      {/* Kotak kosong bergaris putus-putus. Tanda yang dikenali orang sebagai
          "memang belum ada isinya", bukan "gagal dimuat". */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300">
        <span className="h-2.5 w-7 rounded-full bg-slate-300" />
      </div>
      <p className="mt-4 text-lg font-black text-slate-800">{judul}</p>
      {keterangan && (
        <p className="mt-1 text-sm leading-relaxed text-slate-500">{keterangan}</p>
      )}
    </div>
  );
}
