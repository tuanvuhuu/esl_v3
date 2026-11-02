'use client';

// HtmlEditorLite.tsx
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React, { useEffect, useRef } from "react";

import {
  BoldIcon,
  HeadingIcon,
  ItalicIcon,
  LinkIcon,
  ListOrderedIcon,
  ListUnorderedIcon,
  TypographyIcon,
} from "@primer/octicons-react";
import { IconButton } from "@primer/react";
import styles from './html-edtor-lite.module.css';
import clsx from 'clsx';

const UnderlineIcon = TypographyIcon;

interface IHtmlEditorLiteProps {
  value: string;
  onValueChanged: (htmlValue: string) => void;
  height?: number; // nếu có → dùng fixed height
  autoHeight?: boolean; // mới: bật auto height (mặc định true nếu không truyền height)
  autoFocus?: boolean; // mới: tự động focus khi mount
  isReadOnly?: boolean;
  width?: string | number;
  mode?: "minimal" | "standard";
}

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
}) => {
  const latestHtmlRef = useRef<string>(value);
  const editorRef = useRef<HTMLDivElement>(null);

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
      Image.configure({ inline: true, allowBase64: true }),
    ],
    content: value,
    editable: !isReadOnly,
    editorProps: {
      attributes: {
        class: "prose prose-sm focus:outline-none px-4 py-3 min-h-[100px]",
        spellcheck: "false",
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

  // Auto height lần đầu khi mount
  useEffect(() => {
    if (autoHeight && editorRef.current) {
      const el = editorRef.current;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + 10}px`;
    }
  }, [autoHeight]);

  if (!editor) return null;

  const getButtonClass = (mark: string) =>
    clsx(styles.toolbarButton, editor.isActive(mark) && styles.toolbarButtonActive);

  const isAutoHeightMode = autoHeight && !height;

  return (
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
        <div className={clsx(styles.htmlEditorLite_box, styles.toolbarBorder)}>
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
        </div>
      )}

      {/* Editor Content – Auto Height */}
      <div
        style={{ flex: isAutoHeightMode ? "0 0 auto" : 1 }}
        ref={editorRef}
        className={clsx(styles.htmlEditorLite_box3, isAutoHeightMode ? styles.htmlEditorLite_box3_isAutoHeightMode : styles.htmlEditorLite_box3_notIsAutoHeightMode)}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default HtmlEditorLite;
