/* =============================================================================
   / — halaman depan, satu-satunya yang dilihat orang sebelum punya akun.

   Semua angka dan teks di sini datang dari server, tidak satu pun ditulis di
   program: harga tiket, batas akhir, rangkaian acara, dan sponsor. Itu yang
   membuat panitia bisa mengubahnya sendiri tanpa menghubungi anak web, dan
   itu juga syarat supaya pendaftaran bisa ditutup tanpa deploy ulang.

   Kalau `registrasi_dibuka` bernilai salah, tombol daftarnya tidak boleh tetap
   mengajak mendaftar.

   -----------------------------------------------------------------------
   TIGA HAL YANG DIPERBAIKI SETELAH DILIHAT DI LAYAR 1728px
   -----------------------------------------------------------------------

   1. Panahnya terasa mati. Dia memang mengubah sesuatu, tapi yang berubah
      cuma satu baris kecil setinggi 14px di tepi bawah gambar. Panah yang
      perubahannya tidak terlihat sama saja dengan panah rusak. Sekarang satu
      slide memuat nomor acara, namanya besar, tanggal, dan keterangannya,
      jadi menekan panah jelas memindahkan sesuatu.

   2. Isinya menumpuk jadi satu kolom sempit di tengah layar lebar. Mockup
      Figma seluruhnya 720x1600, jadi tidak ada acuan desktop sama sekali;
      versi sebelumnya memakai ukuran mobile apa adanya lalu dipusatkan.
      Sekarang tipografi dan tinggi hero ikut membesar bertahap, dan kolom
      isinya melebar.

   3. Sponsor tampil sebagai kotak abu-abu bertuliskan PLATINUM dan GOLD A.
      Itu bukan gambar rusak: barisnya memang masih data contoh, logonya
      menunjuk ke placehold.co. Gambar dari layanan placeholder sekarang
      diperlakukan sebagai "belum ada logo" dan diganti kartu nama yang
      memang dirancang. Namanya tetap dari database, tidak ada yang dikarang.
============================================================================= */

import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useMuat } from '../../lib/kait';
import { Memuat } from '../../komponen/Keadaan';
import { useSesi } from '../../lib/sesi';
import type { Acara } from '../../types/api';

interface Sponsor {
  id: number;
  nama: string;
  logo_url: string;
  tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'MEDIA_PARTNER';
  url: string | null;
}

/** Server sudah mengelompokkan sponsor per tier, jadi tidak perlu disaring
 *  lagi di sini. Bentuknya objek, bukan daftar datar. */
type SponsorPerTier = Record<Sponsor['tier'], Sponsor[]>;

interface Isi {
  pengaturan: Record<string, unknown>;
  acara: Acara[];
  sponsor: SponsorPerTier;
}

// Empat tier, sesuai yang diterima database. Mockup baru menggambar tiga;
// Media Partner ikut di sini supaya Divisi Pendanaan tidak kehabisan tempat
// waktu menjualnya. Tinggi kartunya berbeda per tier supaya yang membayar
// paling mahal memang terlihat paling besar.
const TIER: {
  kunci: Sponsor['tier'];
  label: string;
  tinggi: string;
  kolom: string;
}[] = [
  { kunci: 'PLATINUM', label: 'Platinum', tinggi: 'h-28 sm:h-32', kolom: 'grid-cols-1 sm:grid-cols-2' },
  { kunci: 'GOLD', label: 'Gold', tinggi: 'h-24 sm:h-28', kolom: 'grid-cols-2 sm:grid-cols-3' },
  { kunci: 'SILVER', label: 'Silver', tinggi: 'h-20 sm:h-24', kolom: 'grid-cols-2 sm:grid-cols-4' },
  { kunci: 'MEDIA_PARTNER', label: 'Media Partner', tinggi: 'h-20 sm:h-24', kolom: 'grid-cols-2 sm:grid-cols-4' },
];

export default function Landing() {
  const { masuk } = useSesi();
  const { data, memuat } = useMuat<Isi>(async (signal) => {
    const [pengaturan, acara, sponsor] = await Promise.all([
      api
        .get<Record<string, unknown>>('/settings/publik', { signal, tanpaLogin: true })
        .catch(() => ({}) as Record<string, unknown>),
      api.get<Acara[]>('/events', { signal, tanpaLogin: true }).catch(() => []),
      api
        .get<SponsorPerTier>('/sponsors', { signal, tanpaLogin: true })
        .catch(() => ({}) as SponsorPerTier),
    ]);
    return { pengaturan, acara: acara ?? [], sponsor: sponsor ?? ({} as SponsorPerTier) };
  }, []);

  if (memuat) return <Memuat />;

  const harga = data?.pengaturan?.harga_tampil as string | undefined;
  const batas = data?.pengaturan?.batas_akhir_pembayaran as string | undefined;
  const dibuka = data?.pengaturan?.registrasi_dibuka !== false;

  const acara = (data?.acara ?? []).slice().sort((a, b) => a.urutan - b.urutan);

  return (
    <div className="pb-20">
      <Hero acara={acara} />

      {/* Tulisan raksasa Campus Goes To Kampoeng di belakang isi halaman,
          seperti di mockup. aria-hidden: buat pembaca layar ini cuma
          pengulangan nama acara yang sudah disebut di tempat lain. */}
      <div className="relative overflow-hidden px-6 pt-6 lg:pt-10">
        <p
          aria-hidden
          className="pointer-events-none absolute -left-10 top-8 -rotate-[14deg] select-none text-[clamp(2.8rem,13vw,8rem)] font-black leading-[0.82] tracking-tight text-slate-900/[0.06] lg:left-[4%]"
        >
          Campus
          <br />
          Goes
          <br />
          To
          <br />
          Kampoeng
        </p>

        <div className="relative mx-auto max-w-6xl">
          <h1 className="judul-tebal text-[clamp(2rem,8.6vw,5.5rem)] whitespace-nowrap">
            Selamat Datang !
          </h1>

          <p className="mt-3 max-w-xl text-base leading-snug text-slate-700 lg:text-xl">
            {masuk
              ? 'Senang kamu kembali. Lanjutkan dari dashboard kamu.'
              : 'Sepertinya anda belum memiliki akun silahkan masuk atau daftar'}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 lg:mt-8 lg:gap-4">
            {masuk ? (
              <Link
                to="/dashboard"
                className="tombol-utama px-7 py-3 text-[15px] lg:px-10 lg:py-4 lg:text-lg"
              >
                Buka Dashboard &gt;
              </Link>
            ) : dibuka ? (
              <Link
                to="/masuk"
                className="tombol-utama px-7 py-3 text-[15px] lg:px-10 lg:py-4 lg:text-lg"
              >
                Masuk atau Daftar &gt;
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-full bg-slate-200 px-7 py-3 text-[15px] font-bold text-slate-500 lg:px-10 lg:py-4 lg:text-lg">
                Pendaftaran Ditutup
              </span>
            )}

            <Link
              to="/cek-status"
              className="bisa-ditekan active:bisa-ditekan-aktif rounded-full border-2 border-slate-300 px-7 py-3 text-[15px] font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-50 lg:px-10 lg:py-4 lg:text-lg"
            >
              Cek Status
            </Link>
          </div>

          {(harga || batas) && (
            <p className="mt-5 text-sm text-slate-500 lg:text-base">
              {harga && <span className="font-bold text-merek-magenta">{harga}</span>}
              {harga && batas && ' · '}
              {batas && <>Pendaftaran ditutup {batas}</>}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto mt-14 max-w-6xl space-y-16 px-4 lg:mt-20 lg:space-y-24">
        {acara.length > 0 && <RangkaianAcara acara={acara} />}
        <DidukungOleh sponsor={data?.sponsor} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Hero dengan carousel rangkaian acara.
 *
 * Gambarnya cuma satu, dan memang cuma ada satu: tabel events tidak punya
 * kolom gambar, dan menambah kolom ke database demi hiasan halaman depan
 * bukan tukar-tambah yang masuk akal. Jadi yang berpindah adalah isi
 * slidenya, di atas gambar yang sama.
 *
 * Panah dan titik HANYA digambar kalau acaranya memang lebih dari satu.
 * Panah yang tidak memindahkan apa-apa lebih buruk daripada tidak ada panah.
 */
function Hero({ acara }: { acara: Acara[] }) {
  const [slide, setSlide] = useState(0);
  const banyak = acara.length;
  const wadah = useRef<HTMLDivElement>(null);
  const sentuhX = useRef<number | null>(null);

  const ke = useCallback(
    (n: number) => setSlide(((n % banyak) + banyak) % banyak),
    [banyak],
  );

  // Panah kiri-kanan papan ketik, tapi hanya saat carouselnya sedang difokus.
  // Dipasang di elemennya, bukan di window, supaya tidak merebut panah dari
  // orang yang sedang menggulir halaman.
  function saatTombol(e: React.KeyboardEvent) {
    if (banyak < 2) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      ke(slide - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      ke(slide + 1);
    }
  }

  // Geser jari. Ambangnya 40px supaya ketukan biasa tidak terhitung geseran.
  function mulaiSentuh(e: React.TouchEvent) {
    sentuhX.current = e.touches[0]?.clientX ?? null;
  }
  function selesaiSentuh(e: React.TouchEvent) {
    const awal = sentuhX.current;
    sentuhX.current = null;
    if (awal === null || banyak < 2) return;
    const beda = (e.changedTouches[0]?.clientX ?? awal) - awal;
    if (Math.abs(beda) < 40) return;
    ke(beda < 0 ? slide + 1 : slide - 1);
  }

  const a = acara[slide];

  return (
    <section className="relative">
      <div
        ref={wadah}
        role={banyak > 1 ? 'group' : undefined}
        aria-roledescription={banyak > 1 ? 'carousel' : undefined}
        aria-label={banyak > 1 ? 'Rangkaian acara' : undefined}
        tabIndex={banyak > 1 ? 0 : undefined}
        onKeyDown={saatTombol}
        onTouchStart={mulaiSentuh}
        onTouchEnd={selesaiSentuh}
        className="relative h-[min(46dvh,21rem)] min-h-64 w-full overflow-hidden sm:h-[min(56dvh,28rem)] lg:h-[min(64dvh,36rem)]"
      >
        <img
          src="/hero-kampoeng.jpg"
          alt=""
          className="h-full w-full object-cover"
        />

        {/* Tirai gelap dari bawah. Tanpa ini tulisan putih di atas foto
            terang tidak terbaca di bawah matahari, dan halaman depan dibuka
            paling sering justru di luar ruangan. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
        />

        {a && (
          <div className="absolute inset-x-0 bottom-0 px-5 pb-14 sm:px-10 sm:pb-20 lg:px-16 lg:pb-28">
            <div
              // key memaksa elemennya dibuat ulang tiap slide berganti, jadi
              // animasi masuknya jalan lagi. Tanpa key dia cuma sekali.
              key={a.id}
              className="masuk-naik mx-auto max-w-6xl"
            >
              {banyak > 1 && (
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80 sm:text-xs">
                  Acara {slide + 1} dari {banyak}
                </p>
              )}
              <h2 className="judul-tebal mt-1.5 text-[clamp(1.6rem,5.5vw,3.5rem)] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                {a.nama}
              </h2>
              <p className="mt-1 text-sm font-bold text-white/90 sm:text-base lg:text-lg">
                {tanggalPanjang(a.tanggal)}
              </p>
              {a.deskripsi && (
                <p className="mt-2 hidden max-w-2xl text-sm leading-snug text-white/85 sm:block sm:text-base">
                  {a.deskripsi}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Pembaca layar diberi tahu slide mana yang sedang tampil, karena
            perpindahannya tidak menggeser fokus ke mana pun. */}
        <p aria-live="polite" className="sr-only">
          {a ? `Acara ${slide + 1} dari ${banyak}: ${a.nama}` : ''}
        </p>

        {banyak > 1 && (
          <>
            <PanahHero arah="kiri" onClick={() => ke(slide - 1)} />
            <PanahHero arah="kanan" onClick={() => ke(slide + 1)} />

            <div className="absolute bottom-[3.75rem] right-4 z-20 flex items-center gap-1.5 sm:bottom-20 sm:right-10 lg:bottom-28 lg:right-16">
              {acara.map((x, i) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => ke(i)}
                  aria-label={`Lihat ${x.nama}`}
                  aria-current={i === slide}
                  className="group flex h-11 w-5 items-center justify-center"
                >
                  <span
                    className={`block h-2 rounded-full transition-all duration-200 ${
                      i === slide
                        ? 'w-6 bg-white'
                        : 'w-2 bg-white/50 group-hover:bg-white/80'
                    }`}
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <img
        src="/logo-cgtk.png"
        alt="CGTK"
        className="relative z-10 mx-auto -mt-12 w-[47%] max-w-[17rem] drop-shadow-[0_6px_14px_rgba(15,42,70,0.35)] sm:-mt-16 lg:-mt-20 lg:max-w-[22rem]"
      />
    </section>
  );
}

/**
 * Panah carousel.
 *
 * Lingkarannya 44px, batas bawah yang masih bisa ditekan jempol dengan
 * yakin. Versi sebelumnya 36px dan cuma bergaris tipis, jadi di atas foto
 * terang dia nyaris tidak terlihat sebagai tombol.
 */
function PanahHero({ arah, onClick }: { arah: 'kiri' | 'kanan'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={arah === 'kiri' ? 'Acara sebelumnya' : 'Acara berikutnya'}
      className={`bisa-ditekan active:bisa-ditekan-aktif absolute top-[38%] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 sm:top-1/2 text-white ring-1 ring-white/70 backdrop-blur-sm hover:bg-black/55 sm:h-14 sm:w-14 ${
        arah === 'kiri' ? 'left-3 sm:left-6' : 'right-3 sm:right-6'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-6 w-6 sm:h-7 sm:w-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {arah === 'kiri' ? <path d="M15 5 8 12l7 7" /> : <path d="m9 5 7 7-7 7" />}
      </svg>
    </button>
  );
}

/* -------------------------------------------------------------------------- */

function RangkaianAcara({ acara }: { acara: Acara[] }) {
  return (
    <section>
      <h2 className="judul-tebal text-2xl lg:text-4xl">Rangkaian Acara</h2>
      <p className="mt-1.5 text-sm text-slate-500 lg:text-base">
        Empat hal yang terjadi sepanjang CGTK. Jam tiap sesinya ada di halaman
        Jadwal.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:mt-8 lg:grid-cols-4 lg:gap-5">
        {acara.map((a, i) => (
          <li key={a.id}>
            <Link
              to="/schedule"
              style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
              className="masuk-naik kartu kartu-bisa-klik flex h-full flex-col p-5 ring-1 ring-slate-200 lg:p-6"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-utama-50 text-sm font-black text-utama-700 lg:h-11 lg:w-11 lg:text-base">
                {a.urutan}
              </span>

              <h3 className="judul-tebal mt-4 text-lg lg:text-xl">{a.nama}</h3>

              {a.tanggal && (
                <p className="mt-1 text-sm font-bold text-jadwal-tanggal">
                  {tanggalPanjang(a.tanggal)}
                </p>
              )}

              {a.deskripsi && (
                <p className="mt-2 line-clamp-3 text-sm leading-snug text-slate-600">
                  {a.deskripsi}
                </p>
              )}

              <span className="mt-auto pt-4 text-sm font-black text-merek-magenta">
                Lihat jadwal &rsaquo;
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Alamat logo yang sebenarnya bukan logo.
 *
 * Baris sponsor yang ada sekarang masih data contoh dari seed, logonya
 * menunjuk ke layanan gambar placeholder. Gambarnya berhasil dimuat, jadi
 * tidak ada onError yang menyala, dan yang tampil di halaman depan adalah
 * kotak abu-abu bertuliskan PLATINUM seperti gambar rusak.
 *
 * Alamat seperti itu diperlakukan sebagai "belum ada logo". Namanya tetap
 * diambil dari database; tidak ada nama atau logo yang dikarang di sini.
 */
const INANG_PLACEHOLDER = [
  'placehold.co',
  'placeholder.com',
  'via.placeholder.com',
  'dummyimage.com',
  'placekitten.com',
];

function logoAsli(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return !INANG_PLACEHOLDER.some((h) => new URL(url).hostname.endsWith(h));
  } catch {
    return false;
  }
}

function DidukungOleh({ sponsor }: { sponsor: SponsorPerTier | undefined }) {
  const adaIsi = Object.values(sponsor ?? {}).some((v) => v.length > 0);
  if (!adaIsi) return null;

  return (
    <section>
      <h2 className="judul-tebal text-2xl lg:text-4xl">Didukung Oleh</h2>

      <div className="mt-6 space-y-8 lg:mt-8 lg:space-y-10">
        {TIER.map((t) => {
          const isi = sponsor?.[t.kunci] ?? [];
          if (isi.length === 0) return null;

          return (
            <div key={t.kunci}>
              <div className="flex items-center gap-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  {t.label}
                </p>
                <span aria-hidden className="h-px flex-1 bg-slate-200" />
              </div>

              <div className={`mt-4 grid gap-4 ${t.kolom}`}>
                {isi.map((s) => (
                  <KartuSponsor key={s.id} sponsor={s} tinggi={t.tinggi} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function KartuSponsor({ sponsor, tinggi }: { sponsor: Sponsor; tinggi: string }) {
  // Dimulai dari apakah alamatnya memang logo; kalau gambarnya gagal dimuat
  // belakangan, keadaannya pindah ke sini juga.
  const [pakaiGambar, setPakaiGambar] = useState(logoAsli(sponsor.logo_url));

  return (
    <div
      className={`flex ${tinggi} items-center justify-center rounded-2xl bg-white p-4 ring-1 ring-slate-200`}
    >
      {pakaiGambar ? (
        <img
          src={sponsor.logo_url}
          alt={sponsor.nama}
          loading="lazy"
          onError={() => setPakaiGambar(false)}
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        /* Kartu nama, bukan kotak abu-abu. Dipakai selama logonya belum
           diunggah Divisi Pendanaan, dan sengaja terlihat seperti pilihan
           desain, bukan seperti gambar yang gagal dimuat. */
        <span className="judul-tebal px-2 text-center text-sm leading-tight text-merek-navy sm:text-base">
          {sponsor.nama}
        </span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * 2026-10-26 -> 26 Oktober 2026.
 *
 * Tanggal mentah ISO muncul apa adanya di halaman depan, dan itu satu-satunya
 * tempat di seluruh web ini yang terlihat seperti isian database yang lupa
 * dirapikan. Kalau formatnya tidak terbaca, yang ditampilkan tetap teks
 * aslinya: lebih baik tanggal jelek daripada tanggal hilang.
 */
function tanggalPanjang(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
