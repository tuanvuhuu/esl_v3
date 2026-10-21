// Bộ từ khởi đầu cho Soạn nhanh (P36): từ hay dạy cho trẻ 5–11 tuổi, kèm nghĩa tiếng Việt, emoji, chủ đề, trình độ.
// Trình độ đối chiếu với CEFR-J Wordlist 1.5 (Tono Laboratory, ĐH Ngoại ngữ Tokyo; dùng thương mại miễn phí, phải ghi nguồn):
// từ A1 hay gặp nhất với trẻ nhỏ xếp Pre-A1, còn lại theo CEFR-J. Nghĩa và emoji do trung tâm soạn.
// Emoji là ký tự Unicode, máy tự vẽ, không phải ảnh nên không vướng bản quyền.

export type StarterTopic =
  | 'Animals'
  | 'Colours'
  | 'Numbers'
  | 'Family'
  | 'Body'
  | 'Food'
  | 'Clothes'
  | 'School'
  | 'Toys'
  | 'Home'
  | 'Weather'
  | 'Transport'
  | 'Actions'
  | 'Feelings';

export type StarterWord = { en: string; vi: string; emoji: string; topic: StarterTopic; level: 'Pre-A1' | 'A1' | 'A2' };

export const STARTER_TOPIC_LABELS: Record<StarterTopic, string> = {
  Animals: 'Con vật',
  Colours: 'Màu sắc',
  Numbers: 'Số đếm',
  Family: 'Gia đình',
  Body: 'Cơ thể',
  Food: 'Đồ ăn, đồ uống',
  Clothes: 'Quần áo',
  School: 'Trường học',
  Toys: 'Đồ chơi',
  Home: 'Nhà cửa',
  Weather: 'Thời tiết',
  Transport: 'Phương tiện',
  Actions: 'Hoạt động',
  Feelings: 'Cảm xúc',
};

type Row = [en: string, vi: string, emoji: string, level: StarterWord['level']];
const P = 'Pre-A1' as const;
const A1 = 'A1' as const;
const A2 = 'A2' as const;

const DATA: Record<StarterTopic, Row[]> = {
  Animals: [
    ['cat', 'con mèo', '🐱', P], ['dog', 'con chó', '🐶', P], ['fish', 'con cá', '🐟', P], ['bird', 'con chim', '🐦', P],
    ['duck', 'con vịt', '🦆', P], ['cow', 'con bò', '🐄', P], ['horse', 'con ngựa', '🐴', P], ['chicken', 'con gà', '🐔', P],
    ['rabbit', 'con thỏ', '🐰', P], ['elephant', 'con voi', '🐘', P], ['monkey', 'con khỉ', '🐵', P], ['lion', 'sư tử', '🦁', P],
    ['tiger', 'con hổ', '🐯', P], ['frog', 'con ếch', '🐸', P], ['pig', 'con lợn', '🐷', A1], ['sheep', 'con cừu', '🐑', A1],
    ['bear', 'con gấu', '🐻', A1], ['snake', 'con rắn', '🐍', A1], ['mouse', 'con chuột', '🐭', A1], ['giraffe', 'hươu cao cổ', '🦒', A1],
    ['zebra', 'ngựa vằn', '🦓', A1], ['spider', 'con nhện', '🕷️', A1], ['bee', 'con ong', '🐝', A2], ['butterfly', 'con bướm', '🦋', A2],
    ['dolphin', 'cá heo', '🐬', A2], ['whale', 'cá voi', '🐳', A2], ['penguin', 'chim cánh cụt', '🐧', A2], ['crocodile', 'cá sấu', '🐊', A2],
  ],
  Colours: [
    ['red', 'màu đỏ', '🔴', P], ['blue', 'màu xanh dương', '🔵', P], ['yellow', 'màu vàng', '🟡', P], ['green', 'màu xanh lá', '🟢', P],
    ['orange', 'màu cam', '🟠', P], ['purple', 'màu tím', '🟣', P], ['black', 'màu đen', '⚫', P], ['white', 'màu trắng', '⚪', P],
    ['brown', 'màu nâu', '🟤', P], ['pink', 'màu hồng', '🩷', P], ['grey', 'màu xám', '🩶', A1],
  ],
  Numbers: [
    ['one', 'số một', '1️⃣', P], ['two', 'số hai', '2️⃣', P], ['three', 'số ba', '3️⃣', P], ['four', 'số bốn', '4️⃣', P],
    ['five', 'số năm', '5️⃣', P], ['six', 'số sáu', '6️⃣', P], ['seven', 'số bảy', '7️⃣', P], ['eight', 'số tám', '8️⃣', P],
    ['nine', 'số chín', '9️⃣', P], ['ten', 'số mười', '🔟', P], ['eleven', 'số mười một', '', A1], ['twelve', 'số mười hai', '', A1],
    ['twenty', 'số hai mươi', '', A1], ['hundred', 'một trăm', '💯', A2],
  ],
  Family: [
    ['mother', 'mẹ', '👩', P], ['father', 'bố', '👨', P], ['baby', 'em bé', '👶', P], ['sister', 'chị, em gái', '👧', P],
    ['brother', 'anh, em trai', '👦', P], ['grandmother', 'bà', '👵', P], ['grandfather', 'ông', '👴', P], ['family', 'gia đình', '👨‍👩‍👧', P],
    ['aunt', 'cô, dì', '', A1], ['uncle', 'chú, bác', '', A1], ['cousin', 'anh chị em họ', '', A1], ['parents', 'bố mẹ', '', A2],
  ],
  Body: [
    ['head', 'cái đầu', '🗣️', P], ['eye', 'mắt', '👁️', P], ['ear', 'tai', '👂', P], ['nose', 'mũi', '👃', P],
    ['mouth', 'miệng', '👄', P], ['hand', 'bàn tay', '✋', P], ['foot', 'bàn chân', '🦶', P], ['leg', 'chân', '🦵', P],
    ['arm', 'cánh tay', '💪', P], ['hair', 'tóc', '💇', P], ['face', 'khuôn mặt', '🙂', P], ['tooth', 'răng', '🦷', A1],
    ['shoulder', 'vai', '', A2], ['knee', 'đầu gối', '', A2],
  ],
  Food: [
    ['apple', 'quả táo', '🍎', P], ['banana', 'quả chuối', '🍌', P], ['orange', 'quả cam', '🍊', P], ['milk', 'sữa', '🥛', P],
    ['water', 'nước', '💧', P], ['bread', 'bánh mì', '🍞', P], ['egg', 'quả trứng', '🥚', P], ['rice', 'cơm', '🍚', P],
    ['cake', 'bánh ngọt', '🍰', P], ['ice cream', 'kem', '🍦', P], ['juice', 'nước ép', '🧃', P], ['chicken', 'thịt gà', '🍗', P],
    ['carrot', 'cà rốt', '🥕', A1], ['tomato', 'cà chua', '🍅', A1], ['grapes', 'quả nho', '🍇', A1], ['watermelon', 'dưa hấu', '🍉', A1],
    ['pizza', 'bánh pizza', '🍕', A1], ['noodles', 'mì, phở', '🍜', A1], ['sandwich', 'bánh kẹp', '🥪', A1], ['cheese', 'phô mai', '🧀', A1],
    ['tea', 'trà', '🍵', A1], ['soup', 'súp, canh', '🍲', A2], ['vegetables', 'rau củ', '🥦', A2], ['breakfast', 'bữa sáng', '🍳', A2],
  ],
  Clothes: [
    ['hat', 'cái mũ', '👒', P], ['shoes', 'đôi giày', '👟', P], ['socks', 'đôi tất', '🧦', P], ['shirt', 'áo sơ mi', '👕', P],
    ['dress', 'váy liền', '👗', P], ['T-shirt', 'áo phông', '', P], ['trousers', 'quần dài', '👖', A1], ['jacket', 'áo khoác', '🧥', A1],
    ['skirt', 'chân váy', '', A1], ['glasses', 'kính mắt', '👓', A1], ['scarf', 'khăn quàng', '🧣', A2], ['gloves', 'găng tay', '🧤', A2],
  ],
  School: [
    ['book', 'quyển sách', '📕', P], ['pen', 'bút mực', '🖊️', P], ['pencil', 'bút chì', '✏️', P], ['bag', 'cặp sách', '🎒', P],
    ['ruler', 'thước kẻ', '📏', P], ['eraser', 'cục tẩy', '', P], ['teacher', 'giáo viên', '🧑‍🏫', P], ['school', 'trường học', '🏫', P],
    ['desk', 'bàn học', '', P], ['chair', 'cái ghế', '🪑', P], ['crayon', 'bút sáp màu', '🖍️', A1], ['scissors', 'cái kéo', '✂️', A1],
    ['classroom', 'lớp học', '', A1], ['board', 'cái bảng', '', A1], ['computer', 'máy tính', '💻', A1], ['homework', 'bài tập về nhà', '📝', A2],
  ],
  Toys: [
    ['ball', 'quả bóng', '⚽', P], ['doll', 'búp bê', '🪆', P], ['kite', 'cái diều', '🪁', P], ['car', 'ô tô đồ chơi', '🚗', P],
    ['robot', 'người máy', '🤖', P], ['teddy bear', 'gấu bông', '🧸', P], ['balloon', 'bóng bay', '🎈', P], ['game', 'trò chơi', '🎮', A1],
    ['puzzle', 'trò ghép hình', '🧩', A1], ['drum', 'cái trống', '🥁', A1], ['guitar', 'đàn ghi-ta', '🎸', A2],
  ],
  Home: [
    ['house', 'ngôi nhà', '🏠', P], ['bed', 'cái giường', '🛏️', P], ['door', 'cửa ra vào', '🚪', P], ['window', 'cửa sổ', '🪟', P],
    ['table', 'cái bàn', '', P], ['clock', 'đồng hồ', '🕒', P], ['lamp', 'cái đèn', '💡', A1], ['kitchen', 'nhà bếp', '', A1],
    ['bathroom', 'phòng tắm', '🛁', A1], ['bedroom', 'phòng ngủ', '', A1], ['garden', 'khu vườn', '🌷', A1], ['sofa', 'ghế sô pha', '🛋️', A2],
  ],
  Weather: [
    ['sun', 'mặt trời', '☀️', P], ['rain', 'mưa', '🌧️', P], ['snow', 'tuyết', '❄️', P], ['cloud', 'đám mây', '☁️', P],
    ['wind', 'gió', '🌬️', A1], ['rainbow', 'cầu vồng', '🌈', A1], ['hot', 'nóng', '🥵', A1], ['cold', 'lạnh', '🥶', A1],
    ['storm', 'cơn bão', '⛈️', A2],
  ],
  Transport: [
    ['bus', 'xe buýt', '🚌', P], ['bike', 'xe đạp', '🚲', P], ['train', 'tàu hoả', '🚆', P], ['plane', 'máy bay', '✈️', P],
    ['boat', 'con thuyền', '⛵', P], ['motorbike', 'xe máy', '🏍️', A1], ['taxi', 'xe taxi', '🚕', A1], ['ship', 'con tàu', '🚢', A1],
    ['helicopter', 'trực thăng', '🚁', A2],
  ],
  Actions: [
    ['run', 'chạy', '🏃', P], ['jump', 'nhảy', '🦘', P], ['swim', 'bơi', '🏊', P], ['sing', 'hát', '🎤', P],
    ['dance', 'nhảy múa', '💃', P], ['read', 'đọc', '📖', P], ['write', 'viết', '✍️', P], ['draw', 'vẽ', '🎨', P],
    ['eat', 'ăn', '🍽️', P], ['drink', 'uống', '🥤', P], ['sleep', 'ngủ', '😴', P], ['play', 'chơi', '🤹', P],
    ['walk', 'đi bộ', '🚶', A1], ['climb', 'leo trèo', '🧗', A1], ['cook', 'nấu ăn', '🧑‍🍳', A1], ['ride', 'đạp xe, cưỡi', '🚴', A1],
    ['fly', 'bay', '🕊️', A1], ['listen', 'nghe', '🎧', A1], ['wash', 'rửa', '🧼', A2], ['catch', 'bắt', '', A2],
  ],
  Feelings: [
    ['happy', 'vui vẻ', '😄', P], ['sad', 'buồn', '😢', P], ['angry', 'tức giận', '😠', A1], ['tired', 'mệt', '😫', A1],
    ['hungry', 'đói', '🤤', A1], ['thirsty', 'khát', '', A2], ['scared', 'sợ hãi', '😨', A2], ['excited', 'háo hức', '🤩', A2],
  ],
};

export const STARTER_WORDS: StarterWord[] = (Object.entries(DATA) as [StarterTopic, Row[]][]).flatMap(([topic, rows]) =>
  rows.map(([en, vi, emoji, level]) => ({ en, vi, emoji, topic, level })),
);

// Tra nhanh theo từ tiếng Anh (chữ thường). Từ có hai nghĩa (orange, chicken) giữ nghĩa đầu tiên.
const BY_WORD = new Map<string, StarterWord>();
for (const w of STARTER_WORDS) if (!BY_WORD.has(w.en.toLowerCase())) BY_WORD.set(w.en.toLowerCase(), w);
export function findStarterWord(en: string): StarterWord | undefined {
  return BY_WORD.get(en.trim().toLowerCase());
}

const ORDER = ['Pre-A1', 'A1', 'A2'] as const;
// Từ thuộc trình độ này hoặc thấp hơn, để lớp A1 vẫn ôn được từ Pre-A1
export function starterWordsUpTo(level: StarterWord['level'], topic?: StarterTopic): StarterWord[] {
  const max = ORDER.indexOf(level);
  return STARTER_WORDS.filter((w) => ORDER.indexOf(w.level) <= max && (!topic || w.topic === topic));
}
