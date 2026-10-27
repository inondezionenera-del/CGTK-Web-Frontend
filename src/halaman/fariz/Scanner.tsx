/* =============================================================================
   /scan — scanner presensi. Layar paling kritis di hari acara.

   Kalau layar ini lambat, antrean di pintu masuk memanjang dan acaranya molor.
   Semua keputusan di bawah tunduk pada itu.

   Enam cabang hasil, masing-masing warna satu layar penuh dan bunyi berbeda,
   karena panitia di pintu masuk tidak akan sempat membaca teks. SUDAH_SCAN
   berwarna KUNING, bukan merah: itu bukan kesalahan, itu tanda aturannya
   bekerja. Merah membuat panitia mengira ada masalah dan berhenti.

   Yang mudah terlewat dan ditangani di sini:
     - satu AudioContext dipakai ulang, tidak dibuat baru tiap bunyi. Browser
       membatasi jumlahnya (Chrome sekitar enam), dan pada lima belas scan per
       detik bunyinya mati sendiri dalam hitungan detik kalau dibuat terus
     - jeda 800 ms antar-scan, supaya QR yang sama tidak terbaca berkali-kali
       selama ia masih di depan kamera
     - scan_uuid dibuat untuk setiap scan; itu kunci yang membuat kiriman ulang
       tidak pernah menghasilkan presensi ganda
     - kamera dimatikan waktu halaman ditinggalkan
     - layar ditahan menyala selama scanner terbuka, dan diminta ulang sesudah
       panitia sempat membuka aplikasi lain
     - sesi dipilih dulu, dan kamera terkunci kalau sesinya tidak ACTIVE
============================================================================= */

import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { api, KesalahanApi } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError } from '../../komponen/Keadaan';
import {
  antrean,
  kirimAntrean,
  pasangPemicuOnline,
  uuid,
  type StatusAntrean,
} from '../../lib/antrean';
import type { Sesi } from '../../types/api';

type Cabang =
  | 'BERHASIL'
  | 'SUDAH_SCAN'
  | 'BELUM_BAYAR'
  | 'SESI_DITUTUP'
  | 'QR_TIDAK_VALID'
  | 'TERLALU_SERING'
  | 'TERSIMPAN_OFFLINE';

const TAMPILAN: Record<Cabang, { latar: string; teks: string; judul: string }> = {
  BERHASIL:          { latar: 'bg-berhasil-600',   teks: 'text-white',      judul: 'Berhasil' },
  SUDAH_SCAN:        { latar: 'bg-peringatan-400', teks: 'text-slate-900',  judul: 'Sudah Presensi' },
  BELUM_BAYAR:       { latar: 'bg-hatihati-600',   teks: 'text-white',      judul: 'Belum Lunas' },
  SESI_DITUTUP:      { latar: 'bg-bahaya-700',     teks: 'text-white',      judul: 'Sesi Ditutup' },
  QR_TIDAK_VALID:    { latar: 'bg-bahaya-600',     teks: 'text-white',      judul: 'QR Tidak Dikenali' },
  TERLALU_SERING:    { latar: 'bg-hatihati-700',   teks: 'text-white',      judul: 'Tunggu Sebentar' },
  TERSIMPAN_OFFLINE: { latar: 'bg-slate-700',      teks: 'text-white',      judul: 'Tersimpan di HP' },
};

/** Satu AudioContext untuk seumur halaman. Lihat catatan di atas. */
let konteksAudio: AudioContext | null = null;
function bunyi(frekuensi: number, lama: number, ulang = 1) {
  try {
    konteksAudio ??= new AudioContext();
    if (konteksAudio.state === 'suspended') void konteksAudio.resume();
    for (let i = 0; i < ulang; i++) {
      const osc = konteksAudio.createOscillator();
      const gain = konteksAudio.createGain();
      osc.type = 'sine';
      osc.frequency.value = frekuensi;
      gain.gain.value = 0.12;
      osc.connect(gain).connect(konteksAudio.destination);
      const mulai = konteksAudio.currentTime + i * (lama + 0.06);
      osc.start(mulai);
      osc.stop(mulai + lama);
    }
  } catch {
    // Suara itu bantuan, bukan syarat. Kalau browser menolaknya, scannernya
    // tetap harus jalan.
  }
}

const SUARA: Record<Cabang, () => void> = {
  BERHASIL:          () => bunyi(880, 0.1),
  SUDAH_SCAN:        () => bunyi(440, 0.1, 2),
  BELUM_BAYAR:       () => bunyi(220, 0.4),
  SESI_DITUTUP:      () => bunyi(180, 0.5),
  QR_TIDAK_VALID:    () => bunyi(180, 0.5),
  TERLALU_SERING:    () => {},
  TERSIMPAN_OFFLINE: () => bunyi(660, 0.1),
};

interface Hasil {
  cabang: Cabang;
  nama?: string;
  rincian?: string;
}

export default function Scanner() {
  const { data: sesi, memuat, error, muatUlang } = useMuat<Sesi[]>(
    (signal) => api.get<Sesi[]>('/events/sessions/live', { signal }),
    [],
  );

  const [sesiTerpilih, setSesiTerpilih] = useState<number | null>(null);
  const [modeCepat, setModeCepat] = useState(true);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [jumlahHariIni, setJumlahHariIni] = useState(0);
  const [status, setStatus] = useState<StatusAntrean>({ keadaan: 'online', antre: 0 });
  const [kodeManual, setKodeManual] = useState('');

  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const terakhir = useRef<{ isi: string; pada: number }>({ isi: '', pada: 0 });

  const sesiAktif = (sesi ?? []).find((s) => s.id === sesiTerpilih) ?? null;
  const bolehScan = sesiAktif?.status === 'ACTIVE';

  /* --- kirim satu scan ---------------------------------------------------- */
  const kirim = useCallback(
    async (isiQr: string) => {
      if (!sesiTerpilih) return;

      const scan = {
        scan_uuid: uuid(),
        isi_qr: isiQr,
        session_id: sesiTerpilih,
        waktu_scan: new Date().toISOString(),
      };

      // Offline: simpan dan beri tahu panitia datanya aman. Tanpa kepastian itu
      // mereka akan memindai ulang orang yang sama, dan itu justru mengacaukan.
      if (!navigator.onLine) {
        await antrean.simpan(scan);
        setStatus({ keadaan: 'offline', antre: await antrean.jumlah() });
        tampilkan({ cabang: 'TERSIMPAN_OFFLINE' });
        return;
      }

      try {
        const r = await api.post<{ nama: string; sesi?: string; xp_didapat?: number; sudah_pernah?: boolean }>(
          '/attendance/scan',
          { ...scan, mode_cepat: modeCepat },
        );
        if (r.sudah_pernah) {
          tampilkan({ cabang: 'SUDAH_SCAN', nama: r.nama });
        } else {
          setJumlahHariIni((n) => n + 1);
          tampilkan({
            cabang: 'BERHASIL',
            nama: r.nama,
            rincian: r.xp_didapat ? `+${r.xp_didapat} XP` : undefined,
          });
        }
      } catch (e) {
        const kode = e instanceof KesalahanApi ? e.kode : '';
        const pesan = e instanceof KesalahanApi ? e.pesan : 'Gagal mengirim.';

        if (kode === 'JARINGAN') {
          await antrean.simpan(scan);
          setStatus({ keadaan: 'offline', antre: await antrean.jumlah() });
          tampilkan({ cabang: 'TERSIMPAN_OFFLINE' });
          return;
        }

        const peta: Record<string, Cabang> = {
          SUDAH_SCAN: 'SUDAH_SCAN',
          BELUM_BAYAR: 'BELUM_BAYAR',
          SESI_DITUTUP: 'SESI_DITUTUP',
          QR_TIDAK_VALID: 'QR_TIDAK_VALID',
          TERLALU_SERING: 'TERLALU_SERING',
        };
        tampilkan({ cabang: peta[kode] ?? 'QR_TIDAK_VALID', rincian: pesan });
      }
    },
    [sesiTerpilih, modeCepat],
  );

  function tampilkan(h: Hasil) {
    SUARA[h.cabang]();
    setHasil(h);
    // Mode Cepat: tidak ada yang perlu ditutup, kamera siap lagi sendiri.
    if (modeCepat) setTimeout(() => setHasil(null), 900);
  }

  /* --- kamera ------------------------------------------------------------- */
  useEffect(() => {
    if (!bolehScan) return;

    let berhenti = false;
    let rafId = 0;
    const kanvas = document.createElement('canvas');
    const ctx = kanvas.getContext('2d', { willReadFrequently: true });

    async function nyalakan() {
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({
          // `exact` supaya tidak diam-diam jatuh ke kamera depan. Kalau HP
          // panitia benar-benar tidak punya kamera belakang, lebih baik gagal
          // dengan jelas daripada memindai wajah panitia sendiri.
          video: { facingMode: { exact: 'environment' } },
          audio: false,
        });
      } catch {
        try {
          stream.current = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false,
          });
        } catch {
          return;
        }
      }
      if (berhenti || !video.current) return;
      video.current.srcObject = stream.current;
      await video.current.play().catch(() => {});
      baca();
    }

    function baca() {
      if (berhenti) return;
      const v = video.current;
      if (v && ctx && v.readyState === v.HAVE_ENOUGH_DATA) {
        kanvas.width = v.videoWidth;
        kanvas.height = v.videoHeight;
        ctx.drawImage(v, 0, 0, kanvas.width, kanvas.height);
        const gambar = ctx.getImageData(0, 0, kanvas.width, kanvas.height);
        const kode = jsQR(gambar.data, gambar.width, gambar.height);

        if (kode?.data) {
          const sekarang = Date.now();
          // Jeda 800 ms: QR yang sama masih di depan kamera selama beberapa
          // puluh frame. Tanpa jeda ini satu orang terkirim belasan kali.
          const sama = kode.data === terakhir.current.isi;
          if (!sama || sekarang - terakhir.current.pada > 800) {
            terakhir.current = { isi: kode.data, pada: sekarang };
            void kirim(kode.data);
          }
        }
      }
      rafId = requestAnimationFrame(baca);
    }

    void nyalakan();

    return () => {
      berhenti = true;
      cancelAnimationFrame(rafId);
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      if (video.current) video.current.srcObject = null;
    };
  }, [bolehScan, kirim]);

  /* --- layar jangan mati selama scanner terbuka --------------------------- */
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let hidup = true;

    async function minta() {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        /* tidak didukung, bukan alasan berhenti */
      }
    }
    const saatBerubah = () => {
      if (document.visibilityState === 'visible') void minta();
    };

    void minta();
    document.addEventListener('visibilitychange', saatBerubah);
    return () => {
      hidup = false;
      document.removeEventListener('visibilitychange', saatBerubah);
      void sentinel?.release().catch(() => {});
      void hidup;
    };
  }, []);

  /* --- antrean offline ---------------------------------------------------- */
  useEffect(() => {
    void antrean.jumlah().then((n) => {
      if (n > 0) setStatus({ keadaan: 'offline', antre: n });
    });
    return pasangPemicuOnline(setStatus);
  }, []);

  if (memuat) return <Memuat pesan="Memuat sesi..." />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  /* --- pilih sesi --------------------------------------------------------- */
  if (!sesiTerpilih) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-bold">Pilih Sesi</h1>
        <p className="text-sm text-slate-500">
          Kamera hanya terbuka untuk sesi yang sedang berjalan.
        </p>
        {(sesi ?? []).length === 0 ? (
          <div className="rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800">
            Belum ada sesi yang dibuka Divisi Acara.
          </div>
        ) : (
          (sesi ?? []).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSesiTerpilih(s.id)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left dark:border-slate-800 dark:bg-slate-900"
            >
              <span>
                <span className="block font-bold">{s.nama}</span>
                <span className="block text-xs text-slate-500">{s.lokasi ?? '-'}</span>
              </span>
              <span className="rounded-md bg-berhasil-600 px-2 py-1 text-[11px] font-extrabold uppercase text-white">
                {s.status}
              </span>
            </button>
          ))
        )}
      </div>
    );
  }

  const t = hasil ? TAMPILAN[hasil.cabang] : null;

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-slate-950">
      {/* Bar status */}
      <div className="flex items-center justify-between gap-2 p-3 text-white">
        <button
          type="button"
          onClick={() => setSesiTerpilih(null)}
          className="rounded-xl bg-white/10 px-3 text-xs font-bold"
        >
          {sesiAktif?.nama ?? 'Sesi'}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">{jumlahHariIni} scan</span>
          <button
            type="button"
            onClick={() => setModeCepat((v) => !v)}
            className={`rounded-xl px-3 text-xs font-extrabold ${
              modeCepat ? 'bg-berhasil-600 text-white' : 'bg-white/15 text-white'
            }`}
          >
            {modeCepat ? 'Mode Cepat' : 'Mode Normal'}
          </button>
        </div>
      </div>

      {/* Indikator antrean: panitia harus selalu tahu datanya aman */}
      <div className="px-3 pb-2">
        <span
          className={`inline-block rounded-lg px-2.5 py-1 text-[11px] font-bold ${
            status.keadaan === 'online'
              ? 'bg-berhasil-600 text-white'
              : status.keadaan === 'selesai'
                ? 'bg-utama-600 text-white'
                : 'bg-peringatan-400 text-slate-900'
          }`}
        >
          {status.keadaan === 'online' && 'Online'}
          {status.keadaan === 'offline' && `Offline, ${status.antre} antre di HP`}
          {status.keadaan === 'mengirim' && `Mengirim ${status.terkirim}/${status.antre}`}
          {status.keadaan === 'selesai' &&
            `${status.diterima} terkirim, ${status.ditolak} ditolak`}
        </span>
      </div>

      {/* Kamera atau hasil */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {!bolehScan ? (
          <div className="p-8 text-center">
            <p className="text-2xl font-black text-white">Sesi Ditutup</p>
            <p className="mt-2 text-sm text-slate-300">
              Kamera terkunci sampai Divisi Acara membuka sesinya lagi.
            </p>
          </div>
        ) : t ? (
          <div className={`flex h-full w-full flex-col items-center justify-center ${t.latar} ${t.teks}`}>
            <p className="px-6 text-center text-3xl font-black">{t.judul}</p>
            {hasil?.nama && (
              <p className="mt-3 px-6 text-center text-2xl font-bold">{hasil.nama}</p>
            )}
            {hasil?.rincian && (
              <p className="mt-1 px-6 text-center text-base">{hasil.rincian}</p>
            )}
            {!modeCepat && (
              <button
                type="button"
                onClick={() => setHasil(null)}
                className="mt-8 rounded-xl bg-white px-8 font-bold text-slate-900"
              >
                Lanjut
              </button>
            )}
          </div>
        ) : (
          <>
            <video
              ref={video}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute h-60 w-60 rounded-3xl border-4 border-white/80" />
          </>
        )}
      </div>

      {/* Cadangan: ketik kode kalau kamera bermasalah atau QR peserta buram */}
      <div className="space-y-2 p-3">
        <div className="flex gap-2">
          <input
            value={kodeManual}
            onChange={(e) => setKodeManual(e.target.value)}
            placeholder="Ketik isi QR / kode"
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none"
          />
          <button
            type="button"
            disabled={!kodeManual.trim() || !bolehScan}
            onClick={() => {
              void kirim(kodeManual.trim());
              setKodeManual('');
            }}
            className="rounded-xl bg-utama-600 px-4 text-sm font-bold text-white disabled:opacity-40"
          >
            Kirim
          </button>
        </div>
        {status.keadaan === 'offline' && status.antre > 0 && navigator.onLine && (
          <button
            type="button"
            onClick={() => void kirimAntrean(setStatus)}
            className="w-full rounded-xl bg-white/10 text-sm font-bold text-white"
          >
            Kirim {status.antre} yang tertahan
          </button>
        )}
      </div>
    </div>
  );
}
