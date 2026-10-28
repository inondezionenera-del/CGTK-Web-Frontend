/* =============================================================================
   /admin/alumni — undang alumni dan tugaskan LO.

   Ini yang paling menghambat di sisi data: tabel representatives masih NOL
   baris. Tanpa alumni yang diundang, booth kampus tidak punya penjaga, tombol
   Buat Otomatis di halaman booth tidak punya bahan, dan halaman alumni yang
   baru dibuat tidak akan pernah dibuka siapa pun.

   Kampus DAN jurusan dua-duanya wajib, dan itu bukan kerewelan form. Orang
   yang sama menjaga booth kampus di Acara 2 dan booth jurusan di Acara 3.
   Kalau salah satunya kosong, dia tidak muncul di salah satu acara dan baru
   ketahuan di hari-H waktu mejanya kosong.

   Dua cara mengundang, sama seperti Tandai Lunas:

     Satuan  untuk menambah satu orang, dengan pilihan kampus dan jurusan yang
             bisa dicari.
     Massal  untuk menempel daftar dari spreadsheet panitia. Lima puluh alumni
             tidak akan diketik satu per satu lewat form.

   Yang gagal dilaporkan per baris beserta alasannya, karena yang terjadi
   berikutnya selalu sama: panitia mencocokkannya dengan catatan mereka.
============================================================================= */

import { useState } from 'react';
import { api, pesanDari } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

interface Kampus {
  id: number;
  nama: string;
  singkatan: string;
}

interface Jurusan {
  id: number;
  nama: string;
  rumpun?: string | null;
}

interface Alumni {
  id: number;
  email_undangan: string;
  status: 'DIUNDANG' | 'AKTIF' | 'NONAKTIF';
  angkatan: number | null;
  kontak: string | null;
  bio: string | null;
  sudah_masuk: boolean;
  nama: string | null;
  kampus: { id: number; nama: string; singkatan: string } | null;
  jurusan: { id: number; nama: string } | null;
}

interface HasilBaris {
  email: string;
  status: string;
  alasan?: string;
}

interface Isi {
  kampus: Kampus[];
  jurusan: Jurusan[];
  alumni: Alumni[];
}

export default function AdminAlumni() {
  const { data, memuat, error, muatUlang } = useMuat<Isi>(async (signal) => {
    const [kampus, jurusan, alumni] = await Promise.all([
      api.get<Kampus[]>('/universities', { signal }).catch(() => []),
      api.get<Jurusan[]>('/majors', { signal }).catch(() => []),
      // /representatives/admin, bukan /representatives.
      //
      // Yang publik hanya memuat alumni berstatus AKTIF, karena dia dipakai
      // halaman kampus yang dilihat peserta. Panitia justru paling butuh
      // melihat yang masih DIUNDANG: itu yang perlu ditagih sebelum hari-H.
      api.get<Alumni[]>('/representatives/admin', { signal }).catch(() => []),
    ]);
    return { kampus: kampus ?? [], jurusan: jurusan ?? [], alumni: alumni ?? [] };
  }, []);

  const [tab, setTab] = useState<'satuan' | 'massal'>('satuan');

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <header className="text-center">
        <h1 className="judul-tebal text-[2rem]">Undang Alumni</h1>
        <p className="mt-1 text-sm text-slate-500">
          Mereka masuk dengan akun Google di email yang kamu undang.
        </p>
      </header>

      {data?.kampus.length === 0 && (
        <div className="kartu p-4 ring-2 ring-hatihati-600/40">
          <p className="font-black">Belum ada kampus di database</p>
          <p className="mt-1 text-sm text-slate-600">
            Tambahkan kampus dan jurusannya dulu di halaman Kampus &amp; Jurusan,
            baru alumni bisa diundang.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {(['satuan', 'massal'] as const).map((t) => (
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

      {tab === 'satuan' ? (
        <Satuan
          kampus={data?.kampus ?? []}
          jurusan={data?.jurusan ?? []}
          selesai={() => muatUlang(false)}
        />
      ) : (
        <Massal
          kampus={data?.kampus ?? []}
          jurusan={data?.jurusan ?? []}
          selesai={() => muatUlang(false)}
        />
      )}

      <DaftarAlumni
        alumni={data?.alumni ?? []}
        kampus={data?.kampus ?? []}
        jurusan={data?.jurusan ?? []}
        selesai={() => muatUlang(false)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Satuan({
  kampus,
  jurusan,
  selesai,
}: {
  kampus: Kampus[];
  jurusan: Jurusan[];
  selesai: () => void;
}) {
  const [email, setEmail] = useState('');
  const [univ, setUniv] = useState('');
  const [major, setMajor] = useState('');
  const [angkatan, setAngkatan] = useState('');
  const [kontak, setKontak] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState<string | null>(null);

  const siap = email.includes('@') && univ !== '' && major !== '';

  async function kirim() {
    setSibuk(true);
    setGagal(null);
    setBerhasil(null);
    try {
      await api.post('/representatives/admin/undang', {
        email_undangan: email.trim().toLowerCase(),
        university_id: Number(univ),
        major_id: Number(major),
        ...(angkatan ? { angkatan: Number(angkatan) } : {}),
        ...(kontak.trim() ? { kontak: kontak.trim() } : {}),
      });
      setBerhasil(email.trim().toLowerCase());
      setEmail('');
      setAngkatan('');
      setKontak('');
      selesai();
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(false);
    }
  }

  return (
    <section className="kartu space-y-4 p-5 ring-1 ring-slate-200">
      {gagal && <PesanError pesan={gagal} />}
      {berhasil && (
        <p className="text-sm font-bold text-berhasil-700">
          {berhasil} sudah diundang.
        </p>
      )}

      <div>
        <label htmlFor="email" className="text-sm font-black">
          Email Google alumni
        </label>
        <input
          id="email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@gmail.com"
          className="isian mt-1 outline-none focus:ring-2 focus:ring-merek-magenta/40"
        />
        <p className="mt-1 text-xs text-slate-500">
          Harus email yang dia pakai untuk masuk Google. Salah satu huruf saja
          membuat dia tidak dikenali sebagai alumni waktu login.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="univ" className="text-sm font-black">
            Kampus
          </label>
          <select
            id="univ"
            value={univ}
            onChange={(e) => setUniv(e.target.value)}
            className="isian mt-1 outline-none focus:ring-2 focus:ring-merek-magenta/40"
          >
            <option value="">Pilih kampus</option>
            {kampus.map((k) => (
              <option key={k.id} value={k.id}>
                {k.singkatan} &middot; {k.nama}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="major" className="text-sm font-black">
            Jurusan
          </label>
          <select
            id="major"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            className="isian mt-1 outline-none focus:ring-2 focus:ring-merek-magenta/40"
          >
            <option value="">Pilih jurusan</option>
            {jurusan.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nama}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="angkatan" className="text-sm font-black">
            Angkatan
          </label>
          <input
            id="angkatan"
            type="number"
            inputMode="numeric"
            min={1990}
            max={2100}
            value={angkatan}
            onChange={(e) => setAngkatan(e.target.value)}
            placeholder="2022"
            className="isian mt-1 outline-none focus:ring-2 focus:ring-merek-magenta/40"
          />
        </div>

        <div>
          <label htmlFor="kontak" className="text-sm font-black">
            Kontak
          </label>
          <input
            id="kontak"
            value={kontak}
            maxLength={40}
            onChange={(e) => setKontak(e.target.value)}
            placeholder="08xxxxxxxxxx"
            className="isian mt-1 outline-none focus:ring-2 focus:ring-merek-magenta/40"
          />
        </div>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Kampus dan jurusan dua-duanya wajib. Orang yang sama menjaga booth
        kampus di satu acara dan booth jurusan di acara lain; kalau salah
        satunya kosong, mejanya kosong di hari-H.
      </p>

      <button
        type="button"
        disabled={!siap || sibuk}
        onClick={() => void kirim()}
        className="tombol-utama w-full px-6 py-3.5 disabled:opacity-50"
      >
        {sibuk ? 'Mengundang...' : 'Undang Alumni'}
      </button>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Massal({
  kampus,
  jurusan,
  selesai,
}: {
  kampus: Kampus[];
  jurusan: Jurusan[];
  selesai: () => void;
}) {
  const [teks, setTeks] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);
  const [hasil, setHasil] = useState<HasilBaris[] | null>(null);

  // Dicocokkan dengan singkatan kampus dan nama jurusan supaya panitia bisa
  // menempel langsung dari spreadsheet tanpa mencari id-nya satu per satu.
  const petaKampus = new Map(kampus.map((k) => [k.singkatan.toUpperCase(), k.id]));
  const petaJurusan = new Map(jurusan.map((j) => [j.nama.toUpperCase(), j.id]));

  const baris = teks
    .split('\n')
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const [email, sing, jur, ang] = b.split(/\s*[;,]\s*/);
      return {
        mentah: b,
        email: (email ?? '').toLowerCase(),
        university_id: petaKampus.get((sing ?? '').toUpperCase()),
        major_id: petaJurusan.get((jur ?? '').toUpperCase()),
        angkatan: ang ? Number(ang) : undefined,
      };
    });

  const sah = baris.filter((b) => b.email.includes('@') && b.university_id && b.major_id);
  const cacat = baris.filter((b) => !(b.email.includes('@') && b.university_id && b.major_id));

  async function proses() {
    setSibuk(true);
    setGagal(null);
    setHasil(null);
    try {
      const r = await api.post<{ rincian: HasilBaris[] }>(
        '/representatives/admin/undang-massal',
        {
          baris: sah.map((b) => ({
            email_undangan: b.email,
            university_id: b.university_id,
            major_id: b.major_id,
            ...(b.angkatan && Number.isFinite(b.angkatan) ? { angkatan: b.angkatan } : {}),
          })),
        },
      );
      setHasil(r.rincian ?? []);
      selesai();
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(false);
    }
  }

  return (
    <section className="kartu space-y-4 p-5 ring-1 ring-slate-200">
      <div>
        <label htmlFor="massal" className="text-sm font-black">
          Tempel daftarnya, satu alumni per baris
        </label>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
          Urutannya: email, singkatan kampus, nama jurusan, angkatan. Dipisah
          koma atau titik koma. Angkatan boleh dikosongkan.
        </p>
        <textarea
          id="massal"
          rows={8}
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          placeholder={
            'budi@gmail.com, ITB, Teknik Informatika, 2022\n' +
            'sari@gmail.com, UI, Kedokteran, 2021'
          }
          className="isian mt-1.5 font-mono text-sm outline-none focus:ring-2 focus:ring-merek-magenta/40"
        />
      </div>

      <p className="text-sm">
        <span className="font-black text-berhasil-700">{sah.length} siap</span>
        {cacat.length > 0 && (
          <>
            {' '}
            &middot;{' '}
            <span className="font-black text-bahaya-600">
              {cacat.length} belum cocok
            </span>
          </>
        )}
      </p>

      {cacat.length > 0 && (
        <ul className="space-y-0.5 text-xs text-bahaya-600">
          {cacat.slice(0, 6).map((b, i) => (
            <li key={i} className="truncate">
              {b.mentah} &mdash;{' '}
              {!b.email.includes('@')
                ? 'email tidak valid'
                : !b.university_id
                  ? 'singkatan kampus tidak dikenal'
                  : 'nama jurusan tidak dikenal'}
            </li>
          ))}
          {cacat.length > 6 && <li>dan {cacat.length - 6} baris lagi</li>}
        </ul>
      )}

      {gagal && <PesanError pesan={gagal} />}

      <button
        type="button"
        disabled={sah.length === 0 || sibuk}
        onClick={() => void proses()}
        className="tombol-utama w-full px-6 py-3.5 disabled:opacity-50"
      >
        {sibuk ? 'Mengundang...' : `Undang ${sah.length} Alumni`}
      </button>

      {hasil && (
        <div className="rounded-2xl bg-slate-100 p-4 text-sm">
          <p className="font-black">
            {hasil.filter((h) => h.status !== 'GAGAL').length} berhasil,{' '}
            {hasil.filter((h) => h.status === 'GAGAL').length} gagal
          </p>
          {hasil
            .filter((h) => h.status === 'GAGAL')
            .map((h) => (
              <p key={h.email} className="mt-1 text-xs text-bahaya-600">
                {h.email}: {h.alasan ?? 'gagal'}
              </p>
            ))}
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

const SARINGAN = [
  { nilai: '', label: 'Semua' },
  { nilai: 'DIUNDANG', label: 'Diundang' },
  { nilai: 'AKTIF', label: 'Aktif' },
  { nilai: 'NONAKTIF', label: 'Nonaktif' },
];

/**
 * Daftar alumni beserta penyuntingannya.
 *
 * Disaring dan dicari di sisi layar, bukan dengan memanggil server tiap
 * ketukan: jumlah alumni belasan sampai puluhan orang, bukan ribuan, dan satu
 * permintaan per huruf cuma membebani API di hari acara tanpa manfaat.
 */
function DaftarAlumni({
  alumni,
  kampus,
  jurusan,
  selesai,
}: {
  alumni: Alumni[];
  kampus: Kampus[];
  jurusan: Jurusan[];
  selesai: () => void;
}) {
  const [saring, setSaring] = useState('');
  const [cari, setCari] = useState('');
  const [sunting, setSunting] = useState<number | null>(null);

  const q = cari.trim().toLowerCase();
  const tampil = alumni.filter((a) => {
    if (saring && a.status !== saring) return false;
    if (!q) return true;
    return [a.nama, a.email_undangan, a.kampus?.singkatan, a.jurusan?.nama]
      .filter(Boolean)
      .some((x) => String(x).toLowerCase().includes(q));
  });

  const belumMasuk = alumni.filter((a) => !a.sudah_masuk).length;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Alumni ({alumni.length})
        </h2>
        {belumMasuk > 0 && (
          <span className="text-xs font-bold text-hatihati-700">
            {belumMasuk} belum pernah masuk
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {SARINGAN.map((s) => (
          <button
            key={s.nilai || 'semua'}
            type="button"
            onClick={() => setSaring(s.nilai)}
            className={`rounded-full px-4 py-2 text-sm font-black ${
              saring === s.nilai ? 'tombol-utama' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <input
        value={cari}
        onChange={(e) => setCari(e.target.value)}
        placeholder="Cari nama, email, kampus, atau jurusan"
        aria-label="Cari alumni"
        className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
      />

      {tampil.length === 0 ? (
        <Kosong
          judul={alumni.length === 0 ? 'Belum ada alumni' : 'Tidak ada yang cocok'}
          keterangan={
            alumni.length === 0
              ? 'Undang lewat formulir di atas. Mereka muncul di sini dengan status Diundang.'
              : 'Coba kata kunci lain atau ganti saringannya.'
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {tampil.map((a) => (
            <li key={a.id} className="kartu p-4 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black">
                    {a.nama ?? a.email_undangan.split('@')[0]}
                  </p>
                  <p className="truncate text-sm text-slate-600">
                    {[a.kampus?.singkatan, a.jurusan?.nama, a.angkatan]
                      .filter(Boolean)
                      .join(' \u00b7 ') || 'Kampus dan jurusan belum diisi'}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {a.email_undangan}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      a.status === 'AKTIF'
                        ? 'bg-berhasil-600 text-white'
                        : a.status === 'DIUNDANG'
                          ? 'bg-peringatan-400 text-slate-900'
                          : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {a.status === 'DIUNDANG' ? 'Diundang' : a.status === 'AKTIF' ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSunting(sunting === a.id ? null : a.id)}
                    className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-black text-slate-700"
                  >
                    {sunting === a.id ? 'Tutup' : 'Ubah'}
                  </button>
                </div>
              </div>

              {!a.sudah_masuk && a.status === 'DIUNDANG' && (
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Belum pernah masuk. Dia jadi alumni otomatis begitu masuk
                  dengan akun Google di email ini.
                </p>
              )}

              {sunting === a.id && (
                <SuntingAlumni
                  alumni={a}
                  kampus={kampus}
                  jurusan={jurusan}
                  selesai={() => {
                    setSunting(null);
                    selesai();
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function SuntingAlumni({
  alumni,
  kampus,
  jurusan,
  selesai,
}: {
  alumni: Alumni;
  kampus: Kampus[];
  jurusan: Jurusan[];
  selesai: () => void;
}) {
  const [univ, setUniv] = useState(String(alumni.kampus?.id ?? ''));
  const [major, setMajor] = useState(String(alumni.jurusan?.id ?? ''));
  const [angkatan, setAngkatan] = useState(String(alumni.angkatan ?? ''));
  const [kontak, setKontak] = useState(alumni.kontak ?? '');
  const [status, setStatus] = useState(alumni.status);
  const [sibuk, setSibuk] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);
  const [berhasil, setBerhasil] = useState(false);

  async function simpan() {
    setSibuk(true);
    setGagal(null);
    setBerhasil(false);
    try {
      await api.patch(`/representatives/admin/${alumni.id}`, {
        ...(univ ? { university_id: Number(univ) } : {}),
        ...(major ? { major_id: Number(major) } : {}),
        angkatan: angkatan ? Number(angkatan) : null,
        kontak: kontak.trim() || null,
        status,
      });
      setBerhasil(true);
      selesai();
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-slate-50 p-4">
      {gagal && <PesanError pesan={gagal} />}
      {berhasil && !gagal && (
        <p className="text-sm font-bold text-berhasil-700">Tersimpan.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <select
          value={univ}
          onChange={(e) => setUniv(e.target.value)}
          aria-label="Kampus"
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
        >
          <option value="">Pilih kampus</option>
          {kampus.map((k) => (
            <option key={k.id} value={k.id}>
              {k.singkatan} &middot; {k.nama}
            </option>
          ))}
        </select>

        <select
          value={major}
          onChange={(e) => setMajor(e.target.value)}
          aria-label="Jurusan"
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
        >
          <option value="">Pilih jurusan</option>
          {jurusan.map((j) => (
            <option key={j.id} value={j.id}>
              {j.nama}
            </option>
          ))}
        </select>

        <input
          type="number"
          min={1990}
          max={2100}
          value={angkatan}
          onChange={(e) => setAngkatan(e.target.value)}
          placeholder="Angkatan"
          aria-label="Angkatan"
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
        />

        <input
          value={kontak}
          maxLength={40}
          onChange={(e) => setKontak(e.target.value)}
          placeholder="Kontak"
          aria-label="Kontak"
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
        />
      </div>

      <div>
        <p className="text-sm font-black">Status kehadiran</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {(['DIUNDANG', 'AKTIF', 'NONAKTIF'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-full px-4 py-2 text-xs font-black ${
                status === s ? 'tombol-utama' : 'bg-white text-slate-700 ring-1 ring-slate-300'
              }`}
            >
              {s === 'DIUNDANG' ? 'Diundang' : s === 'AKTIF' ? 'Aktif' : 'Nonaktif'}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Email undangan tidak bisa diubah dari sini. Email itu kunci pencocokan
        saat alumni pertama kali masuk; menggantinya sesudah akunnya tersambung
        akan memutus hubungan itu tanpa pesan error apa pun.
      </p>

      <button
        type="button"
        disabled={sibuk}
        onClick={() => void simpan()}
        className="tombol-utama w-full px-6 py-3 text-sm disabled:opacity-50"
      >
        {sibuk ? 'Menyimpan...' : 'Simpan Perubahan'}
      </button>
    </div>
  );
}
