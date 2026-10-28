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
import { Link } from 'react-router-dom';
import jsQR from 'jsqr';
import { api, KesalahanApi, pesanDari } from '../../lib/api';
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

/**
 * Tiap cabang satu layar penuh: warna gradasi dari atas ke putih, maskot
 * besar, lalu satu kata raksasa. Warnanya diambil langsung dari mockup, bukan
 * dikira-kira.
 *
 * SUDAH_SCAN kuning dan tulisannya gelap, bukan merah dan putih. Dia bukan
 * kesalahan: dia tanda aturan anti-dobel bekerja. Kalau merah, panitia di
 * pintu masuk mengira ada masalah lalu berhenti, dan antreannya macet.
 *
 * TERSIMPAN_OFFLINE tidak ada di mockup. Dibuat abu-abu gelap supaya jelas
 * berbeda dari enam yang lain: itu satu-satunya keadaan yang belum selesai,
 * datanya masih di HP dan belum sampai ke server.
 */
interface Tampilan {
  atas: string;
  pil: string;
  teks: string;
  judul: string;
  maskot: string | null;
}

const TAMPILAN: Record<Cabang, Tampilan> = {
  BERHASIL:          { atas: '#60ff0b', pil: '#49d000', teks: 'text-white',     judul: 'BERHASIL',       maskot: 'berhasil' },
  SUDAH_SCAN:        { atas: '#fff70b', pil: '#d0d000', teks: 'text-slate-900', judul: 'SUDAH PRESENSI', maskot: 'sudah-presensi' },
  BELUM_BAYAR:       { atas: '#ff840b', pil: '#d07a00', teks: 'text-white',     judul: 'BELUM BAYAR',    maskot: 'belum-bayar' },
  SESI_DITUTUP:      { atas: '#ff0b0b', pil: '#d00000', teks: 'text-white',     judul: 'SESI DITUTUP',   maskot: 'sesi-ditutup' },
  QR_TIDAK_VALID:    { atas: '#ff0b0b', pil: '#d00000', teks: 'text-white',     judul: 'QR TIDAK VALID', maskot: 'qr-tidak-valid' },
  TERLALU_SERING:    { atas: '#ff850b', pil: '#d07a00', teks: 'text-white',     judul: 'TERLALU SERING', maskot: 'terlalu-sering' },
  TERSIMPAN_OFFLINE: { atas: '#475569', pil: '#334155', teks: 'text-white',     judul: 'TERSIMPAN DI HP', maskot: null },
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
  const [cariNama, setCariNama] = useState(false);

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
    // Layar pemilih sesi memakai header sendiri.
    //
    // Kerangka aplikasi sengaja tidak memasang bar apa pun di /scan supaya
    // layar kameranya bersih. Tapi layar pemilih BUKAN layar kamera, dan tanpa
    // header dia jadi halaman tanpa logo, tanpa menu, dan tanpa satu pun jalan
    // kembali: panitia yang membukanya terjebak sampai menutup tab.
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-5">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" aria-label="Beranda CGTK">
            <img src="/logo-cgtk.png" alt="CGTK" className="h-8 w-auto" />
          </Link>
          <Link
            to="/admin"
            className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700"
          >
            Kembali ke Panel
          </Link>
        </div>

        <h1 className="judul-tebal text-2xl">Pilih Sesi</h1>
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
              className="flex w-full items-center justify-between kartu p-4 text-left"
            >
              <span>
                <span className="block font-bold">{s.nama}</span>
                <span className="block text-xs text-slate-500">{s.lokasi ?? '-'}</span>
              </span>
              {/* Ditulis LIVE, bukan isi kolom status mentah. Daftar ini
                  memang cuma berisi sesi yang sedang berjalan, dan lencana
                  yang isinya ikut kolom akan tampil kosong kalau kolomnya
                  suatu saat tidak ikut dikirim lagi. */}
              <span className="shrink-0 rounded-md bg-berhasil-600 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
                Live
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

        {/* Jalan keluar.
            Halaman scanner sengaja menutupi seluruh layar tanpa bar aplikasi,
            dan itu berarti tidak ada satu pun tautan untuk kembali. Panitia
            yang selesai memindai jadi terjebak dan satu-satunya jalan adalah
            menutup tab. Ketahuan waktu halaman ini dibuka di browser. */}
        <Link
          to="/admin"
          className="ml-2 shrink-0 rounded-full bg-white/15 px-4 py-1.5 text-xs font-black text-white"
        >
          Keluar
        </Link>
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
          <div
            className="flex h-full w-full flex-col items-center justify-center px-5"
            style={{ background: `linear-gradient(180deg, ${t.atas} 0%, #ffffff 100%)` }}
          >
            {t.maskot && (
              <img
                src={`/maskot/${t.maskot}.png`}
                alt=""
                aria-hidden
                className="mb-2 max-h-[34vh] w-auto max-w-[72%] object-contain drop-shadow-lg"
              />
            )}

            <p className="judul-stiker px-2 text-center text-[13vw] leading-none sm:text-6xl">
              {t.judul}
            </p>

            {/* Nama dan asal sekolah jadi dua pil berwarna lebih tua, seperti
                di mockup. Mockup menulis "Kelompok : Pluto"; tidak ada kolom
                kelompok di database, jadi yang tampil asal sekolah. */}
            {hasil?.nama && (
              <p
                className={`mt-4 w-full max-w-md truncate rounded-full px-5 py-3 text-center text-xl font-extrabold ${t.teks}`}
                style={{ background: t.pil }}
              >
                {hasil.nama}
              </p>
            )}
            {hasil?.rincian && (
              <p
                className={`mt-2 w-full max-w-md truncate rounded-full px-5 py-3 text-center text-lg font-extrabold ${t.teks}`}
                style={{ background: t.pil }}
              >
                {hasil.rincian}
              </p>
            )}

            {!modeCepat && (
              <button
                type="button"
                onClick={() => setHasil(null)}
                className="mt-7 w-full max-w-xs rounded-full bg-white px-8 py-3 font-extrabold text-slate-900 shadow-lg"
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

      {cariNama && sesiTerpilih !== null && (
        <PanelCariNama
          sessionId={sesiTerpilih}
          tutup={() => setCariNama(false)}
          selesai={(nama) => {
            setCariNama(false);
            setHasil({ cabang: 'BERHASIL', nama, rincian: 'Presensi manual' });
          }}
        />
      )}

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
        {/* Cari Nama, seperti di mockup. Jalan keluar terakhir waktu QR
            pesertanya tidak terbaca DAN kodenya juga tidak bisa dibaca:
            layarnya retak, HP-nya mati, atau QR-nya belum pernah terbit.
            Presensi lewat jalur ini ditandai MANUAL di database dan wajib
            diberi alasan, jadi tetap bisa ditelusuri sesudah acara. */}
        <button
          type="button"
          disabled={!bolehScan}
          onClick={() => setCariNama(true)}
          className="w-full rounded-full bg-white/10 py-3 text-sm font-bold text-white disabled:opacity-40"
        >
          Cari Nama
        </button>

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

/* -------------------------------------------------------------------------- */

interface PesertaCari {
  id: string;
  nama: string;
  asal_sekolah: string;
  kelas: string;
}

/**
 * Cari peserta berdasarkan nama lalu catat presensinya secara manual.
 *
 * Alasan WAJIB diisi, dan itu bukan formalitas. Jalur ini melewati seluruh
 * pemeriksaan QR: tidak ada tanda tangan yang diverifikasi, tidak ada bukti
 * bahwa orangnya benar-benar memegang QR itu. Satu-satunya yang tersisa untuk
 * menelusuri kalau ada yang janggal sesudah acara adalah catatan siapa yang
 * memasukkannya dan kenapa. Server juga menolak alasan di bawah tiga huruf.
 *
 * Pencarian ditunda tiga ratus milidetik sesudah ketikan terakhir. Tanpa itu
 * mengetik satu nama mengirim satu permintaan per huruf, dan di hari acara
 * scanner lain ikut melambat karenanya.
 */
function PanelCariNama({
  sessionId,
  tutup,
  selesai,
}: {
  sessionId: number;
  tutup: () => void;
  selesai: (nama: string) => void;
}) {
  const [q, setQ] = useState('');
  const [hasilCari, setHasilCari] = useState<PesertaCari[]>([]);
  const [mencari, setMencari] = useState(false);
  const [dipilih, setDipilih] = useState<PesertaCari | null>(null);
  const [alasan, setAlasan] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHasilCari([]);
      return;
    }
    const batal = new AbortController();
    const jeda = setTimeout(() => {
      setMencari(true);
      api
        .get<PesertaCari[]>(`/participants/cari?q=${encodeURIComponent(q.trim())}`, {
          signal: batal.signal,
        })
        .then((r) => setHasilCari(r ?? []))
        .catch(() => setHasilCari([]))
        .finally(() => setMencari(false));
    }, 300);

    return () => {
      clearTimeout(jeda);
      batal.abort();
    };
  }, [q]);

  async function kirimManual() {
    if (!dipilih) return;
    setSibuk(true);
    setGagal(null);
    try {
      await api.post('/attendance/manual', {
        participant_id: dipilih.id,
        session_id: sessionId,
        alasan: alasan.trim(),
      });
      selesai(dipilih.nama);
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="kartu max-h-[85dvh] w-full max-w-sm overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="judul-tebal text-xl">Cari Nama</h2>
          <button
            type="button"
            onClick={tutup}
            className="shrink-0 text-sm font-bold text-slate-500"
          >
            Tutup
          </button>
        </div>

        {!dipilih ? (
          <>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ketik nama peserta"
              className="isian mt-3 outline-none focus:ring-2 focus:ring-merek-magenta/40"
            />

            {mencari && <p className="mt-2 text-sm text-slate-500">Mencari...</p>}

            {!mencari && q.trim().length >= 2 && hasilCari.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">
                Tidak ada yang cocok. Coba potongan namanya saja.
              </p>
            )}

            <ul className="mt-2 space-y-1.5">
              {hasilCari.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setDipilih(p)}
                    className="w-full rounded-xl bg-slate-100 p-3 text-left"
                  >
                    <span className="block truncate font-bold">{p.nama}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {[p.asal_sekolah, p.kelas].filter(Boolean).join(' \u00b7 ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <div className="mt-3 rounded-xl bg-slate-100 p-3">
              <p className="font-black">{dipilih.nama}</p>
              <p className="text-xs text-slate-500">
                {[dipilih.asal_sekolah, dipilih.kelas].filter(Boolean).join(' \u00b7 ')}
              </p>
            </div>

            <label htmlFor="alasan" className="mt-4 block text-sm font-black">
              Kenapa dicatat manual?
            </label>
            <input
              id="alasan"
              autoFocus
              value={alasan}
              maxLength={200}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="HP mati, QR belum terbit, layar retak"
              className="isian mt-1 outline-none focus:ring-2 focus:ring-merek-magenta/40"
            />
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Wajib diisi. Jalur ini melewati pemeriksaan QR, jadi catatan ini
              satu-satunya cara menelusurinya sesudah acara.
            </p>

            {gagal && <p className="mt-2 text-sm font-bold text-bahaya-600">{gagal}</p>}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={alasan.trim().length < 3 || sibuk}
                onClick={() => void kirimManual()}
                className="tombol-utama flex-1 px-5 py-3 disabled:opacity-50"
              >
                {sibuk ? 'Mencatat...' : 'Catat Hadir'}
              </button>
              <button
                type="button"
                onClick={() => setDipilih(null)}
                className="flex-1 rounded-full bg-white px-5 py-3 font-bold ring-1 ring-slate-300"
              >
                Ganti
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
