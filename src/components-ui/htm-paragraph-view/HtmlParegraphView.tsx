'use client';

import { useMemo } from "react";
import styles from "./HtmlParegraphView.module.css";

interface IHtmlParegraphViewProps {
  html: string;
  lineNumber?: number;
}

const HtmlParegraphView = (props: IHtmlParegraphViewProps) => {
  const { html, lineNumber = 2 } = props;

  const htmlView = useMemo(() => {
    if (typeof DOMParser === "undefined") {
      return html;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const allParagraphs = Array.from(doc.body.querySelectorAll("p"));
    const isOverflow = allParagraphs.length > lineNumber;

    const visibleParagraphs = allParagraphs
      .slice(0, lineNumber)
      .map((p, index) => {
        // nếu là dòng cuối và có overflow -> thêm ...
        if (index === lineNumber - 1 && isOverflow) {
          p.textContent = `${p.textContent?.trim()}…`;
        }

        return p.outerHTML;
      })
      .join("");

    return visibleParagraphs;
  }, [html, lineNumber]);

  return (
    <div
      className={styles.htmlParagraphView}
      dangerouslySetInnerHTML={{ __html: htmlView }}
    />
  );
};

export default HtmlParegraphView;
