/* =============================================================================
   Dua kait yang dipakai hampir semua halaman.
============================================================================= */

import { useCallback, useEffect, useRef, useState } from 'react';
import { pesanDari } from './api';

interface Keadaan<T> {
  data: T | null;
  memuat: boolean;
  error: string | null;
}

/**
 * Ambil data sekali waktu halaman dibuka.
 *
 *   const { data, memuat, error, muatUlang } = useMuat(
 *     (signal) => api.get<Halaman>(`/pages/${slug}`, { signal }),
 *     [slug],
 *   );
 */
export function useMuat<T>(
  ambil: (signal: AbortSignal) => Promise<T>,
  kunci: unknown[] = [],
) {
  const [keadaan, setKeadaan] = useState<Keadaan<T>>({
    data: null,
    memuat: true,
    error: null,
  });

  const ambilRef = useRef(ambil);
  ambilRef.current = ambil;

  const jalankan = useCallback(async (signal: AbortSignal, diamDiam = false) => {
    if (!diamDiam) setKeadaan((s) => ({ ...s, memuat: true, error: null }));
    try {
      const hasil = await ambilRef.current(signal);
      if (!signal.aborted) setKeadaan({ data: hasil, memuat: false, error: null });
    } catch (e) {
      if (signal.aborted || (e as Error)?.name === 'AbortError') return;
      setKeadaan({ data: null, memuat: false, error: pesanDari(e) });
    }
  }, []);

  useEffect(() => {
    const pengendali = new AbortController();
    void jalankan(pengendali.signal);
    return () => pengendali.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, kunci);

  const muatUlang = useCallback(
    (diamDiam = true) => {
      const pengendali = new AbortController();
      void jalankan(pengendali.signal, diamDiam);
    },
    [jalankan],
  );

  return { ...keadaan, muatUlang };
}

/**
 * Muat ulang berkala, TAPI berhenti kalau layarnya tidak sedang dibuka.
 *
 * document.hidden itu wajib, bukan hiasan. Kalau HP peserta ada di saku dan
 * halaman ini tetap memanggil API tiap menit, baterai dan kuota mereka habis
 * percuma, dan server kita ikut kena beban yang tidak ada gunanya.
 *
 *   useMuatUlangBerkala(muatUlang, 60_000);
 */
export function useMuatUlangBerkala(kerjakan: () => void, jedaMs: number) {
  const kerjakanRef = useRef(kerjakan);
  kerjakanRef.current = kerjakan;

  useEffect(() => {
    const pewaktu = setInterval(() => {
      if (!document.hidden) kerjakanRef.current();
    }, jedaMs);

    // Begitu peserta membuka lagi tabnya, segarkan sekarang juga supaya
    // yang dia lihat bukan data basi dari sepuluh menit yang lalu.
    function saatKembali() {
      if (!document.hidden) kerjakanRef.current();
    }
    document.addEventListener('visibilitychange', saatKembali);

    return () => {
      clearInterval(pewaktu);
      document.removeEventListener('visibilitychange', saatKembali);
    };
  }, [jedaMs]);
}
