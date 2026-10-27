/* =============================================================================
   Mesin sinkron offline.

   Dipakai bersama tiga scanner: presensi, booth, dan verifikasi tunai. Ditulis
   sekali di sini, bukan tiga kali di tiga halaman.

   Kenapa serumit ini. Sinyal di venue akan mati, itu bukan kemungkinan tapi
   kepastian, dan yang paling berbahaya justru saat sinyalnya pulih: dua puluh
   HP panitia mengirim tumpukannya bersamaan. Kalau tiap HP mengulang tiap
   detik, server kita roboh tepat pada detik keadaan membaik. Karena itu:

     - antrean disimpan di IndexedDB, bukan localStorage; lima ratus peserta
       tidak muat di localStorage dan isinya hilang diam-diam kalau penuh
     - dikirim per 20, bukan sekaligus
     - jeda bertahap 5, 15, 45 detik, lalu 2 menit kalau gagal
     - hanya baris yang namanya disebut server yang dihapus dari antrean; yang
       tidak disebut berarti belum sempat diproses dan harus dikirim lagi
     - setiap scan punya scan_uuid sendiri, dan itu yang menjamin kiriman ulang
       tidak pernah menghasilkan presensi ganda
============================================================================= */

import { api } from './api';

const NAMA_DB = 'cgtk-offline';
const VERSI_DB = 1;
const TOKO_ANTREAN = 'antrean';
const PER_KIRIMAN = 20;
const JEDA = [5_000, 15_000, 45_000, 120_000];

export interface ScanAntre {
  scan_uuid: string;
  isi_qr: string;
  session_id: number;
  waktu_scan: string;
  /** Dipakai untuk menampilkan kembali ke panitia, tidak dikirim ke server. */
  nama_tebakan?: string;
}

export type StatusAntrean =
  | { keadaan: 'online'; antre: 0 }
  | { keadaan: 'offline'; antre: number }
  | { keadaan: 'mengirim'; antre: number; terkirim: number }
  | { keadaan: 'selesai'; diterima: number; ditolak: number };

let db: IDBDatabase | null = null;

function buka(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);
  return new Promise((selesai, gagal) => {
    const req = indexedDB.open(NAMA_DB, VERSI_DB);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(TOKO_ANTREAN)) {
        d.createObjectStore(TOKO_ANTREAN, { keyPath: 'scan_uuid' });
      }
    };
    req.onsuccess = () => {
      db = req.result;
      selesai(db);
    };
    req.onerror = () => gagal(req.error);
  });
}

function transaksi<T>(
  mode: IDBTransactionMode,
  kerja: (toko: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return buka().then(
    (d) =>
      new Promise<T>((selesai, gagal) => {
        const t = d.transaction(TOKO_ANTREAN, mode);
        const req = kerja(t.objectStore(TOKO_ANTREAN));
        req.onsuccess = () => selesai(req.result);
        req.onerror = () => gagal(req.error);
      }),
  );
}

export const antrean = {
  async simpan(scan: ScanAntre) {
    await transaksi('readwrite', (t) => t.put(scan));
  },

  async semua(): Promise<ScanAntre[]> {
    return (await transaksi<ScanAntre[]>('readonly', (t) => t.getAll())) ?? [];
  },

  async jumlah(): Promise<number> {
    return (await transaksi<number>('readonly', (t) => t.count())) ?? 0;
  },

  async hapus(scanUuid: string) {
    await transaksi('readwrite', (t) => t.delete(scanUuid));
  },
};

/** UUID v4. crypto.randomUUID tidak ada di semua browser HP lama. */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface RincianSync {
  scan_uuid: string;
  status: 'DITERIMA' | 'DITOLAK';
  alasan?: string;
  pesan?: string;
}

let sedangKirim = false;

/**
 * Kirim antrean bertahap. Aman dipanggil kapan saja; kalau sudah ada yang
 * berjalan, panggilan kedua langsung keluar.
 */
export async function kirimAntrean(
  lapor?: (s: StatusAntrean) => void,
): Promise<void> {
  if (sedangKirim || !navigator.onLine) return;
  sedangKirim = true;

  let percobaan = 0;
  let totalDiterima = 0;
  let totalDitolak = 0;

  try {
    for (;;) {
      const semua = await antrean.semua();
      if (semua.length === 0) break;

      const gerombolan = semua.slice(0, PER_KIRIMAN);
      lapor?.({
        keadaan: 'mengirim',
        antre: semua.length,
        terkirim: totalDiterima + totalDitolak,
      });

      try {
        const hasil = await api.post<{ rincian: RincianSync[] }>(
          '/attendance/sync/attendance',
          {
            batch: gerombolan.map((s) => ({
              scan_uuid: s.scan_uuid,
              isi_qr: s.isi_qr,
              session_id: s.session_id,
              waktu_scan: s.waktu_scan,
            })),
          },
        );

        // Hanya yang disebut server yang dihapus. Yang tidak disebut berarti
        // belum sempat diproses, dan membuangnya berarti kehilangan presensi
        // seseorang tanpa jejak.
        for (const r of hasil.rincian ?? []) {
          await antrean.hapus(r.scan_uuid);
          if (r.status === 'DITERIMA') totalDiterima++;
          else totalDitolak++;
        }

        percobaan = 0;
      } catch {
        // Putus di tengah. Gerombolan yang sama dikirim ulang persis, dan
        // scan_uuid yang menjamin tidak ada yang dobel.
        if (percobaan >= JEDA.length) break;
        const jeda = JEDA[percobaan] ?? JEDA[JEDA.length - 1]!;
        percobaan++;
        lapor?.({ keadaan: 'offline', antre: semua.length });
        await new Promise((r) => setTimeout(r, jeda));
        if (!navigator.onLine) break;
      }
    }

    const sisa = await antrean.jumlah();
    lapor?.(
      sisa === 0
        ? { keadaan: 'selesai', diterima: totalDiterima, ditolak: totalDitolak }
        : { keadaan: 'offline', antre: sisa },
    );
  } finally {
    sedangKirim = false;
  }
}

/** Coba kirim lagi begitu sinyal pulih. */
export function pasangPemicuOnline(lapor?: (s: StatusAntrean) => void) {
  const jalan = () => void kirimAntrean(lapor);
  window.addEventListener('online', jalan);
  return () => window.removeEventListener('online', jalan);
}
