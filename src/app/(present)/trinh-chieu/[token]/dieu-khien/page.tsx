import { connection } from 'next/server';
import { Suspense } from 'react';
import { PresentRemote } from '@/components/present/PresentRemote';
import { loadPresentation } from '../../load';

// Điện thoại điều khiển màn chiếu (35.19): mở bằng mã QR trên màn chiếu, cùng tài khoản với máy chiếu.
export default function PresentRemotePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<div aria-busy="true" className="h-dvh animate-pulse bg-stone" />}>
      <RemoteData params={params} />
    </Suspense>
  );
}

async function RemoteData({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const p = await loadPresentation(token, `/trinh-chieu/${token}/dieu-khien`);
  return <PresentRemote key={p.initial.mode} token={token} title={p.title} slides={p.slides} initial={p.initial} />;
}
