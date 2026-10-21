# Dữ liệu nạp sẵn

## cefrj-1.5-a1-a2.csv

Các dòng trình độ A1 và A2 của **CEFR-J Wordlist Version 1.5**, do Yukio Tono (Tono Laboratory, Tokyo University of Foreign Studies) biên soạn, lấy từ bản sao của Open Language Profiles: https://github.com/openlanguageprofiles/olp-en-cefrj (gốc: http://www.cefr-j.org/download.html).

Điều khoản: dữ liệu CEFR-J được dùng cho nghiên cứu và mục đích thương mại miễn phí, với điều kiện ghi nguồn đúng. Bản quyền thuộc Tono Laboratory, TUFS.

Ghi nguồn: The CEFR-J Wordlist Version 1.5. Compiled by Yukio Tono, Tokyo University of Foreign Studies.

Cột: `headword, pos, CEFR, CoreInventory 1, CoreInventory 2` (đã bỏ cột `Threshold`). Dùng để nạp bảng `vocab_items` trong migration `0018_vocab_items.sql`; câu lệnh nạp sinh bằng `scripts/build-vocab-seed.ts`.
