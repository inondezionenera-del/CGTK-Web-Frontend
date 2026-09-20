/* =============================================================================
   Satu-satunya pintu ke backend.

   Fungsi ini yang membongkar amplop jawaban, jadi di halamanmu kamu langsung
   menerima isinya. Kalau gagal, dia melempar KesalahanApi yang sudah membawa
   pesan asli dari server, tinggal ditampilkan apa adanya.

     const halaman = await api.get<Halaman>('/pages/faq');
     //    ^ sudah isi datanya, bukan { sukses, data }

   Token login ditempelkan sendiri kalau memang ada sesinya, jadi kamu tidak
   perlu mengurusnya di tiap halaman.
============================================================================= */

import { supabase } from './supabase';
import type { Jawaban, Meta } from '../types/api';

const DASAR = import.meta.env.VITE_API_BASE ?? '';

/** Error yang membawa pesan asli dari server. Tampilkan err.pesan apa adanya. */
export class KesalahanApi extends Error {
  readonly kode: string;
  readonly status: number;
  readonly detail?: unknown;

  constructor(kode: string, pesan: string, status: number, detail?: unknown) {
    super(pesan);
    this.name = 'KesalahanApi';
    this.kode = kode;
    this.status = status;
    this.detail = detail;
  }

  /** Enak dibaca di JSX: {err.pesan} */
  get pesan() {
    return this.message;
  }
}

export interface HasilBerhalaman<T> {
  data: T[];
  meta: Meta;
}

type Pilihan = {
  /** Batal otomatis kalau komponennya keburu ditutup. */
  signal?: AbortSignal;
  /** Kirim tanpa token walaupun sedang login. Jarang dipakai. */
  tanpaLogin?: boolean;
};

async function ambilToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function panggil<T>(
  metode: string,
  alamat: string,
  badan?: unknown,
  pilihan: Pilihan = {},
): Promise<{ data: T; meta?: Meta }> {
  if (!DASAR) {
    throw new KesalahanApi(
      'BELUM_DISETEL',
      'VITE_API_BASE masih kosong di .env, jadi belum ada backend yang bisa dipanggil.',
      0,
    );
  }

  const kepala: Record<string, string> = { Accept: 'application/json' };
  if (badan !== undefined) kepala['Content-Type'] = 'application/json';

  if (!pilihan.tanpaLogin) {
    const token = await ambilToken();
    if (token) kepala['Authorization'] = `Bearer ${token}`;
  }

  let respons: Response;
  try {
    respons = await fetch(`${DASAR}${alamat}`, {
      method: metode,
      headers: kepala,
      body: badan === undefined ? undefined : JSON.stringify(badan),
      signal: pilihan.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new KesalahanApi(
      'JARINGAN',
      'Tidak bisa menghubungi server. Coba periksa koneksimu.',
      0,
    );
  }

  // 204 dipakai untuk "tidak ada yang baru", misalnya polling pengumuman.
  if (respons.status === 204) return { data: undefined as T };

  let isi: unknown;
  try {
    isi = await respons.json();
  } catch {
    throw new KesalahanApi(
      'JAWABAN_RUSAK',
      `Server menjawab ${respons.status} tapi isinya bukan JSON.`,
      respons.status,
    );
  }

  const jawaban = isi as Jawaban<T>;

  // Inilah sebabnya semua lewat sini: pesan error ada di error.pesan,
  // bukan di pesan. Salah satu tingkat saja, pesannya hilang diam-diam.
  if (!respons.ok || jawaban?.sukses === false) {
    const gagal = jawaban as Extract<Jawaban<T>, { sukses: false }>;
    throw new KesalahanApi(
      gagal?.error?.kode ?? 'ERROR_SERVER',
      gagal?.error?.pesan ?? `Terjadi kesalahan (${respons.status}).`,
      respons.status,
      gagal?.error?.detail,
    );
  }

  const berhasil = jawaban as Extract<Jawaban<T>, { sukses: true }>;
  return { data: berhasil.data, meta: berhasil.meta };
}

export const api = {
  async get<T>(alamat: string, pilihan?: Pilihan): Promise<T> {
    return (await panggil<T>('GET', alamat, undefined, pilihan)).data;
  },

  /** Untuk daftar yang berhalaman, kalau kamu butuh meta.total juga. */
  async getBerhalaman<T>(alamat: string, pilihan?: Pilihan): Promise<HasilBerhalaman<T>> {
    const hasil = await panggil<T[]>('GET', alamat, undefined, pilihan);
    return { data: hasil.data ?? [], meta: hasil.meta ?? {} };
  },

  async post<T>(alamat: string, badan?: unknown, pilihan?: Pilihan): Promise<T> {
    return (await panggil<T>('POST', alamat, badan, pilihan)).data;
  },

  async patch<T>(alamat: string, badan?: unknown, pilihan?: Pilihan): Promise<T> {
    return (await panggil<T>('PATCH', alamat, badan, pilihan)).data;
  },

  async del<T>(alamat: string, pilihan?: Pilihan): Promise<T> {
    return (await panggil<T>('DELETE', alamat, undefined, pilihan)).data;
  },
};

/** Ubah error apa pun jadi kalimat yang boleh dilihat peserta. */
export function pesanDari(e: unknown): string {
  if (e instanceof KesalahanApi) return e.pesan;
  if (e instanceof Error) return e.message;
  return 'Terjadi kesalahan yang tidak dikenali.';
}
