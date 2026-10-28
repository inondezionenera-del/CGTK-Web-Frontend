/* =============================================================================
   /admin/jadwal — saklar sesi. Halaman terpenting di hari acara.

   Satu saklar di sini mengunci atau membuka kamera SEMUA panitia di lapangan
   seketika. Karena itu dua hal dibuat begitu:

   1. Tombolnya besar. Dipencet sambil berdiri di tengah keramaian, bukan
      sambil duduk di depan laptop.

   2. Menutup sesi selalu lewat konfirmasi, membuka tidak. Salah pencet yang
      membuka sesi cuma membuat kamera menyala lebih awal; salah pencet yang
      menutup bikin tujuh panitia di pintu masuk tiba-tiba tidak bisa memindai
      di tengah antrean, dan tidak ada yang tahu kenapa.

   Status DRAFT tidak ditampilkan ke peserta di halaman jadwal, tapi di sini
   harus terlihat, karena ini tempat Divisi Acara menyiapkannya.
============================================================================= */

import { useEffect, useState } from 'react';
import { api, pesanDari } from '../../lib/api';
import { useMuat, useMuatUlangBerkala } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';
import type { Acara, Sesi, StatusSesi } from '../../types/api';

/** Tiga gradasi dari mockup, dipakai berputar mengikuti urutan sesi. */
const GRADASI = [
  'linear-gradient(90deg, #ff5a00 0%, #ffb37a 70%, #fff 100%)',
  'linear-gradient(90deg, #7b1f5a 0%, #e0199c 70%, #fff 100%)',
  'linear-gradient(90deg, #0f3a66 0%, #2f9bdc 70%, #fff 100%)',
];

export default function AdminSaklar() {
  const { data, memuat, error, muatUlang } = useMuat<Sesi[]>(
    (signal) => api.get<Sesi[]>('/events/sessions/admin', { signal }),
    [],
  );

  // Dua orang bisa membuka halaman ini bersamaan di hari-H. Menyegarkan
  // berkala membuat yang satu melihat perubahan yang satunya.
  useMuatUlangBerkala(muatUlang, 30_000);

  const [konfirmasi, setKonfirmasi] = useState<Sesi | null>(null);
  const [sibuk, setSibuk] = useState<number | null>(null);
  const [gagal, setGagal] = useState<string | null>(null);

  async function ubah(sesi: Sesi, status: StatusSesi) {
    setSibuk(sesi.id);
    setGagal(null);
    try {
      await api.patch(`/events/sessions/admin/${sesi.id}/saklar`, { status });
      muatUlang(false);
    } catch (e) {
      setGagal(pesanDari(e));
    } finally {
      setSibuk(null);
      setKonfirmasi(null);
    }
  }

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      <header className="text-center">
        <h1 className="judul-tebal text-[2rem] uppercase">Saklar Sesi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Scanner panitia hanya bisa memindai kalau sesinya berstatus ACTIVE.
        </p>
      </header>

      {gagal && <PesanError pesan={gagal} />}

      {(data ?? []).length === 0 ? (
        <Kosong
          judul="Belum ada sesi"
          keterangan="Divisi Acara belum membuat sesi apa pun."
        />
      ) : (
        <ul className="space-y-4">
          {(data ?? []).map((s, i) => (
            <li key={s.id}>
              {/* Kartu bergradasi dengan saklar besar, mengikuti mockup.
                  Warnanya berputar tiga-tiga mengikuti urutan sesi, bukan
                  mengikuti statusnya: status sudah dinyatakan oleh saklarnya
                  sendiri, dan dua penanda untuk satu hal cuma membingungkan.

                  Saklarnya tombol penuh, bukan kotak centang kecil. Dipakai
                  Divisi Acara sambil berdiri di tengah acara, dan salah tekan
                  di sini mengunci scanner semua panitia sekaligus. */}
              <button
                type="button"
                disabled={sibuk === s.id}
                onClick={() =>
                  s.status === 'ACTIVE' ? setKonfirmasi(s) : void ubah(s, 'ACTIVE')
                }
                className="flex w-full items-center gap-3 rounded-[1.75rem] p-4 text-left shadow-[0_6px_0_-1px_rgba(0,0,0,0.18)] disabled:opacity-60"
                style={{ backgroundImage: GRADASI[i % GRADASI.length] }}
              >
                <span className="min-w-0 flex-1">
                  <img
                    src="/logo-cgtk.png"
                    alt=""
                    aria-hidden
                    className="h-9 w-auto drop-shadow"
                  />
                  <span className="mt-1 block truncate text-xl font-black uppercase leading-tight text-white drop-shadow">
                    {s.nama}
                  </span>
                  <span className="block truncate text-xs font-semibold text-white/80">
                    {s.lokasi ?? 'Tanpa lokasi'}
                    {s.status === 'DRAFT' ? ' · draft' : ''}
                  </span>
                </span>

                {/* Saklar. Knop putih bergeser, dan kata ON/OFF ada di sisi
                    yang kosong, persis seperti gambar. */}
                <span
                  className={`relative flex h-16 w-32 shrink-0 items-center rounded-2xl border-[5px] bg-white/95 ${
                    s.status === 'ACTIVE' ? 'border-[#3ddc00]' : 'border-[#ff1b1b]'
                  }`}
                >
                  <span
                    className={`absolute inset-y-0 w-1/2 rounded-xl bg-white shadow-md transition-all ${
                      s.status === 'ACTIVE' ? 'right-0' : 'left-0'
                    }`}
                  />
                  <span
                    className={`relative z-10 w-full text-center text-xl font-black ${
                      s.status === 'ACTIVE'
                        ? 'pr-16 text-[#2bb000]'
                        : 'pl-16 text-[#d10000]'
                    }`}
                  >
                    {s.status === 'ACTIVE' ? 'ON' : 'OFF'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <TambahSesi selesai={() => muatUlang(false)} />

      {konfirmasi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="kartu w-full max-w-sm p-6 text-center">
            <h2 className="text-lg font-bold">Tutup sesi ini?</h2>
            <p className="mt-1 font-semibold">{konfirmasi.nama}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Scanner semua panitia di lapangan akan langsung terkunci untuk
              sesi ini.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setKonfirmasi(null)}
                className="flex-1 rounded-xl border border-slate-300 px-4 font-bold dark:border-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void ubah(konfirmasi, 'CLOSED')}
                className="flex-1 rounded-xl bg-bahaya-600 px-4 font-bold text-white"
              >
                Ya, Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Membuat sesi baru.
 *
 * Sebelum ini tidak ada layar untuk membuat sesi sama sekali: yang ada cuma
 * saklar nyala dan mati untuk sesi yang entah dibuat dari mana. Enam sesi yang
 * ada sekarang data contoh.
 *
 * Jam mulai boleh dikosongkan, dan itu disengaja. Jadwal di lapangan bergeser
 * terus, dan yang menentukan scanner boleh jalan atau tidak adalah saklarnya,
 * bukan jamnya. Jam di sini cuma keterangan untuk peserta.
 */
function TambahSesi({ selesai }: { selesai: () => void }) {
  const [buka, setBuka] = useState(false);
  const [acara, setAcara] = useState<Acara[]>([]);
  const [eventId, setEventId] = useState('');
  const [nama, setNama] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [jam, setJam] = useState('');
  const [sibuk, setSibuk] = useState(false);
  const [gagal, setGagal] = useState<string | null>(null);

  useEffect(() => {
    if (!buka) return;
    let hidup = true;
    void api
      .get<Acara[]>('/events')
      .then((a) => hidup && setAcara(a ?? []))
      .catch(() => hidup && setAcara([]));
    return () => {
      hidup = false;
    };
  }, [buka]);

  const siap = eventId !== '' && nama.trim().length >= 2;

  async function simpan() {
    setSibuk(true);
    setGagal(null);
    try {
      await api.post('/events/sessions/admin', {
        event_id: Number(eventId),
        nama: nama.trim(),
        ...(lokasi.trim() ? { lokasi: lokasi.trim() } : {}),
        // datetime-local tidak membawa zona waktu. Dikirim apa adanya akan
        // ditolak Zod yang meminta offset, jadi dilengkapi dari zona perangkat
        // yang sedang dipakai panitia.
        ...(jam ? { jam_mulai: new Date(jam).toISOString() } : {}),
      });
      setNama('');
      setLokasi('');
      setJam('');
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
        Tambah Sesi
      </button>
    );
  }

  return (
    <section className="kartu space-y-3 p-5 ring-1 ring-slate-200">
      <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
        Sesi Baru
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

      <input
        value={nama}
        maxLength={120}
        onChange={(e) => setNama(e.target.value)}
        placeholder="Nama sesi, misalnya Sharing Kampus"
        className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
      />
      <input
        value={lokasi}
        maxLength={120}
        onChange={(e) => setLokasi(e.target.value)}
        placeholder="Lokasi, misalnya Aula Utama"
        className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
      />
      <input
        type="datetime-local"
        value={jam}
        onChange={(e) => setJam(e.target.value)}
        className="isian outline-none focus:ring-2 focus:ring-merek-magenta/40"
      />

      <p className="text-xs leading-relaxed text-slate-500">
        Jam boleh dikosongkan. Yang menentukan scanner boleh jalan atau tidak
        adalah saklarnya, bukan jamnya. Sesi baru lahir sebagai DRAFT dan tidak
        terlihat peserta sampai dibuka.
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!siap || sibuk}
          onClick={() => void simpan()}
          className="tombol-utama flex-1 px-6 py-3.5 disabled:opacity-50"
        >
          {sibuk ? 'Menyimpan...' : 'Simpan Sesi'}
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
