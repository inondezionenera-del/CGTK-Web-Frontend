/* =============================================================================
   /daftar — dua wajah, satu alamat.

   Belum masuk  -> halaman "Daftar dengan Google".
   Sudah masuk  -> formulir data peserta.

   Digabung di satu alamat dengan sengaja. Server mengirim peserta yang baru
   pertama kali masuk ke /daftar, dan orang yang belum punya akun juga menekan
   tombol Daftar yang menuju ke sana. Kalau keduanya dipisah jadi dua alamat,
   salah satu kelompok pasti mendarat di halaman yang menolaknya: yang belum
   masuk melihat formulir yang meminta login, atau yang sudah masuk melihat
   tombol Google lagi padahal dia sudah lewat.

   Sebelum ini /daftar langsung formulir di balik WajibLogin, jadi tamu yang
   menekan Daftar cuma dilempar ke layar "harus masuk dulu" tanpa penjelasan.
============================================================================= */

import { useSesi } from '../../lib/sesi';
import { Memuat } from '../../komponen/Keadaan';
import Masuk from './Masuk';
import Daftar from './Daftar';

export default function GerbangDaftar() {
  const { masuk, memuat } = useSesi();

  if (memuat) return <Memuat pesan="Memeriksa sesi..." />;
  if (!masuk) return <Masuk mode="daftar" />;
  return <Daftar />;
}
