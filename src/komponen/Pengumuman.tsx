/* =============================================================================
   Overlay pengumuman darurat. Aktif di semua halaman peserta.

   Pakai polling, bukan Realtime. Supabase paket gratis cuma memberi 200
   koneksi realtime bersamaan sementara puncak kita 250 sampai 300 orang, dan
   yang ke-201 tidak akan menerima apa pun TANPA pesan error. Kegagalan diam
   seperti itu baru ketahuan setelah acara lewat. Polling tiga puluh detik
   lebih membosankan tapi pasti sampai.

   Tiga hal yang menentukan benar atau tidaknya:

   1. Berhenti waktu layar tidak dibuka. Penjaganya ada di pengambilan data,
      BUKAN di penampilan popup. Bedanya penting: kalau penjaganya di
      penampilan, pengumuman yang datang saat HP di saku dibuang permanen dan
      tidak pernah muncul lagi. Dengan penjaganya di pengambilan, tik yang
      terlewat diulang pada tik berikutnya dengan `sejak` yang sama, jadi tidak
      ada yang hilang.

   2. Pakai `meta.server_time`, bukan jam HP. Jam HP peserta sering meleset
      beberapa menit, dan selisih itu cukup untuk melewatkan satu pengumuman.

   3. Jeda dibaca dari pengaturan, bukan ditulis di program, supaya panitia bisa
      melonggarkannya sendiri kalau hari-H ternyata lebih ramai dari perkiraan.
============================================================================= */

import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useSesi } from '../lib/sesi';

interface Pengumuman {
  id: number;
  judul: string;
  isi: string;
  tingkat: 'BIASA' | 'DARURAT';
  dibuat_at: string;
}

interface JawabanTerbaru {
  data: Pengumuman[];
  meta?: { server_time?: string };
}

const JEDA_BAWAAN = 30;

export function OverlayPengumuman() {
  const { masuk } = useSesi();
  const [antre, setAntre] = useState<Pengumuman[]>([]);
  const sejak = useRef<string | null>(null);
  const [jedaDetik, setJedaDetik] = useState(JEDA_BAWAAN);

  // Jeda dari pengaturan publik. Kalau gagal dibaca, pakai bawaan; pengumuman
  // yang telat tiga puluh detik jauh lebih baik daripada tidak jalan sama sekali.
  useEffect(() => {
    api
      .get<Record<string, unknown>>('/settings/publik', { tanpaLogin: true })
      .then((s) => {
        const n = Number(s?.polling_pengumuman_detik);
        if (Number.isFinite(n) && n >= 5) setJedaDetik(n);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!masuk) return;

    let hidup = true;

    async function ambil() {
      // Penjaga ada DI SINI, sebelum permintaan. Lihat catatan 1 di atas.
      if (document.hidden) return;
      try {
        const q = sejak.current
          ? `?sejak=${encodeURIComponent(sejak.current)}`
          : '';
        const r = (await api.get<JawabanTerbaru['data']>(
          `/announcements/terbaru${q}`,
        )) as unknown as Pengumuman[] | undefined;

        // 204 berarti tidak ada yang baru, dan itu jawaban paling sering
        // sepanjang hari. api.get mengembalikan undefined untuk itu.
        if (!r || r.length === 0) return;

        if (hidup) {
          setAntre((lama) => [
            ...lama,
            ...r.filter((p) => p.tingkat === 'DARURAT'),
          ]);
          const terakhir = r[r.length - 1];
          if (terakhir) sejak.current = terakhir.dibuat_at;
        }
      } catch {
        // Jaringan putus bukan alasan menghentikan polling; tik berikutnya
        // mencoba lagi dengan `sejak` yang sama.
      }
    }

    void ambil();
    const t = setInterval(() => void ambil(), jedaDetik * 1000);

    // Begitu peserta membuka layarnya lagi, langsung periksa, jangan menunggu
    // tik berikutnya.
    const saatKembali = () => {
      if (!document.hidden) void ambil();
    };
    document.addEventListener('visibilitychange', saatKembali);

    return () => {
      hidup = false;
      clearInterval(t);
      document.removeEventListener('visibilitychange', saatKembali);
    };
  }, [masuk, jedaDetik]);

  const sekarang = antre[0];
  if (!sekarang) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border-2 border-red-400 bg-bahaya-600 p-6 text-white shadow-2xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-3 w-3 animate-ping rounded-full bg-white" />
          <span className="rounded-md bg-bahaya-700 px-2 py-1 text-xs font-black uppercase tracking-widest">
            Pengumuman Darurat
          </span>
        </div>
        <h2 className="text-xl font-bold">{sekarang.judul}</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-red-50">
          {sekarang.isi}
        </p>
        <button
          type="button"
          onClick={() => setAntre((a) => a.slice(1))}
          className="mt-6 w-full rounded-xl bg-white px-4 font-bold text-bahaya-700"
        >
          {antre.length > 1 ? `Saya Mengerti (${antre.length - 1} lagi)` : 'Saya Mengerti'}
        </button>
      </div>
    </div>
  );
}
