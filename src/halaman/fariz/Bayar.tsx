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
      <div className="mx-auto max-w-md px-4 py-8">
        {/* Gambar kartu identitas abu-abu, seperti di mockup. Digambar sebagai
            SVG, bukan dipotong dari PNG: bentuknya cuma persegi dan lingkaran,
            dan sebagai SVG dia tetap tajam di layar sepadat apa pun. */}
        <svg
          viewBox="0 0 320 180"
          className="w-full text-slate-300"
          role="img"
          aria-label="Kartu identitas belum lengkap"
        >
          <rect width="320" height="180" rx="26" fill="currentColor" />
          <rect x="42" y="26" width="236" height="128" rx="10" fill="white" />
          <rect x="60" y="44" width="200" height="92" fill="currentColor" />
          <circle cx="104" cy="76" r="20" fill="white" />
          <path d="M78 128a26 26 0 0 1 52 0z" fill="white" />
          <rect x="150" y="60" width="78" height="20" rx="4" fill="white" />
          <rect x="150" y="96" width="60" height="20" rx="4" fill="white" />
        </svg>

        {/* Daftar yang kurang ditulis merah dengan bintang, persis seperti di
            mockup. Nama kolomnya datang dari server, jadi kalau Administrasi
            menambah pertanyaan baru, yang kurang ikut muncul sendiri. */}
        <div className="mt-6">
          {(data.field_belum_diisi?.length ?? 0) > 0 ? (
            <ul className="space-y-0.5">
              {data.field_belum_diisi!.map((f) => (
                <li key={f} className="text-lg font-extrabold text-bahaya-600">
                  *{f.replace(/_/g, ' ')} belum diisi
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-lg font-extrabold text-bahaya-600">
              *Datamu belum lengkap
            </p>
          )}
        </div>

        <p className="mt-3 text-sm text-slate-600">
          Panitia Administrasi minta datanya lengkap sebelum pembayaran dibuka,
          supaya tidak ada yang sudah bayar tapi datanya setengah.
        </p>

        <Link
          to="/daftar"
          className="mt-6 flex min-h-16 items-center justify-center rounded-full bg-white text-xl font-black text-slate-900 shadow-[0_6px_0_-1px_rgba(0,0,0,0.25)] ring-1 ring-slate-200"
        >
          Lengkapi Profil &gt;
        </Link>
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
    /* Kartunya ditengahkan tegak, bukan ditempel di atas.

       Di layar 1440 kartu setinggi 400px yang dipaku di tepi atas membuat
       dua pertiga layar jadi air kosong, dan halaman ini jadi terlihat
       seperti belum selesai dikerjakan. */
    <div className="latar-air -mt-16 flex min-h-dvh items-center justify-center px-4 pb-14 pt-24">
      <div className="kartu masuk-naik mx-auto w-full max-w-md px-6 pb-10 pt-8 text-center sm:px-8">
        <h1 className="judul-tebal text-2xl">Bayar Disini</h1>

        {/* Harga ditulis paling besar sesudah judul, seperti di mockup.
            Nilainya dari pengaturan server, bukan ditulis di program, supaya
            Administrasi bisa mengubahnya sendiri. */}
        {data.harga_tampil && (
          <p className="judul-tebal mt-2 text-[2.6rem] leading-none text-slate-900">
            {data.harga_tampil}
          </p>
        )}

        {/* Kode registrasi. Ini yang paling sering lupa ditulis peserta di form
            pembayaran, dan tanpa kode itu uang yang masuk tidak bisa
            dicocokkan dengan namanya. Karena itu tombol salin ditaruh menempel
            di sebelahnya, bukan di bawah. */}
        <p className="mt-7 text-left text-sm font-extrabold">Kode Pendaftaran</p>
        <div className="mt-2 flex items-stretch gap-2">
          <p className="flex min-h-14 flex-1 items-center justify-center rounded-full bg-slate-200 px-4 text-xl font-black tracking-wider text-slate-900 break-all">
            {data.kode_registrasi}
          </p>
          <button
            type="button"
            onClick={() => void salin()}
            aria-label="Salin kode pendaftaran"
            className="flex min-h-14 w-16 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-extrabold text-slate-700"
          >
            {tersalin ? 'OK' : 'Salin'}
          </button>
        </div>

        <p className="mt-2 text-left text-xs font-bold leading-tight text-bahaya-600">
          WAJIB kamu tulis di form pembayaran. Kalau tidak, pembayaranmu tidak
          bisa dicocokkan dengan namamu.
        </p>

        {/* Petunjuk ditulis Divisi Administrasi, panjangnya tidak bisa ditebak. */}
        {data.petunjuk && (
          <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-100 p-4 text-left text-sm leading-relaxed text-slate-700">
            {data.petunjuk}
          </div>
        )}

        {/* Keadaan 3: Administrasi belum mengisi alamat formnya. Tombolnya tetap
            tampil supaya peserta tahu langkah ini ada, tapi mati. */}
        {!data.form_tersedia || !data.link_bayar ? (
          <div className="mt-6">
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-full bg-slate-200 px-6 py-3.5 font-bold text-slate-500"
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
            className="tombol-utama mt-6 flex items-center justify-center px-6 py-3.5"
          >
            Buka Form Pembayaran
          </a>
        )}

        {data.batas_akhir && (
          <p className="mt-4 text-sm font-extrabold leading-tight text-bahaya-600">
            *Batas Akhir Pembayaran
            <br />
            {data.batas_akhir}
          </p>
        )}

        {/* Keadaan 4 */}
        {sudahBuka && (
          <div className="mt-6 rounded-2xl bg-slate-100 p-4 text-left">
            <p className="text-sm font-bold">Sudah selesai membayar?</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Panitia memeriksa dan menandainya dalam 1x24 jam. Kamu bisa
              menutup halaman ini dan mengeceknya lagi nanti, atau lewat
              halaman{' '}
              <Link to="/cek-status" className="font-semibold underline">
                Cek Status
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
