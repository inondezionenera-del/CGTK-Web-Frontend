/* =============================================================================
   /p/:slug — FAQ, About, Terms. Satu komponen untuk ketiganya.

   Tidak ada satu pun teks tetap yang ditulis di dalam program. Isinya diubah
   sendiri oleh panitia dari halaman admin; kalau teksnya ditulis di sini, tiap
   kali FAQ berubah harus ada anak web yang buka laptop.

   Tampilannya mengikuti mockup FAQ: latar air sampai ke tepi layar, judul di
   dalam panel kaca buram, lalu kartu-kartu biru tua.

   Isinya Markdown, dan sebelumnya ditampilkan apa adanya sebagai satu blok
   teks. Itu artinya tanda pagar dan tanda bintang ikut kelihatan di layar, dan
   halaman ini yang paling terlihat belum jadi.

   Yang dipakai di sini pembaca Markdown kecil yang ditulis sendiri, bukan
   pustaka: yang dibutuhkan cuma judul, paragraf, daftar, dan tebal. Menambah
   pustaka Markdown untuk empat hal itu menambah puluhan kilobyte yang harus
   diunduh lima ratus peserta lewat sinyal lapangan.
============================================================================= */

import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';
import type { Halaman } from '../../types/api';

interface Bagian {
  judul: string | null;
  isi: string[];
}

/**
 * Memecah Markdown jadi bagian-bagian, satu kartu per judul.
 *
 * Untuk FAQ, tiap judul jadi pertanyaan dan isinya jadi jawaban. Untuk About
 * dan Terms yang tidak punya judul sama sekali, semuanya jadi satu kartu.
 */
function pecah(teks: string): Bagian[] {
  const bagian: Bagian[] = [];
  let sekarang: Bagian | null = null;

  for (const baris of (teks ?? '').split('\n')) {
    const judul = baris.match(/^\s{0,3}#{1,6}\s+(.*)$/);
    if (judul) {
      if (sekarang) bagian.push(sekarang);
      sekarang = { judul: (judul[1] ?? '').trim(), isi: [] };
      continue;
    }
    if (!sekarang) sekarang = { judul: null, isi: [] };
    sekarang.isi.push(baris);
  }
  if (sekarang) bagian.push(sekarang);

  return bagian.filter((b) => b.judul || b.isi.some((x) => x.trim()));
}

/**
 * Tebal **begini** dan miring _begini_. Sisanya dibiarkan apa adanya.
 *
 * Miring ikut dikenali karena teks bawaan halaman ini memakainya, dan tanpa
 * itu peserta melihat garis bawahnya mentah di layar.
 */
function gaya(baris: string) {
  return baris.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((potong, i) => {
    if (potong.startsWith('**') && potong.endsWith('**')) {
      return <strong key={i}>{potong.slice(2, -2)}</strong>;
    }
    if (potong.length > 2 && potong.startsWith('_') && potong.endsWith('_')) {
      return <em key={i}>{potong.slice(1, -1)}</em>;
    }
    return <span key={i}>{potong}</span>;
  });
}

function Isi({ baris }: { baris: string[] }) {
  const keluaran: React.ReactNode[] = [];
  let daftar: string[] = [];

  function tutupDaftar(kunci: string) {
    if (daftar.length === 0) return;
    keluaran.push(
      <ul key={kunci} className="my-2 list-disc space-y-1 pl-5">
        {daftar.map((d, i) => (
          <li key={i}>{gaya(d)}</li>
        ))}
      </ul>,
    );
    daftar = [];
  }

  baris.forEach((b, i) => {
    const poin = b.match(/^\s*[-*+]\s+(.*)$/);
    if (poin) {
      daftar.push(poin[1] ?? '');
      return;
    }
    tutupDaftar(`u${i}`);
    if (b.trim()) {
      keluaran.push(
        <p key={i} className="my-1.5">
          {gaya(b)}
        </p>,
      );
    }
  });
  tutupDaftar('u-akhir');

  return <>{keluaran}</>;
}

export default function HalamanInfo() {
  const { slug = '' } = useParams();

  const { data, memuat, error, muatUlang } = useMuat<Halaman>(
    (signal) => api.get<Halaman>(`/pages/${slug}`, { signal }),
    [slug],
  );

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;
  if (!data) {
    return (
      <Kosong
        judul="Halaman tidak ditemukan"
        keterangan="Alamatnya mungkin salah ketik."
      />
    );
  }

  const bagian = pecah(data.isi ?? '');

  // Isi bawaan halaman ini adalah penanda "belum diisi", bukan tulisan yang
  // dimaksudkan untuk dibaca peserta. Dibersihkan dari tanda Markdown dulu,
  // lalu kalau yang tersisa memang tidak berarti apa-apa, yang tampil keadaan
  // kosong yang rapi. Menampilkan penanda itu apa adanya membuat halaman FAQ
  // terlihat seperti halaman yang rusak.
  const telanjang = (data.isi ?? '')
    .replace(/[*_#>`-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const belumDiisi = telanjang.length === 0 || telanjang === 'belum diisi.' || telanjang === 'belum diisi';

  if (belumDiisi) {
    return (
      <div className="latar-air min-h-[calc(100dvh-4rem)] px-4 pb-14 pt-8">
        <div className="mx-auto w-fit rounded-2xl bg-white/20 px-10 py-3 backdrop-blur-sm">
          <h1 className="judul-stiker text-center text-[2.6rem] uppercase leading-none">
            {data.judul}
          </h1>
        </div>
        <div className="mx-auto mt-7 max-w-2xl">
          <Kosong
            judul="Isinya belum ditulis panitia"
            keterangan="Halaman ini akan terisi sebelum acara dimulai."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="latar-air min-h-[calc(100dvh-3.5rem)] px-4 pb-14 pt-8">
      {/* Panel kaca buram di belakang judul, seperti di mockup. */}
      <div className="mx-auto w-fit rounded-2xl bg-white/20 px-10 py-3 backdrop-blur-sm">
        <h1 className="judul-stiker text-center text-[2.6rem] uppercase leading-none">
          {data.judul}
        </h1>
      </div>

      <div className="mx-auto mt-7 max-w-2xl space-y-5">
        {bagian.length === 0 ? (
          <p className="rounded-[1.75rem] bg-merek-navy p-6 text-center text-white/80">
            Isinya belum ditulis panitia.
          </p>
        ) : (
          bagian.map((b, i) => (
            <section
              key={i}
              className="rounded-[1.75rem] bg-merek-navy px-5 py-5 text-white shadow-[0_14px_30px_-18px_rgba(0,0,0,0.8)]"
            >
              {b.judul && (
                <div className="flex gap-3 border-b border-white/40 pb-3">
                  <span className="shrink-0 text-xl font-black leading-tight">Q.</span>
                  <h2 className="text-base font-bold leading-snug">{b.judul}</h2>
                </div>
              )}

              {b.isi.some((x) => x.trim()) && (
                <div className={`flex gap-3 ${b.judul ? 'pt-3' : ''}`}>
                  {b.judul && (
                    <span className="shrink-0 text-xl font-black leading-tight">A.</span>
                  )}
                  <div className="min-w-0 text-sm leading-relaxed text-white/90">
                    <Isi baris={b.isi} />
                  </div>
                </div>
              )}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
