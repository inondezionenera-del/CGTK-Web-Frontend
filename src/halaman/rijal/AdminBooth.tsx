/* =============================================================================
   /admin/booth — buat dan buka booth.

   Booth lahir dengan status DRAFT. Peserta tidak melihatnya, scanner menolak
   memindainya, dan dia tidak ikut di rekomendasi kuis. Jadi membuat booth saja
   belum cukup: harus dibuka juga, dan itu yang paling sering terlewat.
   Karena itu jumlah booth yang masih DRAFT ditulis besar di atas.

   Tombol Buat Otomatis membangun booth dari alumni yang sudah diundang, satu
   per kampus untuk acara expo kampus dan satu per jurusan untuk acara sharing
   jurusan. Membuat empat puluh booth lewat form satu per satu adalah cara
   paling pasti membuat pekerjaan ini ditinggalkan setengah jalan.

   Saklar di sini berbeda dengan Saklar Sesi. Yang ini menentukan booth-nya ada
   atau tidak sepanjang acara; yang itu menentukan scanner presensi boleh
   jalan atau tidak di satu sesi.
============================================================================= */

import { useState } from 'react';
import { api, pesanDari } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';
import type { Acara } from '../../types/api';

interface Booth {
  id: number;
  nama_tampilan: string;
  kode_booth: string;
  booth_type: 'KAMPUS' | 'JURUSAN';
  lokasi: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  acara: string | null;
  kampus: string | null;
  jurusan: string | null;
  event_id: number;
}

interface Isi {
  booth: Booth[];
  acara: Acara[];
}

const STATUS_BERIKUT: Record<Booth['status'], Booth['status']> = {
  DRAFT: 'ACTIVE',
  ACTIVE: 'CLOSED',
  CLOSED: 'ACTIVE',
};

export default function AdminBooth() {
  const { data, memuat, error, muatUlang } = useMuat<Isi>(async (signal) => {
    const [booth, acara] = await Promise.all([
      api.get<Booth[]>('/booths/admin/semua', { signal }),
      api.get<Acara[]>('/events', { signal }).catch(() => []),
    ]);
    return { booth: booth ?? [], acara: acara ?? [] };
  }, []);

  const [sibuk, setSibuk] = useState<number | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [acaraOtomatis, setAcaraOtomatis] = useState('');
  const [jalanOtomatis, setJalanOtomatis] = useState(false);

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  const booth = data?.booth ?? [];
  const draf = booth.filter((b) => b.status === 'DRAFT').length;

  async function ubahStatus(b: Booth) {
    setSibuk(b.id);
    setGagal(null);
    setPesan(null);
    try {
      await api.patch(`/booths/admin/${b.id}/saklar`, { status: STATUS_BERIKUT[b.status] });
      muatUlang(false);
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(null);
    }
  }

  async function buatOtomatis() {
    if (!acaraOtomatis) return;
    setJalanOtomatis(true);
    setGagal(null);
    setPesan(null);
    try {
      const r = await api.post<{ dibuat?: number } | unknown>(
        '/booths/admin/buat-otomatis',
        { event_id: Number(acaraOtomatis) },
      );
      const n = (r as { dibuat?: number })?.dibuat;
      setPesan(
        typeof n === 'number'
          ? `${n} booth dibuat. Semuanya masih DRAFT, buka satu per satu di bawah.`
          : 'Selesai. Booth baru masih DRAFT, buka satu per satu di bawah.',
      );
      muatUlang(false);
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setJalanOtomatis(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <header className="text-center">
        <h1 className="judul-tebal text-[2rem]">Kelola Booth</h1>
        <p className="mt-1 text-sm text-slate-500">
          {booth.length} booth, {booth.filter((b) => b.status === 'ACTIVE').length} terbuka.
        </p>
      </header>

      {draf > 0 && (
        <div className="kartu p-4 ring-2 ring-hatihati-600/40">
          <p className="font-black text-hatihati-700">
            {draf} booth masih DRAFT
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            Booth DRAFT tidak terlihat peserta, tidak bisa dipindai, dan tidak
            ikut direkomendasikan kuis. Tekan tombol statusnya untuk membuka.
          </p>
        </div>
      )}

      {gagal && <PesanError pesan={gagal} />}
      {pesan && (
        <p className="kartu p-4 text-sm font-bold text-berhasil-700 ring-2 ring-berhasil-600/40">
          {pesan}
        </p>
      )}

      <section className="kartu space-y-3 p-5 ring-1 ring-slate-200">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Buat Otomatis Dari Alumni
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Membangun booth dari alumni yang sudah diundang. Acara expo kampus
          dapat satu booth per kampus, acara sharing jurusan dapat satu per
          jurusan.
        </p>
        <select
          value={acaraOtomatis}
          onChange={(e) => setAcaraOtomatis(e.target.value)}
          className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
        >
          <option value="">Pilih acara</option>
          {(data?.acara ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.nama}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!acaraOtomatis || jalanOtomatis}
          onClick={() => void buatOtomatis()}
          className="tombol-utama w-full px-6 py-3.5 disabled:opacity-50"
        >
          {jalanOtomatis ? 'Membuat...' : 'Buat Otomatis'}
        </button>
      </section>

      <BuatManual acara={data?.acara ?? []} selesai={() => muatUlang(false)} />

      <section>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
          Semua Booth
        </h2>
        {booth.length === 0 ? (
          <Kosong
            judul="Belum ada booth"
            keterangan="Undang alumni dulu, lalu tekan Buat Otomatis."
          />
        ) : (
          <ul className="mt-2 space-y-2">
            {booth.map((b) => (
              <li
                key={b.id}
                className="kartu flex items-center gap-3 p-4 ring-1 ring-slate-200"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">{b.nama_tampilan}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[b.acara, b.lokasi, b.kampus ?? b.jurusan].filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                    {b.kode_booth} &middot; {b.booth_type}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={sibuk === b.id}
                  onClick={() => void ubahStatus(b)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-black disabled:opacity-50 ${
                    b.status === 'ACTIVE'
                      ? 'bg-berhasil-600 text-white'
                      : b.status === 'CLOSED'
                        ? 'bg-slate-300 text-slate-700'
                        : 'bg-hatihati-600 text-white'
                  }`}
                >
                  {b.status === 'ACTIVE'
                    ? 'BUKA'
                    : b.status === 'CLOSED'
                      ? 'TUTUP'
                      : 'DRAFT'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function BuatManual({ acara, selesai }: { acara: Acara[]; selesai: () => void }) {
  const [buka, setBuka] = useState(false);
  const [eventId, setEventId] = useState('');
  const [tipe, setTipe] = useState<'KAMPUS' | 'JURUSAN'>('KAMPUS');
  const [nama, setNama] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);

  const siap = eventId !== '' && nama.trim().length >= 2;

  async function simpan() {
    setSibuk(true);
    setGagal(null);
    try {
      await api.post('/booths/admin', {
        event_id: Number(eventId),
        booth_type: tipe,
        nama_tampilan: nama.trim(),
        ...(lokasi.trim() ? { lokasi: lokasi.trim() } : {}),
      });
      setNama('');
      setLokasi('');
      setBuka(false);
      selesai();
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(false);
    }
  }

  if (!buka) {
    return (
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="w-full rounded-full bg-slate-100 px-6 py-3.5 font-black text-slate-700"
      >
        Tambah Booth Satuan
      </button>
    );
  }

  return (
    <section className="kartu space-y-4 p-5 ring-1 ring-slate-200">
      <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
        Tambah Booth
      </h2>

      {gagal && <PesanError pesan={gagal} />}

      <select
        value={eventId}
        onChange={(e) => setEventId(e.target.value)}
        className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
      >
        <option value="">Pilih acara</option>
        {acara.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nama}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        {(['KAMPUS', 'JURUSAN'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipe(t)}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-black ${
              tipe === t ? 'tombol-utama' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <input
        value={nama}
        maxLength={120}
        onChange={(e) => setNama(e.target.value)}
        placeholder="Nama booth, misalnya Booth ITB"
        className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
      />
      <input
        value={lokasi}
        maxLength={120}
        onChange={(e) => setLokasi(e.target.value)}
        placeholder="Lokasi, misalnya Aula Barat meja 4"
        className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
      />

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!siap || sibuk}
          onClick={() => void simpan()}
          className="tombol-utama flex-1 px-6 py-3.5 disabled:opacity-50"
        >
          {sibuk ? 'Menyimpan...' : 'Simpan'}
        </button>
        <button
          type="button"
          onClick={() => setBuka(false)}
          className="flex-1 rounded-full bg-white px-6 py-3.5 font-bold ring-1 ring-slate-300"
        >
          Batal
        </button>
      </div>
    </section>
  );
}
