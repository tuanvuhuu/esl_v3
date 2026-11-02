'use client';

import { useState, useTransition } from 'react';
import { saveLessonAction } from '@/app/(app)/bai-giang/actions';
import type { CampusOption } from '@/lib/campus';
import type { LessonRow } from '@/lib/queries/lessons';
import { ComboBox, TextAreaAutoHeight, TextInput } from '@/components-ui';
import { Btn } from '@/components/ui/Btn';
import { Field, FormFooter } from '@/components/ui/Field';
import { Alert } from '@/components/ui/primitives';

// Form tạo và sửa bài giảng: tiêu đề, mục tiêu, nội dung và cơ sở dùng bài giảng.
export function LessonForm({
  lesson,
  campuses,
  defaultCampusIds,
  onDone,
  onCancel,
}: {
  lesson: LessonRow | null;
  campuses: CampusOption[];
  defaultCampusIds: number[]; // cơ sở đang chọn ở thanh trên, để tạo bài ngay trong cơ sở đó
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(lesson?.title ?? '');
  const [objectives, setObjectives] = useState(lesson?.objectives ?? '');
  const [content, setContent] = useState(lesson?.content ?? '');
  const [campusIds, setCampusIds] = useState<string[]>((lesson?.campusIds ?? defaultCampusIds).map(String));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const r = await saveLessonAction(lesson?.id ?? null, { title, objectives, content, campusIds: campusIds.map(Number) });
      if (!r.ok) return setError(r.message ?? 'Không lưu được');
      onDone(r.message ?? 'Đã lưu bài giảng');
    });
  }

  return (
    <div className="flex flex-col gap-3.5">
      {error && (
        <Alert>
          {error}
        </Alert>
      )}

      <Field label="Tiêu đề *">
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VD: Unit 3 — Past simple"
          aria-label="Tiêu đề bài giảng"
          block
        />
      </Field>

      <Field label="Cơ sở dùng bài giảng *" hint="Chọn một hoặc nhiều cơ sở">
        <ComboBox
          label="Cơ sở dùng bài giảng *"
          multiple
          values={campusIds}
          onChange={setCampusIds}
          options={campuses.map((c) => ({ value: String(c.id), label: c.name }))}
          block
        />
      </Field>

      <Field label="Mục tiêu" hint="Viết theo dạng học sinh làm được gì">
        <TextAreaAutoHeight
          value={objectives}
          onChange={(e) => setObjectives(e.target.value)}
          rows={3}
          placeholder="VD: Học sinh kể lại một việc đã làm hôm qua bằng quá khứ đơn"
          aria-label="Mục tiêu bài giảng"
        />
      </Field>

      <Field label="Nội dung">
        <TextAreaAutoHeight
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          placeholder="Các phần chính của buổi học, bài tập về nhà gợi ý, lưu ý"
          aria-label="Nội dung bài giảng"
        />
      </Field>

      <FormFooter>
        <Btn onClick={onCancel}>
          Huỷ
        </Btn>
        <Btn variant="primary" loading={pending} disabled={pending} onClick={save}>
          {pending ? 'Đang lưu…' : 'Lưu bài giảng'}
        </Btn>
      </FormFooter>
    </div>
  );
}
