'use client';

// EditorImage.ts
import Image from "@tiptap/extension-image";

/**
 * Mở rộng extension Image mặc định của tiptap để hỗ trợ:
 * - `uploading`: làm mờ ảnh trong lúc đang upload (không lưu vào HTML khi đã xong)
 * - `id`: id tạm dùng để tìm lại đúng node sau khi upload xong (không lưu vào HTML)
 * - `width`: resize ảnh (lưu vào HTML để hiển thị đúng lại khi load)
 * - `align`: căn lề ảnh trái/giữa/phải (lưu vào HTML)
 */

const ALIGN_STYLES: Record<string, string> = {
  left: "margin-right: auto; display: block;",
  center: "margin-left: auto; margin-right: auto; display: block;",
  right: "margin-left: auto; display: block;",
};

const EditorImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),

      // Id tạm — chỉ tồn tại trong lúc soạn bài, không render ra HTML
      id: {
        default: null,
        rendered: false,
      },

      // Trạng thái đang upload — chỉ tạo style mờ tạm thời, không lưu vào HTML
      uploading: {
        default: false,
        parseHTML: () => false,
        renderHTML: (attrs) =>
          attrs.uploading
            ? { style: "opacity: 0.4; filter: grayscale(40%); cursor: wait;" }
            : {},
      },

      // Kích thước ảnh — render & lưu vào HTML
      width: {
        default: "50%",
        renderHTML: (attrs) => ({
          style: `width: ${attrs.width}; height: auto;`,
        }),
        parseHTML: (element) =>
          (element as HTMLElement).style.width ||
          element.getAttribute("width") ||
          "50%",
      },

      // Căn lề ảnh — render & lưu vào HTML
      align: {
        default: "left",
        renderHTML: (attrs) => ({
          style: ALIGN_STYLES[attrs.align as string] || ALIGN_STYLES.left,
        }),
        parseHTML: (element) => {
          const style = (element as HTMLElement).style;
          if (style.marginLeft === "auto" && style.marginRight === "auto") {
            return "center";
          }
          if (style.marginLeft === "auto") return "right";
          return "left";
        },
      },
    };
  },
});

export default EditorImage;
