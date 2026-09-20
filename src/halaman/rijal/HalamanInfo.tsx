/* =============================================================================
   CONTOH LENGKAP. Baca ini dulu sebelum bikin halamanmu sendiri.

   Ini halaman /p/:slug punya RIJAL, dan sengaja dibuat utuh supaya dipakai
   sebagai contekan. Isinya menunjukkan semua yang dipakai berulang:

     - satu komponen untuk banyak alamat (/p/faq, /p/about, /p/terms)
     - mengambil data lewat api.get, bukan lewat supabase
     - tiga keadaan ditangani: memuat, gagal, kosong
     - pesan error ditampilkan apa adanya dari server
     - tidak ada satu pun teks tetap yang ditulis di dalam program

   Yang terakhir itu aturan paling keras di proyek ini. Isi FAQ, About, dan
   Terms diubah sendiri oleh panitia dari halaman admin. Kalau teksnya ditulis
   di sini, tiap kali FAQ berubah harus ada anak web yang buka laptop.
============================================================================= */

import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';
import type { Halaman } from '../../types/api';

export default function HalamanInfo() {
  const { slug = '' } = useParams();

  const { data, memuat, error, muatUlang } = useMuat<Halaman>(
    (signal) => api.get<Halaman>(`/pages/${slug}`, { signal }),
    [slug],
  );

  if (memuat) return <Memuat />;

  if (error) {
    return <PesanError pesan={error} coba={() => muatUlang(false)} />;
  }

  if (!data) {
    return <Kosong judul="Halaman tidak ditemukan" keterangan="Alamatnya mungkin salah ketik." />;
  }

  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">{data.judul}</h1>

      {/*
        data.isi berbentuk Markdown. Untuk sekarang ditampilkan apa adanya
        supaya belum ada pustaka tambahan yang ikut masuk. Nanti kalau sudah
        sepakat mau pakai pustaka Markdown yang mana, ganti bagian ini saja,
        yang lain tidak perlu disentuh.
      */}
      <div className="mt-4 whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300">
        {data.isi}
      </div>
    </article>
  );
}
