'use client';

// HtmlEditorLite.tsx
import { TextAlign } from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from "@tiptap/starter-kit";
import React, { useEffect, useRef } from "react";

import {
  BoldIcon,
  CircleSlashIcon,
  FocusCenterIcon,
  HeadingIcon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListOrderedIcon,
  ListUnorderedIcon,
  MoveToEndIcon,
  MoveToStartIcon,
  RowsIcon,
  TrashIcon,
  TypographyIcon,
} from "@primer/octicons-react";
import { IconButton } from "@primer/react";

import { uploadApi } from "@/components-ui/_adapters/upload";
import EditorImage from "./EditorImage";
import styles from './html-editor.module.css';
import clsx from 'clsx';

// Tái xuất tên biểu tượng từ @primer/octicons-react cho thanh công cụ căn lề và gạch chân
const UnderlineIcon = TypographyIcon;
const AlignLeftIcon = MoveToStartIcon;
const AlignCenterIcon = FocusCenterIcon;
const AlignRightIcon = MoveToEndIcon;
const AlignJustifyIcon = RowsIcon;
const UnAlignIcon = CircleSlashIcon;

const IMAGE_SIZES = [
  { label: "25%", value: "25%" },
  { label: "50%", value: "50%" },
  { label: "75%", value: "75%" },
  { label: "100%", value: "100%" },
];

interface IHtmlEditorLiteProps {
  value: string;
  onValueChanged: (htmlValue: string) => void;
  height?: number; // nếu có → dùng fixed height
  autoHeight?: boolean; // mới: bật auto height (mặc định true nếu không truyền height)
  autoFocus?: boolean; // mới: tự động focus khi mount
  isReadOnly?: boolean;
  width?: string | number;
  mode?: "minimal" | "standard";
  uploadSubFolder?: string; // subFolder truyền cho uploadApi.uploadFile
  dvcsId?: number; // id đơn vị cơ sở truyền cho uploadApi.uploadFile
}

// Trích URL ảnh từ response trả về của uploadApi.
const extractUploadedUrl = (response: unknown): string => {
  if (typeof response === "string") return response;
  if (response && typeof response === "object") {
    const record = response as Record<string, unknown>;
    if (record.data && typeof record.data === "object") {
      const inner = record.data as Record<string, unknown>;
      if (typeof inner.url === "string") return inner.url;
    }
    if (typeof record.data === "string") return record.data;
    if (typeof record.url === "string") return record.url;
  }
  return "";
};

const cleanHtmlValue = (html: string): string => {
  if (!html) return "";
  if (html.includes("<img") || html.includes("<iframe") || html.includes("<video") || html.includes("<audio")) {
    return html;
  }
  const cleanText = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim();
  return cleanText === "" ? "" : html;
};

const HtmlEditorLite: React.FC<IHtmlEditorLiteProps> = ({
  value = "",
  onValueChanged,
  height,
  autoHeight = true, // mặc định bật auto height
  autoFocus = false, // mặc định tắt (có thể bật từ props)
  isReadOnly = false,
  width = "100%",
  mode = "standard",
  uploadSubFolder = "html-editor",
  dvcsId,
}) => {
  const latestHtmlRef = useRef<string>(value);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingActionRef = useRef<{ mode: "insert" | "replace"; pos: number }>({
    mode: "insert",
    pos: 0,
  });
  // Tránh closure cũ khi uploadSubFolder/dvcsId thay đổi sau khi editor đã tạo
  const latestUploadPropsRef = useRef({ uploadSubFolder, dvcsId });
  useEffect(() => {
    latestUploadPropsRef.current = { uploadSubFolder, dvcsId };
  }, [uploadSubFolder, dvcsId]);

  // Tìm node ảnh theo id tạm trong toàn bộ doc, trả về vị trí (pos)
  const findImagePosById = (view: EditorView, tempId: string): number | null => {
    let targetPos: number | null = null;
    view.state.doc.descendants((node, pos) => {
      if (node.type.name === "image" && node.attrs.id === tempId) {
        targetPos = pos;
        return false;
      }
      return true;
    });
    return targetPos;
  };

  // Sau khi upload xong → cập nhật src thật, tắt trạng thái uploading
  const applyUploadedImage = (view: EditorView, tempId: string, url: string) => {
    const pos = findImagePosById(view, tempId);
    if (pos === null) return;
    const node = view.state.doc.nodeAt(pos) as ProseMirrorNode | null;
    if (!node) return;
    view.dispatch(
      view.state.tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        src: url,
        uploading: false,
        id: null,
      }),
    );
  };

  // Upload lỗi khi chèn mới → xoá node placeholder đã chèn
  const removeUploadingImage = (view: EditorView, tempId: string) => {
    let targetPos: number | null = null;
    let size = 0;
    view.state.doc.descendants((node, pos) => {
      if (node.type.name === "image" && node.attrs.id === tempId) {
        targetPos = pos;
        size = node.nodeSize;
        return false;
      }
      return true;
    });
    if (targetPos === null) return;
    view.dispatch(view.state.tr.delete(targetPos, targetPos + size));
  };

  // Chèn ảnh mới: hiện preview tạm (blob) + mờ đi trong lúc upload, xong thì thay src thật
  const insertImageWithUpload = (view: EditorView, file: File, pos: number) => {
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const blobUrl = URL.createObjectURL(file);
    const { schema } = view.state;
    const node = schema.nodes.image.create({
      src: blobUrl,
      uploading: true,
      id: tempId,
    });
    view.dispatch(view.state.tr.insert(pos, node));

    const { uploadSubFolder: sf, dvcsId: sid } = latestUploadPropsRef.current;
    uploadApi
      .uploadFile(file, sf, sid)
      .then((res) => applyUploadedImage(view, tempId, extractUploadedUrl(res)))
      .catch((err: unknown) => {
        console.error("Upload ảnh thất bại:", err);
        removeUploadingImage(view, tempId);
      })
      .finally(() => URL.revokeObjectURL(blobUrl));
  };

  // Thay ảnh đang chọn bằng file mới (giữ nguyên width/align cũ)
  const replaceImageWithUpload = (view: EditorView, file: File, pos: number) => {
    const node = view.state.doc.nodeAt(pos) as ProseMirrorNode | null;
    if (!node || node.type.name !== "image") return;
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const blobUrl = URL.createObjectURL(file);
    const previousSrc = String(node.attrs.src ?? "");

    view.dispatch(
      view.state.tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        src: blobUrl,
        uploading: true,
        id: tempId,
      }),
    );

    const { uploadSubFolder: sf, dvcsId: sid } = latestUploadPropsRef.current;
    uploadApi
      .uploadFile(file, sf, sid)
      .then((res) => applyUploadedImage(view, tempId, extractUploadedUrl(res)))
      .catch((err: unknown) => {
        console.error("Upload ảnh thất bại:", err);
        applyUploadedImage(view, tempId, previousSrc); // rollback về ảnh cũ
      })
      .finally(() => URL.revokeObjectURL(blobUrl));
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: mode === "standard" ? { levels: [1, 2, 3] } : false,
        codeBlock: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      EditorImage.configure({ inline: true, allowBase64: true }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        defaultAlignment: "justify",
      }),
    ],
    content: value,
    editable: !isReadOnly,
    editorProps: {
      attributes: {
        class: "prose prose-sm focus:outline-none px-4 py-3 min-h-[100px]",
        spellcheck: "false",
      },
      // Kéo-thả ảnh từ máy vào editor
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false; // đang kéo-thả nội dung trong editor, không can thiệp
        const files = (event as DragEvent).dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
        if (images.length === 0) return false;
        event.preventDefault();
        const coords = view.posAtCoords({
          left: (event as DragEvent).clientX,
          top: (event as DragEvent).clientY,
        });
        let pos = coords?.pos ?? view.state.selection.from;
        images.forEach((file) => {
          insertImageWithUpload(view, file, pos);
          pos += 1; // image là atom node có size = 1
        });
        return true;
      },
      // Dán ảnh từ clipboard vào editor
      handlePaste: (view, event) => {
        const files = (event as ClipboardEvent).clipboardData?.files;
        if (!files || files.length === 0) return false;
        const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
        if (images.length === 0) return false;
        event.preventDefault();
        let pos = view.state.selection.from;
        images.forEach((file) => {
          insertImageWithUpload(view, file, pos);
          pos += 1;
        });
        return true;
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      latestHtmlRef.current = activeEditor.getHTML();
      // Auto height: điều chỉnh chiều cao container khi nội dung thay đổi
      if (autoHeight && editorRef.current) {
        const el = editorRef.current;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight + 20}px`; // +20 cho padding thoải mái
      }
    },
    onBlur: ({ editor: activeEditor }) => {
      const html = activeEditor.getHTML();
      const cleaned = cleanHtmlValue(html);
      if (cleaned !== value) onValueChanged(cleaned);
    },
  });

  useEffect(() => {
    if (!editor || isReadOnly || !autoFocus) return;

    const timer = setTimeout(() => {
      if (editor.isDestroyed) return;
      editor.commands.focus();
      setTimeout(() => editor.commands.focus("end"), 0);
    }, 0);

    return () => clearTimeout(timer);
  }, [editor, autoFocus, isReadOnly]);

  // Đồng bộ value từ parent
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML() && value !== latestHtmlRef.current) {
      editor.commands.setContent(value);
      latestHtmlRef.current = value;
    }
  }, [value, editor]);

  // Cập nhật editable
  useEffect(() => {
    editor?.setEditable(!isReadOnly);
  }, [isReadOnly, editor]);

  useEffect(() => {
    if (!autoHeight || !editor) return;
    const containerEl = editorRef.current;
    const contentEl = containerEl?.querySelector(".ProseMirror") as HTMLElement | null;
    if (!containerEl || !contentEl) return;

    const updateHeight = () => {
      containerEl.style.height = "auto";
      containerEl.style.height = `${contentEl.scrollHeight + 20}px`;
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(() => updateHeight());
    resizeObserver.observe(contentEl);

    return () => resizeObserver.disconnect();
  }, [autoHeight, editor]);

  if (!editor) return null;

  const getButtonClass = (mark: string) =>
    clsx(styles.toolbarButton, editor.isActive(mark) && styles.toolbarButtonActive);

  const getImageButtonClass = (alignValue: string) =>
    clsx(styles.toolbarButton, editor.getAttributes("image").align === alignValue && styles.toolbarButtonActive);

  const isAutoHeightMode = autoHeight && !height;

  const handleInsertImageClick = () => {
    pendingActionRef.current = { mode: "insert", pos: editor.state.selection.from };
    fileInputRef.current?.click();
  };

  const handleReplaceImageClick = () => {
    pendingActionRef.current = { mode: "replace", pos: editor.state.selection.from };
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại đúng file cũ ở lần sau
    if (!file) return;
    const action = pendingActionRef.current;
    if (action.mode === "replace") {
      replaceImageWithUpload(editor.view, file, action.pos);
    } else {
      insertImageWithUpload(editor.view, file, action.pos);
    }
  };
  const getTextAlignButtonClass = (alignValue: string) =>
    clsx(styles.toolbarButton, editor.isActive({ textAlign: alignValue }) && styles.toolbarButtonActive);

  return (
    <>
      {/* Input file ẩn, dùng chung cho "Chèn ảnh" và "Thay ảnh khác" */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />

      {!isReadOnly && typeof document !== "undefined" && (
        <BubbleMenu
          editor={editor}
          shouldShow={({ editor: activeEditor }) => activeEditor.isActive("image")}
        >
          <div className={styles.htmlEditorLite_box}>
            <IconButton
              icon={AlignLeftIcon}
              aria-label="Căn trái"
              variant="invisible"
              onClick={() =>
                editor.chain().focus().updateAttributes("image", { align: "left" }).run()
              }
              className={getImageButtonClass("left")}
            />
            <IconButton
              icon={AlignCenterIcon}
              aria-label="Căn giữa"
              variant="invisible"
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .updateAttributes("image", { align: "center" })
                  .run()
              }
              className={getImageButtonClass("center")}
            />
            <IconButton
              icon={AlignRightIcon}
              aria-label="Căn phải"
              variant="invisible"
              onClick={() =>
                editor.chain().focus().updateAttributes("image", { align: "right" }).run()
              }
              className={getImageButtonClass("right")}
            />

            <span className={styles.htmlEditorLite_box2} />

            {IMAGE_SIZES.map((s) => {
              const active = editor.getAttributes("image").width === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() =>
                    editor
                      .chain()
                      .focus()
                      .updateAttributes("image", { width: s.value })
                      .run()
                  }
                  className={clsx(styles.htmlEditorLite_box3, active ? styles.htmlEditorLite_box3_active : styles.htmlEditorLite_box3_notActive)}
                >
                  {s.label}
                </button>
              );
            })}

            <span className={styles.htmlEditorLite_box2} />

            <IconButton
              icon={ImageIcon}
              aria-label="Thay ảnh khác"
              variant="invisible"
              onClick={handleReplaceImageClick}
              className={getButtonClass("__replace_image__")}
            />
            <IconButton
              icon={TrashIcon}
              aria-label="Xoá ảnh"
              variant="invisible"
              onClick={() => editor.chain().focus().deleteSelection().run()}
              className={getButtonClass("__delete_image__")}
            />
          </div>
        </BubbleMenu>
      )}

      <div
        className={clsx(styles.editorFrame, isReadOnly ? styles.editorFrameReadOnly : styles.editorFrameEditable)}
        style={{
          // width theo quy tắc styled-system cũ: số ≤ 1 là phần trăm
          width: typeof width === "number" && width > 0 && width <= 1 ? `${width * 100}%` : width,
          // Chỉ dùng height cố định nếu truyền props.height
          height: height && !autoHeight ? height : undefined,
        }}
      >
        {/* Toolbar */}
        {!isReadOnly && (
          <div className={clsx(styles.htmlEditorLite_box4, styles.toolbarBorder)}>
            <IconButton
              icon={BoldIcon}
              aria-label="Đậm"
              variant="invisible"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={getButtonClass("bold")}
            />

            <IconButton
              icon={ItalicIcon}
              aria-label="Nghiêng"
              variant="invisible"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={getButtonClass("italic")}
            />

            <IconButton
              icon={UnderlineIcon}
              aria-label="Gạch chân"
              variant="invisible"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={getButtonClass("underline")}
            />

            {mode === "standard" && (
              <>
                <span className={styles.htmlEditorLite_box2} />
                <IconButton
                  icon={HeadingIcon}
                  aria-label="Tiêu đề"
                  variant="invisible"
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 2 }).run()
                  }
                  className={getButtonClass("heading")}
                />
                <IconButton
                  icon={ListUnorderedIcon}
                  aria-label="Danh sách"
                  variant="invisible"
                  onClick={() =>
                    editor.chain().focus().toggleBulletList().run()
                  }
                  className={getButtonClass("bulletList")}
                />
                <IconButton
                  icon={ListOrderedIcon}
                  aria-label="Danh sách số"
                  variant="invisible"
                  onClick={() =>
                    editor.chain().focus().toggleOrderedList().run()
                  }
                  className={getButtonClass("orderedList")}
                />
                <span className={styles.htmlEditorLite_box2} />
                <span className={styles.htmlEditorLite_box2} />
                <IconButton
                  icon={AlignLeftIcon}
                  aria-label="Căn trái"
                  variant="invisible"
                  onClick={() =>
                    editor.chain().focus().setTextAlign("left").run()
                  }
                  className={getTextAlignButtonClass("left")}
                />
                <IconButton
                  icon={AlignCenterIcon}
                  aria-label="Căn giữa"
                  variant="invisible"
                  onClick={() =>
                    editor.chain().focus().setTextAlign("center").run()
                  }
                  className={getTextAlignButtonClass("center")}
                />
                <IconButton
                  icon={AlignRightIcon}
                  aria-label="Căn phải"
                  variant="invisible"
                  onClick={() =>
                    editor.chain().focus().setTextAlign("right").run()
                  }
                  className={getTextAlignButtonClass("right")}
                />
                <IconButton
                  icon={AlignJustifyIcon}
                  aria-label="Căn đều hai bên"
                  variant="invisible"
                  onClick={() =>
                    editor.chain().focus().setTextAlign("justify").run()
                  }
                  className={getTextAlignButtonClass("justify")}
                />
                <IconButton
                  icon={UnAlignIcon}
                  aria-label="Bỏ căn lề"
                  variant="invisible"
                  onClick={() => editor.chain().focus().unsetTextAlign().run()}
                  className={getButtonClass("__unset_align__")}
                />
              </>
            )}

            <span className={styles.htmlEditorLite_box2} />
            <IconButton
              icon={LinkIcon}
              aria-label="Liên kết"
              variant="invisible"
              onClick={() => {
                const url = window.prompt(
                  "URL:",
                  editor.getAttributes("link").href || "https://",
                );
                if (url === null) return;
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                } else {
                  editor.chain().focus().unsetLink().run();
                }
              }}
              className={getButtonClass("link")}
            />

            <IconButton
              icon={ImageIcon}
              aria-label="Chèn ảnh"
              variant="invisible"
              onClick={handleInsertImageClick}
              className={getButtonClass("image")}
            />
          </div>
        )}

        {/* Editor Content – Auto Height */}
        <div
          style={{ flex: isAutoHeightMode ? "0 0 auto" : 1 }}
          ref={editorRef}
          className={clsx(styles.htmlEditorLite_box5, isAutoHeightMode ? styles.htmlEditorLite_box5_isAutoHeightMode : styles.htmlEditorLite_box5_notIsAutoHeightMode)}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </>
  );
};

export default HtmlEditorLite;
