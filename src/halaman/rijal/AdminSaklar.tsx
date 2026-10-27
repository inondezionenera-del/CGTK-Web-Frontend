/* =============================================================================
   /admin/jadwal — saklar sesi. Halaman terpenting di hari acara.

   Satu saklar di sini mengunci atau membuka kamera SEMUA panitia di lapangan
   seketika. Karena itu dua hal dibuat begitu:

   1. Tombolnya besar. Dipencet sambil berdiri di tengah keramaian, bukan
      sambil duduk di depan laptop.

   2. Menutup sesi selalu lewat konfirmasi, membuka tidak. Salah pencet yang
      membuka sesi cuma membuat kamera menyala lebih awal; salah pencet yang
      menutup bikin tujuh panitia di pintu masuk tiba-tiba tidak bisa memindai
      di tengah antrean, dan tidak ada yang tahu kenapa.

   Status DRAFT tidak ditampilkan ke peserta di halaman jadwal, tapi di sini
   harus terlihat, karena ini tempat Divisi Acara menyiapkannya.
============================================================================= */

import { useState } from 'react';
import { api, pesanDari } from '../../lib/api';
import { useMuat, useMuatUlangBerkala } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';
import type { Sesi, StatusSesi } from '../../types/api';

export default function AdminSaklar() {
  const { data, memuat, error, muatUlang } = useMuat<Sesi[]>(
    (signal) => api.get<Sesi[]>('/events/sessions/admin', { signal }),
    [],
  );

  // Dua orang bisa membuka halaman ini bersamaan di hari-H. Menyegarkan
  // berkala membuat yang satu melihat perubahan yang satunya.
  useMuatUlangBerkala(muatUlang, 30_000);

  const [konfirmasi, setKonfirmasi] = useState<Sesi | null>(null);
  const [sibuk, setSibuk] = useState<number | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);

  async function ubah(sesi: Sesi, status: StatusSesi) {
    setSibuk(sesi.id);
    setGagal(null);
    try {
      await api.patch(`/events/sessions/admin/${sesi.id}/saklar`, { status });
      muatUlang(false);
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(null);
      setKonfirmasi(null);
    }
  }

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      <header>
        <h1 className="text-2xl font-bold">Saklar Sesi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Scanner panitia hanya bisa memindai kalau sesinya berstatus ACTIVE.
        </p>
      </header>

      {gagal && <PesanError pesan={gagal} />}

      {(data ?? []).length === 0 ? (
        <Kosong
          judul="Belum ada sesi"
          keterangan="Divisi Acara belum membuat sesi apa pun."
        />
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((s) => (
            <li
              key={s.id}
              className={`kartu flex flex-wrap items-center justify-between gap-3 border p-4 ${
                s.status === 'ACTIVE'
                  ? 'border-berhasil-600'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-bold">{s.nama}</h2>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-extrabold ${
                      s.status === 'ACTIVE'
                        ? 'bg-berhasil-600 text-white'
                        : s.status === 'CLOSED'
                          ? 'bg-slate-400 text-white'
                          : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {s.lokasi ?? 'Tanpa lokasi'}
                </p>
              </div>

              {s.status === 'ACTIVE' ? (
                <button
                  type="button"
                  disabled={sibuk === s.id}
                  onClick={() => setKonfirmasi(s)}
                  className="rounded-xl bg-bahaya-600 px-6 text-sm font-black text-white disabled:opacity-50"
                >
                  TUTUP SESI
                </button>
              ) : (
                <button
                  type="button"
                  disabled={sibuk === s.id}
                  onClick={() => void ubah(s, 'ACTIVE')}
                  className="rounded-xl bg-berhasil-600 px-6 text-sm font-black text-white disabled:opacity-50"
                >
                  BUKA SESI
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {konfirmasi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="kartu w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold">Tutup sesi ini?</h2>
            <p className="mt-1 font-semibold">{konfirmasi.nama}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Scanner semua panitia di lapangan akan langsung terkunci untuk
              sesi ini.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setKonfirmasi(null)}
                className="flex-1 rounded-xl border border-slate-300 px-4 font-bold dark:border-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void ubah(konfirmasi, 'CLOSED')}
                className="flex-1 rounded-xl bg-bahaya-600 px-4 font-bold text-white"
              >
                Ya, Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
