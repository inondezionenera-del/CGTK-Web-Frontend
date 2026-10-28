/* =============================================================================
   /admin/lunas — Divisi Administrasi menandai pembayaran.

   Dipakai ratusan kali selama tiga bulan pendaftaran, jadi yang menentukan di
   sini bukan tampilannya tapi berapa ketukan per orang.

   Dua cara, keduanya ada:

   - Satuan, untuk kasus khusus dan perbaikan. Cari kode, lihat siapa orangnya,
     tandai.
   - Borongan, untuk hari biasa. Tempel banyak kode sekaligus, satu per baris.
     Lima ratus peserta tidak mungkin diklik satu per satu.

   Yang gagal ditampilkan terpisah dan bisa disalin sekali tekan, karena yang
   terjadi berikutnya selalu sama: Administrasi mencocokkan daftar gagal itu
   dengan catatan mereka. Tanpa tombol salin, mereka menyalinnya dengan tangan
   dan salah ketik lagi.
============================================================================= */

import { useState } from 'react';
import { api, pesanDari } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

interface HasilBaris {
  kode: string;
  status: 'LUNAS' | 'GAGAL';
  nama?: string;
  pesan?: string;
}

export default function AdminLunas() {
  const [tab, setTab] = useState<'daftar' | 'borongan' | 'satuan'>('daftar');

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <header className="text-center">
        <h1 className="judul-tebal text-[2rem]">Tandai Lunas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Divisi Administrasi. Setiap penandaan tercatat di log.
        </p>
      </header>

      <div className="flex gap-2">
        {(['daftar', 'borongan', 'satuan'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl px-4 text-sm font-bold capitalize ${
              tab === t
                ? 'tombol-utama'
                : 'border border-slate-300 dark:border-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'daftar' ? <Daftar /> : tab === 'borongan' ? <Borongan /> : <Satuan />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

interface BelumLunas {
  id: string;
  kode_registrasi: string;
  nama: string;
  asal_sekolah: string | null;
  kelas: string | null;
}

/**
 * Daftar centang, mengikuti mockup Admin Tandai Lunas.
 *
 * Ditaruh sebagai tab pertama karena ini yang paling mudah dipahami, tapi
 * BUKAN satu-satunya cara, dan borongan sengaja tidak dihapus. Lima ratus
 * peserta tidak mungkin dicentang satu per satu di HP, dan yang dipegang
 * Administrasi biasanya daftar kode dari catatan mereka sendiri, bukan daftar
 * nama di layar ini.
 *
 * Penandaannya tetap lewat endpoint massal yang sama, jadi yang gagal tetap
 * dilaporkan per kode.
 */
function Daftar() {
  const { data, memuat, error, muatUlang } = useMuat<BelumLunas[]>(
    (signal) => api.get<BelumLunas[]>('/payments/admin/belum-lunas?per=100', { signal }),
    [],
  );

  const [pilih, setPilih] = useState<Set<string>>(new Set());
  const [jalan, setJalan] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilBaris[] | null>(null);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const baris = data ?? [];
  const semuaDipilih = baris.length > 0 && pilih.size === baris.length;

  function ubah(kode: string) {
    const s = new Set(pilih);
    if (s.has(kode)) s.delete(kode);
    else s.add(kode);
    setPilih(s);
  }

  async function tandai() {
    if (pilih.size === 0) return;
    setJalan(true);
    setGagal(null);
    setHasil(null);
    try {
      const r = await api.post<{ rincian: HasilBaris[] }>(
        '/payments/admin/tandai-lunas-massal',
        { kode_registrasi: [...pilih] },
      );
      setHasil(r.rincian ?? []);
      setPilih(new Set());
      muatUlang(false);
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setJalan(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-lg font-extrabold">Dipilih {pilih.size} Peserta</p>
        <button
          type="button"
          aria-label={semuaDipilih ? 'Batalkan semua' : 'Pilih semua'}
          onClick={() =>
            setPilih(semuaDipilih ? new Set() : new Set(baris.map((b) => b.kode_registrasi)))
          }
          className={`h-8 w-8 shrink-0 rounded-full border-[3px] border-slate-900 ${
            semuaDipilih ? 'bg-slate-900' : 'bg-transparent'
          }`}
        />
      </div>

      {gagal && <PesanError pesan={gagal} />}

      {baris.length === 0 ? (
        <Kosong
          judul="Tidak ada yang menunggu"
          keterangan="Semua pendaftar yang datanya lengkap sudah ditandai lunas."
        />
      ) : (
        <ul className="space-y-3">
          {baris.map((b) => {
            const dipilih = pilih.has(b.kode_registrasi);
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => ubah(b.kode_registrasi)}
                  className={`flex min-h-16 w-full items-center gap-3 rounded-full px-3 text-left shadow-[0_3px_0_-1px_rgba(0,0,0,0.15)] ${
                    dipilih ? 'bg-utama-100' : 'bg-slate-200'
                  }`}
                >
                  <span className="h-11 w-11 shrink-0 rounded-full bg-slate-400/70" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-black">{b.nama}</span>
                    <span className="block truncate font-mono text-xs text-slate-600">
                      {b.kode_registrasi}
                      {b.asal_sekolah ? ` · ${b.asal_sekolah}` : ''}
                    </span>
                  </span>
                  <span
                    className={`h-7 w-7 shrink-0 rounded-full border-[3px] border-slate-900 ${
                      dipilih ? 'bg-slate-900' : 'bg-transparent'
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {pilih.size > 0 && (
        <button
          type="button"
          disabled={jalan}
          onClick={() => void tandai()}
          className="tombol-utama sticky bottom-3 w-full px-6 py-3.5 disabled:opacity-60"
        >
          {jalan ? 'Menandai...' : `Tandai ${pilih.size} Peserta Lunas`}
        </button>
      )}

      {hasil && (
        <div className="kartu p-4 text-sm">
          <p className="font-bold">
            {hasil.filter((r) => r.status === 'LUNAS').length} berhasil,{' '}
            {hasil.filter((r) => r.status === 'GAGAL').length} gagal
          </p>
          {hasil
            .filter((r) => r.status === 'GAGAL')
            .map((r) => (
              <p key={r.kode} className="mt-1 text-xs text-bahaya-600">
                {r.kode}: {r.pesan ?? 'gagal'}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Borongan() {
  const [teks, setTeks] = useState('');
  const [hasil, setHasil] = useState<HasilBaris[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jalan, setJalan] = useState(false);
  const [tersalin, setTersalin] = useState(false);

  const kode = teks
    .split('\n')
    .map((b) => b.trim().toUpperCase())
    .filter(Boolean);

  async function proses() {
    if (kode.length === 0) return;
    setJalan(true);
    setError(null);
    setHasil(null);
    try {
      const r = await api.post<{ rincian: HasilBaris[] }>(
        '/payments/admin/tandai-lunas-massal',
        { kode_registrasi: kode },
      );
      setHasil(r.rincian ?? []);
    } catch (e) {
      setError(pesanDari(e));
    } finally {
      setJalan(false);
    }
  }

  const gagal = (hasil ?? []).filter((r) => r.status === 'GAGAL');
  const sukses = (hasil ?? []).filter((r) => r.status === 'LUNAS');

  return (
    <div className="kartu space-y-4 border border-slate-200 p-5 dark:border-slate-800">
      <div>
        <label htmlFor="massal" className="text-sm font-semibold">
          Tempel kode registrasi, satu per baris
        </label>
        <textarea
          id="massal"
          rows={6}
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          placeholder={'CGTK-K7M2QX\nCGTK-P3R8WZ\nCGTK-M2N5TY'}
          className="mt-1 w-full rounded-2xl border border-slate-300 bg-white p-3 font-mono text-sm outline-none focus:border-utama-600 dark:border-slate-700 dark:bg-slate-800"
        />
        <p className="mt-1 text-xs text-slate-500">{kode.length} kode terbaca</p>
      </div>

      <button
        type="button"
        onClick={() => void proses()}
        disabled={jalan || kode.length === 0}
        className="tombol-utama w-full px-6 disabled:opacity-50"
      >
        {jalan ? 'Memproses...' : `Proses ${kode.length} kode`}
      </button>

      {error && (
        <p className="rounded-xl bg-bahaya-50 p-3 text-sm text-bahaya-700">{error}</p>
      )}

      {hasil && (
        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="text-sm font-bold">
            <span className="text-berhasil-700">{sukses.length} berhasil</span>
            {' · '}
            <span className="text-bahaya-700">{gagal.length} gagal</span>
          </p>

          <ul className="max-h-64 space-y-1.5 overflow-y-auto">
            {hasil.map((r) => (
              <li
                key={r.kode}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                  r.status === 'LUNAS'
                    ? 'bg-berhasil-50 dark:bg-berhasil-700/10'
                    : 'bg-bahaya-50 dark:bg-bahaya-700/10'
                }`}
              >
                <span className="font-mono font-bold">{r.kode}</span>
                <span className="text-right">
                  {r.status === 'LUNAS' ? (
                    <span className="font-bold text-berhasil-700">
                      {r.nama ?? 'LUNAS'}
                    </span>
                  ) : (
                    <span className="font-bold text-bahaya-700">
                      {r.pesan ?? 'Gagal'}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {gagal.length > 0 && (
            <div className="rounded-xl border border-bahaya-600 bg-bahaya-50 p-3 dark:bg-bahaya-700/10">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-bahaya-700">
                  Yang gagal, bisa disalin
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(gagal.map((g) => g.kode).join('\n'))
                      .then(() => {
                        setTersalin(true);
                        setTimeout(() => setTersalin(false), 2000);
                      })
                      .catch(() => {});
                  }}
                  className="text-xs font-bold text-bahaya-700 underline"
                >
                  {tersalin ? 'Tersalin' : 'Salin semua'}
                </button>
              </div>
              <textarea
                readOnly
                rows={2}
                value={gagal.map((g) => g.kode).join('\n')}
                className="w-full rounded-lg border border-bahaya-600 bg-white p-2 font-mono text-xs dark:bg-slate-900"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Satuan() {
  const [kode, setKode] = useState('');
  const [catatan, setCatatan] = useState('');
  const [pesan, setPesan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jalan, setJalan] = useState(false);

  async function tandai() {
    const k = kode.trim().toUpperCase();
    if (!k) return;
    setJalan(true);
    setError(null);
    setPesan(null);
    try {
      const r = await api.post<{ nama?: string }>('/payments/admin/tandai-lunas', {
        kode_registrasi: k,
        catatan: catatan.trim() || undefined,
      });
      setPesan(`${r.nama ?? k} ditandai LUNAS. QR-nya terbit otomatis.`);
      setKode('');
      setCatatan('');
    } catch (e) {
      setError(pesanDari(e));
    } finally {
      setJalan(false);
    }
  }

  return (
    <div className="kartu space-y-4 border border-slate-200 p-5 dark:border-slate-800">
      <div>
        <label htmlFor="kode1" className="text-sm font-semibold">
          Kode registrasi
        </label>
        <input
          id="kode1"
          value={kode}
          onChange={(e) => setKode(e.target.value)}
          placeholder="CGTK-XXXXXX"
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40 font-mono uppercase"
        />
      </div>

      <div>
        <label htmlFor="cat" className="text-sm font-semibold">
          Catatan internal
        </label>
        <input
          id="cat"
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Contoh: tunai 12 Des, diterima Rina"
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
        />
      </div>

      <button
        type="button"
        onClick={() => void tandai()}
        disabled={jalan || !kode.trim()}
        className="tombol-utama w-full px-6 disabled:opacity-50"
      >
        {jalan ? 'Menandai...' : 'Tandai Lunas'}
      </button>

      {pesan && (
        <p className="rounded-xl bg-berhasil-50 p-3 text-sm font-semibold text-berhasil-700 dark:bg-berhasil-700/10">
          {pesan}
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-bahaya-50 p-3 text-sm text-bahaya-700 dark:bg-bahaya-700/10">
          {error}
        </p>
      )}
    </div>
  );
}
