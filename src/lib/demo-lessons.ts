// Bộ bài học thử (P35.24): mỗi bài một chủ đề quen thuộc với trẻ 5–10 tuổi, đủ các dạng câu.
// Dữ liệu thuần, không đụng CSDL. demo.ts đọc danh sách này để tạo bài cho tài khoản học thử.
import type { ItemType, Skill } from './assignment-scoring';

export type DemoItem = {
  skill: Skill;
  itemType: ItemType;
  prompt: string;
  promptVi: string;
  points: number;
  passage?: string;
  referenceText?: string;
  maxSeconds?: number;
  options?: { label: string; isCorrect?: boolean }[];
  pairs?: { left: string; right: string }[];
};

export type DemoLesson = { title: string; description: string; items: DemoItem[] };

// Gọn cho từng dạng câu. Đáp án đúng của trắc nghiệm và chọn tranh luôn là phần tử đầu, khi tạo sẽ đảo vị trí.
export const pic = (prompt: string, promptVi: string, correct: string, ...wrong: string[]): DemoItem => ({
  skill: 'listening',
  itemType: 'picture_choice',
  prompt,
  promptVi,
  points: 1,
  options: [{ label: correct, isCorrect: true }, ...wrong.map((label) => ({ label }))],
});
export const choice = (prompt: string, promptVi: string, correct: string, ...wrong: string[]): DemoItem => ({
  skill: 'reading',
  itemType: 'choice',
  prompt,
  promptVi,
  points: 1,
  options: [{ label: correct, isCorrect: true }, ...wrong.map((label) => ({ label }))],
});
export const match = (prompt: string, promptVi: string, pairs: [string, string][]): DemoItem => ({
  skill: 'reading',
  itemType: 'match',
  prompt,
  promptVi,
  points: 2,
  pairs: pairs.map(([left, right]) => ({ left, right })),
});
export const order = (sentence: string): DemoItem => ({
  skill: 'writing',
  itemType: 'order',
  prompt: 'Put the words in order.',
  promptVi: 'Sắp xếp các từ thành câu đúng',
  referenceText: sentence,
  points: 1,
});
export const gap = (prompt: string, promptVi: string, answers: string): DemoItem => ({
  skill: 'writing',
  itemType: 'gap_fill',
  prompt,
  promptVi,
  referenceText: answers,
  points: 1,
});
export const repeat = (sentence: string): DemoItem => ({
  skill: 'speaking',
  itemType: 'speak_repeat',
  prompt: 'Listen and repeat.',
  promptVi: 'Nghe rồi nói lại',
  referenceText: sentence,
  maxSeconds: 10,
  points: 1,
});
export const read = (sentence: string): DemoItem => ({
  skill: 'speaking',
  itemType: 'speak_read',
  prompt: 'Read aloud.',
  promptVi: 'Đọc to câu sau',
  referenceText: sentence,
  maxSeconds: 15,
  points: 1,
});
export const write = (prompt: string, promptVi: string): DemoItem => ({ skill: 'writing', itemType: 'text', prompt, promptVi, points: 1 });

export const DEMO_LESSONS: DemoLesson[] = [
  {
    title: 'Học thử 1: Animals',
    description: 'Con vật quen thuộc: nghe chọn tranh, ghép từ, sắp xếp câu, nói và viết.',
    items: [
      pic('Which one is a puppy?', 'Chạm vào chú cún con', '🐶 Puppy', '🐱 Kitten', '🐰 Bunny', '🐦 Bird'),
      pic('Find the elephant.', 'Tìm con voi', '🐘 Elephant', '🦒 Giraffe', '🦁 Lion', '🐵 Monkey'),
      pic('Which animal lives in the sea?', 'Con nào sống dưới biển?', '🐬 Dolphin', '🐄 Cow', '🐔 Chicken', '🐴 Horse'),
      match('Match the animals.', 'Ghép tên con vật với nghĩa tiếng Việt', [
        ['Dog', 'Con chó'],
        ['Cat', 'Con mèo'],
        ['Fish', 'Con cá'],
        ['Duck', 'Con vịt'],
      ]),
      choice('How many legs does a cat have?', 'Con mèo có mấy chân?', 'Four', 'Two', 'Six'),
      choice('Which animal can fly?', 'Con nào bay được?', 'A bird', 'A fish', 'A snake'),
      gap('A cow says _____.', 'Con bò kêu thế nào?', 'moo'),
      gap('The lion is the king of the _____.', 'Sư tử là chúa tể của…', 'jungle|forest'),
      order('I have a little dog'),
      order('The monkey likes bananas'),
      repeat('The cat is sleeping.'),
      read('I can see a big brown bear.'),
      write('What is your favourite animal? Why?', 'Con vật con thích nhất là gì? Vì sao?'),
    ],
  },
  {
    title: 'Học thử 2: Colors & Numbers',
    description: 'Màu sắc và số đếm từ 1 đến 20.',
    items: [
      pic('Which one is red?', 'Chạm vào đồ màu đỏ', '🍎 Apple', '🍌 Banana', '🥦 Broccoli', '🍇 Grapes'),
      pic('Find something yellow.', 'Tìm đồ màu vàng', '🌻 Sunflower', '🍆 Eggplant', '🍀 Clover', '🫐 Blueberries'),
      pic('Which one is blue?', 'Chạm vào đồ màu xanh dương', '🐳 Whale', '🍊 Orange', '🌹 Rose', '🐸 Frog'),
      match('Match the colours.', 'Ghép màu với nghĩa tiếng Việt', [
        ['Red', 'Màu đỏ'],
        ['Blue', 'Màu xanh dương'],
        ['Yellow', 'Màu vàng'],
        ['Green', 'Màu xanh lá'],
        ['Black', 'Màu đen'],
      ]),
      match('Match the numbers.', 'Ghép số với chữ', [
        ['3', 'three'],
        ['7', 'seven'],
        ['12', 'twelve'],
        ['20', 'twenty'],
      ]),
      choice('What is two plus three?', 'Hai cộng ba bằng mấy?', 'Five', 'Four', 'Six'),
      choice('What colour is the sky on a sunny day?', 'Bầu trời ngày nắng màu gì?', 'Blue', 'Pink', 'Brown'),
      choice('Which number comes after nine?', 'Số nào đứng sau số chín?', 'Ten', 'Eight', 'Eleven'),
      gap('Grass is _____.', 'Cỏ có màu gì?', 'green'),
      gap('One, two, three, _____, five.', 'Điền số còn thiếu', 'four'),
      order('My bag is pink'),
      order('I have three red pencils'),
      repeat('Red, yellow, green and blue.'),
      read('There are ten apples on the table.'),
      write('What colour is your school bag?', 'Cặp sách của con màu gì? Viết một câu tiếng Anh.'),
    ],
  },
  {
    title: 'Học thử 3: My Family',
    description: 'Thành viên trong gia đình và giới thiệu bản thân.',
    items: [
      pic('Who is the baby?', 'Chạm vào em bé', '👶 Baby', '👴 Grandfather', '👩 Mother', '👦 Brother'),
      pic('Find the grandmother.', 'Tìm bà', '👵 Grandmother', '👧 Sister', '👨 Father', '🧒 Child'),
      match('Match the family words.', 'Ghép từ chỉ người trong gia đình', [
        ['Mother', 'Mẹ'],
        ['Father', 'Bố'],
        ['Sister', 'Chị, em gái'],
        ['Brother', 'Anh, em trai'],
        ['Grandmother', 'Bà'],
      ]),
      choice('Your mother’s mother is your…', 'Mẹ của mẹ con là…', 'grandmother', 'aunt', 'sister'),
      choice('Choose the correct answer: "How old are you?"', 'Chọn câu trả lời đúng cho "How old are you?"', 'I’m eight.', 'I’m fine.', 'I’m Lan.'),
      choice('Choose the correct answer: "What’s your name?"', 'Chọn câu trả lời đúng cho "What’s your name?"', 'My name is Nam.', 'I’m nine.', 'It’s red.'),
      gap('This is my _____. He is my dad.', 'Đây là… của con. Bố của con.', 'father|dad'),
      gap('She is my sister. _____ name is Mai.', 'Điền từ còn thiếu (của cô ấy)', 'her'),
      order('This is my mother'),
      order('I love my family very much'),
      order('My brother is ten years old'),
      repeat('Hello, my name is Tom.'),
      read('I have one brother and two sisters.'),
      write('How many people are there in your family?', 'Nhà con có mấy người? Viết một câu tiếng Anh.'),
    ],
  },
  {
    title: 'Học thử 4: Food & Drinks',
    description: 'Đồ ăn, đồ uống và nói điều mình thích.',
    items: [
      pic('Which one is a banana?', 'Chạm vào quả chuối', '🍌 Banana', '🍓 Strawberry', '🍉 Watermelon', '🍐 Pear'),
      pic('Find the milk.', 'Tìm sữa', '🥛 Milk', '🧃 Juice', '☕ Coffee', '🍵 Tea'),
      pic('Which one is bread?', 'Chạm vào bánh mì', '🍞 Bread', '🍕 Pizza', '🍰 Cake', '🍚 Rice'),
      match('Match the food.', 'Ghép tên đồ ăn với nghĩa tiếng Việt', [
        ['Rice', 'Cơm'],
        ['Egg', 'Quả trứng'],
        ['Chicken', 'Thịt gà'],
        ['Noodles', 'Mì, phở'],
      ]),
      choice('Which one is a drink?', 'Cái nào là đồ uống?', 'Water', 'Bread', 'Cheese'),
      choice('Which one is a fruit?', 'Cái nào là trái cây?', 'Mango', 'Carrot', 'Fish'),
      choice('Choose the correct answer: "Do you like ice cream?"', 'Chọn câu trả lời đúng', 'Yes, I do.', 'Yes, I am.', 'Yes, it is.'),
      gap('I drink _____ every morning.', 'Mỗi sáng con uống…', 'milk|water|juice'),
      gap('An _____ a day keeps the doctor away.', 'Điền tên một loại quả bắt đầu bằng "a"', 'apple'),
      order('I like chicken and rice'),
      order('Can I have some water please'),
      repeat('I am hungry. Can I have some bread?'),
      read('My favourite food is pizza with cheese.'),
      write('What do you eat for breakfast?', 'Bữa sáng con ăn gì? Viết một câu tiếng Anh.'),
    ],
  },
  {
    title: 'Học thử 5: At School',
    description: 'Đồ dùng học tập, lớp học và câu lệnh của giáo viên.',
    items: [
      pic('Which one is a pencil?', 'Chạm vào bút chì', '✏️ Pencil', '📏 Ruler', '📚 Books', '✂️ Scissors'),
      pic('Find the school bag.', 'Tìm cặp sách', '🎒 School bag', '🖍️ Crayon', '📐 Set square', '📎 Paper clip'),
      match('Match the school things.', 'Ghép đồ dùng học tập với nghĩa tiếng Việt', [
        ['Book', 'Quyển sách'],
        ['Pen', 'Bút mực'],
        ['Ruler', 'Thước kẻ'],
        ['Eraser', 'Cục tẩy'],
        ['Desk', 'Bàn học'],
      ]),
      match('Match the teacher’s words.', 'Ghép câu lệnh với nghĩa', [
        ['Sit down', 'Ngồi xuống'],
        ['Stand up', 'Đứng lên'],
        ['Open your book', 'Mở sách ra'],
        ['Be quiet', 'Trật tự'],
      ]),
      choice('What do you use to write?', 'Con dùng gì để viết?', 'A pen', 'A chair', 'A bag'),
      choice('Where do you study?', 'Con học ở đâu?', 'At school', 'At the zoo', 'At the beach'),
      choice('Which day comes after Monday?', 'Thứ nào đứng sau thứ Hai?', 'Tuesday', 'Sunday', 'Friday'),
      gap('Please _____ your book to page ten.', 'Hãy… sách ra trang mười', 'open'),
      gap('I have English on _____.', 'Con học tiếng Anh vào thứ mấy? (viết một ngày bằng tiếng Anh)', 'monday|tuesday|wednesday|thursday|friday|saturday|sunday'),
      order('This is my new pencil case'),
      order('May I come in please'),
      repeat('Good morning, teacher!'),
      read('My classroom is big and bright.'),
      write('What is your favourite subject at school?', 'Môn học con thích nhất là gì?'),
    ],
  },
];
