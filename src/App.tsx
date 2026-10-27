/* =============================================================================
   Peta seluruh alamat halaman, beserta pemiliknya.

   ATURAN: kalau kamu menambah halaman, tambahkan barisnya di sini juga, dan
   tulis nama pemiliknya di komentar. File ini yang jadi rujukan waktu ada yang
   bertanya "halaman ini siapa yang pegang".

   Jangan mengubah baris milik orang lain tanpa ngomong dulu.
============================================================================= */

import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Kerangka } from './komponen/Kerangka';
import { WajibLogin } from './komponen/WajibLogin';
import { Memuat } from './komponen/Keadaan';
import { OverlayPengumuman } from './komponen/Pengumuman';

import Landing from './halaman/fariz/Landing';
import TidakDitemukan from './halaman/TidakDitemukan';
import HalamanInfo from './halaman/rijal/HalamanInfo';
import CekStatus from './halaman/rijal/CekStatus';
import Jadwal from './halaman/rijal/Jadwal';
import Pengumuman from './halaman/rijal/Pengumuman';
import { DaftarBooth, DetailBooth } from './halaman/rijal/Booth';
import DetailKampus from './halaman/rijal/DetailKampus';
import AdminSponsor from './halaman/rijal/AdminSponsor';
import { DashboardLO, StatistikLO } from './halaman/rijal/LO';
import Kampus from './halaman/rijal/Kampus';
import AdminSaklar from './halaman/rijal/AdminSaklar';
import AdminLunas from './halaman/fariz/AdminLunas';
import Masuk from './halaman/fariz/Masuk';
import Daftar from './halaman/fariz/Daftar';
import Bayar from './halaman/fariz/Bayar';

// Dua halaman ini membawa pustaka berat: pembaca QR untuk scanner, penggambar
// QR untuk dashboard. Dimuat hanya ketika dibuka, supaya halaman pendaftaran
// yang dipakai lima ratus orang di rumah tetap ringan di sinyal lambat.
const Dashboard = lazy(() => import('./halaman/fariz/Dashboard'));
const Scanner = lazy(() => import('./halaman/fariz/Scanner'));
const ScannerBooth = lazy(() => import('./halaman/haqi/ScannerBooth'));
const Paspor = lazy(() => import('./halaman/haqi/Paspor'));
const Peringkat = lazy(() => import('./halaman/haqi/Peringkat'));
const MisiHalaman = lazy(() => import('./halaman/haqi/Misi'));
const Kuis = lazy(() => import('./halaman/haqi/Kuis'));
const PosterBooth = lazy(() => import('./halaman/rijal/PosterBooth'));

export default function App() {
  return (
    <Suspense fallback={<Memuat />}>
    <OverlayPengumuman />
    <Routes>
      <Route element={<Kerangka />}>
        <Route index element={<Landing />} />

        {/* ---------------- RIJAL ---------------- */}
        <Route path="/p/:slug" element={<HalamanInfo />} />
        <Route path="/campuses" element={<Kampus />} />
        <Route path="/campuses/:id" element={<DetailKampus />} />
        <Route path="/schedule" element={<Jadwal />} />
        <Route path="/announcements" element={<Pengumuman />} />
        <Route path="/booths" element={<DaftarBooth />} />
        <Route path="/booths/:id" element={<DetailBooth />} />
        <Route path="/cek-status" element={<CekStatus />} />
        <Route path="/admin/jadwal" element={<WajibLogin><AdminSaklar /></WajibLogin>} />
        <Route path="/admin/sponsor" element={<WajibLogin><AdminSponsor /></WajibLogin>} />
        <Route path="/admin/booths/poster" element={<WajibLogin><PosterBooth /></WajibLogin>} />
        <Route path="/lo" element={<WajibLogin><DashboardLO /></WajibLogin>} />
        <Route path="/lo/statistik" element={<WajibLogin><StatistikLO /></WajibLogin>} />

        {/* ---------------- FARIZ ---------------- */}
        <Route path="/masuk" element={<Masuk />} />
        <Route path="/daftar" element={<WajibLogin><Daftar /></WajibLogin>} />
        <Route path="/bayar" element={<WajibLogin><Bayar /></WajibLogin>} />
        <Route path="/dashboard" element={<WajibLogin><Dashboard /></WajibLogin>} />
        <Route path="/scan" element={<WajibLogin><Scanner /></WajibLogin>} />
        <Route path="/admin" element={<WajibLogin><AdminLunas /></WajibLogin>} />
        <Route path="/admin/lunas" element={<WajibLogin><AdminLunas /></WajibLogin>} />

        {/* ---------------- HAQI ---------------- */}
        <Route path="/quiz" element={<WajibLogin><Kuis /></WajibLogin>} />
        <Route path="/passport" element={<WajibLogin><Paspor /></WajibLogin>} />
        <Route path="/leaderboard" element={<WajibLogin><Peringkat /></WajibLogin>} />
        <Route path="/missions" element={<WajibLogin><MisiHalaman /></WajibLogin>} />
        <Route path="/scan-booth" element={<WajibLogin><ScannerBooth /></WajibLogin>} />
        <Route path="/scanner/booth" element={<WajibLogin><ScannerBooth /></WajibLogin>} />

        <Route path="*" element={<TidakDitemukan />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
