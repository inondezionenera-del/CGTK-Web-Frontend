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
      <header className="text-center">
        <h1 className="judul-stiker text-[2.8rem] uppercase leading-none">
          Timeline
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Tanda LIVE menyala saat sesinya benar-benar dibuka panitia, bukan
          saat jamnya tiba.
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
            // Dibaca dari dua tempat dengan sengaja: pernah terjadi
            // event_id tidak ikut dikirim server dan seluruh halaman ini
            // tampil kosong tanpa satu pun pesan galat.
            .filter((s) => (s.event_id ?? s.events?.id) === a.id && s.status !== 'DRAFT')
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
                <ul className="space-y-5">
                  {sesiAcara.map((s) => (
                    <li key={s.id} className="relative">
                      {/* Lidah map di pojok kiri atas, seperti di mockup.
                          Digambar dengan satu kotak membulat di belakang
                          kartunya, bukan gambar terpisah. */}
                      <span className="absolute -top-3 left-3 h-7 w-28 rounded-t-2xl bg-white ring-1 ring-merek-navy/25" />

                      <div className="relative rounded-[1.5rem] bg-white px-4 py-4 shadow-[0_12px_26px_-18px_rgba(15,42,70,0.8)] ring-1 ring-merek-navy/25">
                        <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 pb-2">
                          <h3 className="min-w-0 truncate text-xl font-black text-merek-navy">
                            {s.nama}
                          </h3>
                        </div>

                        <p className="mt-2.5 flex items-center gap-2.5 text-sm text-slate-700">
                          <IkonTempat />
                          <span className="min-w-0 truncate">
                            {s.lokasi ?? 'Lokasi menyusul'}
                          </span>
                        </p>

                        <p className="mt-2 flex items-center gap-2.5 text-sm font-bold text-merek-navy">
                          <IkonJam />
                          {jam(s.jam_mulai)}
                        </p>

                        <div className="mt-2.5 flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span
                              className={`h-4 w-4 shrink-0 rounded-full ${
                                s.status === 'ACTIVE'
                                  ? 'bg-berhasil-600'
                                  : s.status === 'CLOSED'
                                    ? 'bg-slate-400'
                                    : 'bg-bahaya-600'
                              }`}
                            />
                            <span
                              className={`truncate text-sm font-black uppercase ${
                                s.status === 'ACTIVE'
                                  ? 'text-berhasil-700'
                                  : s.status === 'CLOSED'
                                    ? 'text-slate-500'
                                    : 'text-bahaya-600'
                              }`}
                            >
                              {s.status === 'ACTIVE'
                                ? 'Sesi Berlangsung'
                                : s.status === 'CLOSED'
                                  ? 'Sesi Selesai'
                                  : 'Sesi Belum Dimulai'}
                            </span>
                          </span>

                          {/* Tombol SCAN di mockup selalu ada. Peserta yang
                              menekannya akan mendapat halaman yang menolak
                              dia, jadi di sini cuma muncul untuk yang memang
                              boleh memindai. Peserta yang sudah presensi
                              melihat tanda centang di tempat yang sama. */}
                          {s.saya_sudah_hadir ? (
                            <span className="shrink-0 rounded-full bg-berhasil-50 px-4 py-2 text-xs font-black text-berhasil-700">
                              &#10003; Hadir
                            </span>
                          ) : null}
                        </div>
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

function IkonTempat() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" strokeLinejoin="round" />
      <path d="M10 21v-5h4v5" strokeLinejoin="round" />
    </svg>
  );
}

function IkonJam() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6 shrink-0 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
