import { Link } from 'react-router-dom';

/* Halaman sementara, isinya peta rute biar gampang loncat waktu mengerjakan.
   Nanti diganti Landing Page punya Fariz. */

const rute: { alamat: string; nama: string; punya: string }[] = [
  { alamat: '/p/faq', nama: 'Halaman Info', punya: 'RIJAL' },
  { alamat: '/campuses', nama: 'Direktori Kampus', punya: 'RIJAL' },
  { alamat: '/schedule', nama: 'Jadwal Acara', punya: 'RIJAL' },
  { alamat: '/announcements', nama: 'Pengumuman', punya: 'RIJAL' },
  { alamat: '/booths', nama: 'Daftar Booth', punya: 'RIJAL' },
  { alamat: '/cek-status', nama: 'Cek Status Pendaftaran', punya: 'RIJAL' },
  { alamat: '/admin/jadwal', nama: 'Admin: Kelola Jadwal', punya: 'RIJAL' },
  { alamat: '/admin/sponsor', nama: 'Admin: Kelola Sponsor', punya: 'RIJAL' },
  { alamat: '/lo', nama: 'Dashboard LO', punya: 'RIJAL' },
  { alamat: '/dashboard', nama: 'Dashboard Peserta', punya: 'Fariz' },
  { alamat: '/scan', nama: 'Scanner Presensi', punya: 'Fariz' },
  { alamat: '/quiz', nama: 'Kuis', punya: 'Haqi' },
  { alamat: '/passport', nama: 'Paspor Kampus', punya: 'Haqi' },
];

export default function Beranda() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Web App CGTK 2027</h1>
      <p className="mt-1 text-sm text-slate-500">
        Halaman ini sementara, buat loncat-loncat waktu mengerjakan.
      </p>

      <ul className="mt-6 divide-y divide-slate-200 dark:divide-slate-800">
        {rute.map((r) => (
          <li key={r.alamat} className="flex items-center justify-between py-3">
            <Link to={r.alamat} className="text-sm font-medium hover:underline">
              {r.nama}
            </Link>
            <span className="text-xs text-slate-400">{r.punya}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
