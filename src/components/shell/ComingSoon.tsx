// Trang tạm cho màn hình chưa làm. Ghi rõ task trong PLAN.md sẽ làm màn này.
export function ComingSoon({ title, task }: { title: string; task: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-h1 font-extrabold leading-tight tracking-tight text-ink">{title}</h1>
      <p className="text-base text-muted">Màn hình này sẽ làm ở task {task} trong PLAN.md.</p>
    </section>
  );
}
