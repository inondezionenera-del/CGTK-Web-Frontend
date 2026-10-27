/* =============================================================================
   Satu bidang isian Form Builder.

   Keenam tipe ditangani di sini, dan tidak ada cabang "selain itu". Kalau ada
   tipe yang tidak dikenali, bidangnya tetap digambar sebagai isian teks dengan
   peringatan, bukan dihilangkan diam-diam.

   Alasannya: Divisi Administrasi menambah pertanyaan sendiri. Kalau mereka
   membuat satu bidang bertipe TANGGAL dan kodenya jatuh ke cabang kosong,
   pertanyaan itu lenyap dari form. Peserta mengirim pendaftaran tanpa tahu ada
   yang hilang, Administrasi mengira semua sudah terisi, dan yang ketahuan
   belakangan cuma datanya bolong. Lebih baik jelek tapi kelihatan.
============================================================================= */

import type { FormField } from '../types/api';

export type NilaiBidang = string | number | boolean | string[] | null;

interface Props {
  bidang: FormField;
  nilai: NilaiBidang;
  onUbah: (nilai: NilaiBidang) => void;
  error?: string;
}

const KELAS_INPUT =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-900 outline-none ' +
  'focus:border-utama-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export function BidangDinamis({ bidang, nilai, onUbah, error }: Props) {
  const id = `f-${bidang.kunci}`;
  const opsi = bidang.opsi ?? [];

  function isian() {
    switch (bidang.tipe) {
      case 'TEKS':
        return (
          <input
            id={id}
            type="text"
            className={KELAS_INPUT}
            value={(nilai as string) ?? ''}
            onChange={(e) => onUbah(e.target.value)}
          />
        );

      case 'ANGKA':
        return (
          <input
            id={id}
            type="number"
            inputMode="numeric"
            className={KELAS_INPUT}
            value={nilai === null || nilai === undefined ? '' : String(nilai)}
            onChange={(e) => onUbah(e.target.value === '' ? null : Number(e.target.value))}
          />
        );

      case 'TANGGAL':
        return (
          <input
            id={id}
            type="date"
            className={KELAS_INPUT}
            value={(nilai as string) ?? ''}
            onChange={(e) => onUbah(e.target.value)}
          />
        );

      case 'PILIHAN':
        return (
          <select
            id={id}
            className={KELAS_INPUT}
            value={(nilai as string) ?? ''}
            onChange={(e) => onUbah(e.target.value || null)}
          >
            <option value="">Pilih {bidang.label.toLowerCase()}...</option>
            {opsi.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );

      case 'PILIHAN_GANDA': {
        const dipilih = Array.isArray(nilai) ? nilai : [];
        return (
          <div className="space-y-1.5">
            {opsi.map((o) => (
              <label
                key={o}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 dark:border-slate-700"
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-slate-300"
                  checked={dipilih.includes(o)}
                  onChange={(e) =>
                    onUbah(
                      e.target.checked
                        ? [...dipilih, o]
                        : dipilih.filter((x) => x !== o),
                    )
                  }
                />
                <span className="text-sm">{o}</span>
              </label>
            ))}
          </div>
        );
      }

      case 'YA_TIDAK':
        return (
          <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-3 dark:border-slate-700">
            <span className="text-sm">{nilai === true ? 'Ya' : 'Tidak'}</span>
            <input
              id={id}
              type="checkbox"
              className="h-5 w-5 rounded border-slate-300"
              checked={nilai === true}
              onChange={(e) => onUbah(e.target.checked)}
            />
          </label>
        );

      default:
        // Tipe yang belum dikenal versi ini. Digambar sebagai teks biasa supaya
        // jawabannya tetap terkirim, dan ditandai supaya ada yang melaporkannya.
        return (
          <>
            <input
              id={id}
              type="text"
              className={KELAS_INPUT}
              value={(nilai as string) ?? ''}
              onChange={(e) => onUbah(e.target.value)}
            />
            <p className="mt-1 text-xs text-hatihati-700">
              Tipe pertanyaan ini belum dikenali aplikasi. Isi sebagai teks
              biasa, lalu beri tahu panitia.
            </p>
          </>
        );
    }
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold">
        {bidang.label}
        {bidang.wajib && <span className="ml-1 text-bahaya-600">*</span>}
      </label>
      {isian()}
      {bidang.bantuan && (
        <p className="text-xs text-slate-500">{bidang.bantuan}</p>
      )}
      {error && <p className="text-xs font-medium text-bahaya-600">{error}</p>}
    </div>
  );
}
