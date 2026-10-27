/* =============================================================================
   /schedule — timeline acara.

   Dibuka berkali-kali oleh peserta di hari acara untuk tahu acara berikutnya
   di mana. Dua aturan yang menentukan benarnya:

   1. Badge LIVE dari `status`, TIDAK PERNAH dari jam. Jadwal di lapangan pasti
      bergeser, telat dua puluh menit itu normal. Kalau LIVE dihitung dari jam,
      badge-nya salah setiap kali jadwal bergeser dan peserta berjalan ke
      ruangan yang salah. Jam tetap ditampilkan, tapi tidak menentukan apa pun.

   2. Sesi berstatus DRAFT tidak ditampilkan sama sekali. Itu sesi yang masih
      disiapkan Divisi Acara.

   Jumlah harinya tidak dikunci: tabnya dibuat dari tanggal yang benar-benar ada
   di data. Kalau acaranya cuma sehari, tabnya tidak muncul.
============================================================================= */

import { useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useMuat, useMuatUlangBerkala } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';
import type { Acara, Sesi } from '../../types/api';

interface Isi {
  acara: Acara[];
  sesi: Sesi[];
}

export default function Jadwal() {
  const { data, memuat, error, muatUlang } = useMuat<Isi>(async (signal) => {
    const [acara, sesi] = await Promise.all([
      api.get<Acara[]>('/events', { signal }),
      api.get<Sesi[]>('/events/sessions', { signal }),
    ]);
    return { acara: acara ?? [], sesi: sesi ?? [] };
  }, []);

  // Sesi bisa dibuka atau ditutup kapan saja oleh Divisi Acara, jadi halaman
  // ini menyegarkan dirinya, tapi berhenti waktu layarnya tidak dibuka.
  useMuatUlangBerkala(muatUlang, 60_000);

  const hari = useMemo(() => {
    const t = new Set((data?.acara ?? []).map((a) => a.tanggal).filter(Boolean));
    return [...t].sort();
  }, [data]);

  const [hariDipilih, setHariDipilih] = useState<string | null>(null);
  const aktif = hariDipilih ?? hari[0] ?? null;

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const acaraHari = (data?.acara ?? [])
    .filter((a) => !aktif || a.tanggal === aktif)
    .sort((a, b) => a.urutan - b.urutan);

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-10">
      <header>
        <h1 className="text-2xl font-bold">Jadwal CGTK 2027</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tanda LIVE menyala saat sesinya benar-benar dibuka panitia.
        </p>
      </header>

      {/* Tab hari hanya muncul kalau acaranya memang lebih dari sehari. */}
      {hari.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {hari.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setHariDipilih(t)}
              className={`shrink-0 rounded-xl px-4 text-sm font-bold ${
                aktif === t
                  ? 'tombol-utama'
                  : 'border border-slate-300 dark:border-slate-700'
              }`}
            >
              Hari {i + 1}
            </button>
          ))}
        </div>
      )}

      {acaraHari.length === 0 ? (
        <Kosong
          judul="Jadwal belum diisi"
          keterangan="Divisi Acara belum memasukkan rangkaian acaranya."
        />
      ) : (
        acaraHari.map((a) => {
          const sesiAcara = (data?.sesi ?? [])
            .filter((s) => s.event_id === a.id && s.status !== 'DRAFT')
            .sort((x, y) => x.urutan - y.urutan);

          return (
            <section key={a.id} className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
                {a.nama}
              </h2>

              {sesiAcara.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900">
                  Belum ada sesi yang dibuka di acara ini.
                </p>
              ) : (
                <ul className="space-y-2">
                  {sesiAcara.map((s) => (
                    <li
                      key={s.id}
                      className={`kartu flex items-center justify-between gap-3 border p-4 ${
                        s.status === 'ACTIVE'
                          ? 'border-berhasil-600'
                          : 'border-slate-200 opacity-70 dark:border-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold">{s.nama}</p>
                        <p className="truncate text-xs text-slate-500">
                          {jam(s.jam_mulai)}
                          {s.lokasi ? ` · ${s.lokasi}` : ''}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {s.saya_sudah_hadir && (
                          <span
                            title="Kamu sudah presensi"
                            className="text-berhasil-700"
                          >
                            &#10003;
                          </span>
                        )}
                        {s.status === 'ACTIVE' ? (
                          <span className="rounded-md bg-berhasil-600 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
                            Live
                          </span>
                        ) : (
                          <span className="rounded-md bg-slate-300 px-2.5 py-1 text-[11px] font-bold uppercase text-slate-700">
                            Selesai
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

/** Jam ditampilkan sebagai informasi, bukan sebagai penentu status. */
function jam(iso: string | null): string {
  if (!iso) return 'Jam menyusul';
  try {
    return new Date(iso).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Jam menyusul';
  }
}
