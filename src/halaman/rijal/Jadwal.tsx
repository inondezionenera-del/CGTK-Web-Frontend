/* =============================================================================
   /schedule — timeline acara.

   Mengikuti TIMELINE.png. Yang menentukan mirip atau tidaknya ada lima, dan
   kelimanya diambil dari piksel TIMELINE ASSETS.png, bukan dikira-kira:

     latar air biru penuh layar      judul TIMELINE putih raksasa
     kartu map arsip dengan lidah    garis tepi biru #0048ce yang meleset
     tanggal acara merah plum        status merah dengan titik bulat

   Dua aturan bisnis yang tidak boleh ikut berubah demi tampilan:

   1. Badge status dari `status`, TIDAK PERNAH dari jam. Jadwal di lapangan
      pasti bergeser, telat dua puluh menit itu normal. Kalau status dihitung
      dari jam, dia salah setiap kali jadwal bergeser dan peserta berjalan ke
      ruangan yang salah. Jam tetap ditampilkan, tapi tidak menentukan apa pun.

   2. Sesi berstatus DRAFT tidak ditampilkan sama sekali.

   Tombol SCAN ada di setiap kartu pada mockup. Di sini dia hanya muncul untuk
   yang memang punya izin memindai. Peserta yang menekannya cuma akan sampai di
   halaman yang menolak dia, dan tombol yang selalu menolak lebih buruk
   daripada tombol yang tidak ada.
============================================================================= */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useMuat, useMuatUlangBerkala } from '../../lib/kait';
import { useIzin } from '../../lib/izin';
import { useSesi } from '../../lib/sesi';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';
import type { Acara, Sesi } from '../../types/api';

interface Isi {
  acara: Acara[];
  sesi: Sesi[];
}

export default function Jadwal() {
  const { pengguna } = useSesi();
  const izin = useIzin(Boolean(pengguna));
  const bolehScan =
    pengguna?.peran === 'SUPER_ADMIN' || izin.includes('SCAN_PRESENSI');

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

  const acaraHari = (data?.acara ?? [])
    .filter((a) => !aktif || a.tanggal === aktif)
    .sort((a, b) => a.urutan - b.urutan);

  return (
    <div className="latar-air -mt-16 min-h-dvh px-4 pb-14 pt-[5.5rem]">
      <div className="mx-auto max-w-xl">
        <header className="text-center">
          <h1 className="judul-air text-[2.9rem] uppercase leading-none sm:text-6xl">
            Timeline
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-snug text-white/90 [text-shadow:0_1px_3px_rgb(15_42_70_/_0.5)]">
            Tanda sesi berlangsung menyala saat panitia benar-benar membukanya,
            bukan saat jamnya tiba.
          </p>
        </header>

        {/* Tab hari hanya muncul kalau acaranya memang lebih dari sehari. */}
        {hari.length > 1 && (
          <div className="mt-5 flex justify-center gap-2 overflow-x-auto pb-1">
            {hari.map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => setHariDipilih(t)}
                aria-pressed={aktif === t}
                className={`bisa-ditekan active:bisa-ditekan-aktif shrink-0 px-5 text-sm font-black ${
                  aktif === t ? 'tombol-utama' : 'pil-nav text-jadwal-teks'
                }`}
              >
                Hari {i + 1}
              </button>
            ))}
          </div>
        )}

        <div className="mt-7 space-y-8">
          {memuat ? (
            <Memuat />
          ) : error ? (
            <PesanError pesan={error} coba={() => muatUlang(false)} />
          ) : acaraHari.length === 0 ? (
            <Kosong
              judul="Jadwal belum diisi"
              keterangan="Divisi Acara belum memasukkan rangkaian acaranya."
            />
          ) : (
            acaraHari.map((a, iAcara) => {
              const sesiAcara = (data?.sesi ?? [])
                // Dibaca dari dua tempat dengan sengaja: pernah terjadi
                // event_id tidak ikut dikirim server dan seluruh halaman ini
                // tampil kosong tanpa satu pun pesan galat.
                .filter(
                  (s) => (s.event_id ?? s.events?.id) === a.id && s.status !== 'DRAFT',
                )
                .sort((x, y) => x.urutan - y.urutan);

              if (sesiAcara.length === 0) {
                return (
                  <KartuJadwal key={a.id} urutan={iAcara}>
                    <BarisJudul nama={a.nama} tanggal={a.tanggal} />
                    <p className="mt-3 text-sm font-semibold text-jadwal-teks/70">
                      Sesinya belum dibuka Divisi Acara.
                    </p>
                  </KartuJadwal>
                );
              }

              return sesiAcara.map((s, iSesi) => (
                <KartuJadwal key={s.id} urutan={iAcara + iSesi}>
                  <BarisJudul nama={s.nama} tanggal={a.tanggal} />

                  <p className="mt-3 flex items-center gap-3 text-[0.95rem] text-jadwal-teks">
                    <IkonTempat />
                    <span className="min-w-0 truncate">
                      {s.lokasi ?? 'Lokasi menyusul'}
                    </span>
                  </p>

                  <p className="mt-2.5 flex items-center gap-3 text-[0.95rem] font-black text-jadwal-teks">
                    <IkonJam />
                    {jam(s.jam_mulai)}
                    {s.jam_selesai ? ` - ${jam(s.jam_selesai)}` : ''}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Status status={s.status} />

                    {s.saya_sudah_hadir ? (
                      <span className="shrink-0 rounded-full bg-berhasil-50 px-4 py-2 text-xs font-black text-berhasil-700">
                        &#10003; Hadir
                      </span>
                    ) : bolehScan ? (
                      <Link
                        to="/scan"
                        className="pil-scan active:pil-scan-tekan shrink-0 px-6 py-2 text-base"
                      >
                        SCAN
                      </Link>
                    ) : null}
                  </div>
                </KartuJadwal>
              ));
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Kartu map arsip.
 *
 * Lidahnya digambar sebagai kotak kecil di belakang kartu, bukan sebagai
 * gambar: tingginya ikut kartu dan warnanya ikut token, jadi dia tidak akan
 * meleset waktu warnanya diganti.
 *
 * Jeda masuknya dibatasi di 6 kartu. Tanpa batas, kartu kesembilan baru muncul
 * sesudah hampir satu detik dan halamannya terasa lambat, bukan hidup.
 */
function KartuJadwal({
  children,
  urutan,
}: {
  children: React.ReactNode;
  urutan: number;
}) {
  return (
    <section
      className="masuk-naik relative"
      style={{ animationDelay: `${Math.min(urutan, 6) * 55}ms` }}
    >
      <span aria-hidden className="tab-jadwal" />
      <div className="kartu-jadwal relative px-5 py-4">{children}</div>
    </section>
  );
}

function BarisJudul({ nama, tanggal }: { nama: string; tanggal: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-jadwal-pemisah pb-2.5">
      <h2 className="min-w-0 truncate text-2xl font-black text-jadwal-teks">
        {nama}
      </h2>
      {tanggal && (
        <span className="shrink-0 text-sm font-black text-jadwal-tanggal">
          {tanggalPendek(tanggal)}
        </span>
      )}
    </div>
  );
}

function Status({ status }: { status: Sesi['status'] }) {
  const berjalan = status === 'ACTIVE';
  const selesai = status === 'CLOSED';

  return (
    <span className="flex min-w-0 items-center gap-3">
      <span
        className={`h-4 w-4 shrink-0 rounded-full ${
          berjalan ? 'bg-berhasil-600' : selesai ? 'bg-slate-400' : 'bg-jadwal-titik'
        }`}
      />
      <span
        className={`truncate text-sm font-black uppercase ${
          berjalan
            ? 'text-berhasil-700'
            : selesai
              ? 'text-slate-500'
              : 'text-jadwal-merah'
        }`}
      >
        {berjalan
          ? 'Sesi Berlangsung'
          : selesai
            ? 'Sesi Selesai'
            : 'Sesi Belum Dimulai'}
      </span>
    </span>
  );
}

function IkonTempat() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-7 w-7 shrink-0 text-jadwal-teks/60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" strokeLinejoin="round" />
      <path d="M10 21v-5h4v5" strokeLinejoin="round" />
    </svg>
  );
}

function IkonJam() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-7 w-7 shrink-0 text-jadwal-teks"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
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

/** 2026-10-26 -> 26 Okt. Dipakai di pojok kanan judul kartu. */
function tanggalPendek(iso: string): string {
  try {
    const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}
