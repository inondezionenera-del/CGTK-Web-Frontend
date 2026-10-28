/* =============================================================================
   Daftar izin pengguna yang sedang masuk.

   Diambil sekali dari server lalu disimpan di memori selama tab-nya terbuka.
   Dipakai bingkai aplikasi untuk menentukan menu mana yang muncul.

   Ini BUKAN pengamanan. Setiap endpoint di balik menu itu tetap memeriksa
   izinnya sendiri di server, dan sudah diuji ditolak 403 untuk peran yang
   tidak berhak. Yang dikerjakan di sini cuma supaya layarnya tidak penuh
   tautan yang akan menolak orang yang menekannya.

   Disimpan di modul, bukan di state React, karena bingkai aplikasi dipasang
   ulang setiap kali halaman berpindah dan mengambil ulang daftar izin di tiap
   perpindahan berarti satu permintaan tambahan untuk setiap ketukan menu.
============================================================================= */

import { useEffect, useState } from 'react';
import { api } from './api';

let tersimpan: string[] | null = null;
let sedangAmbil: Promise<string[]> | null = null;

/** Dibuang saat keluar, supaya pengguna berikutnya tidak mewarisi izin ini. */
export function lupakanIzin() {
  tersimpan = null;
  sedangAmbil = null;
}

export function useIzin(masuk: boolean): string[] {
  const [izin, setIzin] = useState<string[]>(tersimpan ?? []);

  useEffect(() => {
    if (!masuk) {
      lupakanIzin();
      setIzin([]);
      return;
    }
    if (tersimpan) {
      setIzin(tersimpan);
      return;
    }

    let hidup = true;
    // Satu permintaan saja walaupun beberapa komponen memintanya bersamaan.
    sedangAmbil ??= api
      .get<string[]>('/auth/izin')
      .then((d) => {
        tersimpan = d ?? [];
        return tersimpan;
      })
      .catch(() => {
        sedangAmbil = null;
        return [];
      });

    void sedangAmbil.then((d) => {
      if (hidup) setIzin(d);
    });

    return () => {
      hidup = false;
    };
  }, [masuk]);

  return izin;
}
