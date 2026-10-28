/* =============================================================================
   /admin/form — pertanyaan di formulir pendaftaran.

   Yang ditambahkan di sini langsung muncul di halaman Daftar peserta, dan
   ikut terbawa ke ekspor LPJ sebagai kolom tersendiri.

   Dua hal yang sengaja dibuat sulit dirusak:

   1. Kunci tidak bisa diubah sesudah dibuat. Jawaban peserta disimpan
      memakai kunci itu sebagai nama kolomnya di extra_fields. Mengubah kunci
      membuat semua jawaban lama kehilangan rumahnya, dan tidak ada pesan
      error yang muncul: datanya cuma hilang dari layar.

   2. Tidak ada tombol hapus, hanya nonaktifkan. Alasannya sama.

   Pertanyaan yang ditandai wajib menentukan apakah peserta boleh melihat
   petunjuk pembayaran: selama ada yang wajib belum diisi, halaman bayar
   menolak membukanya. Jadi menambah pertanyaan wajib di tengah pendaftaran
   akan mengunci peserta yang sudah terlanjur mendaftar, dan itu ditulis di
   layar sebelum tombolnya ditekan.
============================================================================= */

import { useState } from 'react';
import { api, pesanDari } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

interface Bidang {
  id: number;
  kunci: string;
  label: string;
  tipe: string;
  opsi?: string[] | null;
  wajib: boolean;
  bisa_diedit_peserta?: boolean;
  bantuan?: string | null;
  urutan?: number;
  aktif?: boolean;
}

const TIPE = [
  { nilai: 'TEKS', label: 'Teks' },
  { nilai: 'ANGKA', label: 'Angka' },
  { nilai: 'PILIHAN', label: 'Pilihan' },
  { nilai: 'PILIHAN_GANDA', label: 'Pilihan Ganda' },
  { nilai: 'TANGGAL', label: 'Tanggal' },
  { nilai: 'YA_TIDAK', label: 'Ya / Tidak' },
] as const;

export default function AdminForm() {
  const { data, memuat, error, muatUlang } = useMuat<Bidang[]>(
    (signal) => api.get<Bidang[]>('/form_fields/admin', { signal }),
    [],
  );

  const [sibuk, setSibuk] = useState<number | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const bidang = data ?? [];

  async function matikan(b: Bidang) {
    setSibuk(b.id);
    setGagal(null);
    try {
      await api.patch(`/form_fields/admin/${b.id}/nonaktif`, {});
      muatUlang(false);
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <header className="text-center">
        <h1 className="judul-tebal text-[2rem]">Formulir Pendaftaran</h1>
        <p className="mt-1 text-sm text-slate-500">
          {bidang.filter((b) => b.aktif !== false).length} pertanyaan aktif.
        </p>
      </header>

      {gagal && <PesanError pesan={gagal} />}

      <Tambah selesai={() => muatUlang(false)} />

      {bidang.length === 0 ? (
        <Kosong
          judul="Belum ada pertanyaan tambahan"
          keterangan="Nama, sekolah, dan kelas sudah ditanyakan bawaan; yang di sini tambahannya."
        />
      ) : (
        <ul className="space-y-2">
          {bidang.map((b) => (
            <li
              key={b.id}
              className={`kartu p-4 ring-1 ring-slate-200 ${
                b.aktif === false ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black">
                    {b.label}
                    {b.wajib && <span className="ml-1 text-bahaya-600">*</span>}
                  </p>
                  <p className="truncate font-mono text-xs text-slate-500">
                    {b.kunci} &middot; {b.tipe}
                  </p>
                  {b.bantuan && (
                    <p className="mt-0.5 text-xs text-slate-500">{b.bantuan}</p>
                  )}
                  {(b.opsi ?? []).length > 0 && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      Pilihan: {(b.opsi ?? []).join(', ')}
                    </p>
                  )}
                </div>

                {b.aktif !== false && (
                  <button
                    type="button"
                    disabled={sibuk === b.id}
                    onClick={() => void matikan(b)}
                    className="shrink-0 rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-50"
                  >
                    Nonaktifkan
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Tambah({ selesai }: { selesai: () => void }) {
  const [buka, setBuka] = useState(false);
  const [label, setLabel] = useState('');
  const [kunci, setKunci] = useState('');
  const [tipe, setTipe] = useState<string>('TEKS');
  const [opsi, setOpsi] = useState('');
  const [wajib, setWajib] = useState(false);
  const [bantuan, setBantuan] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);

  const butuhOpsi = tipe === 'PILIHAN' || tipe === 'PILIHAN_GANDA';
  const daftarOpsi = opsi
    .split('\n')
    .map((o) => o.trim())
    .filter(Boolean);

  const kunciSah = /^[a-z][a-z0-9_]*$/.test(kunci);
  const siap =
    label.trim().length >= 2 && kunciSah && (!butuhOpsi || daftarOpsi.length > 0);

  // Kunci disarankan dari labelnya, tapi tetap bisa diubah sebelum disimpan.
  function isiLabel(v: string) {
    setLabel(v);
    if (!kunci || kunci === saranKunci(label)) setKunci(saranKunci(v));
  }

  async function simpan() {
    setSibuk(true);
    setGagal(null);
    try {
      await api.post('/form_fields/admin', {
        kunci,
        label: label.trim(),
        tipe,
        wajib,
        ...(butuhOpsi ? { opsi: daftarOpsi } : {}),
        ...(bantuan.trim() ? { bantuan: bantuan.trim() } : {}),
      });
      setLabel('');
      setKunci('');
      setOpsi('');
      setBantuan('');
      setWajib(false);
      setBuka(false);
      selesai();
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(false);
    }
  }

  if (!buka) {
    return (
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="w-full rounded-full bg-slate-100 px-6 py-3.5 font-black text-slate-700"
      >
        Tambah Pertanyaan
      </button>
    );
  }

  return (
    <section className="kartu space-y-3 p-5 ring-1 ring-slate-200">
      <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
        Pertanyaan Baru
      </h2>

      {gagal && <PesanError pesan={gagal} />}

      <input
        value={label}
        maxLength={160}
        onChange={(e) => isiLabel(e.target.value)}
        placeholder="Pertanyaannya, misalnya Ukuran kaos"
        className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
      />

      <div>
        <input
          value={kunci}
          maxLength={60}
          onChange={(e) => setKunci(e.target.value.toLowerCase())}
          placeholder="ukuran_kaos"
          className="isian font-mono outline-none focus:ring-2 focus:ring-merek-magenta/40"
        />
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {kunci && !kunciSah
            ? 'Kunci harus diawali huruf kecil, isinya huruf kecil, angka, dan garis bawah.'
            : 'Kunci tidak bisa diubah sesudah disimpan: jawaban peserta tersimpan memakai nama ini.'}
        </p>
      </div>

      <select
        value={tipe}
        onChange={(e) => setTipe(e.target.value)}
        className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
      >
        {TIPE.map((t) => (
          <option key={t.nilai} value={t.nilai}>
            {t.label}
          </option>
        ))}
      </select>

      {butuhOpsi && (
        <textarea
          rows={4}
          value={opsi}
          onChange={(e) => setOpsi(e.target.value)}
          placeholder={'S\nM\nL\nXL'}
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
        />
      )}

      <input
        value={bantuan}
        maxLength={300}
        onChange={(e) => setBantuan(e.target.value)}
        placeholder="Keterangan di bawah kolom (opsional)"
        className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
      />

      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={wajib}
          onChange={(e) => setWajib(e.target.checked)}
          className="h-5 w-5 rounded border-slate-300"
        />
        <span className="text-sm font-bold">Wajib diisi</span>
      </label>

      {wajib && (
        <p className="rounded-xl bg-hatihati-50 p-3 text-xs leading-relaxed text-hatihati-700">
          Hati-hati kalau pendaftaran sudah dibuka. Selama ada pertanyaan wajib
          yang belum diisi, halaman pembayaran menolak terbuka, jadi peserta
          yang sudah terlanjur mendaftar akan terkunci sampai mereka melengkapi
          jawabannya.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!siap || sibuk}
          onClick={() => void simpan()}
          className="tombol-utama flex-1 px-6 py-3.5 disabled:opacity-50"
        >
          {sibuk ? 'Menyimpan...' : 'Simpan'}
        </button>
        <button
          type="button"
          onClick={() => setBuka(false)}
          className="flex-1 rounded-full bg-white px-6 py-3.5 font-bold ring-1 ring-slate-300"
        >
          Batal
        </button>
      </div>
    </section>
  );
}

function saranKunci(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^([0-9])/, 'f$1')
    .slice(0, 40);
}
