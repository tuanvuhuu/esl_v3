// Bộ bài mẫu cho lớp thật (35.21): 3 bài Starters đủ các dạng câu và một danh sách từ, giáo vụ thêm vào lớp bằng một nút
// ở màn Bài tập, dùng để demo và kiểm thử đầu cuối. Nội dung do trung tâm tự soạn theo từ vựng trình độ Starters,
// không chép đề thi. Tranh dùng emoji (chưa có ảnh); câu nói chưa có giọng mẫu thu sẵn thì máy đọc câu mẫu.
// Dữ liệu thuần, không đụng CSDL.
import { choice, gap, match, order, pic, read, repeat, write, type DemoItem, type DemoLesson } from './demo-lessons';

// Nhìn tranh rồi nói (tranh là emoji trong đề); câu mẫu để trẻ nói theo nếu chưa biết nói
const lookSay = (emoji: string, model: string): DemoItem => ({
  skill: 'speaking',
  itemType: 'speak_picture',
  prompt: `Look and say. ${emoji}`,
  promptVi: 'Nhìn tranh rồi nói',
  referenceText: model,
  maxSeconds: 15,
  points: 1,
});

export type SampleWord = { word: string; meaningVi: string; emoji: string; sentence: string };
export type SampleSet = { key: string; name: string; description: string; lessons: DemoLesson[]; wordList: { name: string; words: SampleWord[] } };

export const STARTERS_SET: SampleSet = {
  key: 'starters',
  name: 'bộ bài mẫu Starters',
  description: '3 bài Starters (đồ chơi, nhà của em, cơ thể và quần áo) đủ 9 dạng câu, kèm danh sách từ 14 từ cho trò chơi.',
  lessons: [
    {
      title: 'Starters 1: My toys',
      description: 'Đồ chơi, màu sắc và vị trí (in, on, under).',
      items: [
        pic('Which one is a kite?', 'Chạm vào cái diều', '🪁 Kite', '⚽ Ball', '🧸 Teddy bear', '🚂 Train'),
        pic('Find the robot.', 'Tìm con rô-bốt', '🤖 Robot', '🪀 Yo-yo', '🚗 Car', '🎈 Balloon'),
        pic('Which toy has wheels?', 'Đồ chơi nào có bánh xe?', '🚲 Bike', '🪁 Kite', '🧸 Teddy bear', '🎈 Balloon'),
        match('Match the toys.', 'Ghép tên đồ chơi với nghĩa tiếng Việt', [
          ['Ball', 'Quả bóng'],
          ['Doll', 'Búp bê'],
          ['Train', 'Tàu hoả'],
          ['Kite', 'Cái diều'],
        ]),
        choice('Where is the cat? 🐱📦 (The cat is in the box.)', 'Con mèo ở đâu?', 'in the box', 'on the box', 'under the box'),
        choice('Choose the correct answer: "Is this your ball?"', 'Chọn câu trả lời đúng', 'Yes, it is.', 'Yes, I do.', 'Yes, I am.'),
        gap('My teddy bear is _____ the bed. (dưới gầm giường)', 'Gấu bông ở dưới gầm giường', 'under'),
        gap('I can fly my _____ in the park. 🪁', 'Con thả… ở công viên', 'kite'),
        order('I have a red ball'),
        order('The doll is on the chair'),
        repeat('This is my new robot.'),
        read('My favourite toy is a blue train.'),
        lookSay('🚗', 'It is a car.'),
        write('What is your favourite toy?', 'Đồ chơi con thích nhất là gì? Viết một câu tiếng Anh.'),
      ],
    },
    {
      title: 'Starters 2: My home',
      description: 'Phòng trong nhà, đồ đạc và câu "There is / There are".',
      items: [
        pic('Which one is a bed?', 'Chạm vào cái giường', '🛏️ Bed', '🪑 Chair', '🛋️ Sofa', '🚪 Door'),
        pic('Find the window.', 'Tìm cửa sổ', '🪟 Window', '🚪 Door', '🛁 Bath', '📺 Television'),
        match('Match the rooms.', 'Ghép tên phòng với nghĩa tiếng Việt', [
          ['Kitchen', 'Nhà bếp'],
          ['Bedroom', 'Phòng ngủ'],
          ['Bathroom', 'Phòng tắm'],
          ['Living room', 'Phòng khách'],
        ]),
        choice('Where do you sleep?', 'Con ngủ ở phòng nào?', 'In the bedroom', 'In the kitchen', 'In the garden'),
        choice('Where do you cook food?', 'Nấu ăn ở đâu?', 'In the kitchen', 'In the bathroom', 'In the bedroom'),
        choice('Choose the correct sentence.', 'Chọn câu đúng', 'There are two chairs.', 'There is two chairs.', 'There are a chair.'),
        gap('There _____ a sofa in the living room.', 'Điền "is" hoặc "are"', 'is'),
        gap('I wash my hands in the _____.', 'Con rửa tay ở phòng…', 'bathroom'),
        order('There is a big table in the kitchen'),
        order('My bedroom has a small window'),
        repeat('Welcome to my house.'),
        read('There are three bedrooms in my house.'),
        lookSay('🛋️', 'It is a sofa.'),
        write('What is in your bedroom?', 'Trong phòng ngủ của con có gì? Viết một câu tiếng Anh.'),
      ],
    },
    {
      title: 'Starters 3: My body and clothes',
      description: 'Bộ phận cơ thể, quần áo và câu "I am wearing…".',
      items: [
        pic('Which one is a hat?', 'Chạm vào cái mũ', '👒 Hat', '👟 Shoes', '👕 T-shirt', '👖 Jeans'),
        pic('Find the socks.', 'Tìm đôi tất', '🧦 Socks', '🧤 Gloves', '🧣 Scarf', '👗 Dress'),
        pic('What do you see with?', 'Con nhìn bằng gì?', '👀 Eyes', '👂 Ears', '👃 Nose', '👄 Mouth'),
        match('Match the body words.', 'Ghép bộ phận cơ thể với nghĩa tiếng Việt', [
          ['Hand', 'Bàn tay'],
          ['Foot', 'Bàn chân'],
          ['Head', 'Cái đầu'],
          ['Arm', 'Cánh tay'],
        ]),
        choice('How many fingers are on one hand?', 'Một bàn tay có mấy ngón?', 'Five', 'Four', 'Ten'),
        choice('What do you wear on your feet?', 'Con đi gì ở chân?', 'Shoes', 'A hat', 'A T-shirt'),
        gap('I am _____ a yellow T-shirt today.', 'Hôm nay con đang mặc áo phông vàng', 'wearing'),
        gap('I hear with my _____. 👂', 'Con nghe bằng…', 'ears'),
        order('I am wearing blue jeans'),
        order('She has long black hair'),
        repeat('Touch your nose. Clap your hands.'),
        read('My brother is wearing a green hat and red shoes.'),
        lookSay('🧦', 'They are socks.'),
        write('What are you wearing today?', 'Hôm nay con mặc gì? Viết một câu tiếng Anh.'),
      ],
    },
  ],
  wordList: {
    name: 'Starters: toys, home, clothes',
    words: [
      { word: 'ball', meaningVi: 'quả bóng', emoji: '⚽', sentence: 'I can kick the ball.' },
      { word: 'kite', meaningVi: 'cái diều', emoji: '🪁', sentence: 'My kite is in the sky.' },
      { word: 'robot', meaningVi: 'rô-bốt', emoji: '🤖', sentence: 'The robot can dance.' },
      { word: 'train', meaningVi: 'tàu hoả', emoji: '🚂', sentence: 'I like the long train.' },
      { word: 'doll', meaningVi: 'búp bê', emoji: '🪆', sentence: 'My sister has a doll.' },
      { word: 'bed', meaningVi: 'cái giường', emoji: '🛏️', sentence: 'The cat is on my bed.' },
      { word: 'sofa', meaningVi: 'ghế sô-pha', emoji: '🛋️', sentence: 'Dad is on the sofa.' },
      { word: 'window', meaningVi: 'cửa sổ', emoji: '🪟', sentence: 'Please open the window.' },
      { word: 'door', meaningVi: 'cửa ra vào', emoji: '🚪', sentence: 'Close the door, please.' },
      { word: 'hat', meaningVi: 'cái mũ', emoji: '👒', sentence: 'I have a big hat.' },
      { word: 'shoes', meaningVi: 'đôi giày', emoji: '👟', sentence: 'My shoes are white.' },
      { word: 'socks', meaningVi: 'đôi tất', emoji: '🧦', sentence: 'These socks are red.' },
      { word: 'hand', meaningVi: 'bàn tay', emoji: '✋', sentence: 'Wash your hands, please.' },
      { word: 'eyes', meaningVi: 'đôi mắt', emoji: '👀', sentence: 'She has brown eyes.' },
    ],
  },
};
