/* =============================================================================
   /scanner/booth — scanner alumni di meja booth.

   Alumni di sini bukan panitia. Mereka tamu undangan yang datang sukarela,
   tidak ikut rapat, tidak dapat konsumsi panitia. Layar yang berantakan terasa
   di mata mereka dan kampusnya, dan itu menentukan apakah mereka mau datang
   lagi tahun depan. Jadi layar ini sengaja sedikit isinya.

   Aturan yang tidak bisa ditawar:

   - TIDAK ADA input angka. Tidak boleh ada keyboard yang muncul. Di tengah
     antrean booth, mengetik itu lambat, dan alumni yang harus mengetik akan
     berhenti memberi nilai sama sekali.
   - Tiga tombol, sekali ketuk selesai, kamera siap lagi.
   - Angka XP-nya diatur Divisi Acara dan bisa berubah; tata letaknya tetap
     rapi baik angkanya satu digit maupun dua.
   - Tombol Batal tanpa batas waktu, karena alumni sering baru sadar salah
     pencet setelah dua tiga peserta berikutnya lewat.

   Alumni tidak memilih booth. Sistem sudah tahu dia menjaga booth mana
   berdasarkan acara yang sedang berjalan.
============================================================================= */

import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { api, KesalahanApi, pesanDari } from '../../lib/api';
import { uuid } from '../../lib/antrean';

type Jenis = 'HADIR' | 'AKTIF' | 'SANGAT_AKTIF';

interface Tombol {
  jenis: Jenis;
  label: string;
  kunciXp: string;
  warna: string;
  maskot: string;
}

const TOMBOL: Tombol[] = [
  { jenis: 'HADIR', label: 'HADIR', kunciXp: 'xp_booth_hadir', warna: '#1b3a5c', maskot: 'nilai-hadir' },
  { jenis: 'AKTIF', label: 'AKTIF', kunciXp: 'xp_booth_aktif', warna: '#7b2355', maskot: 'nilai-aktif' },
  { jenis: 'SANGAT_AKTIF', label: 'SANGAT AKTIF', kunciXp: 'xp_booth_sangat_aktif', warna: '#f4514f', maskot: 'nilai-sangat-aktif' },
];

interface ScanTerakhir {
  id: number;
  jenis: string;
  xp_diberikan: number;
  nama?: string;
}

export default function ScannerBooth() {
  const [isiQr, setIsiQr] = useState<string | null>(null);
  const [xp, setXp] = useState<Record<string, number>>({});
  const [pesan, setPesan] = useState<{ teks: string; baik: boolean } | null>(null);
  const [terakhir, setTerakhir] = useState<ScanTerakhir[]>([]);
  const [bukaBatal, setBukaBatal] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [kamera, setKamera] = useState<'memulai' | 'siap' | 'gagal'>('memulai');
  const [ulangKamera, setUlangKamera] = useState(0);

  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const jedaSampai = useRef(0);

  // Nilai XP dibaca dari pengaturan, tidak ditulis di program. Divisi Acara
  // boleh menggantinya jadi 5/15/25 kapan saja tanpa menyentuh kode.
  useEffect(() => {
    api
      .get<Record<string, unknown>>('/settings/publik', { tanpaLogin: true })
      .then((s) => {
        const n: Record<string, number> = {};
        for (const t of TOMBOL) {
          const v = Number(s?.[t.kunciXp]);
          if (Number.isFinite(v)) n[t.kunciXp] = v;
        }
        setXp(n);
      })
      .catch(() => {});
  }, []);

  const muatTerakhir = useCallback(() => {
    api
      .get<ScanTerakhir[]>('/booths/scan-terakhir')
      .then((d) => setTerakhir(d ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => muatTerakhir(), [muatTerakhir]);

  /* --- kamera: mati begitu pop-up terbuka, hidup lagi sesudahnya ----------- */
  useEffect(() => {
    if (isiQr) return; // pop-up sedang terbuka, kamera tidak perlu jalan

    let berhenti = false;
    let raf = 0;
    const kanvas = document.createElement('canvas');
    const ctx = kanvas.getContext('2d', { willReadFrequently: true });

    setKamera('memulai');

    async function nyalakan() {
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch {
        if (!berhenti) setKamera('gagal');
        return;
      }
      if (berhenti || !video.current) return;
      setKamera('siap');
      video.current.srcObject = stream.current;
      await video.current.play().catch(() => {});
      baca();
    }

    function baca() {
      if (berhenti) return;
      const v = video.current;
      if (v && ctx && v.readyState === v.HAVE_ENOUGH_DATA && Date.now() > jedaSampai.current) {
        kanvas.width = v.videoWidth;
        kanvas.height = v.videoHeight;
        ctx.drawImage(v, 0, 0, kanvas.width, kanvas.height);
        const g = ctx.getImageData(0, 0, kanvas.width, kanvas.height);
        const kode = jsQR(g.data, g.width, g.height);
        if (kode?.data) {
          jedaSampai.current = Date.now() + 800;
          setIsiQr(kode.data);
          setPesan(null);
        }
      }
      raf = requestAnimationFrame(baca);
    }

    void nyalakan();
    return () => {
      berhenti = true;
      cancelAnimationFrame(raf);
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
  }, [isiQr, ulangKamera]);

  async function beri(jenis: Jenis) {
    if (!isiQr || sibuk) return;
    setSibuk(true);
    try {
      const r = await api.post<{ nama?: string; xp_diberikan?: number }>(
        '/booths/scan',
        {
          isi_qr: isiQr,
          jenis,
          scan_uuid: uuid(),
          waktu_scan: new Date().toISOString(),
        },
      );
      setPesan({
        teks: `${r.nama ?? 'Peserta'} +${r.xp_diberikan ?? ''} XP`,
        baik: true,
      });
      muatTerakhir();
    } catch (e) {
      const kode = e instanceof KesalahanApi ? e.kode : '';
      setPesan({
        teks:
          kode === 'SUDAH_SCAN'
            ? 'Peserta ini sudah pernah dapat XP di booth ini'
            : pesanDari(e),
        baik: false,
      });
    } finally {
      setSibuk(false);
      setIsiQr(null);
      setTimeout(() => setPesan(null), 2200);
    }
  }

  async function batalkan(id: number) {
    try {
      await api.post(`/booths/batal/${id}`);
      muatTerakhir();
    } catch (e) {
      setPesan({ teks: pesanDari(e), baik: false });
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-slate-950">
      <div className="flex items-center justify-between p-3 text-white">
        <h1 className="text-sm font-bold">Scan Peserta</h1>
        <button
          type="button"
          onClick={() => setBukaBatal(true)}
          className="rounded-xl bg-white/10 px-3 text-xs font-bold"
        >
          Batalkan Scan
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute h-60 w-60 rounded-3xl border-4 border-white/80" />

        {/* Keadaan kamera.
            Sebelum ini kegagalan getUserMedia ditelan diam-diam: alumni yang
            menekan "Jangan izinkan", atau yang browsernya memblokir kamera,
            melihat layar hitam kosong selamanya tanpa satu pun petunjuk.
            Di tengah antrean booth itu berarti dia menyerah dan pulang. */}
        {kamera !== 'siap' && (
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-3xl bg-white/95 p-6 text-center text-slate-900">
            {kamera === 'memulai' ? (
              <p className="font-black">Menyalakan kamera...</p>
            ) : (
              <>
                <p className="text-lg font-black">Kamera belum bisa dipakai</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Browser menolak akses kamera. Ketuk ikon gembok di sebelah
                  alamat web, izinkan Kamera, lalu coba lagi.
                </p>
                <button
                  type="button"
                  onClick={() => setUlangKamera((n) => n + 1)}
                  className="tombol-utama mt-5 px-7 py-3 text-sm"
                >
                  Coba Nyalakan Lagi
                </button>
              </>
            )}
          </div>
        )}

        {pesan && (
          <div
            className={`absolute inset-x-4 bottom-6 rounded-2xl p-4 text-center font-bold ${
              pesan.baik
                ? 'bg-berhasil-600 text-white'
                : 'bg-peringatan-400 text-slate-900'
            }`}
          >
            {pesan.teks}
          </div>
        )}
      </div>

      {/* Pop-up tiga tombol. Tidak ada kolom isian, tidak ada keyboard. */}
      {isiQr && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="kartu w-full max-w-sm px-5 pb-5 pt-7">
            {/* Mockup menaruh nama peserta di sini. Namanya baru diketahui
                sesudah penilaian dikirim, karena yang dipegang sekarang cuma
                isi QR-nya. Menampilkan "Peserta" sebagai pengganti cuma
                tulisan yang tidak pernah berubah, jadi barisnya ditiadakan. */}
            <p className="judul-tebal text-center text-xl">
              Seberapa aktif peserta ini?
            </p>

            {/* Tiga baris, masing-masing wajah kecil di luar kiri, label, dan
                angka XP. Garis tebal berwarna di bawah tiap baris itu yang
                membedakan ketiganya di mockup; panitia memilih sambil berdiri
                dan warnanya lebih cepat ditangkap daripada tulisannya. */}
            <div className="mt-5 space-y-3.5">
              {TOMBOL.map((t) => (
                <button
                  key={t.jenis}
                  type="button"
                  disabled={sibuk}
                  onClick={() => void beri(t.jenis)}
                  className="flex min-h-16 w-full items-center gap-3 disabled:opacity-60"
                >
                  <img
                    src={`/maskot/${t.maskot}.png`}
                    alt=""
                    aria-hidden
                    className="h-12 w-12 shrink-0 rounded-full bg-white object-cover ring-2 ring-white drop-shadow"
                  />
                  <span
                    className="flex min-h-14 flex-1 items-center justify-between rounded-2xl bg-slate-100 pl-4 pr-3"
                    style={{ borderBottom: `5px solid ${t.warna}` }}
                  >
                    <span className="text-left text-base font-black text-slate-900">
                      {t.label}
                    </span>
                    <span className="min-w-20 text-right text-base font-black tabular-nums text-merek-oranye">
                      +{xp[t.kunciXp] ?? '--'} XP
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIsiQr(null)}
              className="mt-4 w-full text-sm font-semibold text-slate-500"
            >
              Lewati
            </button>
          </div>
        </div>
      )}

      {/* Batalkan scan, tanpa hitung mundur. */}
      {bukaBatal && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="kartu w-full max-w-sm p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Scan Terakhir</h2>
              <button
                type="button"
                onClick={() => setBukaBatal(false)}
                className="text-sm font-semibold text-slate-500"
              >
                Tutup
              </button>
            </div>
            {terakhir.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Belum ada scan.
              </p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto">
                {terakhir.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">
                        {s.nama ?? 'Peserta'}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {s.jenis} · +{s.xp_diberikan} XP
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void batalkan(s.id)}
                      className="shrink-0 rounded-lg bg-bahaya-600 px-3 text-xs font-bold text-white"
                    >
                      Batalkan
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
