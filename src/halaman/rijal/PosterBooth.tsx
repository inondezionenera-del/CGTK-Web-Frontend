/* =============================================================================
   /admin/booths/poster — poster QR untuk ditempel di meja booth.

   Tombol Cetak Semua wajib ada. Kalau ada empat puluh booth dan harus dicetak
   satu per satu, Divisi Acara akan menyerah di tengah jalan dan posternya tidak
   jadi ditempel. Itu kegagalan yang terjadi di luar aplikasi, tapi tetap
   kegagalan aplikasinya.

   QR dibuat sebesar mungkin, minimal sekitar 10 cm supaya terbaca dari jarak
   setengah meter, dan KODENYA ditulis besar di bawahnya. Kode itu cadangan:
   kamera HP peserta yang buram atau layar yang retak masih bisa diketik
   manual, dan di hari acara itu pasti terpakai.
============================================================================= */

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

interface Poster {
  id: number;
  nama_tampilan: string;
  kode_booth: string;
  // qr_booth, BUKAN qr_token_booth.
  //
  // Server mengirim kolom bernama qr_booth yang sudah berisi QR lengkap hasil
  // susunQrBooth. Halaman ini sebelumnya membaca qr_token_booth, yang tidak
  // pernah ada di jawaban, jadi yang masuk ke penggambar QR adalah undefined
  // dan pustaka QR-nya melempar "No input text".
  //
  // Akibatnya tidak kelihatan dari kode: posternya tetap tercetak, rapi,
  // lengkap dengan nama booth dan kodenya, cuma kotak QR-nya kosong. Baru
  // ketahuan waktu halaman ini dibuka di browser sungguhan.
  qr_booth: string;
  lokasi?: string | null;
  acara?: string | null;
}

export default function PosterBooth() {
  const { data, memuat, error, muatUlang } = useMuat<Poster[]>(
    (signal) => api.get<Poster[]>('/booths/admin/poster/semua', { signal }),
    [],
  );

  const [dipilih, setDipilih] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (data) setDipilih(new Set(data.map((b) => b.id)));
  }, [data]);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const semua = data ?? [];
  const cetak = semua.filter((b) => dipilih.has(b.id));

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      {/* Bagian pengatur: tidak ikut tercetak. */}
      <div className="print:hidden">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="judul-tebal text-[2rem]">Poster Booth</h1>
            <p className="mt-1 text-sm text-slate-500">
              Satu halaman A4 per booth. Tempel di meja masing-masing.
            </p>
          </div>
          <button
            type="button"
            disabled={cetak.length === 0}
            onClick={() => window.print()}
            className="tombol-utama px-5 disabled:opacity-50"
          >
            Cetak {cetak.length} Poster
          </button>
        </header>

        {semua.length === 0 ? (
          <Kosong
            judul="Belum ada booth"
            keterangan="Divisi Acara belum membuat booth."
          />
        ) : (
          <ul className="mt-4 space-y-1.5">
            {semua.map((b) => (
              <li key={b.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 dark:border-slate-800">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-slate-300"
                    checked={dipilih.has(b.id)}
                    onChange={(e) => {
                      const s = new Set(dipilih);
                      if (e.target.checked) s.add(b.id);
                      else s.delete(b.id);
                      setDipilih(s);
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {b.nama_tampilan}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-slate-500">
                    {b.kode_booth}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Yang tercetak. page-break-after memberi satu halaman per booth. */}
      <div className="hidden print:block">
        {cetak.map((b) => (
          <HalamanPoster key={b.id} booth={b} />
        ))}
      </div>
    </div>
  );
}

function HalamanPoster({ booth }: { booth: Poster }) {
  const kanvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Tanpa penjaga ini, booth yang QR-nya belum terbit membuat pustaka QR
    // melempar dan seluruh halaman cetak ikut berhenti di tengah jalan.
    if (kanvas.current && booth.qr_booth) {
      void QRCode.toCanvas(kanvas.current, booth.qr_booth, {
        width: 900,
        margin: 1,
        errorCorrectionLevel: 'H',
      });
    }
  }, [booth.qr_booth]);

  return (
    <section
      className="flex h-screen flex-col items-center justify-center text-center"
      style={{ pageBreakAfter: 'always' }}
    >
      <h2 className="px-8 text-4xl font-black uppercase">{booth.nama_tampilan}</h2>
      {booth.lokasi && (
        <p className="mt-2 text-xl text-slate-600">{booth.lokasi}</p>
      )}

      {booth.qr_booth ? (
        <canvas ref={kanvas} className="mt-8 w-[12cm] max-w-[80%]" />
      ) : (
        <p className="mt-8 w-[12cm] max-w-[80%] rounded-2xl border-4 border-dashed border-slate-300 p-8 text-lg font-bold text-slate-500">
          QR booth ini belum terbit. Buka boothnya dulu di halaman Kelola
          Booth, lalu cetak ulang.
        </p>
      )}

      <p className="mt-6 text-2xl font-bold">Scan untuk membuka materi</p>

      <p className="mt-8 text-lg text-slate-600">Kamera bermasalah? Ketik kode:</p>
      <p className="mt-1 font-mono text-5xl font-black tracking-widest">
        {booth.kode_booth}
      </p>
    </section>
  );
}
