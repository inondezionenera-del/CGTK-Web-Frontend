/* =============================================================================
   /quiz — kuis minat dan bakat.

   Jawaban sementara disimpan di localStorage. Dua puluh soal itu lumayan, dan
   peserta mengerjakannya di HP sambil berjalan; satu telepon masuk atau satu
   tab yang tertutup tidak boleh berarti mengulang dari nol.

   Batas percobaan dibaca dari pengaturan, bukan angka 3 di program, supaya
   Divisi Acara bisa menggantinya sendiri.

   Halaman hasilnya menampilkan bagian yang terkunci sebagai kartu bergembok,
   bukan menyembunyikannya: itu yang mendorong peserta mendatangi booth yang
   direkomendasikan.
============================================================================= */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, pesanDari } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';
import { useSesi } from '../../lib/sesi';

interface Opsi {
  id: number;
  teks: string;
}

interface Soal {
  id: number;
  teks: string;
  urutan: number | null;
  options: Opsi[];
}

interface Hasil {
  attempt_id: number;
  hasil_rumpun: string;
  skor: Record<string, number>;
  hasil_jurusan: { id: number; nama: string }[];
  hasil_kampus: { id: number; nama: string; singkatan: string }[];
  xp_didapat?: number;
}

const KUNCI_SIMPAN = 'cgtk-kuis-jawaban';

export default function Kuis() {
  const { pengguna } = useSesi();

  const { data: soal, memuat, error, muatUlang } = useMuat<Soal[]>(
    (signal) => api.get<Soal[]>('/quiz/soal', { signal }),
    [],
  );

  const [jawaban, setJawaban] = useState<Record<number, number>>({});
  const [nomor, setNomor] = useState(0);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  // Pulihkan jawaban yang belum terkirim.
  useEffect(() => {
    try {
      const simpan = localStorage.getItem(KUNCI_SIMPAN);
      if (simpan) setJawaban(JSON.parse(simpan));
    } catch {
      // localStorage bisa ditolak di mode penyamaran. Bukan alasan berhenti;
      // kuisnya tetap jalan, cuma tidak bisa dipulihkan.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KUNCI_SIMPAN, JSON.stringify(jawaban));
    } catch {
      /* lihat di atas */
    }
  }, [jawaban]);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const daftar = soal ?? [];
  if (daftar.length === 0) {
    return (
      <Kosong
        judul="Soal kuis belum ada"
        keterangan="Panitia belum memasukkan pertanyaannya."
      />
    );
  }

  if (hasil) return <HalamanHasil hasil={hasil} />;

  const sekarang = daftar[nomor];
  const terjawab = Object.keys(jawaban).length;
  const semuaTerjawab = terjawab >= daftar.length;

  async function mulaiDanKirim() {
    setSibuk(true);
    setGagal(null);
    try {
      let id = attemptId;
      if (id === null) {
        const a = await api.post<{ id: number }>('/quiz/mulai', {
          participant_id: pengguna?.id,
        });
        id = a.id;
        setAttemptId(id);
      }

      const r = await api.post<Hasil>('/quiz/selesai', {
        attempt_id: id,
        answers: Object.entries(jawaban).map(([q, o]) => ({
          question_id: Number(q),
          option_id: o,
        })),
      });
      setHasil(r);
      try {
        localStorage.removeItem(KUNCI_SIMPAN);
      } catch {
        /* abaikan */
      }
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-10">
      <header>
        <h1 className="text-xl font-bold">Kuis Minat & Bakat</h1>
        <p className="mt-1 text-sm text-slate-500">
          Soal {nomor + 1} dari {daftar.length}
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-utama-600 transition-all"
            style={{ width: `${((nomor + 1) / daftar.length) * 100}%` }}
          />
        </div>
      </header>

      {sekarang && (
        <section className="kartu border border-slate-200 p-5 dark:border-slate-800">
          <p className="font-bold">{sekarang.teks}</p>
          <ul className="mt-4 space-y-2">
            {sekarang.options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => {
                    setJawaban({ ...jawaban, [sekarang.id]: o.id });
                    if (nomor < daftar.length - 1) setNomor(nomor + 1);
                  }}
                  className={`w-full rounded-xl border p-3 text-left text-sm ${
                    jawaban[sekarang.id] === o.id
                      ? 'border-utama-600 bg-utama-50 font-bold dark:bg-utama-900/30'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {o.teks}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={nomor === 0}
          onClick={() => setNomor(nomor - 1)}
          className="flex-1 rounded-xl border border-slate-300 px-4 font-bold disabled:opacity-40 dark:border-slate-700"
        >
          Sebelumnya
        </button>
        <button
          type="button"
          disabled={nomor >= daftar.length - 1}
          onClick={() => setNomor(nomor + 1)}
          className="flex-1 rounded-xl border border-slate-300 px-4 font-bold disabled:opacity-40 dark:border-slate-700"
        >
          Berikutnya
        </button>
      </div>

      {gagal && <PesanError pesan={gagal} />}

      <button
        type="button"
        disabled={!semuaTerjawab || sibuk}
        onClick={() => void mulaiDanKirim()}
        className="tombol-utama w-full px-6 disabled:opacity-50"
      >
        {sibuk
          ? 'Menghitung...'
          : semuaTerjawab
            ? 'Lihat Hasil'
            : `Masih ${daftar.length - terjawab} soal lagi`}
      </button>
    </div>
  );
}

function HalamanHasil({ hasil }: { hasil: Hasil }) {
  const maks = Math.max(...Object.values(hasil.skor ?? {}), 1);

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-10">
      <header className="kartu border-2 border-utama-600 p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Rumpun kamu
        </p>
        <h1 className="mt-1 text-2xl font-black text-utama-700 dark:text-utama-100">
          {hasil.hasil_rumpun}
        </h1>
        {hasil.xp_didapat ? (
          <p className="mt-2 text-sm font-semibold text-berhasil-700">
            +{hasil.xp_didapat} XP
          </p>
        ) : null}
      </header>

      <section className="kartu border border-slate-200 p-5 dark:border-slate-800">
        <h2 className="text-sm font-bold">Skor per rumpun</h2>
        <ul className="mt-3 space-y-2">
          {Object.entries(hasil.skor ?? {})
            .sort((a, b) => b[1] - a[1])
            .map(([nama, nilai]) => (
              <li key={nama}>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold">{nama}</span>
                  <span className="tabular-nums text-slate-500">{nilai}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-utama-600"
                    style={{ width: `${(nilai / maks) * 100}%` }}
                  />
                </div>
              </li>
            ))}
        </ul>
      </section>

      {hasil.hasil_jurusan?.length > 0 && (
        <section className="kartu border border-slate-200 p-5 dark:border-slate-800">
          <h2 className="text-sm font-bold">Jurusan yang cocok</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {hasil.hasil_jurusan.map((j) => (
              <li key={j.id}>{j.nama}</li>
            ))}
          </ul>
        </section>
      )}

      {hasil.hasil_kampus?.length > 0 && (
        <section className="kartu border border-slate-200 p-5 dark:border-slate-800">
          <h2 className="text-sm font-bold">Kampus yang cocok</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Hanya kampus yang benar-benar membuka booth di CGTK.
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {hasil.hasil_kampus.map((k) => (
              <li key={k.id}>
                {k.singkatan} &middot; {k.nama}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-2xl" aria-hidden>
          &#128274;
        </p>
        <p className="mt-1 text-sm font-bold">Analisis lengkap terkunci</p>
        <p className="mt-1 text-xs text-slate-500">
          Kunjungi booth yang direkomendasikan untuk membukanya.
        </p>
        <Link
          to="/missions"
          className="tombol-utama mt-4 inline-block px-5 py-2.5 text-sm"
        >
          Lihat Misiku
        </Link>
      </section>
    </div>
  );
}
