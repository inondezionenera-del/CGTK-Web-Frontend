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

interface Ringkas {
  pendaftaran: Pendaftaran | null;
  qr: QrSaya | null;
  live: Sesi[];
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

    return { pendaftaran, qr, live };
  }, []);

  // Sesi bisa dibuka atau ditutup Divisi Acara kapan saja, jadi kartu "sedang
  // berlangsung" disegarkan berkala. useMuatUlangBerkala berhenti sendiri waktu
  // layarnya tidak dibuka, supaya baterai dan kuota peserta tidak habis percuma.
  useMuatUlangBerkala(muatUlang, 60_000);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const lunas = data?.pendaftaran?.status === 'LUNAS';

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-10">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs text-slate-400">Halo,</p>
        <h1 className="text-xl font-bold">{pengguna?.nama ?? 'Peserta'}</h1>
        {data?.qr && (
          <p className="text-sm text-slate-500">{data.qr.asal_sekolah}</p>
        )}
      </header>

      {lunas && data?.qr ? (
        <KartuQr isi={data.qr.isi_qr} />
      ) : (
        <KartuBelumLunas status={data?.pendaftaran?.status} />
      )}

      {data?.live && data.live.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
    <section className="rounded-3xl border-2 border-utama-600 bg-white p-6 text-center shadow-sm dark:bg-slate-900">
      <p className="text-[11px] font-black uppercase tracking-wider text-utama-700 dark:text-utama-100">
        QR Identitas
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Tunjukkan ke panitia di pintu masuk dan ke alumni di booth
      </p>

      <div className="mt-4 inline-block rounded-2xl bg-white p-3">
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
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
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
