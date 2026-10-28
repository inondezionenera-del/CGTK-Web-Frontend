/* =============================================================================
   /dashboard — layar yang paling sering dibuka peserta di hari acara.

   Tiga hal yang harus ada dan mudah terlewat:

   1. QR besar, dan layar tidak boleh mati sendiri waktu halaman ini terbuka.
      Peserta mengantre sambil memegang HP; kalau layarnya tidur mereka harus
      membuka kunci lagi di depan panitia dan antreannya tertahan.

   2. Angka XP, bukan cuma nomor level. "Kurang 110 XP lagi menuju Navigator"
      jauh lebih menggerakkan daripada tulisan "Level 3". Itu yang membuat
      peserta mau mendatangi booth yang tidak direkomendasikan kuisnya.

   3. Fitur yang belum terbuka ditampilkan terkunci, bukan disembunyikan.
      Peserta perlu tahu apa yang menunggu mereka setelah lunas.
============================================================================= */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../../lib/api';
import { useMuat, useMuatUlangBerkala } from '../../lib/kait';
import { Memuat, PesanError } from '../../komponen/Keadaan';
import { useSesi } from '../../lib/sesi';
import type { Pendaftaran, QrSaya, Sesi } from '../../types/api';

interface Level {
  nomor: number;
  nama: string;
  xp_minimum: number;
}

interface AkuSaya {
  peserta: {
    total_xp: number;
    level: Level | null;
    level_berikutnya: Level | null;
  } | null;
}

interface Ringkas {
  pendaftaran: Pendaftaran | null;
  qr: QrSaya | null;
  live: Sesi[];
  aku: AkuSaya | null;
}

export default function Dashboard() {
  const { pengguna } = useSesi();

  const { data, memuat, error, muatUlang } = useMuat<Ringkas>(async (signal) => {
    const pendaftaran = await api
      .get<Pendaftaran>('/registrations/saya', { signal })
      .catch(() => null);

    // QR hanya terbit sesudah lunas. 403 di sini bukan kesalahan, itu
    // jawaban yang benar untuk peserta yang belum membayar.
    const qr =
      pendaftaran?.status === 'LUNAS'
        ? await api.get<QrSaya>('/qr/saya', { signal }).catch(() => null)
        : null;

    const live = await api
      .get<Sesi[]>('/events/sessions/live', { signal })
      .catch(() => [] as Sesi[]);

    // XP dan level untuk bar di bawah nama, seperti di mockup.
    const aku = await api.get<AkuSaya>('/auth/saya', { signal }).catch(() => null);

    return { pendaftaran, qr, live, aku };
  }, []);

  // Sesi bisa dibuka atau ditutup Divisi Acara kapan saja, jadi kartu "sedang
  // berlangsung" disegarkan berkala. useMuatUlangBerkala berhenti sendiri waktu
  // layarnya tidak dibuka, supaya baterai dan kuota peserta tidak habis percuma.
  useMuatUlangBerkala(muatUlang, 60_000);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const lunas = data?.pendaftaran?.status === 'LUNAS';
  const ps = data?.aku?.peserta ?? null;

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-10">
      {/* ---------------------------------------------------------------
          Kepala halaman mengikuti mockup: kartu sampul bergambar air, foto
          profil bulat menumpuk di tepi bawahnya, lalu nama besar dan asal
          sekolah di sebelahnya.

          Di mockup barisnya tertulis "Kelompok : Pluto". Tidak ada kolom
          kelompok di database, dan mengarang satu di layar cuma akan jadi
          tulisan yang tidak pernah berubah. Yang ditampilkan asal sekolah,
          data yang memang dikumpulkan saat mendaftar.
      --------------------------------------------------------------- */}
      <header>
        <div className="relative">
          <div className="h-40 w-full overflow-hidden rounded-[2rem] sm:h-48">
            <img src="/latar-air.jpg" alt="" className="h-full w-full object-cover" />
          </div>

          <div className="-mt-12 flex items-end gap-4 px-1">
            <span className="h-24 w-24 shrink-0 rounded-full border-4 border-white bg-slate-200 sm:h-28 sm:w-28" />
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="judul-tebal truncate text-2xl sm:text-3xl">
                {pengguna?.nama ?? 'Peserta'}
              </h1>
              <p className="truncate text-sm font-bold text-slate-700">
                {data?.qr?.asal_sekolah ?? data?.pendaftaran?.kode_registrasi ?? ''}
              </p>
            </div>
          </div>
        </div>

        <BarLevel
          xp={ps?.total_xp ?? 0}
          level={ps?.level ?? null}
          berikutnya={ps?.level_berikutnya ?? null}
        />
      </header>

      {lunas && data?.qr ? (
        <KartuQr isi={data.qr.isi_qr} />
      ) : (
        <KartuBelumLunas status={data?.pendaftaran?.status} />
      )}

      {data?.live && data.live.length > 0 && (
        <section className="kartu p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Sedang Berlangsung
          </p>
          <ul className="space-y-2">
            {data.live.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800"
              >
                <div>
                  <p className="text-sm font-bold">{s.nama}</p>
                  <p className="text-xs text-slate-500">{s.lokasi ?? '-'}</p>
                </div>
                {/* Badge LIVE dari status, tidak pernah dari jam. Jadwal di
                    lapangan bergeser terus; jam tidak bisa dipercaya. */}
                <span className="rounded-md bg-berhasil-600 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
                  Live
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <FiturTerkunci lunas={lunas} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Bar level di bawah nama, dengan ikon obor di ujung kirinya seperti di
 * mockup. Yang ditulis besar nomor levelnya, tapi angka XP-nya tetap ada:
 * "kurang 110 XP lagi" jauh lebih menggerakkan daripada "Level 3", dan itu
 * yang membuat peserta mau mendatangi booth berikutnya.
 */
function BarLevel({
  xp,
  level,
  berikutnya,
}: {
  xp: number;
  level: { nomor: number; nama: string; xp_minimum: number } | null;
  berikutnya: { nomor: number; nama: string; xp_minimum: number } | null;
}) {
  const dasar = level?.xp_minimum ?? 0;
  const atas = berikutnya?.xp_minimum ?? null;

  // Tanpa level berikutnya berarti sudah tertinggi, dan bar-nya penuh.
  const persen = atas === null
    ? 100
    : Math.max(0, Math.min(100, ((xp - dasar) / Math.max(1, atas - dasar)) * 100));

  const sisa = atas === null ? 0 : Math.max(0, atas - xp);

  return (
    <div className="mt-5 px-1">
      <div className="flex items-end justify-between gap-3">
        <p className="judul-tebal text-lg">
          LEVEL {level?.nomor ?? 1}
          <span className="ml-2 align-middle text-xs font-bold text-slate-500">
            {level?.nama ?? 'Pencari Arah'}
          </span>
        </p>
        <p className="shrink-0 text-xs font-extrabold text-slate-700">
          {sisa > 0 ? `Kurang ${sisa} XP lagi !` : 'Keep Going !'}
        </p>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <img src="/obor.png" alt="" aria-hidden className="h-7 w-auto shrink-0" />
        <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-slate-300">
          <div
            className="h-full rounded-full bg-linear-to-r from-merek-oranye via-merek-pink to-merek-navy transition-[width]"
            style={{ width: `${persen}%` }}
          />
        </div>
      </div>

      <p className="mt-1 text-right text-[11px] font-bold text-slate-400">
        {xp} XP
      </p>
    </div>
  );
}

function KartuQr({ isi }: { isi: string }) {
  const kanvas = useRef<HTMLCanvasElement>(null);
  const [aktif, setAktif] = useState(false);

  useEffect(() => {
    if (kanvas.current) {
      // Koreksi tingkat H: QR ini dipindai di bawah matahari, dari layar yang
      // mungkin retak atau kotor. Tingkat tertinggi masih terbaca walau
      // sebagian tertutup.
      void QRCode.toCanvas(kanvas.current, isi, {
        width: 240,
        margin: 1,
        errorCorrectionLevel: 'H',
      });
    }
  }, [isi]);

  // Wake Lock: menahan layar tetap menyala selama kartu ini terbuka. Dia lepas
  // sendiri begitu tab disembunyikan dan TIDAK kembali, jadi sentinel-nya
  // disimpan dan diminta lagi pada visibilitychange. Tanpa itu, peserta yang
  // sempat membuka WhatsApp lalu kembali akan mendapati layarnya mati lagi di
  // tengah antrean, padahal di layar tertulis aktif.
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let hidup = true;

    async function minta() {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
        if (hidup) setAktif(true);
        sentinel.addEventListener('release', () => hidup && setAktif(false));
      } catch {
        if (hidup) setAktif(false);
      }
    }

    function saatBerubah() {
      if (document.visibilityState === 'visible') void minta();
    }

    void minta();
    document.addEventListener('visibilitychange', saatBerubah);
    return () => {
      hidup = false;
      document.removeEventListener('visibilitychange', saatBerubah);
      void sentinel?.release().catch(() => {});
    };
  }, []);

  return (
    <section className="pt-4 text-center">
      <p className="judul-tebal text-xl tracking-wide">YOUR QR CODE</p>
      <p className="mt-1 text-xs text-slate-500">
        Tunjukkan ke panitia di pintu masuk dan ke alumni di booth
      </p>

      {/* Bingkai abu-abu tebal dengan sudut membulat, seperti di mockup.
          Latarnya wajib putih polos: QR di atas warna atau gambar sering
          gagal dibaca kamera HP yang murah. */}
      <div className="mt-4 inline-block rounded-[1.75rem] border-[6px] border-slate-300 bg-white p-4 shadow-[0_10px_24px_-14px_rgba(15,42,70,0.5)]">
        <canvas ref={kanvas} />
      </div>

      {/* Hanya diklaim kalau benar-benar aktif. Safari di iPhone tidak mendukung
          fitur ini sama sekali, dan menulis "aktif" di situ adalah bohong. */}
      {aktif && (
        <p className="mt-2 text-xs font-semibold text-berhasil-700">
          Layar ditahan tetap menyala
        </p>
      )}
    </section>
  );
}

function KartuBelumLunas({ status }: { status?: string }) {
  const pesan =
    status === 'MENUNGGU_PEMBAYARAN'
      ? 'Pembayaranmu belum ditandai panitia. QR terbit otomatis setelah lunas.'
      : status === 'DIBATALKAN'
        ? 'Pendaftaranmu dibatalkan. Hubungi panitia.'
        : 'Selesaikan pendaftaran dan pembayaran untuk mendapat QR.';

  return (
    <section className="rounded-3xl border border-hatihati-600 bg-hatihati-50 p-6 text-center dark:bg-hatihati-700/10">
      <p className="font-bold">QR belum terbit</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{pesan}</p>
      <Link
        to="/bayar"
        className="mt-4 inline-flex items-center justify-center rounded-2xl bg-utama-600 px-6 py-3 font-bold text-white"
      >
        Buka Halaman Pembayaran
      </Link>
    </section>
  );
}

const FITUR = [
  { ke: '/quiz', nama: 'Kuis Minat & Bakat', ket: 'Cari jurusan yang cocok' },
  { ke: '/passport', nama: 'Paspor Kampus', ket: 'Kumpulkan booth yang kamu datangi' },
  { ke: '/missions', nama: 'Misi & Badge', ket: 'Kumpulkan XP' },
  { ke: '/leaderboard', nama: 'Papan Peringkat', ket: 'Lihat posisimu' },
];

function FiturTerkunci({ lunas }: { lunas: boolean }) {
  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        Fitur Peserta
      </p>
      {FITUR.map((f) =>
        lunas ? (
          <Link
            key={f.ke}
            to={f.ke}
            className="flex items-center justify-between kartu p-4"
          >
            <div>
              <p className="text-sm font-bold">{f.nama}</p>
              <p className="text-xs text-slate-500">{f.ket}</p>
            </div>
            <span aria-hidden className="text-slate-400">
              &rsaquo;
            </span>
          </Link>
        ) : (
          // Terkunci, tapi TIDAK disembunyikan. Peserta perlu melihat apa yang
          // menunggu; itu dorongan paling wajar untuk menyelesaikan pembayaran.
          <div
            key={f.ke}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-100 p-4 opacity-70 dark:border-slate-800 dark:bg-slate-800"
          >
            <div>
              <p className="text-sm font-bold text-slate-500">{f.nama}</p>
              <p className="text-xs text-slate-400">Terbuka setelah lunas</p>
            </div>
            <span aria-label="terkunci" className="text-slate-400">
              &#128274;
            </span>
          </div>
        ),
      )}
    </section>
  );
}
