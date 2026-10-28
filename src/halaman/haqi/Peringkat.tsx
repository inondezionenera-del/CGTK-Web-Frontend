/* =============================================================================
   /leaderboard — papan peringkat.

   Empat hal yang membuat halaman ini benar:

   1. Posisi peserta sendiri selalu terlihat, dipin di bawah kalau dia di luar
      daftar. Tanpa itu, yang di peringkat 200 membuka halaman ini sekali lalu
      tidak pernah lagi.

   2. Aturan pemutus seri ditampilkan terbuka. Dengan lima ratus peserta dan
      sumber XP terbatas, seri di posisi tiga atau lima hampir pasti terjadi,
      dan ada hadiahnya. Aturan yang tidak terlihat akan dibaca sebagai
      kecurangan.

   3. Cache lima belas detik dihormati: halaman ini tidak menyegarkan lebih
      rapat dari itu. Menyegarkan tiap detik cuma menguji cache, bukan
      memberi angka yang lebih baru, dan di hari-H itu beban yang percuma.

   4. Kalau papannya sudah dikunci, itu dinyatakan. XP boleh terus bertambah,
      peringkatnya tidak berubah lagi.
============================================================================= */

import { api } from '../../lib/api';
import { useMuat, useMuatUlangBerkala } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';
import { useSesi } from '../../lib/sesi';

interface Baris {
  peringkat: number;
  participant_id: string;
  nama: string;
  total_xp: number;
}

interface Papan {
  beku: boolean;
  dibekukan_at: string | null;
  baris: Baris[];
}

const TIEBREAK = [
  'XP tertinggi',
  'Yang lebih dulu mencapainya',
  'Lebih banyak booth dikunjungi',
  'Lebih dulu mendaftar',
];

export default function Peringkat() {
  const { pengguna } = useSesi();

  const { data, memuat, error, muatUlang } = useMuat<Papan>(
    (signal) => api.get<Papan>('/leaderboard?limit=50', { signal }),
    [],
  );

  // 20 detik, di atas cache 15 detik di server. Lebih rapat dari itu cuma
  // mengambil jawaban yang sama berkali-kali.
  useMuatUlangBerkala(muatUlang, 20_000);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const baris = data?.baris ?? [];
  const sayaDiDaftar = baris.some((b) => b.participant_id === pengguna?.id);
  const saya = baris.find((b) => b.participant_id === pengguna?.id);

  return (
    <div
      className="-mx-4 -mt-5 min-h-[calc(100dvh-3.5rem)] px-4 pb-28 pt-5"
      style={{
        backgroundImage:
          'linear-gradient(180deg, #7fd0ef 0%, #a8e0f2 38%, #f3e2c4 62%, #f7ead3 100%)',
      }}
    >
    <div className="mx-auto max-w-xl space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="judul-stiker text-[2.5rem] uppercase leading-none">
            Pemenang
          </h1>
          <p className="mt-1 text-sm font-bold text-slate-700">50 besar</p>
        </div>
        {data?.beku && (
          <span className="shrink-0 rounded-lg bg-slate-700 px-3 py-1 text-xs font-bold text-white">
            Dikunci
          </span>
        )}
      </header>

      {data?.beku && (
        <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Peringkat sudah dikunci panitia. XP masih boleh bertambah, tapi urutan
          di sini tidak berubah lagi.
        </p>
      )}

      {baris.length === 0 ? (
        <Kosong
          judul="Belum ada yang mengumpulkan XP"
          keterangan="Peringkat muncul setelah acara dimulai."
        />
      ) : (
        <>
        {/* Podium tiga besar, seperti di mockup. Hanya digambar kalau
            pesertanya memang sudah tiga atau lebih; podium dengan dua kotak
            kosong terlihat seperti halaman yang belum jadi. */}
        {baris.length >= 3 && <Podium tiga={baris.slice(0, 3)} />}

        <ol className="space-y-2">
          {(baris.length >= 3 ? baris.slice(3) : baris).map((b) => {
            const aku = b.participant_id === pengguna?.id;
            return (
              <li
                key={b.participant_id}
                className={`flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-5 shadow-[0_3px_0_-1px_rgba(0,0,0,0.12)] ${
                  aku ? 'bg-utama-100 ring-2 ring-merek-magenta' : 'bg-[#f6e6c3]'
                }`}
              >
                <span className="w-14 shrink-0 rounded-full bg-[#e3c88d] py-1.5 text-center text-lg font-black tabular-nums text-[#8a6a2f]">
                  {b.peringkat}
                </span>
                <span className="min-w-0 flex-1 truncate text-lg font-black text-[#8a6a2f]">
                  {b.nama}
                  {aku && (
                    <span className="ml-2 text-xs font-bold text-merek-magenta">
                      kamu
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-lg font-black tabular-nums text-[#8a6a2f]">
                  {b.total_xp.toLocaleString('id-ID')} xp
                </span>
              </li>
            );
          })}
        </ol>
        </>
      )}

      <section className="kartu ring-1 ring-slate-200 p-4 dark:border-slate-800">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Kalau XP-nya sama, urutannya
        </p>
        <ol className="mt-2 space-y-1 text-sm">
          {TIEBREAK.map((t, i) => (
            <li key={t} className="text-slate-600 dark:text-slate-300">
              {i + 1}. {t}
            </li>
          ))}
        </ol>
      </section>

      {/* Dipin di bawah kalau peserta ada di luar lima puluh besar. */}
      {pengguna && !sayaDiDaftar && (
        <div className="fixed inset-x-0 bottom-14 z-10 mx-auto max-w-xl px-4">
          <div className="kartu flex items-center gap-3 border-2 border-utama-600 p-3">
            <span className="w-8 shrink-0 text-center text-sm font-black text-slate-400">
              50+
            </span>
            <span className="min-w-0 flex-1 truncate font-bold">
              {pengguna.nama}
              <span className="ml-2 text-xs font-normal text-slate-500">kamu</span>
            </span>
            <span className="shrink-0 text-xs text-slate-500">
              {saya ? `${saya.total_xp} XP` : 'Kumpulkan XP'}
            </span>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

interface BarisPodium {
  participant_id: string;
  peringkat: number;
  nama: string;
  total_xp: number;
}

/**
 * Podium juara satu, dua, tiga.
 *
 * Urutannya di layar 2 - 1 - 3, bukan 1 - 2 - 3. Itu yang membuat juara satu
 * berada di tengah dan paling tinggi, dan itu yang dikenali orang sebagai
 * podium tanpa perlu membaca angkanya.
 *
 * Tinggi kotaknya tetap, tidak mengikuti XP. Kalau mengikuti XP, selisih satu
 * poin membuat ketiganya hampir sama tinggi dan podiumnya kehilangan arti.
 */
function Podium({ tiga }: { tiga: BarisPodium[] }) {
  const [satu, dua, tigaB] = tiga;
  const urutan = [
    { b: dua, tinggi: 'h-24', warna: '#2f6bb0', cincin: '#1b3a5c', mahkota: '#c0c6cc' },
    { b: satu, tinggi: 'h-36', warna: '#8e2a6b', cincin: '#8e2a6b', mahkota: '#f2c14e' },
    { b: tigaB, tinggi: 'h-20', warna: '#ef4b50', cincin: '#ef4b50', mahkota: '#d08a3c' },
  ];

  return (
    <div className="flex items-end justify-center gap-2 pb-2">
      {urutan.map(({ b, tinggi, warna, cincin, mahkota }) =>
        !b ? null : (
          <div key={b.participant_id} className="flex min-w-0 flex-1 flex-col items-center">
            {/* Mahkota. Digambar sebagai SVG supaya tetap tajam dan warnanya
                bisa berbeda untuk tiap posisi. */}
            <svg viewBox="0 0 48 28" aria-hidden className="h-6 w-10" fill={mahkota}>
              <path d="M2 26 6 6l10 9 8-13 8 13 10-9 4 20z" />
            </svg>

            <span
              className="-mt-1 block aspect-square w-full max-w-24 rounded-full border-4 bg-white"
              style={{ borderColor: cincin }}
            />

            <span className="-mt-2 w-full truncate rounded-full bg-[#f6e6c3] px-2 py-1 text-center text-xs font-black text-[#8a6a2f]">
              {b.nama} &middot; {b.total_xp.toLocaleString('id-ID')} xp
            </span>

            <div
              className={`mt-1 flex w-full items-center justify-center rounded-t-lg ${tinggi}`}
              style={{ background: warna }}
            >
              <span className="judul-stiker text-4xl">{b.peringkat}</span>
            </div>
          </div>
        ),
      )}
    </div>
  );
}
