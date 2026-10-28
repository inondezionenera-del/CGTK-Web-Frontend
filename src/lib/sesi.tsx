/* =============================================================================
   Siapa yang sedang login, dan dia boleh ke halaman mana.

   Alurnya persis seperti di 06-KETENTUAN-TEKNIS bagian 5.1:
     1. supabase.auth.signInWithOAuth({ provider: 'google' })
     2. Google memulangkan ke web, Supabase menyimpan sesinya sendiri
     3. panggil POST /auth/sinkron sekali, kirim access_token
     4. backend menjawab: dia siapa, perannya apa, mau diarahkan ke mana

   Perpanjangan token diurus pustaka Supabase. Tidak ada /auth/refresh.

   CATATAN PENTING soal bentuk jawaban, karena di sinilah kesalahan paling
   mahal di seluruh frontend pernah terjadi.

   POST /auth/sinkron menjawab:

       { sukses, data: { pengguna: { id, nama, peran, izin, ... },
                         arahkan_ke, akun_baru } }

   api.post sudah membuka amplop dan mengembalikan `data`. Jadi yang diterima
   di sini adalah OBJEK PEMBUNGKUS, bukan penggunanya. Versi sebelumnya
   menyimpan pembungkus itu apa adanya sebagai Pengguna, dan akibatnya
   pengguna.id, pengguna.nama, dan pengguna.peran SELALU undefined di seluruh
   aplikasi.

   Yang membuatnya sulit disadari: arahkan_ke kebetulan berada di pembungkus
   yang sama, jadi pengalihan sesudah login tetap benar dan login terasa
   berhasil. Yang rusak diam-diam:

     - peran selalu undefined, jadi SETIAP cabang berdasarkan peran jatuh ke
       default. Menu, tujuan logo, dan halaman mana yang muncul semuanya salah.
     - nama selalu kosong, jadi layar menulis "Peserta" dan "Belum masuk"
       untuk orang yang jelas-jelas sudah masuk.
     - id selalu undefined, jadi halaman yang memanggil /missions/saya/<id>
       mengirim alamat yang tidak sah.

   Ketahuan waktu membuka menu di browser sungguhan: kepalanya menulis
   "Belum masuk" padahal area panitia justru muncul di bawahnya.
============================================================================= */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from './supabase';
import { api } from './api';

export interface Pengguna {
  id: string;
  email?: string;
  nama: string;
  foto_url?: string | null;
  peran: string;
  izin?: string[];
  /** Disalin dari pembungkusnya supaya pemanggil lama tetap jalan. */
  arahkan_ke: string;
}

/** Bentuk sebenarnya yang dikirim POST /auth/sinkron. */
interface JawabanSinkron {
  pengguna: {
    id: string;
    email?: string;
    nama: string;
    foto_url?: string | null;
    peran: string;
    izin?: string[];
  } | null;
  arahkan_ke?: string;
  akun_baru?: boolean;
}

interface IsiSesi {
  pengguna: Pengguna | null;
  memuat: boolean;
  masuk: boolean;
}

const Konteks = createContext<IsiSesi>({ pengguna: null, memuat: true, masuk: false });

export function PenyediaSesi({ children }: { children: ReactNode }) {
  const [pengguna, setPengguna] = useState<Pengguna | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let hidup = true;

    async function sinkron() {
      const { data } = await supabase.auth.getSession();
      if (!hidup) return;

      if (!data.session) {
        setPengguna(null);
        setMemuat(false);
        return;
      }

      try {
        const hasil = await api.post<JawabanSinkron>('/auth/sinkron', {
          access_token: data.session.access_token,
        });

        // Dibuka satu tingkat. Kalau penggunanya tidak ada, diperlakukan
        // sebagai belum masuk, bukan sebagai objek kosong yang membuat
        // masuk bernilai true padahal isinya tidak ada apa-apa.
        const p = hasil?.pengguna;
        if (hidup) {
          setPengguna(
            p
              ? { ...p, arahkan_ke: hasil.arahkan_ke ?? '/dashboard' }
              : null,
          );
        }
      } catch {
        if (hidup) setPengguna(null);
      } finally {
        if (hidup) setMemuat(false);
      }
    }

    void sinkron();
    const { data: langganan } = supabase.auth.onAuthStateChange(() => void sinkron());

    return () => {
      hidup = false;
      langganan.subscription.unsubscribe();
    };
  }, []);

  return (
    <Konteks.Provider value={{ pengguna, memuat, masuk: pengguna !== null }}>
      {children}
    </Konteks.Provider>
  );
}

export function useSesi() {
  return useContext(Konteks);
}
