/* =============================================================================
   /bayar — empat keadaan.

   Pembayaran tidak ditangani web. Peserta dikirim ke form di luar, dan panitia
   mencocokkannya secara manual. Tidak ada QRIS di sini, tidak ada unggah bukti,
   tidak ada layar bukti ditolak. Semua itu dicoret setelah rapat.

   Karena uangnya dibayar di luar, KODE REGISTRASI adalah satu-satunya benang
   yang menghubungkan pembayaran dengan orangnya. Kalau peserta salah menyalin
   kodenya ke form, uangnya masuk tanpa nama dan Administrasi harus mencarinya
   satu per satu. Itu sebabnya kode itu yang paling besar di layar ini, bukan
   harganya: harga juga muncul lagi di form pembayaran, kode tidak.

   Empat keadaan:
     1. profil belum lengkap  -> daftar isian yang kurang, TIDAK ada link bayar
     2. profil lengkap        -> kode, petunjuk, tombol, batas akhir
     3. form belum disiapkan  -> tombol tampil tapi mati, dengan penjelasan
     4. sesudah tombol ditekan-> pesan menunggu diperiksa panitia
============================================================================= */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError } from '../../komponen/Keadaan';
import type { CaraBayar } from '../../types/api';

export default function Bayar() {
  const { data, memuat, error, muatUlang } = useMuat<CaraBayar>(
    (signal) => api.get<CaraBayar>('/payments/cara-bayar', { signal }),
    [],
  );

  const [tersalin, setTersalin] = useState(false);
  const [sudahBuka, setSudahBuka] = useState(false);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;
  if (!data) return null;

  // --- Keadaan 1: profil belum lengkap -------------------------------------
  if (!data.profil_lengkap) {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <div className="rounded-3xl border border-hatihati-600 bg-hatihati-50 p-6 dark:bg-hatihati-700/10">
          <h1 className="text-xl font-bold">Lengkapi dulu datamu</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Panitia Administrasi minta datanya lengkap sebelum pembayaran
            dibuka, supaya tidak ada yang sudah bayar tapi datanya setengah.
          </p>

          {(data.field_belum_diisi?.length ?? 0) > 0 && (
            <ul className="mt-4 space-y-1 text-sm font-semibold text-hatihati-700">
              {data.field_belum_diisi!.map((f) => (
                <li key={f}>· {f.replace(/_/g, ' ')}</li>
              ))}
            </ul>
          )}

          <Link
            to="/daftar"
            className="mt-5 flex items-center justify-center rounded-2xl bg-utama-600 px-6 py-3 font-bold text-white"
          >
            Lengkapi Sekarang
          </Link>
        </div>
      </div>
    );
  }

  // --- Keadaan 2, 3, 4 ------------------------------------------------------
  async function salin() {
    try {
      await navigator.clipboard.writeText(data!.kode_registrasi);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2500);
    } catch {
      // Clipboard bisa ditolak browser. Kodenya tetap terbaca di layar, jadi
      // peserta masih bisa menyalinnya sendiri; jangan tampilkan error menakutkan.
      setTersalin(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5 pb-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-bold">Pembayaran</h1>

        {/* Kode registrasi: elemen paling besar di layar ini, dengan sengaja. */}
        <div className="mt-5 rounded-2xl border-2 border-dashed border-utama-600 bg-utama-50 p-5 dark:bg-utama-900/20">
          <p className="text-[11px] font-bold uppercase tracking-widest text-utama-700 dark:text-utama-100">
            Kode Registrasi Kamu
          </p>
          <p className="mt-1 break-all text-3xl font-black tracking-wider text-utama-900 dark:text-white">
            {data.kode_registrasi}
          </p>
          <button
            type="button"
            onClick={() => void salin()}
            className="mt-3 rounded-xl border border-utama-600 bg-white px-5 text-sm font-bold text-utama-700 dark:bg-slate-800 dark:text-utama-100"
          >
            {tersalin ? 'Tersalin' : 'Salin Kode'}
          </button>
          <p className="mt-3 text-xs font-bold leading-tight text-bahaya-600">
            WAJIB kamu tulis di form pembayaran. Kalau tidak, pembayaranmu tidak
            bisa dicocokkan dengan namamu.
          </p>
        </div>

        {data.harga_tampil && (
          <p className="mt-5 text-sm text-slate-500">
            Biaya pendaftaran{' '}
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {data.harga_tampil}
            </span>
          </p>
        )}

        {/* Petunjuk ditulis Divisi Administrasi, panjangnya tidak bisa ditebak. */}
        {data.petunjuk && (
          <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-left text-sm leading-relaxed text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {data.petunjuk}
          </div>
        )}

        {/* Keadaan 3: Administrasi belum mengisi alamat formnya. Tombolnya tetap
            tampil supaya peserta tahu langkah ini ada, tapi mati. */}
        {!data.form_tersedia || !data.link_bayar ? (
          <div className="mt-5">
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-2xl bg-slate-200 px-6 font-bold text-slate-500 dark:bg-slate-800"
            >
              Form Pembayaran Belum Dibuka
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Panitia belum menyiapkan form pembayarannya. Simpan kodemu dulu,
              cek lagi nanti.
            </p>
          </div>
        ) : (
          <a
            href={data.link_bayar}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setSudahBuka(true)}
            className="mt-5 flex items-center justify-center rounded-2xl bg-utama-600 px-6 py-3.5 font-bold text-white shadow-sm transition hover:bg-utama-700"
          >
            Buka Form Pembayaran
          </a>
        )}

        {data.batas_akhir && (
          <p className="mt-3 text-xs text-slate-500">
            Batas akhir pembayaran {data.batas_akhir}
          </p>
        )}
      </div>

      {/* Keadaan 4 */}
      {sudahBuka && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-bold">Sudah selesai membayar?</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Panitia memeriksa dan menandainya dalam 1x24 jam. Kamu bisa menutup
            halaman ini dan mengeceknya lagi nanti, atau lewat halaman{' '}
            <Link to="/cek-status" className="font-semibold underline">
              Cek Status
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
