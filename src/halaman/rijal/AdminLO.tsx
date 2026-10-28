/* =============================================================================
   /admin/lo — tugaskan LO ke alumni.

   Penugasannya ke ORANGNYA, bukan ke boothnya, dan itu keputusan yang sudah
   diambil di rancangan database. Alumni yang sama menjaga booth kampus di satu
   acara dan booth jurusan di acara lain; kalau penugasan diikat ke booth, satu
   manusia harus dimasukkan dua kali dan LO-nya bisa berbeda di dua acara untuk
   orang yang sama.

   Tanpa penugasan di sini, halaman LO kosong: dashboard LO membaca daftar
   alumni dampingannya dari tabel ini.

   Yang bisa dipilih hanya akun berperan LO Pendidikan. Server juga menolak
   kalau yang dikirim bukan LO, jadi daftar yang disaring di sini cuma supaya
   layarnya tidak penuh nama yang akan ditolak.
============================================================================= */

import { useState } from 'react';
import { api, pesanDari } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';

interface Pengguna {
  id: string;
  nama: string;
  email: string;
  peran: string | null;
}

interface Alumni {
  id: number;
  users?: { nama: string } | null;
  universities?: { singkatan: string } | null;
  majors?: { nama: string } | null;
}

interface Penugasan {
  id: number;
  catatan: string | null;
  users?: { id: string; nama: string; email: string } | null;
  representatives?: {
    id: number;
    users?: { nama: string } | null;
    universities?: { singkatan: string } | null;
    majors?: { nama: string } | null;
  } | null;
}

interface Isi {
  lo: Pengguna[];
  alumni: Alumni[];
  penugasan: Penugasan[];
}

export default function AdminLO() {
  const { data, memuat, error, muatUlang } = useMuat<Isi>(async (signal) => {
    const [lo, alumni, penugasan] = await Promise.all([
      api.get<Pengguna[]>('/users/panitia?peran=LO_PENDIDIKAN', { signal }).catch(() => []),
      api.get<Alumni[]>('/representatives', { signal }).catch(() => []),
      api.get<Penugasan[]>('/lo/admin/assignments', { signal }).catch(() => []),
    ]);
    return { lo: lo ?? [], alumni: alumni ?? [], penugasan: penugasan ?? [] };
  }, []);

  const [loId, setLoId] = useState('');
  const [repId, setRepId] = useState('');
  const [catatan, setCatatan] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const lo = data?.lo ?? [];
  const alumni = data?.alumni ?? [];
  const siap = loId !== '' && repId !== '';

  async function tugaskan() {
    setSibuk(true);
    setGagal(null);
    try {
      await api.post('/lo/admin/assign', {
        lo_user_id: loId,
        representative_id: Number(repId),
        ...(catatan.trim() ? { catatan: catatan.trim() } : {}),
      });
      setRepId('');
      setCatatan('');
      muatUlang(false);
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <header className="text-center">
        <h1 className="judul-tebal text-[2rem]">Tugaskan LO</h1>
        <p className="mt-1 text-sm text-slate-500">
          {data?.penugasan.length ?? 0} penugasan tercatat.
        </p>
      </header>

      {lo.length === 0 && (
        <div className="kartu p-4 ring-2 ring-hatihati-600/40">
          <p className="font-black">Belum ada akun berperan LO Pendidikan</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Akun dibuat begitu orangnya masuk pertama kali dengan Google, lalu
            perannya diubah Super Admin. Selama belum ada, penugasan tidak bisa
            dibuat dan halaman LO akan kosong.
          </p>
        </div>
      )}

      {alumni.length === 0 && (
        <div className="kartu p-4 ring-2 ring-hatihati-600/40">
          <p className="font-black">Belum ada alumni aktif</p>
          <p className="mt-1 text-sm text-slate-600">
            Undang alumni dulu, dan tunggu mereka masuk sekali.
          </p>
        </div>
      )}

      {gagal && <PesanError pesan={gagal} />}

      <section className="kartu space-y-3 p-5 ring-1 ring-slate-200">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Penugasan Baru
        </h2>

        <select
          value={loId}
          onChange={(e) => setLoId(e.target.value)}
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
        >
          <option value="">Pilih LO</option>
          {lo.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nama} &middot; {u.email}
            </option>
          ))}
        </select>

        <select
          value={repId}
          onChange={(e) => setRepId(e.target.value)}
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
        >
          <option value="">Pilih alumni</option>
          {alumni.map((a) => (
            <option key={a.id} value={a.id}>
              {a.users?.nama ?? `Alumni ${a.id}`}
              {a.universities?.singkatan ? ` · ${a.universities.singkatan}` : ''}
              {a.majors?.nama ? ` · ${a.majors.nama}` : ''}
            </option>
          ))}
        </select>

        <input
          value={catatan}
          maxLength={300}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Catatan, misalnya dampingan Hari 2"
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
        />

        <button
          type="button"
          disabled={!siap || sibuk}
          onClick={() => void tugaskan()}
          className="tombol-utama w-full px-6 py-3.5 disabled:opacity-50"
        >
          {sibuk ? 'Menugaskan...' : 'Tugaskan'}
        </button>
      </section>

      <section>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Penugasan Sekarang
        </h2>
        {(data?.penugasan ?? []).length === 0 ? (
          <Kosong
            judul="Belum ada penugasan"
            keterangan="Selama kosong, dashboard LO tidak menampilkan alumni siapa pun."
          />
        ) : (
          <ul className="mt-2 space-y-2">
            {(data?.penugasan ?? []).map((t) => (
              <li key={t.id} className="kartu p-4 ring-1 ring-slate-200">
                <p className="font-black">{t.users?.nama ?? 'LO'}</p>
                <p className="text-sm text-slate-600">
                  mendampingi{' '}
                  <span className="font-bold">
                    {t.representatives?.users?.nama ?? 'alumni'}
                  </span>
                  {t.representatives?.universities?.singkatan
                    ? ` · ${t.representatives.universities.singkatan}`
                    : ''}
                </p>
                {t.catatan && (
                  <p className="mt-0.5 text-xs italic text-slate-500">{t.catatan}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
