// Sinh câu lệnh SQL nạp kho từ (P36.4): bộ từ khởi đầu trước, rồi từ A1, A2 của CEFR-J chưa có trong bộ khởi đầu.
// Chạy: node --import tsx scripts/build-vocab-seed.ts > out.sql, rồi dán vào cuối migration 0018_vocab_items.sql.
import { readFileSync } from 'node:fs';
import { STARTER_WORDS } from '../src/lib/vocab-starter';

// Chủ đề CEFR-J (Core Inventory) trùng với chủ đề của bộ khởi đầu thì gộp; còn lại giữ tên gốc
const TOPIC_MAP: Record<string, string> = {
  'Food and drink': 'Food',
  'Family life': 'Family',
  Clothes: 'Clothes',
  'Objects and rooms': 'Home',
  Education: 'School',
  Weather: 'Weather',
  Colours: 'Colours',
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const cells: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (c === '"') quoted = false;
        else cur += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') {
        cells.push(cur);
        cur = '';
      } else cur += c;
    }
    cells.push(cur);
    rows.push(cells);
  }
  return rows;
}

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const rows: string[] = [];
const seen = new Set<string>();
const seenPair = new Set<string>();

for (const w of STARTER_WORDS) {
  const key = `${w.en.toLowerCase()}|${w.topic}`;
  if (seenPair.has(key)) continue;
  seenPair.add(key);
  seen.add(w.en.toLowerCase());
  rows.push(`(${q(w.en)}, '', ${q(w.level)}, ${q(w.topic)}, ${q(w.vi)}, ${q(w.emoji)}, 'starter')`);
}

const [, ...data] = parseCsv(readFileSync(new URL('../src/db/data/cefrj-1.5-a1-a2.csv', import.meta.url), 'utf8'));
for (const [headword, pos, level, topic1, topic2] of data) {
  const en = headword.split('/')[0].trim();
  if (!en || en.length > 60 || seen.has(en.toLowerCase())) continue;
  seen.add(en.toLowerCase());
  const raw = (topic1 || topic2 || '').trim();
  const topic = (TOPIC_MAP[raw] ?? raw).slice(0, 60);
  rows.push(`(${q(en)}, ${q(pos.slice(0, 30))}, ${q(level)}, ${q(topic)}, '', '', 'cefrj')`);
}

const CHUNK = 400;
const out: string[] = [];
for (let i = 0; i < rows.length; i += CHUNK) {
  out.push(
    `INSERT INTO "vocab_items" ("headword", "pos", "level", "topic", "meaning_vi", "emoji", "source") VALUES\n${rows.slice(i, i + CHUNK).join(',\n')}\nON CONFLICT DO NOTHING;`,
  );
}
process.stdout.write(out.join('--> statement-breakpoint\n') + '\n');
process.stderr.write(`${rows.length} từ\n`);
