import { useLocation } from 'react-router-dom';

/* Penambal sementara. Hapus barisnya di App.tsx begitu halamannya sudah jadi. */

export default function BelumDibuat({ punya }: { punya: string }) {
  const { pathname } = useLocation();
  return (
    <div className="py-16 text-center">
      <p className="font-medium">Halaman ini belum dibuat</p>
      <p className="mt-1 text-sm text-slate-500">
        <code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">{pathname}</code>
        {' '}bagiannya {punya}.
      </p>
    </div>
  );
}
