'use client';

import { CSSProperties, FC, useId } from "react";

export interface IHtmlContentProps {
  // nội dung HTML thô (vd từ rich-text editor) — render qua dangerouslySetInnerHTML.
  html: string;
  // không truyền thì giữ nguyên font của từng thẻ trong html (không ép gì cả).
  fontFamily?: string;
  // không truyền thì giữ nguyên cỡ chữ của từng thẻ trong html. Number hiểu là px.
  fontSize?: number | string;
  // giới hạn số dòng hiển thị (line-clamp) — không truyền thì hiển thị đầy đủ, không cắt dòng.
  lineNumber?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Hiển thị 1 đoạn HTML thô (thường lấy từ rich-text editor) với khả năng ép đồng bộ font chữ/cỡ
 * chữ và giới hạn số dòng — dùng thay cho việc gắn thẳng dangerouslySetInnerHTML rải rác nhiều nơi.
 *
 * Vì html là nội dung thô, các thẻ con bên trong (span/p/font, ...) thường tự mang sẵn style
 * inline riêng (font-family, font-size, ...) — style inline trên chính thẻ con luôn thắng style
 * kế thừa từ thẻ cha, nên chỉ set style trên div bọc ngoài sẽ không ăn xuống được các thẻ đó.
 * Component này ép bằng cách chèn 1 CSS rule "!important" nhắm vào chính nó và mọi thẻ con, scope
 * riêng theo từng instance (qua useId) để không ảnh hưởng tới các HtmlContent khác trên trang.
 * Rule này chỉ được sinh ra khi thật sự truyền fontFamily/fontSize — không truyền thì không chèn
 * gì cả, nội dung giữ nguyên style gốc.
 */
const HtmlContent: FC<IHtmlContentProps> = ({
  html,
  fontFamily,
  fontSize,
  lineNumber,
  className,
  style,
}) => {
  const rawId = useId();
  // useId() trả về dạng ":r1:" — thay ký tự không hợp lệ trong class name (":") .
  const scopeClass = `html-content-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const fontSizeValue =
    typeof fontSize === "number" ? `${fontSize}px` : fontSize;
  const hasFontOverride = !!fontFamily || !!fontSizeValue;

  const lineClampStyle: CSSProperties = lineNumber
    ? {
        display: "-webkit-box",
        WebkitLineClamp: lineNumber,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }
    : {};

  return (
    <>
      {hasFontOverride && (
        <style>{`
          .${scopeClass}, .${scopeClass} * {
            ${fontFamily ? `font-family: ${fontFamily} !important;` : ""}
            ${fontSizeValue ? `font-size: ${fontSizeValue} !important;` : ""}
          }
        `}</style>
      )}
      <div
        className={[hasFontOverride ? scopeClass : "", className]
          .filter(Boolean)
          .join(" ")}
        style={{ ...lineClampStyle, ...style }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
};

export default HtmlContent;
