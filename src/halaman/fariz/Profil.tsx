/* =============================================================================
   /profil — Profil Saya dan Edit Profil, dalam satu halaman.

   Endpoint GET dan PATCH /participants/saya sudah ada sejak lama, tapi TIDAK
   ADA satu halaman pun yang memanggilnya. Jadi peserta tidak punya cara
   melihat datanya sendiri, apalagi memperbaikinya kalau salah ketik waktu
   mendaftar.

   Dibaca dulu, baru boleh diubah. Tombol Ubah membuka formulirnya; sebelum
   ditekan yang tampil cuma datanya. Halaman yang langsung berupa formulir
   membuat orang tidak sengaja mengubah isian lalu menyimpannya, dan di sini
   jumlah penyuntingan dibatasi.

   BATAS PENYUNTINGAN ditulis besar sebelum tombol Simpan ditekan, bukan
   sesudahnya. Server membatasinya lewat setelan max_edit_profil, dan yang
   kehabisan jatah akan ditolak. Memberi tahu orang sesudah tombolnya ditekan
   sama saja dengan tidak memberi tahu.

   Yang TIDAK ada di sini, dan memang tidak boleh ada: peran, status
   pembayaran, kode registrasi, dan email. Semuanya ditentukan server, dan
   tidak satu pun endpoint menerimanya dari arah peserta. Email akun dipegang
   Google.
============================================================================= */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, pesanDari } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';
import { useSesi } from '../../lib/sesi';
import { BidangDinamis } from '../../komponen/BidangDinamis';
import type { FormField, Pendaftaran } from '../../types/api';
import type { NilaiBidang } from '../../komponen/BidangDinamis';

interface ProfilPeserta {
  id: string;
  asal_sekolah: string;
  kelas: string;
  target_jurusan: string | null;
  kampus_impian: string | null;
  izin_bagi_data: boolean;
  extra_fields: Record<string, unknown>;
  jumlah_edit_profil: number;
}

interface Isi {
  profil: ProfilPeserta | null;
  pendaftaran: Pendaftaran | null;
  bidang: FormField[];
  maksEdit: number;
}

export default function Profil() {
  const { pengguna } = useSesi();

  const { data, memuat, error, muatUlang } = useMuat<Isi>(async (signal) => {
    const [profil, pendaftaran, bidang, setelan] = await Promise.all([
      api.get<ProfilPeserta>('/participants/saya', { signal }).catch(() => null),
      api.get<Pendaftaran>('/registrations/saya', { signal }).catch(() => null),
      api.get<FormField[]>('/form_fields', { signal }).catch(() => []),
      api
        .get<Record<string, unknown>>('/settings/publik', { signal, tanpaLogin: true })
        .catch(() => ({}) as Record<string, unknown>),
    ]);
    return {
      profil,
      pendaftaran,
      bidang: bidang ?? [],
      maksEdit: Number(setelan?.max_edit_profil ?? 2) || 2,
    };
  }, []);

  const [ubah, setUbah] = useState(false);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const p = data?.profil;
  if (!p) {
    return (
      <div className="mx-auto max-w-xl space-y-4 pb-10">
        <h1 className="judul-tebal text-[2rem]">Profil Saya</h1>
        <Kosong
          judul="Kamu belum mengisi data peserta"
          keterangan={
            <>
              Isi dulu lewat halaman{' '}
              <Link to="/daftar" className="font-bold underline">
                pendaftaran
              </Link>
              .
            </>
          }
        />
      </div>
    );
  }

  const sisa = Math.max(0, data!.maksEdit - (p.jumlah_edit_profil ?? 0));

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-10">
      <header>
        <h1 className="judul-tebal text-[2rem]">Profil Saya</h1>
        <p className="mt-1 text-sm text-slate-500">
          Data yang kamu isi waktu mendaftar.
        </p>
      </header>

      {/* ------------------------------------------------------------------
          Identitas akun.

          Fotonya ikut ditampilkan, bukan cuma nama dan email. Sebelum ini
          kartu ini seluruhnya teks, dan halaman bernama "Profil Saya" tanpa
          satu pun wajah di dalamnya terbaca seperti halaman yang belum jadi.

          Fotonya datang dari akun Google dan memang belum bisa diganti dari
          sini: tidak ada tempat penyimpanan berkas di proyek ini, jadi tidak
          ada ke mana unggahan akan disimpan. Yang bisa dilakukan sekarang
          dijelaskan apa adanya, lengkap dengan tautan langsung ke tempat
          mengubahnya.
      ------------------------------------------------------------------ */}
      <section className="kartu p-5 ring-1 ring-slate-200">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Akun
        </h2>

        <div className="mt-3 flex items-center gap-4">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 ring-4 ring-white shadow-[0_6px_18px_-8px_rgba(15,42,70,0.6)]">
            {pengguna?.foto_url ? (
              <img
                src={pengguna.foto_url}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              <span aria-hidden className="text-xl font-black text-slate-500">
                {inisialNama(pengguna?.nama)}
              </span>
            )}
          </span>

          <div className="min-w-0">
            <p className="truncate text-lg font-black">{pengguna?.nama ?? '-'}</p>
            <p className="truncate text-sm text-slate-600">
              {pengguna?.email ?? ''}
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Foto, nama, dan email datang dari akun Google-mu. Untuk menggantinya,
          ubah di{' '}
          <a
            href="https://myaccount.google.com/personal-info"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-merek-magenta underline"
          >
            akun Google
          </a>{' '}
          lalu keluar dan masuk lagi di sini.
        </p>
      </section>

      {/* Status. Hanya dibaca. */}
      <section className="kartu p-5 ring-1 ring-slate-200">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Status Pendaftaran
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <LencanaStatus status={data?.pendaftaran?.status} />
          {data?.pendaftaran?.kode_registrasi && (
            <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-sm font-black">
              {data.pendaftaran.kode_registrasi}
            </span>
          )}
        </div>
        {data?.pendaftaran?.status !== 'LUNAS' && (
          <Link
            to="/bayar"
            className="tombol-utama mt-4 inline-block px-6 py-2.5 text-sm"
          >
            Buka Halaman Pembayaran
          </Link>
        )}
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Status pembayaran hanya bisa diubah panitia. Kamu tidak bisa
          mengubahnya dari sini, dan memang tidak seharusnya bisa.
        </p>
      </section>

      {/* Data peserta. */}
      <section className="kartu p-5 ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Data Peserta
          </h2>
          {!ubah && (
            <button
              type="button"
              disabled={sisa === 0}
              onClick={() => setUbah(true)}
              className="shrink-0 rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-50"
            >
              {sisa === 0 ? 'Jatah ubah habis' : 'Ubah'}
            </button>
          )}
        </div>

        {ubah ? (
          <FormUbah
            profil={p}
            bidang={data!.bidang}
            sisa={sisa}
            batal={() => setUbah(false)}
            selesai={() => {
              setUbah(false);
              muatUlang(false);
            }}
          />
        ) : (
          <>
            <dl className="mt-3 space-y-2.5">
              <Baris label="Asal sekolah" nilai={p.asal_sekolah} />
              <Baris label="Kelas" nilai={p.kelas} />
              <Baris label="Jurusan yang diminati" nilai={p.target_jurusan} />
              <Baris label="Kampus impian" nilai={p.kampus_impian} />
              <Baris
                label="Izin data dibagikan ke alumni"
                nilai={p.izin_bagi_data ? 'Ya' : 'Tidak'}
              />
              {data!.bidang.map((b) => (
                <Baris
                  key={b.kunci}
                  label={b.label}
                  nilai={tampilkan(p.extra_fields?.[b.kunci])}
                />
              ))}
            </dl>

            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              {sisa > 0
                ? `Kamu masih bisa mengubah data ini ${sisa} kali lagi.`
                : 'Jatah mengubah data sudah habis. Hubungi panitia kalau ada yang salah.'}
            </p>
          </>
        )}
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function FormUbah({
  profil,
  bidang,
  sisa,
  batal,
  selesai,
}: {
  profil: ProfilPeserta;
  bidang: FormField[];
  sisa: number;
  batal: () => void;
  selesai: () => void;
}) {
  const [sekolah, setSekolah] = useState(profil.asal_sekolah ?? '');
  const [kelas, setKelas] = useState(profil.kelas ?? '');
  const [jurusan, setJurusan] = useState(profil.target_jurusan ?? '');
  const [kampus, setKampus] = useState(profil.kampus_impian ?? '');
  const [izin, setIzin] = useState(Boolean(profil.izin_bagi_data));
  const [extra, setExtra] = useState<Record<string, unknown>>(
    profil.extra_fields ?? {},
  );

  const [sibuk, setSibuk] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);
  const [salah, setSalah] = useState<Record<string, string>>({});

  function validasi(): boolean {
    const s: Record<string, string> = {};
    if (sekolah.trim().length < 2) s['sekolah'] = 'Asal sekolah minimal 2 huruf.';
    if (kelas.trim().length < 1) s['kelas'] = 'Kelas tidak boleh kosong.';
    for (const b of bidang) {
      if (!b.wajib) continue;
      const v = extra[b.kunci];
      const kosong =
        v === undefined || v === null || v === '' ||
        (Array.isArray(v) && v.length === 0);
      if (kosong) s[b.kunci] = `${b.label} wajib diisi.`;
    }
    setSalah(s);
    return Object.keys(s).length === 0;
  }

  async function simpan() {
    if (!validasi()) return;
    setSibuk(true);
    setGagal(null);
    try {
      await api.patch('/participants/saya', {
        asal_sekolah: sekolah.trim(),
        kelas: kelas.trim(),
        target_jurusan: jurusan.trim() || undefined,
        kampus_impian: kampus.trim() || undefined,
        izin_bagi_data: izin,
        ...(bidang.length > 0 ? { extra_fields: extra } : {}),
      });
      selesai();
    } catch (e) {
      // Pesan dari server apa adanya: dia yang tahu alasannya, misalnya jatah
      // habis atau ada kolom yang dikunci panitia.
      setGagal(pesanDari(e));
    } finally {
      setSibuk(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="rounded-xl bg-hatihati-50 p-3 text-xs font-bold leading-relaxed text-hatihati-700">
        Menyimpan sekali memakai satu jatah. Sesudah ini sisa {Math.max(0, sisa - 1)}{' '}
        kali lagi, jadi periksa dulu sebelum menekan Simpan.
      </p>

      {gagal && <PesanError pesan={gagal} />}

      <Isian
        id="sekolah"
        label="Asal sekolah"
        nilai={sekolah}
        ubah={setSekolah}
        error={salah['sekolah']}
      />
      <Isian
        id="kelas"
        label="Kelas"
        nilai={kelas}
        ubah={setKelas}
        error={salah['kelas']}
      />
      <Isian
        id="jurusan"
        label="Jurusan yang diminati"
        nilai={jurusan}
        ubah={setJurusan}
        opsional
      />
      <Isian
        id="kampus"
        label="Kampus impian"
        nilai={kampus}
        ubah={setKampus}
        opsional
      />

      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3">
        <input
          type="checkbox"
          checked={izin}
          onChange={(e) => setIzin(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300"
        />
        <span className="text-sm leading-snug">
          <span className="font-bold">Izinkan alumni melihat datamu</span>
          <span className="block text-xs text-slate-500">
            Kalau dimatikan, namamu tidak muncul di daftar pengunjung booth yang
            dibuka alumni. Nomor teleponmu tidak pernah ditampilkan ke siapa
            pun.
          </span>
        </span>
      </label>

      {bidang.map((b) => (
        <BidangDinamis
          key={b.kunci}
          bidang={b}
          nilai={extra[b.kunci] as NilaiBidang}
          onUbah={(v) => setExtra({ ...extra, [b.kunci]: v })}
          error={salah[b.kunci]}
        />
      ))}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={sibuk}
          onClick={() => void simpan()}
          className="tombol-utama flex-1 px-6 py-3.5 disabled:opacity-50"
        >
          {sibuk ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
        <button
          type="button"
          disabled={sibuk}
          onClick={batal}
          className="flex-1 rounded-full bg-white px-6 py-3.5 font-bold ring-1 ring-slate-300"
        >
          Batal
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Isian({
  id,
  label,
  nilai,
  ubah,
  error,
  opsional,
}: {
  id: string;
  label: string;
  nilai: string;
  ubah: (v: string) => void;
  error?: string;
  opsional?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-black">
        {label}
        {opsional && (
          <span className="ml-1 font-normal text-slate-400">(opsional)</span>
        )}
      </label>
      <input
        id={id}
        value={nilai}
        onChange={(e) => ubah(e.target.value)}
        aria-invalid={Boolean(error)}
        className="isian mt-1 outline-none focus:ring-2 focus:ring-merek-magenta/40"
      />
      {error && <p className="mt-1 text-xs font-bold text-bahaya-600">{error}</p>}
    </div>
  );
}

function Baris({ label, nilai }: { label: string; nilai: unknown }) {
  const kosong = nilai === null || nilai === undefined || nilai === '';
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className={`text-sm font-bold ${kosong ? 'text-slate-300' : ''}`}>
        {kosong ? 'belum diisi' : String(nilai)}
      </dd>
    </div>
  );
}

function tampilkan(v: unknown): unknown {
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak';
  return v;
}

function LencanaStatus({ status }: { status?: string }) {
  const peta: Record<string, { teks: string; kelas: string }> = {
    LUNAS: { teks: 'Lunas', kelas: 'bg-berhasil-600 text-white' },
    MENUNGGU_PEMBAYARAN: {
      teks: 'Menunggu pembayaran',
      kelas: 'bg-peringatan-400 text-slate-900',
    },
    PROFIL_BELUM_LENGKAP: {
      teks: 'Profil belum lengkap',
      kelas: 'bg-hatihati-600 text-white',
    },
    DIBATALKAN: { teks: 'Dibatalkan', kelas: 'bg-bahaya-600 text-white' },
  };
  const t = peta[status ?? ''] ?? { teks: 'Belum mendaftar', kelas: 'bg-slate-200 text-slate-700' };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${t.kelas}`}>
      {t.teks}
    </span>
  );
}

/** Dua huruf untuk foto yang belum ada, sama seperti di bar atas. */
function inisialNama(nama: string | undefined): string {
  const bagian = (nama ?? '').trim().split(/\s+/).filter(Boolean);
  if (bagian.length === 0) return '';
  if (bagian.length === 1) return (bagian[0] ?? '').slice(0, 2).toUpperCase();
  return ((bagian[0]?.[0] ?? '') + (bagian[1]?.[0] ?? '')).toUpperCase();
}
