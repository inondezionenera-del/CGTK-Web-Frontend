/* =============================================================================
   /admin/kampus — data kampus dan jurusan.

   Dua belas kampus dan lima belas jurusan yang ada sekarang adalah data contoh
   yang dibuat untuk pengujian, bukan data CGTK yang sebenarnya. Layar ini
   dipakai untuk menggantinya.

   Jurusan dipakai di tiga tempat sekaligus, dan itu sebabnya rumpun tidak
   boleh asal diketik: hasil kuis memilih jurusan lewat rumpun, booth jurusan
   dibuat dari jurusan, dan alumni diundang per jurusan. Rumpun yang salah
   ketik satu huruf membuat rekomendasi kuis kosong tanpa pesan error apa pun,
   jadi di sini rumpun dipilih dari yang sudah ada.

   Tidak ada tombol hapus. Kampus dan jurusan sudah terlanjur dirujuk alumni,
   booth, dan hasil kuis peserta; menghapusnya akan meninggalkan rujukan yang
   menggantung. Yang ada tombol nonaktifkan, dan itu yang memang dibutuhkan.
============================================================================= */

import { useState } from 'react';
import { api, pesanDari } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

interface Kampus {
  id: number;
  nama: string;
  singkatan: string;
  kota?: string | null;
  akreditasi?: string | null;
  jenis?: string | null;
  aktif?: boolean;
}

interface Jurusan {
  id: number;
  nama: string;
  rumpun: string;
  aktif?: boolean;
}

interface Isi {
  kampus: Kampus[];
  jurusan: Jurusan[];
  rumpun: string[];
}

const JENIS = ['NEGERI', 'SWASTA', 'KEDINASAN'] as const;

export default function AdminMaster() {
  const { data, memuat, error, muatUlang } = useMuat<Isi>(async (signal) => {
    const [kampus, jurusan, rumpun] = await Promise.all([
      api.get<Kampus[]>('/universities', { signal }).catch(() => []),
      api.get<Jurusan[]>('/majors', { signal }).catch(() => []),
      api.get<string[]>('/majors/rumpun', { signal }).catch(() => []),
    ]);
    return { kampus: kampus ?? [], jurusan: jurusan ?? [], rumpun: rumpun ?? [] };
  }, []);

  const [tab, setTab] = useState<'kampus' | 'jurusan'>('kampus');

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <header className="text-center">
        <h1 className="judul-tebal text-[2rem]">Kampus &amp; Jurusan</h1>
        <p className="mt-1 text-sm text-slate-500">
          {data?.kampus.length ?? 0} kampus, {data?.jurusan.length ?? 0} jurusan.
        </p>
      </header>

      <div className="flex gap-2">
        {(['kampus', 'jurusan'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-black capitalize ${
              tab === t ? 'tombol-utama' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'kampus' ? (
        <>
          <TambahKampus selesai={() => muatUlang(false)} />
          {(data?.kampus ?? []).length === 0 ? (
            <Kosong judul="Belum ada kampus" />
          ) : (
            <ul className="space-y-2">
              {(data?.kampus ?? []).map((k) => (
                <li key={k.id} className="kartu p-4 ring-1 ring-slate-200">
                  <p className="font-black">
                    {k.singkatan} &middot; {k.nama}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[k.kota, k.akreditasi, k.jenis].filter(Boolean).join(' · ') ||
                      'Belum ada keterangan'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <TambahJurusan
            rumpun={data?.rumpun ?? []}
            selesai={() => muatUlang(false)}
          />
          {(data?.jurusan ?? []).length === 0 ? (
            <Kosong judul="Belum ada jurusan" />
          ) : (
            <ul className="space-y-2">
              {(data?.jurusan ?? []).map((j) => (
                <li key={j.id} className="kartu p-4 ring-1 ring-slate-200">
                  <p className="font-black">{j.nama}</p>
                  <p className="text-xs text-slate-500">{j.rumpun}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function TambahKampus({ selesai }: { selesai: () => void }) {
  const [nama, setNama] = useState('');
  const [singkatan, setSingkatan] = useState('');
  const [kota, setKota] = useState('');
  const [jenis, setJenis] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);

  const siap = nama.trim().length >= 2 && singkatan.trim().length >= 1;

  async function simpan() {
    setSibuk(true);
    setGagal(null);
    try {
      await api.post('/universities/admin', {
        nama: nama.trim(),
        singkatan: singkatan.trim().toUpperCase(),
        ...(kota.trim() ? { kota: kota.trim() } : {}),
        ...(jenis ? { jenis } : {}),
      });
      setNama('');
      setSingkatan('');
      setKota('');
      setJenis('');
      selesai();
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(false);
    }
  }

  return (
    <section className="kartu space-y-3 p-5 ring-1 ring-slate-200">
      <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
        Tambah Kampus
      </h2>
      {gagal && <PesanError pesan={gagal} />}

      <input
        value={nama}
        maxLength={160}
        onChange={(e) => setNama(e.target.value)}
        placeholder="Institut Teknologi Bandung"
        className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          value={singkatan}
          maxLength={20}
          onChange={(e) => setSingkatan(e.target.value)}
          placeholder="ITB"
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
        />
        <input
          value={kota}
          maxLength={80}
          onChange={(e) => setKota(e.target.value)}
          placeholder="Bandung"
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
        />
        <select
          value={jenis}
          onChange={(e) => setJenis(e.target.value)}
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
        >
          <option value="">Jenis (opsional)</option>
          {JENIS.map((j) => (
            <option key={j} value={j}>
              {j.charAt(0) + j.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-slate-500">
        Singkatan dipakai waktu menempel daftar alumni secara massal, jadi tulis
        yang sama dengan yang dipakai panitia di spreadsheet.
      </p>

      <button
        type="button"
        disabled={!siap || sibuk}
        onClick={() => void simpan()}
        className="tombol-utama w-full px-6 py-3.5 disabled:opacity-50"
      >
        {sibuk ? 'Menyimpan...' : 'Tambah Kampus'}
      </button>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function TambahJurusan({
  rumpun,
  selesai,
}: {
  rumpun: string[];
  selesai: () => void;
}) {
  const [nama, setNama] = useState('');
  const [pilih, setPilih] = useState('');
  const [baru, setBaru] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);

  const rumpunDipakai = pilih === '__baru' ? baru.trim() : pilih;
  const siap = nama.trim().length >= 2 && rumpunDipakai.length >= 2;

  async function simpan() {
    setSibuk(true);
    setGagal(null);
    try {
      await api.post('/majors/admin', {
        nama: nama.trim(),
        rumpun: rumpunDipakai,
      });
      setNama('');
      setBaru('');
      selesai();
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(false);
    }
  }

  return (
    <section className="kartu space-y-3 p-5 ring-1 ring-slate-200">
      <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
        Tambah Jurusan
      </h2>
      {gagal && <PesanError pesan={gagal} />}

      <input
        value={nama}
        maxLength={160}
        onChange={(e) => setNama(e.target.value)}
        placeholder="Teknik Informatika"
        className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
      />

      <select
        value={pilih}
        onChange={(e) => setPilih(e.target.value)}
        className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
      >
        <option value="">Pilih rumpun</option>
        {rumpun.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
        <option value="__baru">+ Rumpun baru</option>
      </select>

      {pilih === '__baru' && (
        <input
          value={baru}
          maxLength={80}
          onChange={(e) => setBaru(e.target.value)}
          placeholder="Nama rumpun baru"
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
        />
      )}

      <p className="text-xs leading-relaxed text-slate-500">
        Rumpun dipilih dari yang sudah ada, bukan diketik ulang. Hasil kuis
        mencari jurusan lewat nama rumpun yang sama persis; beda satu huruf
        membuat rekomendasinya kosong tanpa pesan error.
      </p>

      <button
        type="button"
        disabled={!siap || sibuk}
        onClick={() => void simpan()}
        className="tombol-utama w-full px-6 py-3.5 disabled:opacity-50"
      >
        {sibuk ? 'Menyimpan...' : 'Tambah Jurusan'}
      </button>
    </section>
  );
}
