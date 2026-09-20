import { Link } from 'react-router-dom';

export default function TidakDitemukan() {
  return (
    <div className="py-20 text-center">
      <p className="text-lg font-medium">Halaman tidak ditemukan</p>
      <Link to="/" className="mt-4 inline-block text-sm text-slate-500 underline">
        Kembali ke beranda
      </Link>
    </div>
  );
}
