/* =============================================================================
   /admin/pengaturan — semua setelan acara, dikelompokkan.

   Halaman ini yang paling menghambat sebelum dibuat. Lima setelan pembayaran
   kosong di database, dan tanpa layar ini satu-satunya cara mengisinya adalah
   membuka psql. Selama kosong, halaman pembayaran peserta mati total: kode
   registrasinya muncul, tombolnya tidak menuju ke mana-mana.

   Tiga hal yang membuat layar ini aman dipakai di tengah acara:

   1. Disimpan per baris, bukan satu tombol Simpan Semua. Satu setelan yang
      ditolak server tidak ikut membatalkan yang lain, dan panitia tahu persis
      mana yang gagal.

   2. Izin diperiksa server per kelompok. Divisi Pendanaan tidak bisa mengubah
      setelan XP walaupun barisnya kelihatan di layar. Yang ditolak muncul
      sebagai pesan dari server, apa adanya, bukan tombol yang disembunyikan.

   3. link_pembayaran dan prefill_entry_id ditampilkan tersamar untuk yang
      tidak berhak membacanya. Mereka tetap bisa menggantinya tanpa pernah
      melihat isinya, dan itu memang cukup.

   Mode Hemat dan saklar lain memakai tombol geser, bukan kolom teks berisi
   true dan false. Di tengah acara tidak ada yang mau mengetik kata.
============================================================================= */

import { useState } from 'react';
import { api, pesanDari } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

interface Setelan {
  kunci: string;
  nilai: string;
  tipe: string;
  kelompok: string;
  deskripsi: string | null;
  diubah_at: string | null;
}

const NAMA_KELOMPOK: Record<string, string> = {
  bayar: 'Pembayaran',
  xp: 'XP dan Gamifikasi',
  form: 'Formulir Pendaftaran',
  kuis: 'Kuis',
  acara: 'Acara',
  sistem: 'Sistem',
};

/** Urutan tampil. Pembayaran di atas karena itu yang paling sering diubah. */
const URUTAN = ['bayar', 'acara', 'form', 'kuis', 'xp', 'sistem'];

export default function AdminPengaturan() {
  const { data, memuat, error, muatUlang } = useMuat<Setelan[]>(
    (signal) => api.get<Setelan[]>('/settings/admin', { signal }),
    [],
  );

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const semua = data ?? [];
  if (semua.length === 0) {
    return <Kosong judul="Belum ada setelan" keterangan="Database belum di-seed." />;
  }

  const perKelompok = new Map<string, Setelan[]>();
  for (const s of semua) {
    const isi = perKelompok.get(s.kelompok) ?? [];
    isi.push(s);
    perKelompok.set(s.kelompok, isi);
  }

  // Kelompok yang tidak ada di URUTAN ditaruh paling bawah, bukan paling
  // atas: indexOf mengembalikan -1 untuk yang tidak dikenal.
  const posisi = (k: string) => {
    const i = URUTAN.indexOf(k);
    return i === -1 ? URUTAN.length : i;
  };
  const kelompok = [...perKelompok.keys()].sort((a, b) => posisi(a) - posisi(b));

  const kosongWajib = semua.filter(
    (s) => s.kelompok === 'bayar' && !s.nilai && s.kunci !== 'prefill_entry_id',
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <header className="text-center">
        <h1 className="judul-tebal text-[2rem]">Pengaturan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tersimpan satu per satu begitu kamu selesai mengetik.
        </p>
      </header>

      {kosongWajib.length > 0 && (
        <div className="kartu p-4 ring-2 ring-bahaya-600/40">
          <p className="font-black text-bahaya-700">
            Halaman pembayaran peserta belum bisa dipakai
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            {kosongWajib.length} setelan pembayaran masih kosong:{' '}
            <span className="font-bold">
              {kosongWajib.map((s) => s.kunci.replace(/_/g, ' ')).join(', ')}
            </span>
            . Selama kosong, peserta sampai di halaman bayar tapi tombolnya
            mati.
          </p>
        </div>
      )}

      {kelompok.map((k) => (
        <section key={k} className="kartu p-5 ring-1 ring-slate-200">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            {NAMA_KELOMPOK[k] ?? k}
          </h2>
          <ul className="mt-3 space-y-4">
            {(perKelompok.get(k) ?? []).map((s) => (
              <Baris key={s.kunci} setelan={s} selesai={() => muatUlang(false)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Baris({ setelan, selesai }: { setelan: Setelan; selesai: () => void }) {
  const [nilai, setNilai] = useState(setelan.nilai ?? '');
  const [sibuk, setSibuk] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);
  const [tersimpan, setTersimpan] = useState(false);

  const boolean_ = setelan.tipe === 'boolean';
  const angka = setelan.tipe === 'number' || setelan.tipe === 'int';
  const panjang = setelan.kunci === 'teks_petunjuk_bayar';
  const tersamar = nilai === '••••••';

  async function simpan(baru: string) {
    if (baru === (setelan.nilai ?? '')) return;
    setSibuk(true);
    setGagal(null);
    setTersimpan(false);
    try {
      await api.patch(`/settings/admin/${setelan.kunci}`, { nilai: baru });
      setTersimpan(true);
      selesai();
    } catch (e) {
      setGagal(pesanDari(e));
      setNilai(setelan.nilai ?? '');
    } finally {
      setSibuk(false);
    }
  }

  return (
    <li>
      <div className="flex items-start justify-between gap-3">
        <label htmlFor={setelan.kunci} className="min-w-0">
          <span className="block text-sm font-black capitalize">
            {setelan.kunci.replace(/_/g, ' ')}
          </span>
          {setelan.deskripsi && (
            <span className="block text-xs leading-snug text-slate-500">
              {setelan.deskripsi}
            </span>
          )}
        </label>

        {boolean_ && (
          <button
            type="button"
            role="switch"
            aria-checked={nilai === 'true'}
            aria-label={setelan.kunci.replace(/_/g, ' ')}
            disabled={sibuk}
            onClick={() => {
              const baru = nilai === 'true' ? 'false' : 'true';
              setNilai(baru);
              void simpan(baru);
            }}
            className={`relative h-9 w-16 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              nilai === 'true' ? 'bg-berhasil-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-1 h-7 w-7 rounded-full bg-white transition-all ${
                nilai === 'true' ? 'left-8' : 'left-1'
              }`}
            />
          </button>
        )}
      </div>

      {!boolean_ &&
        (panjang ? (
          <textarea
            id={setelan.kunci}
            rows={4}
            value={nilai}
            disabled={sibuk}
            onChange={(e) => setNilai(e.target.value)}
            onBlur={() => void simpan(nilai)}
            className="isian mt-1.5 outline-none focus:ring-2 focus:ring-merek-magenta/40"
          />
        ) : (
          <input
            id={setelan.kunci}
            type={angka ? 'number' : 'text'}
            inputMode={angka ? 'numeric' : undefined}
            value={nilai}
            disabled={sibuk}
            onChange={(e) => setNilai(e.target.value)}
            onFocus={() => {
              // Nilai tersamar dikosongkan saat difokus. Menyimpannya kembali
              // apa adanya akan menimpa rahasia aslinya dengan enam titik.
              if (tersamar) setNilai('');
            }}
            onBlur={() => void simpan(nilai)}
            className="isian mt-1.5 outline-none focus:ring-2 focus:ring-merek-magenta/40"
          />
        ))}

      {gagal && <p className="mt-1 text-xs font-bold text-bahaya-600">{gagal}</p>}
      {tersimpan && !gagal && (
        <p className="mt-1 text-xs font-bold text-berhasil-700">Tersimpan</p>
      )}
      {!setelan.nilai && setelan.kelompok === 'bayar' && !gagal && (
        <p className="mt-1 text-xs font-bold text-hatihati-700">Masih kosong</p>
      )}
    </li>
  );
}
