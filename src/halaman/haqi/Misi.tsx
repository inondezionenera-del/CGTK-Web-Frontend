/* =============================================================================
   /missions — misi dan badge.

   Misi dikelompokkan per acara, bukan jadi satu daftar panjang. Booth Teknik
   Informatika mungkin cuma buka Hari 2; kalau misinya tercampur, peserta datang
   di hari yang salah dan menemukan meja kosong.

   Misi yang sudah tidak bisa diselesaikan (boothnya tutup) ditampilkan abu-abu,
   tidak dihapus. Peserta berhak tahu dia melewatkan apa, dan daftar yang
   menyusut sendiri membuat orang mengira aplikasinya yang salah.

   Badge yang belum didapat juga tetap tampil, lengkap dengan syaratnya. Itu
   satu-satunya alasan orang mengejarnya.
============================================================================= */

import { api } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat, PesanError, Kosong } from '../../komponen/Keadaan';
import { useSesi } from '../../lib/sesi';
import type { Acara } from '../../types/api';

interface Misi {
  id: number;
  nama: string;
  deskripsi: string | null;
  xp: number;
  event_id: number | null;
  status: string;
  progress: number;
}

interface Badge {
  id: number;
  nama: string;
  deskripsi: string | null;
  syarat: unknown;
  didapat: boolean;
}

interface Isi {
  misi: Misi[];
  badge: Badge[];
  acara: Acara[];
  belumSiap: boolean;
}

export default function MisiHalaman() {
  const { pengguna } = useSesi();

  const { data, memuat, error, muatUlang } = useMuat<Isi>(
    async (signal) => {
      const pid = pengguna?.id ?? '';
      let belumSiap = false;

      // Modul ini milik layanan Python. Selama layanannya belum nyala, Worker
      // menjawab 503, dan itu bukan kesalahan yang perlu ditakuti peserta.
      const misi = await api
        .get<Misi[]>(`/missions/saya/${pid}`, { signal })
        .catch((e) => {
          if ((e as { status?: number }).status === 503) belumSiap = true;
          return [] as Misi[];
        });

      const badge = await api
        .get<Badge[]>(`/achievements/saya/${pid}`, { signal })
        .catch(() => [] as Badge[]);

      const acara = await api.get<Acara[]>('/events', { signal }).catch(() => []);

      return { misi: misi ?? [], badge: badge ?? [], acara: acara ?? [], belumSiap };
    },
    [pengguna?.id],
  );

  if (memuat) return <Memuat />;
  if (error) return <PesanError pesan={error} coba={() => muatUlang(false)} />;

  if (data?.belumSiap) {
    return (
      <Kosong
        judul="Fitur misi belum dinyalakan"
        keterangan="Panitia masih menyiapkannya. Coba lagi nanti."
      />
    );
  }

  const namaAcara = new Map((data?.acara ?? []).map((a) => [a.id, a.nama]));

  // Dikelompokkan per acara. Yang tidak terikat acara mana pun masuk ke
  // kelompok terakhir, bukan dibuang.
  const kelompok = new Map<number | null, Misi[]>();
  for (const m of data?.misi ?? []) {
    const k = m.event_id ?? null;
    kelompok.set(k, [...(kelompok.get(k) ?? []), m]);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 pb-10">
      <header>
        <h1 className="judul-tebal text-[2rem]">Misi &amp; Badge</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kumpulkan XP dengan mendatangi booth dan ikut sesi.
        </p>
      </header>

      {(data?.misi ?? []).length === 0 ? (
        <Kosong judul="Belum ada misi" keterangan="Panitia belum membuat misi." />
      ) : (
        [...kelompok.entries()].map(([eventId, daftar]) => (
          <section key={String(eventId)} className="space-y-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              {eventId === null ? 'Misi Umum' : (namaAcara.get(eventId) ?? 'Acara')}
            </h2>
            <ul className="space-y-2">
              {daftar.map((m) => {
                const selesai = m.status === 'SELESAI';
                const mati = m.status === 'TIDAK_BISA';
                return (
                  <li
                    key={m.id}
                    className={`kartu border p-4 ${
                      selesai
                        ? 'border-berhasil-600 bg-berhasil-50 dark:bg-berhasil-700/10'
                        : mati
                          ? 'border-slate-200 bg-slate-100 opacity-60 dark:border-slate-800 dark:bg-slate-800'
                          : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold">
                          <span aria-hidden className="mr-2">
                            {selesai ? '✓' : mati ? '■' : '□'}
                          </span>
                          {m.nama}
                        </p>
                        {m.deskripsi && (
                          <p className="mt-0.5 text-xs text-slate-500">{m.deskripsi}</p>
                        )}
                        {mati && (
                          <p className="mt-1 text-xs text-slate-400">
                            Boothnya sudah tutup
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-lg bg-utama-50 px-2 py-1 text-xs font-black text-utama-700 dark:bg-utama-900/40 dark:text-utama-100">
                        +{m.xp} XP
                      </span>
                    </div>

                    {!selesai && !mati && m.progress > 0 && (
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-utama-600"
                          style={{ width: `${Math.min(100, m.progress)}%` }}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {(data?.badge ?? []).length > 0 && (
        <section>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Badge
          </h2>
          <ul className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {(data?.badge ?? []).map((b) => (
              <li
                key={b.id}
                className={`kartu p-3 text-center ${
                  b.didapat ? 'ring-2 ring-merek-magenta' : 'ring-1 ring-slate-200'
                }`}
                title={b.deskripsi ?? undefined}
              >
                {/* Lencana segi enam dari Figma. Yang belum didapat memakai
                    gambar yang sama dalam keadaan abu-abu dan pudar, bukan
                    gambar lain: bentuk yang sama persis itu yang membuat orang
                    tahu persis apa yang akan dia dapat kalau syaratnya
                    dipenuhi. */}
                <img
                  src="/lencana/emas.png"
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className={`mx-auto h-12 w-12 ${
                    b.didapat ? '' : 'opacity-35 grayscale'
                  }`}
                />
                <p className="mt-1 truncate text-[11px] font-bold">{b.nama}</p>
                {!b.didapat && b.deskripsi && (
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-400">
                    {b.deskripsi}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
