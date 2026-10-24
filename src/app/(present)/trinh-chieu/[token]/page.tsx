import { connection } from 'next/server';
import { Suspense } from 'react';
import { PresentStage } from '@/components/present/PresentStage';
import { loadPresentation } from '../load';

// Màn chiếu cho cả lớp (35.19), không có khung menu để chiếu toàn màn hình.
export default function PresentPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<div aria-busy="true" className="h-dvh animate-pulse bg-stone" />}>
      <PresentData params={params} />
    </Suspense>
  );
}

async function PresentData({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const p = await loadPresentation(token, `/trinh-chieu/${token}`);
  return (
    <PresentStage
      key={p.initial.mode}
      token={token}
      title={p.title}
      slides={p.slides}
      initial={p.initial}
      backHref={p.kind === 'assignment' ? `/bai-tap/${p.sourceId}` : '/tu-vung'}
      canSwitchMode={p.kind === 'word_list'}
    />
  );
}
