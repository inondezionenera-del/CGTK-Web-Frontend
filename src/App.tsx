/* =============================================================================
   Peta seluruh alamat halaman, beserta pemiliknya.

   ATURAN: kalau kamu menambah halaman, tambahkan barisnya di sini juga, dan
   tulis nama pemiliknya di komentar. File ini yang jadi rujukan waktu ada yang
   bertanya "halaman ini siapa yang pegang".

   Jangan mengubah baris milik orang lain tanpa ngomong dulu.
============================================================================= */

import { Routes, Route } from 'react-router-dom';
import { Kerangka } from './komponen/Kerangka';
import { WajibLogin } from './komponen/WajibLogin';

import Beranda from './halaman/Beranda';
import TidakDitemukan from './halaman/TidakDitemukan';
import BelumDibuat from './halaman/BelumDibuat';
import HalamanInfo from './halaman/rijal/HalamanInfo';

export default function App() {
  return (
    <Routes>
      <Route element={<Kerangka />}>
        <Route index element={<Beranda />} />

        {/* ---------------- RIJAL ---------------- */}
        <Route path="/p/:slug" element={<HalamanInfo />} />
        <Route path="/campuses" element={<BelumDibuat punya="RIJAL" />} />
        <Route path="/campuses/:id" element={<BelumDibuat punya="RIJAL" />} />
        <Route path="/schedule" element={<BelumDibuat punya="RIJAL" />} />
        <Route path="/announcements" element={<BelumDibuat punya="RIJAL" />} />
        <Route path="/booths" element={<BelumDibuat punya="RIJAL" />} />
        <Route path="/booths/:id" element={<BelumDibuat punya="RIJAL" />} />
        <Route path="/cek-status" element={<BelumDibuat punya="RIJAL" />} />
        <Route
          path="/admin/jadwal"
          element={<WajibLogin><BelumDibuat punya="RIJAL" /></WajibLogin>}
        />
        <Route
          path="/admin/sponsor"
          element={<WajibLogin><BelumDibuat punya="RIJAL" /></WajibLogin>}
        />
        <Route
          path="/admin/booths/poster"
          element={<WajibLogin><BelumDibuat punya="RIJAL" /></WajibLogin>}
        />
        <Route path="/lo" element={<WajibLogin><BelumDibuat punya="RIJAL" /></WajibLogin>} />
        <Route
          path="/lo/statistik"
          element={<WajibLogin><BelumDibuat punya="RIJAL" /></WajibLogin>}
        />

        {/* ---------------- FARIZ ---------------- */}
        <Route path="/masuk" element={<BelumDibuat punya="Fariz" />} />
        <Route path="/daftar" element={<BelumDibuat punya="Fariz" />} />
        <Route path="/bayar" element={<WajibLogin><BelumDibuat punya="Fariz" /></WajibLogin>} />
        <Route path="/dashboard" element={<WajibLogin><BelumDibuat punya="Fariz" /></WajibLogin>} />
        <Route path="/scan" element={<WajibLogin><BelumDibuat punya="Fariz" /></WajibLogin>} />
        <Route path="/admin" element={<WajibLogin><BelumDibuat punya="Fariz" /></WajibLogin>} />

        {/* ---------------- HAQI ---------------- */}
        <Route path="/quiz" element={<WajibLogin><BelumDibuat punya="Haqi" /></WajibLogin>} />
        <Route path="/passport" element={<WajibLogin><BelumDibuat punya="Haqi" /></WajibLogin>} />
        <Route path="/leaderboard" element={<BelumDibuat punya="Haqi" />} />
        <Route path="/missions" element={<WajibLogin><BelumDibuat punya="Haqi" /></WajibLogin>} />
        <Route
          path="/scan-booth"
          element={<WajibLogin><BelumDibuat punya="Haqi" /></WajibLogin>}
        />

        <Route path="*" element={<TidakDitemukan />} />
      </Route>
    </Routes>
  );
}
