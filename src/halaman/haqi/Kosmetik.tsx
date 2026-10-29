/* =============================================================================
   /kosmetik — hadiah tampilan.

   Tidak satu pun di sini memberi keuntungan: tidak menambah XP, tidak
   mengubah peringkat, tidak membuka fitur. Itu memang maksudnya. Hadiah yang
   memberi keuntungan membuat yang tertinggal makin tertinggal.

   Yang terkunci TETAP ditampilkan, lengkap dengan syaratnya, dan ini bukan
   sekadar gaya: itu satu-satunya alasan orang mengejarnya. Kosmetik yang
   disembunyikan sampai terbuka tidak pernah jadi dorongan untuk siapa pun.

   Warna dan bingkai digambar langsung dari kolom nilai, bukan dari gambar yang
   harus diunduh satu per satu. Di sinyal lapangan, tiga belas gambar kecil
   adalah tiga belas permintaan yang bisa gagal.

   Syaratnya diperiksa server waktu dipakai, bukan cuma di sini. Tombol yang
   disembunyikan di layar bukan pengamanan.
============================================================================= */

import { useState } from 'react';
import { api, pesanDari } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

interface Kosmetik {
  id: number;
  tipe: 'BACKGROUND' | 'WARNA_NAMA' | 'LAGU' | 'BINGKAI' | string;
  nama: string;
  aset_url: string | null;
  nilai: string | null;
  syarat_level: number | null;
  syarat_top15: boolean;
  terbuka: boolean;
  dipakai: boolean;
}

interface Isi {
  level: number;
  total_xp: number;
  daftar: Kosmetik[];
}

const NAMA_TIPE: Record<string, string> = {
  WARNA_NAMA: 'Warna Nama',
  BINGKAI: 'Bingkai Foto',
  BACKGROUND: 'Latar Paspor',
  LAGU: 'Lagu',
};

const URUTAN = ['WARNA_NAMA', 'BINGKAI', 'BACKGROUND', 'LAGU'];

export default function Kosmetik() {
  const { data, memuat, error, muatUlang } = useMuat<Isi>(
    (signal) => api.get<Isi>('/cosmetics', { signal }),
    [],
  );

  const [sibuk, setSibuk] = useState<number | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const daftar = data?.daftar ?? [];
  if (daftar.length === 0) {
    return (
      <Kosong
        judul="Belum ada kosmetik"
        keterangan="Panitia belum menyiapkannya."
      />
    );
  }

  const perTipe = new Map<string, Kosmetik[]>();
  for (const k of daftar) {
    const isi = perTipe.get(k.tipe) ?? [];
    isi.push(k);
    perTipe.set(k.tipe, isi);
  }

  const posisi = (t: string) => {
    const i = URUTAN.indexOf(t);
    return i === -1 ? URUTAN.length : i;
  };
  const tipe = [...perTipe.keys()].sort((a, b) => posisi(a) - posisi(b));

  async function pakai(k: Kosmetik) {
    setSibuk(k.id);
    setGagal(null);
    try {
      await api.post('/cosmetics/pakai', { cosmetic_id: k.id });
      muatUlang(false);
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(null);
    }
  }

  const terbuka = daftar.filter((k) => k.terbuka).length;

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-10">
      <header>
        <h1 className="judul-tebal text-[2rem]">Kosmetik</h1>
        <p className="mt-1 text-sm text-slate-500">
          {terbuka} dari {daftar.length} terbuka. Level kamu sekarang{' '}
          {data?.level ?? 1}, {data?.total_xp ?? 0} XP.
        </p>
      </header>

      {gagal && <PesanError pesan={gagal} />}

      {tipe.map((t) => (
        <section key={t}>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            {NAMA_TIPE[t] ?? t}
          </h2>
          <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(perTipe.get(t) ?? []).map((k) => (
              <li key={k.id}>
                <button
                  type="button"
                  disabled={!k.terbuka || sibuk === k.id || k.dipakai}
                  onClick={() => void pakai(k)}
                  className={`kartu w-full p-3 text-center ${
                    k.dipakai
                      ? 'ring-2 ring-merek-magenta'
                      : k.terbuka
                        ? 'ring-1 ring-slate-200'
                        : 'ring-1 ring-slate-200 opacity-60'
                  }`}
                >
                  <Contoh kosmetik={k} />

                  <span className="mt-2 block truncate text-xs font-black">
                    {k.nama}
                  </span>

                  <span className="mt-0.5 block text-[11px] leading-tight text-slate-500">
                    {k.dipakai
                      ? 'Dipakai'
                      : k.terbuka
                        ? 'Ketuk untuk pakai'
                        : k.syarat_top15
                          ? 'Lima belas besar'
                          : `Level ${k.syarat_level ?? '?'}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="rounded-xl bg-slate-100 p-3 text-xs leading-relaxed text-slate-500">
        Tidak satu pun kosmetik menambah XP atau mengubah peringkatmu. Semuanya
        cuma tampilan.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Contoh tampilan, digambar dari kolom nilai. Tidak mengunduh gambar apa pun.
 *
 * YANG TERKUNCI TETAP DIGAMBAR UTUH.
 *
 * Versi sebelumnya mengganti semua yang terkunci dengan kotak abu-abu. Di
 * Level 1 hampir semuanya terkunci, jadi seluruh halaman ini jadi dua belas
 * kotak abu-abu kosong, dan tidak ada satu pun alasan untuk mengejarnya:
 * orang tidak tahu Bingkai Emas itu seperti apa, jadi dia tidak menginginkannya.
 *
 * Sekarang warnanya ditampilkan apa adanya, cuma diredupkan sedikit dan diberi
 * gembok. Yang menentukan boleh atau tidaknya dipakai tetap server, dan tombol
 * terkunci tetap disabled; ini murni soal yang terlihat.
 */
function Contoh({ kosmetik: k }: { kosmetik: Kosmetik }) {
  const terkunci = !k.terbuka;
  const redup = terkunci ? 'opacity-80' : '';

  if (k.tipe === 'WARNA_NAMA') {
    return (
      <span className="relative mx-auto block">
        <span
          className={`block rounded-xl bg-slate-900 px-2 py-3 text-base font-black ${redup}`}
          style={{ color: k.nilai ?? '#fff' }}
        >
          Nama
        </span>
        {terkunci && <Gembok />}
      </span>
    );
  }

  if (k.tipe === 'BINGKAI') {
    return (
      <span className="relative mx-auto block h-14 w-14">
        <span
          className={`block h-full w-full rounded-full border-4 bg-slate-200 ${redup}`}
          style={{
            borderColor:
              k.nilai === 'emas'
                ? '#d4af37'
                : k.nilai === 'ukir'
                  ? '#a0266e'
                  : k.nilai === 'garis'
                    ? '#1b3a5c'
                    : '#cbd5e1',
            borderStyle: k.nilai === 'ukir' ? 'double' : 'solid',
          }}
        />
        {terkunci && <Gembok />}
      </span>
    );
  }

  // BACKGROUND dan sisanya.
  return (
    <span className="relative mx-auto block h-14 w-full">
      <span
        className={`block h-full w-full rounded-xl ${redup}`}
        style={{
          backgroundImage:
            k.nilai === 'juara'
              ? 'linear-gradient(135deg,#d4af37,#f2743a)'
              : k.nilai === 'senja'
                ? 'linear-gradient(135deg,#f2743a,#a0266e)'
                : k.nilai === 'gelap'
                  ? 'linear-gradient(135deg,#1b3a5c,#0f2a46)'
                  : 'linear-gradient(135deg,#e2e8f0,#f8fafc)',
        }}
      />
      {terkunci && <Gembok />}
    </span>
  );
}

/** Gembok kecil di pojok, penanda belum terbuka. */
function Gembok() {
  return (
    <span
      aria-hidden
      className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 shadow-[0_2px_6px_rgba(15,42,70,0.25)]"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    </span>
  );
}
