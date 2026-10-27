/* =============================================================================
   /daftar — form profiling peserta.

   Empat isian tetap, lalu sisanya disusun dari `GET /form_fields`. Divisi
   Administrasi menambah dan mengurangi pertanyaan sendiri, jadi jumlah barisnya
   tidak pernah pasti dan tidak boleh ditulis di program.

   Satu kotak centang di bawah sengaja dibuat menonjol, bukan dikecilkan di
   pojok: izin agar kampus yang booth-nya dikunjungi boleh melihat data minat
   peserta. Peserta kita anak SMA. Persetujuan seperti itu harus benar-benar
   mereka berikan, bukan tercentang lebih dulu dan terlewat.
============================================================================= */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, pesanDari } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError } from '../../komponen/Keadaan';
import { BidangDinamis, type NilaiBidang } from '../../komponen/BidangDinamis';
import type { FormField } from '../../types/api';

interface Tetap {
  asal_sekolah: string;
  kelas: string;
  target_jurusan: string;
  kampus_impian: string;
}

export default function Daftar() {
  const navigate = useNavigate();

  const { data: bidang, memuat, error, muatUlang } = useMuat<FormField[]>(
    (signal) => api.get<FormField[]>('/form_fields', { signal }),
    [],
  );

  const [tetap, setTetap] = useState<Tetap>({
    asal_sekolah: '',
    kelas: '',
    target_jurusan: '',
    kampus_impian: '',
  });
  const [extra, setExtra] = useState<Record<string, NilaiBidang>>({});
  const [izin, setIzin] = useState(false);
  const [salah, setSalah] = useState<Record<string, string>>({});
  const [kirimError, setKirimError] = useState<string | null>(null);
  const [mengirim, setMengirim] = useState(false);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  function periksa(): boolean {
    const hasil: Record<string, string> = {};
    if (tetap.asal_sekolah.trim().length < 2) hasil.asal_sekolah = 'Wajib diisi.';
    if (tetap.kelas.trim().length < 1) hasil.kelas = 'Wajib diisi.';

    for (const b of bidang ?? []) {
      if (!b.wajib) continue;
      const v = extra[b.kunci];
      const kosong =
        v === undefined ||
        v === null ||
        v === '' ||
        (Array.isArray(v) && v.length === 0);
      if (kosong) hasil[b.kunci] = 'Wajib diisi.';
    }

    setSalah(hasil);
    return Object.keys(hasil).length === 0;
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setKirimError(null);
    if (!periksa()) return;

    setMengirim(true);
    try {
      await api.post('/registrations', {
        asal_sekolah: tetap.asal_sekolah.trim(),
        kelas: tetap.kelas.trim(),
        target_jurusan: tetap.target_jurusan.trim() || undefined,
        kampus_impian: tetap.kampus_impian.trim() || undefined,
        izin_bagi_data: izin,
        extra_fields: extra,
      });
      // Tujuan sesudah daftar: halaman bayar. Itu satu-satunya langkah
      // berikutnya yang masuk akal, dan server menahan link bayarnya sampai
      // profilnya benar-benar lengkap.
      navigate('/bayar', { replace: true });
    } catch (err) {
      setKirimError(pesanDari(err));
      setMengirim(false);
    }
  }

  const KELAS_INPUT =
    'isian outline-none focus:ring-2 focus:ring-merek-magenta/40 ' +
    'focus:border-utama-600 dark:border-slate-700 dark:bg-slate-800';

  return (
    <form onSubmit={kirim} className="mx-auto max-w-xl space-y-5 pb-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-utama-600">
          Langkah 1 dari 2
        </p>
        <h1 className="mt-1 text-2xl font-bold">Data Peserta</h1>
        <p className="mt-1 text-sm text-slate-500">
          Isi sekali, dipakai sampai hari acara.
        </p>
      </header>

      <div className="space-y-1">
        <label htmlFor="sekolah" className="block text-sm font-semibold">
          Asal Sekolah <span className="text-bahaya-600">*</span>
        </label>
        <input
          id="sekolah"
          className={KELAS_INPUT}
          value={tetap.asal_sekolah}
          onChange={(e) => setTetap({ ...tetap, asal_sekolah: e.target.value })}
          placeholder="Contoh: SMAN 1 Pamekasan"
        />
        {salah.asal_sekolah && (
          <p className="text-xs font-medium text-bahaya-600">{salah.asal_sekolah}</p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="kelas" className="block text-sm font-semibold">
            Kelas <span className="text-bahaya-600">*</span>
          </label>
          <input
            id="kelas"
            className={KELAS_INPUT}
            value={tetap.kelas}
            onChange={(e) => setTetap({ ...tetap, kelas: e.target.value })}
            placeholder="Contoh: XII IPA 2"
          />
          {salah.kelas && (
            <p className="text-xs font-medium text-bahaya-600">{salah.kelas}</p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="jurusan" className="block text-sm font-semibold">
            Target Jurusan
          </label>
          <input
            id="jurusan"
            className={KELAS_INPUT}
            value={tetap.target_jurusan}
            onChange={(e) => setTetap({ ...tetap, target_jurusan: e.target.value })}
            placeholder="Contoh: Teknik Informatika"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="kampus" className="block text-sm font-semibold">
          Kampus Impian
        </label>
        <input
          id="kampus"
          className={KELAS_INPUT}
          value={tetap.kampus_impian}
          onChange={(e) => setTetap({ ...tetap, kampus_impian: e.target.value })}
          placeholder="Contoh: ITB"
        />
      </div>

      {(bidang ?? []).length > 0 && (
        <div className="space-y-5 border-t border-slate-200 pt-5 dark:border-slate-800">
          {(bidang ?? []).map((b) => (
            <BidangDinamis
              key={b.kunci}
              bidang={b}
              nilai={extra[b.kunci] ?? null}
              error={salah[b.kunci]}
              onUbah={(v) => setExtra({ ...extra, [b.kunci]: v })}
            />
          ))}
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-utama-600 bg-utama-50 p-4 dark:bg-utama-900/30">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-400"
          checked={izin}
          onChange={(e) => setIzin(e.target.checked)}
        />
        <span className="text-sm leading-relaxed">
          Saya bersedia data minat saya dilihat oleh kampus yang boothnya saya
          kunjungi.
          <span className="mt-1 block text-xs text-slate-500">
            Boleh tidak dicentang. Kamu tetap bisa ikut semua acara.
          </span>
        </span>
      </label>

      {kirimError && <PesanError pesan={kirimError} />}

      <button
        type="submit"
        disabled={mengirim}
        className="w-full rounded-2xl bg-utama-600 px-6 font-bold text-white shadow-sm transition hover:bg-utama-700 disabled:opacity-60"
      >
        {mengirim ? 'Menyimpan...' : 'Simpan & Lanjut ke Pembayaran'}
      </button>
    </form>
  );
}
