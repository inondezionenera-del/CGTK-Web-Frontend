/* =============================================================================
   Bingkai luar aplikasi: logo, navigasi, dan menu semua area.

   Disusun ulang sesudah webnya dibuka langsung dan tiga hal ketahuan:

   1. TIDAK ADA logo CGTK sama sekali di header. Yang ada cuma ikon obor tanpa
      tautan, jadi "klik logo untuk kembali" memang mustahil.

   2. Area alumni, panel panitia, dan scanner tidak bisa ditemukan. Menunya
      cuma tiga tautan dan selebihnya hanya bisa dicapai dengan mengetik
      alamatnya sendiri. Halaman yang ada di kode tapi tidak bisa dijangkau
      sama saja dengan tidak ada.

   3. Saat belum masuk tidak ada tombol Masuk yang kelihatan. Yang ada cuma
      lingkaran abu-abu tanpa tulisan, dan tidak ada yang tahu itu bisa
      ditekan. Jadi semua orang berhenti di tampilan publik.

   Sekarang: logo di kiri yang bisa diklik, beberapa tautan utama sesuai peran,
   lalu tombol Menu yang membuka seluruh area yang boleh dibuka orang itu.

   Menyembunyikan tautan BUKAN pengamanan, dan tidak diperlakukan begitu.
   Setiap endpoint di baliknya memeriksa izinnya sendiri dan menolak 403, dan
   itu sudah diuji per peran. Penyaringan di sini supaya layarnya tidak penuh
   tautan yang akan menolak orang yang menekannya.

   Halaman scanner tetap mengambil seluruh layar tanpa bar apa pun. Layar itu
   dipakai satu tangan di tengah antrean, dan setiap piksel yang bukan kamera
   adalah beban.
============================================================================= */

import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSesi } from '../lib/sesi';
import { useIzin, lupakanIzin } from '../lib/izin';
import { keluar } from '../lib/supabase';

interface Tautan {
  ke: string;
  label: string;
  /** Hanya untuk peran ini. */
  peran?: string[];
  /** Butuh salah satu izin ini. */
  izin?: string[];
  /** Boleh dibuka tanpa masuk. */
  publik?: boolean;
}

interface Kelompok {
  judul: string;
  isi: Tautan[];
}

/**
 * Konteks yang sedang dilihat.
 *
 * Satu akun bisa punya lebih dari satu sisi sekaligus. Akun pengelola proyek
 * misalnya peserta, alumni, DAN panitia. Peran saja tidak cukup untuk
 * menentukan menu mana yang tampil, karena perannya cuma satu sementara
 * sisinya tiga.
 *
 * Yang dipilih di sini TIDAK memberi hak apa pun. Dia cuma menentukan
 * dashboard mana yang dituju logo dan tautan utama mana yang muncul di bar
 * atas. Semua area yang boleh dibuka orang itu tetap ada di dalam menu, apa
 * pun konteksnya, dan tiap endpoint tetap memeriksa izinnya sendiri di server.
 */
type Konteks = 'peserta' | 'alumni' | 'lo' | 'panitia';

const KUNCI_KONTEKS = 'cgtk-konteks';

/** Izin apa pun yang menandakan orang ini panitia. */
const IZIN_PANITIA = [
  'TANDAI_LUNAS', 'SCAN_PRESENSI', 'SAKLAR_SESI', 'KELOLA_JADWAL',
  'KELOLA_BOOTH', 'KIRIM_PENGUMUMAN', 'KELOLA_SPONSOR', 'KELOLA_KONTEN',
  'KELOLA_MASTER', 'UNDANG_ALUMNI', 'KELOLA_FORM', 'EKSPOR_LPJ',
  'LIHAT_AUDIT', 'BEKUKAN_LEADERBOARD', 'SAHKAN_PEMENANG',
  'ATUR_PEMBAYARAN', 'PENGATURAN_SISTEM', 'ATUR_XP', 'LIHAT_ANALITIK',
];

/**
 * Seluruh area aplikasi, dikelompokkan menurut fungsinya.
 *
 * Satu daftar untuk semua orang, lalu disaring. Sebelumnya tiap peran punya
 * daftarnya sendiri yang ditulis terpisah, dan itu yang membuat halaman baru
 * gampang lupa didaftarkan di salah satunya.
 */
const SEMUA: Kelompok[] = [
  {
    judul: 'Umum',
    isi: [
      { ke: '/', label: 'Beranda', publik: true },
      { ke: '/schedule', label: 'Jadwal', publik: true },
      { ke: '/campuses', label: 'Direktori Kampus', publik: true },
      { ke: '/booths', label: 'Booth', publik: true },
      { ke: '/announcements', label: 'Pengumuman', publik: true },
      { ke: '/p/faq', label: 'FAQ', publik: true },
      { ke: '/cek-status', label: 'Cek Status Pendaftaran', publik: true },
    ],
  },
  {
    judul: 'Peserta',
    isi: [
      { ke: '/dashboard', label: 'Dashboard & QR', peran: ['PESERTA'] },
      { ke: '/profil', label: 'Profil Saya', peran: ['PESERTA'] },
      { ke: '/passport', label: 'Paspor Booth', peran: ['PESERTA'] },
      { ke: '/quiz', label: 'Kuis Minat & Bakat', peran: ['PESERTA'] },
      { ke: '/missions', label: 'Misi & Badge', peran: ['PESERTA'] },
      { ke: '/leaderboard', label: 'Papan Peringkat', peran: ['PESERTA'] },
      { ke: '/kosmetik', label: 'Kosmetik', peran: ['PESERTA'] },
      { ke: '/bayar', label: 'Pembayaran', peran: ['PESERTA'] },
    ],
  },
  {
    judul: 'Alumni',
    isi: [
      { ke: '/alumni', label: 'Beranda Alumni', peran: ['ALUMNI'] },
      { ke: '/alumni/pengunjung', label: 'Pengunjung Booth', peran: ['ALUMNI'] },
      { ke: '/alumni/sertifikat', label: 'Sertifikat & Rekap', peran: ['ALUMNI'] },
    ],
  },
  {
    judul: 'Scanner',
    isi: [
      { ke: '/scan', label: 'Scanner Presensi', izin: ['SCAN_PRESENSI'] },
      { ke: '/scanner/booth', label: 'Scanner Booth', izin: ['SCAN_BOOTH'] },
    ],
  },
  {
    judul: 'LO Pendidikan',
    isi: [
      { ke: '/lo', label: 'Alumni Dampingan', izin: ['LIHAT_ALUMNI_DAMPINGAN'] },
      { ke: '/lo/statistik', label: 'Statistik Booth', izin: ['LIHAT_STATISTIK_DAMPINGAN'] },
    ],
  },
  {
    judul: 'Panitia',
    isi: [
      { ke: '/admin', label: 'Dashboard Panitia', izin: IZIN_PANITIA },
      { ke: '/admin/pendaftaran', label: 'Pendaftaran & Pembayaran', izin: ['TANDAI_LUNAS'] },
      { ke: '/admin/lunas', label: 'Tandai Lunas', izin: ['TANDAI_LUNAS'] },
      { ke: '/admin/jadwal', label: 'Saklar Sesi', izin: ['SAKLAR_SESI', 'KELOLA_JADWAL'] },
      { ke: '/admin/booth', label: 'Kelola Booth', izin: ['KELOLA_BOOTH'] },
      { ke: '/admin/booths/poster', label: 'Poster Booth', izin: ['KELOLA_BOOTH'] },
      { ke: '/admin/alumni', label: 'Undang Alumni', izin: ['UNDANG_ALUMNI'] },
      { ke: '/admin/lo', label: 'Tugaskan LO', izin: ['UNDANG_ALUMNI'] },
      { ke: '/admin/kampus', label: 'Kampus & Jurusan', izin: ['KELOLA_MASTER'] },
      { ke: '/admin/pengumuman', label: 'Kirim Pengumuman', izin: ['KIRIM_PENGUMUMAN'] },
      { ke: '/admin/halaman', label: 'Halaman Info', izin: ['KELOLA_KONTEN'] },
      { ke: '/admin/sponsor', label: 'Kelola Sponsor', izin: ['KELOLA_SPONSOR'] },
      { ke: '/admin/form', label: 'Formulir Pendaftaran', izin: ['KELOLA_FORM'] },
      { ke: '/admin/pemenang', label: 'Pemenang', izin: ['BEKUKAN_LEADERBOARD', 'SAHKAN_PEMENANG'] },
      { ke: '/admin/ekspor', label: 'Ekspor & Log', izin: ['EKSPOR_LPJ', 'LIHAT_AUDIT'] },
      {
        ke: '/admin/pengaturan',
        label: 'Pengaturan',
        izin: ['ATUR_PEMBAYARAN', 'PENGATURAN_SISTEM', 'ATUR_XP', 'KELOLA_FORM', 'KELOLA_JADWAL'],
      },
    ],
  },
];

export function Kerangka() {
  const { pengguna, masuk } = useSesi();
  const { pathname } = useLocation();
  const izin = useIzin(masuk);
  const [menuBuka, setMenuBuka] = useState(false);
  const [konteksPilihan, setKonteksPilihan] = useState<Konteks | null>(() => {
    try {
      const k = localStorage.getItem(KUNCI_KONTEKS);
      return k === 'peserta' || k === 'alumni' || k === 'lo' || k === 'panitia' ? k : null;
    } catch {
      // Mode penyamaran menolak localStorage. Bukan alasan berhenti.
      return null;
    }
  });

  // Menu ditutup tiap kali halaman berpindah. Tanpa ini, menekan satu tautan
  // memindahkan halamannya tapi lapisannya tetap menutupi layar.
  useEffect(() => {
    setMenuBuka(false);
  }, [pathname]);

  if (pathname.startsWith('/scan')) return <Outlet />;

  const penuh =
    ['/', '/masuk', '/daftar', '/bayar'].includes(pathname) ||
    pathname.startsWith('/p/');

  const peran = pengguna?.peran;

  // Kapabilitas dari server kalau ada; kalau tidak, disimpulkan dari peran
  // supaya akun lama yang token-nya belum memuatnya tetap jalan seperti biasa.
  const kap = pengguna?.kapabilitas ?? {
    peserta: peran === 'PESERTA',
    alumni: peran === 'ALUMNI',
    panitia: Boolean(peran) && !['PESERTA', 'ALUMNI', 'LO_PENDIDIKAN'].includes(peran ?? ''),
  };
  const bisaLo =
    peran === 'LO_PENDIDIKAN' ||
    peran === 'SUPER_ADMIN' ||
    izin.includes('LIHAT_ALUMNI_DAMPINGAN');

  const tersedia: Konteks[] = [
    ...(kap.peserta ? (['peserta'] as const) : []),
    ...(kap.alumni ? (['alumni'] as const) : []),
    ...(bisaLo ? (['lo'] as const) : []),
    ...(kap.panitia ? (['panitia'] as const) : []),
  ];

  // Konteks aktif: pilihan yang tersimpan kalau masih berlaku, kalau tidak
  // yang paling sesuai dengan perannya, kalau tidak yang pertama tersedia.
  const bawaan: Konteks =
    peran === 'PESERTA' && kap.peserta ? 'peserta'
      : peran === 'ALUMNI' && kap.alumni ? 'alumni'
      : peran === 'LO_PENDIDIKAN' && bisaLo ? 'lo'
      : (tersedia[0] ?? 'peserta');
  const konteks: Konteks =
    konteksPilihan && tersedia.includes(konteksPilihan) ? konteksPilihan : bawaan;

  function gantiKonteks(k: Konteks) {
    setKonteksPilihan(k);
    try {
      localStorage.setItem(KUNCI_KONTEKS, k);
    } catch {
      /* lihat di atas */
    }
  }

  const beranda = masuk ? berandaKonteks(konteks) : '/';

  // Menu disaring dengan KAPABILITAS, bukan peran.
  //
  // Dulu tautan peserta disaring dengan peran === 'PESERTA'. Akibatnya akun
  // yang perannya SUPER_ADMIN tapi punya baris peserta tidak pernah melihat
  // satu pun menu peserta, padahal server mengizinkannya.
  function boleh(t: Tautan): boolean {
    if (!masuk) return Boolean(t.publik);
    if (t.peran) {
      if (t.peran.includes('PESERTA')) return kap.peserta;
      if (t.peran.includes('ALUMNI')) return kap.alumni;
      return t.peran.includes(peran ?? '');
    }
    if (t.izin) return peran === 'SUPER_ADMIN' || t.izin.some((i) => izin.includes(i));
    return true;
  }

  const kelompok = SEMUA
    .map((k) => ({ ...k, isi: k.isi.filter(boleh) }))
    .filter((k) => k.isi.length > 0);

  // Beberapa tautan utama di bar atas, sisanya di balik tombol Menu, supaya
  // bar-nya tetap muat di layar 360px tanpa berubah jadi strip yang digeser.
  const utama = tautanUtama(konteks, masuk, izin, peran);

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      {/* z-50: DI ATAS lapisan gelap menu.

          Sebelumnya header z-30 dan lapisannya z-40, jadi begitu menu terbuka
          trisulanya tertutup dan tidak bisa ditekan lagi untuk menutup. Orang
          harus menekan area gelap atau tombol Tutup, padahal logonya jelas
          terlihat dan terasa seperti tombol yang macet.

          Ketahuan waktu pengujian browser: klik kedua pada trisula ditolak
          dengan "intercepts pointer events". */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          {/* ----------------------------------------------------------------
              Trisula sebagai kontrol sidebar.

              Trisula di aset aslinya mengarah ke samping. Diputar seperempat
              putaran dia mengarah ke atas, dan itu justru posisi alami sebuah
              trisula, jadi bentuk dan identitasnya tidak dikorbankan untuk
              animasi. Terbuka mengarah ke atas, tertutup kembali ke samping.

              Tombol, bukan tautan. Menekannya membuka dan menutup menu, bukan
              memindahkan halaman. Jalan ke dashboard tetap ada dan jelas:
              tautan pertama di bar atas, dan satu bagian tersendiri di dalam
              menu.

              aria-expanded dan aria-controls dipasang supaya pembaca layar
              tahu ini kontrol buka-tutup dan tahu apa yang dikendalikannya.
          ---------------------------------------------------------------- */}
          <button
            type="button"
            onClick={() => setMenuBuka((v) => !v)}
            aria-label={menuBuka ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={menuBuka}
            aria-controls="menu-navigasi"
            className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-merek-magenta"
          >
            <img
              src="/trisula.png"
              alt="CGTK"
              className={`h-7 w-auto transition-transform duration-300 ease-out motion-reduce:transition-none ${
                menuBuka ? '-rotate-90' : 'rotate-0'
              }`}
            />
          </button>

          <nav className="ml-auto flex items-center gap-4 sm:gap-7">
            {utama.map((m) => (
              <NavLink
                key={m.ke}
                to={m.ke}
                end={m.ke === '/'}
                className={({ isActive }) =>
                  `hidden text-sm font-bold sm:block ${
                    isActive ? 'text-merek-magenta' : 'text-slate-900'
                  }`
                }
              >
                {m.label}
              </NavLink>
            ))}

            {!masuk && (
              <Link to="/masuk" className="tombol-utama px-5 py-2 text-sm">
                Masuk
              </Link>
            )}

            {/* Tulisan Menu dipertahankan di samping trisula.

                Ikon sendirian jarang dikenali sebagai kontrol oleh orang yang
                baru pertama membuka web ini, dan panitia di hari acara tidak
                punya waktu menebak. Dua-duanya membuka menu yang sama. */}
            <button
              type="button"
              onClick={() => setMenuBuka((v) => !v)}
              aria-label={menuBuka ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              aria-expanded={menuBuka}
              aria-controls="menu-navigasi"
              className="flex h-10 items-center rounded-full bg-slate-100 px-4 text-sm font-black"
            >
              Menu
            </button>
          </nav>
        </div>
      </header>

      {menuBuka && (
        <div
          className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/50"
          onClick={() => setMenuBuka(false)}
        >
          <div
            id="menu-navigasi"
            role="dialog"
            aria-label="Menu navigasi"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto flex h-full w-[min(22rem,88vw)] flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate font-black">
                  {pengguna?.nama ?? 'Belum masuk'}
                </p>
                <p className="truncate text-xs font-bold text-slate-500">
                  {masuk
                    ? tersedia.length > 1
                      ? `${labelPeran(peran)} \u00b7 sedang melihat ${labelKonteks(konteks)}`
                      : labelPeran(peran)
                    : 'Masuk untuk membuka fitur peserta'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMenuBuka(false)}
                aria-label="Tutup menu"
                className="shrink-0 text-sm font-bold text-slate-500"
              >
                Tutup
              </button>
            </div>

            {/* Aksi ke rumah peran, berdiri sendiri di paling atas.

                Dulu tugas ini dipegang logo. Sesudah logo berubah jadi
                kontrol buka-tutup, jalan ke dashboard harus tetap ada dan
                jelas, bukan hilang diam-diam di tengah daftar. */}
            {/* Pemindah konteks. Muncul hanya kalau akunnya memang punya
                lebih dari satu sisi, supaya peserta biasa tidak melihat
                pilihan yang tidak ada artinya buat dia. */}
            {masuk && tersedia.length > 1 && (
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Lihat sebagai
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {tersedia.map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={konteks === k}
                      onClick={() => gantiKonteks(k)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-black ${
                        konteks === k
                          ? 'tombol-utama'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {labelKonteks(k)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {masuk && (
              <div className="px-5 pt-4">
                <NavLink
                  to={beranda}
                  end
                  className="tombol-utama flex items-center justify-center px-5 py-3 text-sm"
                >
                  Ke {labelBeranda(konteks)}
                </NavLink>
              </div>
            )}

            <nav className="flex-1 overflow-y-auto px-5 py-4">
              {kelompok.map((k) => (
                <section key={k.judul} className="mb-5">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    {k.judul}
                  </p>
                  <ul className="mt-1.5 space-y-0.5">
                    {k.isi.map((t) => (
                      <li key={k.judul + t.ke}>
                        <NavLink
                          to={t.ke}
                          end={t.ke === '/'}
                          className={({ isActive }) =>
                            `block rounded-xl px-3 py-2.5 text-sm font-bold ${
                              isActive
                                ? 'bg-utama-50 text-merek-magenta'
                                : 'text-slate-800'
                            }`
                          }
                        >
                          {t.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </nav>

            <div className="border-t border-slate-100 px-5 py-4">
              {masuk ? (
                <button
                  type="button"
                  onClick={() => {
                    lupakanIzin();
                    void keluar();
                  }}
                  className="w-full rounded-full bg-slate-100 py-3 text-sm font-black text-slate-700"
                >
                  Keluar
                </button>
              ) : (
                <Link
                  to="/masuk"
                  className="tombol-utama block py-3 text-center text-sm"
                >
                  Masuk atau Daftar
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <main className={penuh ? '' : 'mx-auto max-w-5xl px-4 py-5'}>
        <Outlet />
      </main>
    </div>
  );
}

/** Rumah tiap konteks. */
function berandaKonteks(k: Konteks): string {
  switch (k) {
    case 'peserta': return '/dashboard';
    case 'alumni': return '/alumni';
    case 'lo': return '/lo';
    default: return '/admin';
  }
}

function labelKonteks(k: Konteks): string {
  switch (k) {
    case 'peserta': return 'Peserta';
    case 'alumni': return 'Alumni';
    case 'lo': return 'LO';
    default: return 'Panitia';
  }
}

/** Nama rumah tiap konteks, untuk tombol di dalam menu. */
function labelBeranda(k: Konteks): string {
  switch (k) {
    case 'peserta': return 'Dashboard';
    case 'alumni': return 'Beranda Alumni';
    case 'lo': return 'Alumni Dampingan';
    default: return 'Dashboard Panitia';
  }
}

function labelPeran(peran: string | undefined): string {
  switch (peran) {
    case 'PESERTA': return 'Peserta';
    case 'ALUMNI': return 'Alumni Booth';
    case 'LO_PENDIDIKAN': return 'LO Pendidikan';
    case 'SUPER_ADMIN': return 'Super Admin';
    case 'DIV_ACARA': return 'Divisi Acara';
    case 'DIV_ADMINISTRASI': return 'Divisi Administrasi';
    case 'DIV_PENDANAAN': return 'Divisi Pendanaan & PDD';
    default: return peran ?? 'Pengguna';
  }
}

function tautanUtama(
  konteks: Konteks,
  masuk: boolean,
  izin: string[],
  peran: string | undefined,
): { ke: string; label: string }[] {
  if (!masuk) {
    return [
      { ke: '/', label: 'Beranda' },
      { ke: '/schedule', label: 'Jadwal' },
      { ke: '/campuses', label: 'Kampus' },
    ];
  }
  switch (konteks) {
    case 'peserta':
      return [
        { ke: '/dashboard', label: 'Dashboard' },
        { ke: '/passport', label: 'Paspor' },
        { ke: '/schedule', label: 'Jadwal' },
      ];
    case 'alumni':
      return [
        { ke: '/alumni', label: 'Beranda' },
        { ke: '/alumni/pengunjung', label: 'Pengunjung' },
        { ke: '/scanner/booth', label: 'Scanner' },
      ];
    case 'lo':
      return [
        { ke: '/lo', label: 'Dampingan' },
        { ke: '/lo/statistik', label: 'Statistik' },
        { ke: '/schedule', label: 'Jadwal' },
      ];
    default: {
      const t = [{ ke: '/admin', label: 'Dashboard' }];
      if (peran === 'SUPER_ADMIN' || izin.includes('SCAN_PRESENSI')) {
        t.push({ ke: '/scan', label: 'Scanner' });
      }
      t.push({ ke: '/schedule', label: 'Jadwal' });
      return t;
    }
  }
}
