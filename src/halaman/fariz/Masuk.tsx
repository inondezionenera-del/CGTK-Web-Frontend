/* =============================================================================
   /masuk dan /daftar — satu pintu, Google.

   TIDAK ADA kolom email dan kata sandi di sini, dan itu bukan soal selera.
   Sesi login dipegang Supabase dan backend memverifikasi token yang Supabase
   terbitkan. Tidak ada tabel kata sandi dan tidak ada endpoint yang
   menerimanya, jadi kolom semacam itu tidak bisa menuju ke mana pun. Kalaupun
   suatu hari disambungkan, artinya kita menyimpan kata sandi lima ratus anak
   SMA, dan itu tanggung jawab yang tidak perlu diambil siapa pun di tim ini.

   Dua halaman, satu komponen. Bedanya cuma kata-katanya:

     /masuk   untuk yang sudah pernah masuk
     /daftar  untuk yang belum punya akun

   Keduanya memakai tombol Google yang sama, dan memang harus begitu: akun
   dibuat otomatis oleh server saat pertama kali seseorang masuk. Memisahkan
   keduanya jadi dua mekanisme berbeda cuma akan membuat orang yang salah pilih
   halaman mengira dirinya ditolak.

   Yang membuat halaman ini perlu ditulis ulang: dulu kegagalan menyiapkan
   profil terlihat persis sama dengan belum masuk. Orang menyelesaikan login
   Google, kembali ke sini, dan halamannya diam saja seolah tidak terjadi
   apa-apa. Sekarang keadaan itu punya layarnya sendiri, lengkap dengan alasan
   dari server dan dua jalan keluar.
============================================================================= */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { masukDenganGoogle, keluar } from '../../lib/supabase';
import { useSesi } from '../../lib/sesi';
import { lupakanIzin } from '../../lib/izin';
import { Memuat } from '../../komponen/Keadaan';

export default function Masuk({ mode = 'masuk' }: { mode?: 'masuk' | 'daftar' }) {
  const { pengguna, memuat, galat, sesiAdaTapiProfilGagal } = useSesi();
  const navigate = useNavigate();
  const [jalan, setJalan] = useState(false);
  const [gagalBuka, setGagalBuka] = useState<string | null>(null);

  // Tujuan sesudah login ditentukan server lewat `arahkan_ke`, bukan ditebak
  // di sini. Ada delapan cabang tujuan, dan kalau logikanya ditulis di dua
  // tempat, dua tempat itu pasti berbeda pada suatu hari.
  useEffect(() => {
    if (pengguna) navigate(pengguna.arahkan_ke || '/dashboard', { replace: true });
  }, [pengguna, navigate]);

  if (memuat) return <Memuat pesan="Memeriksa sesi..." />;

  async function mulai() {
    setGagalBuka(null);
    setJalan(true);
    try {
      // Kembali ke halaman yang sama. Supabase menaruh sesinya di alamat ini,
      // lalu efek di atas yang memindahkan orangnya sesuai perannya.
      const { error } = await masukDenganGoogle(
        `${window.location.origin}${mode === 'daftar' ? '/daftar' : '/masuk'}`,
      );
      if (error) throw error;
      // Berhasil berarti browser berpindah ke Google; tidak ada yang perlu
      // dikerjakan sesudah ini.
    } catch (e) {
      setGagalBuka((e as Error).message || 'Gagal membuka halaman Google.');
      setJalan(false);
    }
  }

  const daftar = mode === 'daftar';

  return (
    <div className="latar-air relative min-h-[calc(100dvh-4rem)] px-5 pb-16 pt-14">
      <img
        src="/logo-cgtk.png"
        alt="CGTK"
        className="relative z-10 mx-auto w-44 max-w-[52%]"
      />

      <div className="kartu relative mx-auto -mt-8 max-w-md px-7 pb-10 pt-12 text-center">
        {sesiAdaTapiProfilGagal ? (
          /* ----------------------------------------------------------------
             Google menerima dia, server tidak bisa menyiapkan profilnya.
             Ini keadaan tersendiri, bukan "belum masuk".
          ---------------------------------------------------------------- */
          <>
            <p className="text-4xl" aria-hidden>
              &#9888;
            </p>
            <h1 className="judul-tebal mt-2 text-[1.75rem]">Akunmu belum siap</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Google sudah mengenalimu, tapi datamu di CGTK belum bisa
              disiapkan.
            </p>
            {galat && (
              <p className="mt-3 rounded-xl bg-bahaya-50 p-3 text-sm font-bold text-bahaya-700">
                {galat}
              </p>
            )}

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="tombol-utama mt-6 w-full px-5 py-3.5 text-[15px]"
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={() => {
                lupakanIzin();
                void keluar().then(() => window.location.assign('/masuk'));
              }}
              className="mt-3 w-full rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-700"
            >
              Keluar dan masuk ulang
            </button>

            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              Kalau masih sama, tunjukkan pesan di atas ke panitia Divisi PDD.
            </p>
          </>
        ) : (
          <>
            <h1 className="judul-tebal text-[1.75rem] text-slate-900">
              {daftar ? 'Buat' : 'Account'}
            </h1>
            <p className="judul-tebal -mt-1 text-[2.6rem] text-slate-900">
              {daftar ? 'Akun' : 'Login'}
            </p>

            <button
              type="button"
              onClick={() => void mulai()}
              disabled={jalan}
              className="tombol-utama mt-9 flex w-full items-center justify-center gap-3 px-5 py-3.5 text-[15px] disabled:opacity-60"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.85z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85C6.71 7.31 9.14 5.38 12 5.38z" />
                </svg>
              </span>
              {jalan
                ? 'Membuka Google...'
                : daftar
                  ? 'Daftar dengan Google'
                  : 'Masuk dengan Google'}
            </button>

            {jalan && (
              <p className="mt-3 text-sm text-slate-500" role="status">
                Kamu akan dibawa ke halaman Google. Jangan tutup tab ini.
              </p>
            )}

            {(gagalBuka || galat) && (
              <p className="mt-4 rounded-xl bg-bahaya-50 p-3 text-sm font-bold text-bahaya-700">
                {gagalBuka ?? galat}
              </p>
            )}

            <p className="mt-6 text-sm leading-relaxed text-slate-500">
              {daftar
                ? 'Belum punya akun CGTK? Tekan tombol di atas. Akunmu dibuat otomatis begitu Google selesai, lalu kamu langsung diminta mengisi data peserta.'
                : 'Sudah pernah masuk sebelumnya? Pakai akun Google yang sama seperti waktu mendaftar.'}
            </p>

            <p className="mt-4 text-sm">
              {daftar ? 'Sudah punya akun? ' : 'Belum punya akun? '}
              <Link
                to={daftar ? '/masuk' : '/daftar'}
                className="font-black text-merek-magenta underline"
              >
                {daftar ? 'Masuk di sini' : 'Daftar di sini'}
              </Link>
            </p>

            <p className="mt-4 text-xs leading-relaxed text-slate-400">
              Tidak ada kata sandi yang kami simpan. Dari Google kami cuma
              menerima nama dan email.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
