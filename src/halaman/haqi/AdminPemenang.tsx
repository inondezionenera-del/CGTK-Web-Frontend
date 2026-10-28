/* =============================================================================
   /admin/pemenang — bekukan papan peringkat, periksa, lalu sahkan.

   Dua langkah terpisah, dan jarak di antaranya yang penting.

   BEKUKAN menghentikan urutan dan menyimpannya sebagai snapshot. XP boleh
   terus masuk; papan tidak ikut bergerak lagi. Ini yang dilakukan beberapa
   menit sebelum pengumuman, supaya scan yang masuk saat MC sedang bicara
   tidak mengubah siapa yang menang.

   SAHKAN baru dilakukan sesudah panitia MEMBACA daftar pemenangnya. Memeriksa
   sesudah nama diumumkan di atas panggung sudah terlambat. Pengesahan juga
   yang membuka kosmetik eksklusif untuk lima belas besar.

   Izinnya berbeda, dan itu disengaja: membekukan boleh Divisi Acara,
   mengesahkan hanya Super Admin. Kalau tombol Sahkan ditolak server, pesannya
   ditampilkan apa adanya.

   Keduanya tidak bisa dibatalkan dari layar ini, jadi masing-masing minta
   konfirmasi sekali lagi.
============================================================================= */

import { useState } from 'react';
import { api, pesanDari } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError } from '../../komponen/Keadaan';

interface Pemenang {
  peringkat: number;
  participant_id: string;
  nama: string;
  total_xp: number;
}

interface Status {
  beku: boolean;
  dibekukan_at: string | null;
  disahkan: boolean;
  disahkan_at: string | null;
  jumlah_pemenang: number | null;
  catatan: string | null;
  pemenang: Pemenang[];
}

export default function AdminPemenang() {
  const { data, memuat, error, muatUlang } = useMuat<Status>(
    (signal) => api.get<Status>('/leaderboard/admin/status', { signal }),
    [],
  );

  const [jumlah, setJumlah] = useState(3);
  const [catatan, setCatatan] = useState('');
  const [minta, setMinta] = useState<'bekukan' | 'sahkan' | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;
  if (!data) return null;

  async function jalankan(apa: 'bekukan' | 'sahkan') {
    setSibuk(true);
    setGagal(null);
    try {
      if (apa === 'bekukan') {
        await api.post('/leaderboard/admin/bekukan', { jumlah_pemenang: jumlah });
      } else {
        await api.post('/leaderboard/admin/sahkan', {
          jumlah_pemenang: jumlah,
          catatan: catatan.trim() || undefined,
        });
      }
      setMinta(null);
      muatUlang(false);
    } catch (e) {
      setGagal(pesanDari(e));
      setMinta(null);
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <header className="text-center">
        <h1 className="judul-tebal text-[2rem]">Pemenang</h1>
        <p className="mt-1 text-sm text-slate-500">
          Bekukan dulu, periksa daftarnya, baru sahkan.
        </p>
      </header>

      {gagal && <PesanError pesan={gagal} />}

      {/* Keadaan sekarang, ditulis sebagai kalimat. Panitia di tengah acara
          tidak punya waktu menerjemahkan lencana berwarna. */}
      <section className="kartu p-5 ring-1 ring-slate-200">
        <p className="font-black">
          {!data.beku
            ? 'Papan peringkat masih bergerak'
            : data.disahkan
              ? 'Pemenang sudah disahkan'
              : 'Sudah dibekukan, belum disahkan'}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          {!data.beku
            ? 'Setiap scan yang masuk masih bisa mengubah urutannya.'
            : data.disahkan
              ? `Disahkan ${waktu(data.disahkan_at)}. Kosmetik lima belas besar sudah dibagikan.`
              : `Dibekukan ${waktu(data.dibekukan_at)}. Urutan tidak berubah lagi walaupun XP terus masuk.`}
        </p>
        {data.catatan && (
          <p className="mt-2 text-sm italic text-slate-500">{data.catatan}</p>
        )}
      </section>

      {/* Langkah 1 */}
      {!data.beku && (
        <section className="kartu space-y-4 p-5 ring-2 ring-merek-magenta">
          <div>
            <label htmlFor="jumlah" className="text-sm font-black">
              Berapa pemenang yang diumumkan?
            </label>
            <input
              id="jumlah"
              type="number"
              min={1}
              max={50}
              value={jumlah}
              onChange={(e) => setJumlah(Math.max(1, Number(e.target.value) || 1))}
              className="isian mt-1 outline-none focus:ring-2 focus:ring-merek-magenta/40"
            />
          </div>

          {minta === 'bekukan' ? (
            <div className="rounded-2xl bg-slate-100 p-4">
              <p className="text-sm font-bold leading-relaxed">
                Bekukan sekarang? Sesudah ini urutan tidak bisa bergerak lagi,
                dan tidak ada tombol untuk membatalkannya dari layar ini.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={sibuk}
                  onClick={() => void jalankan('bekukan')}
                  className="tombol-utama flex-1 px-5 py-3 disabled:opacity-50"
                >
                  {sibuk ? 'Membekukan...' : 'Ya, bekukan'}
                </button>
                <button
                  type="button"
                  onClick={() => setMinta(null)}
                  className="flex-1 rounded-full bg-white px-5 py-3 font-bold ring-1 ring-slate-300"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMinta('bekukan')}
              className="tombol-utama w-full px-6 py-3.5"
            >
              Bekukan Papan Peringkat
            </button>
          )}
        </section>
      )}

      {/* Daftar pemenang dari snapshot */}
      {data.beku && (
        <section className="kartu p-5 ring-1 ring-slate-200">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Calon Pemenang
          </h2>
          {data.pemenang.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              Snapshot-nya kosong. Belum ada peserta lunas yang mengumpulkan XP
              waktu papan dibekukan.
            </p>
          ) : (
            <ol className="mt-3 space-y-2">
              {data.pemenang.map((p) => (
                <li
                  key={p.participant_id}
                  className="flex items-center gap-3 rounded-full bg-[#f6e6c3] py-2 pl-2 pr-5"
                >
                  <span className="w-12 shrink-0 rounded-full bg-[#e3c88d] py-1 text-center font-black text-[#8a6a2f]">
                    {p.peringkat}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-black text-[#8a6a2f]">
                    {p.nama}
                  </span>
                  <span className="shrink-0 font-black tabular-nums text-[#8a6a2f]">
                    {p.total_xp.toLocaleString('id-ID')} xp
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {/* Langkah 2 */}
      {data.beku && !data.disahkan && (
        <section className="kartu space-y-4 p-5 ring-2 ring-merek-magenta">
          <div>
            <label htmlFor="catatan" className="text-sm font-black">
              Catatan (opsional)
            </label>
            <input
              id="catatan"
              value={catatan}
              maxLength={500}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Disahkan di panggung utama, disaksikan ketua pelaksana"
              className="isian mt-1 outline-none focus:ring-2 focus:ring-merek-magenta/40"
            />
          </div>

          {minta === 'sahkan' ? (
            <div className="rounded-2xl bg-slate-100 p-4">
              <p className="text-sm font-bold leading-relaxed">
                Sahkan {data.pemenang.length} pemenang di atas? Pastikan
                namanya sudah kamu baca. Pengesahan tercatat di log dan tidak
                bisa diulang.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={sibuk}
                  onClick={() => void jalankan('sahkan')}
                  className="tombol-utama flex-1 px-5 py-3 disabled:opacity-50"
                >
                  {sibuk ? 'Mengesahkan...' : 'Ya, sahkan'}
                </button>
                <button
                  type="button"
                  onClick={() => setMinta(null)}
                  className="flex-1 rounded-full bg-white px-5 py-3 font-bold ring-1 ring-slate-300"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMinta('sahkan')}
              className="tombol-utama w-full px-6 py-3.5"
            >
              Sahkan Pemenang
            </button>
          )}
        </section>
      )}
    </div>
  );
}

function waktu(iso: string | null): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}
