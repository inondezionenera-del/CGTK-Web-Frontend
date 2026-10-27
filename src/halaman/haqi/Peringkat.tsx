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
    <div className="mx-auto max-w-xl space-y-4 pb-24">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Papan Peringkat</h1>
          <p className="mt-1 text-sm text-slate-500">50 besar</p>
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
        <ol className="space-y-2">
          {baris.map((b) => {
            const aku = b.participant_id === pengguna?.id;
            return (
              <li
                key={b.participant_id}
                className={`kartu flex items-center gap-3 border p-3 ${
                  aku
                    ? 'border-utama-600 bg-utama-50 dark:bg-utama-900/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <span className="w-8 shrink-0 text-center text-lg font-black tabular-nums text-slate-400">
                  {b.peringkat}
                </span>
                <span className="min-w-0 flex-1 truncate font-bold">
                  {b.nama}
                  {aku && (
                    <span className="ml-2 text-xs font-semibold text-utama-700 dark:text-utama-100">
                      kamu
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-black tabular-nums">
                  {b.total_xp.toLocaleString('id-ID')}
                  <span className="ml-1 text-xs font-normal text-slate-400">XP</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <section className="kartu border border-slate-200 p-4 dark:border-slate-800">
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
  );
}
