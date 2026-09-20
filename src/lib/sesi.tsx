/* =============================================================================
   Siapa yang sedang login, dan dia boleh ke halaman mana.

   Alurnya persis seperti di 06-KETENTUAN-TEKNIS bagian 5.1:
     1. supabase.auth.signInWithOAuth({ provider: 'google' })
     2. Google memulangkan ke web, Supabase menyimpan sesinya sendiri
     3. panggil POST /auth/sinkron sekali, kirim access_token
     4. backend menjawab: dia siapa, perannya apa, mau diarahkan ke mana

   Perpanjangan token diurus pustaka Supabase. Tidak ada /auth/refresh.
============================================================================= */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from './supabase';
import { api } from './api';

export interface Pengguna {
  id: string;
  nama: string;
  peran: string;
  arahkan_ke: string;
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
        const hasil = await api.post<Pengguna>('/auth/sinkron', {
          access_token: data.session.access_token,
        });
        if (hidup) setPengguna(hasil);
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
