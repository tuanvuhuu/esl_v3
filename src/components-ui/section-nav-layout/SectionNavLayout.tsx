'use client';

import { CheckCircleFillIcon } from "@primer/octicons-react";
import { CounterLabel, NavList } from "@primer/react";
import clsx from "clsx";
import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Text from "../text";
import styles from "./SectionNavLayout.module.css";

export interface ISectionNavItem {
  key: string;
  /** text (được dịch qua translate) hoặc React node */
  title: React.ReactNode;
  /** hiện dấu ✓ thay cho số thứ tự */
  isDone?: boolean;
  /** nhóm con (menu 2 cấp). Section con đặt lồng trong Section cha */
  children?: ISectionNavItem[];
}

export interface ISectionNavLayoutHandle {
  /** cuộn tới nhóm (vd: nhóm đầu tiên có lỗi validate) */
  scrollTo: (key: string) => void;
}

interface ISectionNavLayoutProps {
  items: ISectionNavItem[];
  children: React.ReactNode;
  /** nội dung dưới menu trái (vd: thanh tiến độ) */
  sideFooter?: React.ReactNode;
  /** chiều cao tối đa vùng nội dung cuộn, vd "calc(100vh - 12rem)". Không truyền = không giới hạn */
  contentMaxHeight?: string;
  /** độ rộng menu trái, mặc định 250px */
  sideWidth?: string;
  /** gọi trước khi cuộn tới nhóm — vd: mở phần đang thu gọn để nhóm đủ cao */
  onNavigate?: (key: string) => void;
  ariaLabel?: string;
  className?: string;
  sideClassName?: string;
  /** hiện số thứ tự 1, 2, 3… trước mục cấp 1 trên menu trái, mặc định true */
  showNumber?: boolean;
  contentClassName?: string;
}

interface ISectionNavContext {
  register: (key: string, el: HTMLElement | null) => void;
}
const SectionNavContext = createContext<ISectionNavContext | null>(null);

/** text -> <Text> (có translate); React node -> render nguyên, bọc span để giữ style */
const renderTitle = (title: React.ReactNode, className?: string) =>
  typeof title === "string" ? (
    <Text text={title} className={className} />
  ) : (
    <span className={className}>{title}</span>
  );
/** độ sâu lồng Section: 0 = nhóm cấp 1, 1 = nhóm con */
const SectionDepthContext = createContext(0);

/**
 * Bố cục menu trái (NavList) + nội dung chia nhóm cuộn được:
 * bấm menu → cuộn tới nhóm; cuộn nội dung → menu đánh dấu nhóm đang xem (scrollspy).
 * Mỗi nhóm bọc trong <SectionNavLayout.Section sectionKey="..."> với sectionKey khớp items[].key.
 * Menu 2 cấp: truyền items[].children và đặt Section con lồng trong Section cha.
 */
const SectionNavLayoutBase = forwardRef<ISectionNavLayoutHandle, ISectionNavLayoutProps>((props, ref) => {
  const { items, children, sideFooter, contentMaxHeight, sideWidth, onNavigate, ariaLabel, className, sideClassName, contentClassName, showNumber = true } = props;
  // Scrollspy chỉ theo dõi các mục lá (mục cha có con thì theo dõi các con của nó)
  const leafItems = useMemo(
    () => items.flatMap((item) => (item.children?.length ? item.children : [item])),
    [items]
  );
  const [activeKey, setActiveKey] = useState(leafItems[0]?.key);
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Khi đang cuộn do bấm menu: khoá scrollspy để mục được bấm giữ trạng thái active
  // (các nhóm cuối không cuộn lên được tới đầu → scrollspy sẽ chọn nhầm nhóm cuối cùng).
  const isNavScrollingRef = useRef(false);
  const navScrollTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const releaseNavScrollLater = () => {
    clearTimeout(navScrollTimerRef.current);
    navScrollTimerRef.current = setTimeout(() => {
      isNavScrollingRef.current = false;
    }, 150);
  };
  useEffect(() => () => clearTimeout(navScrollTimerRef.current), []);

  const scrollTo = useCallback((key: string) => {
    onNavigate?.(key);
    // đợi 1 frame để thay đổi từ onNavigate (mở/thu gọn…) render xong rồi mới tính vị trí
    requestAnimationFrame(() => {
      const content = contentRef.current;
      const section = sectionRefs.current[key];
      if (!content || !section) return;
      setActiveKey(key);
      isNavScrollingRef.current = true;
      releaseNavScrollLater(); // nhả khoá cả khi không có sự kiện scroll nào (đã ở đúng vị trí)
      content.scrollTo({ top: section.offsetTop, behavior: "smooth" });
    });
  }, [onNavigate]);

  useImperativeHandle(ref, () => ({ scrollTo }), [scrollTo]);

  // Scrollspy: đánh dấu nhóm đang xem trên menu trái
  const handleContentScroll = () => {
    const content = contentRef.current;
    if (!content || !leafItems.length) return;
    if (isNavScrollingRef.current) {
      releaseNavScrollLater();
      return;
    }
    let current = leafItems[0].key;
    leafItems.forEach((item) => {
      const el = sectionRefs.current[item.key];
      if (el && el.offsetTop - 80 <= content.scrollTop) current = item.key;
    });
    if (content.scrollTop + content.clientHeight >= content.scrollHeight - 4) {
      current = leafItems[leafItems.length - 1].key;
    }
    setActiveKey(current);
  };

  const register = useCallback((key: string, el: HTMLElement | null) => {
    sectionRefs.current[key] = el;
  }, []);

  return (
    <SectionNavContext.Provider value={{ register }}>
      <div
        className={clsx(styles.layout, className)}
        style={sideWidth ? ({ "--section-nav-side-width": sideWidth } as React.CSSProperties) : undefined}
      >
        <div className={clsx(styles.side, "p-2 border-r bg-subtle", sideClassName ?? "")}>
          <NavList aria-label={ariaLabel ?? "Các nhóm thông tin"}>
            {items.map((item, index) => {
              const leadingVisual = item.isDone ? (
                <NavList.LeadingVisual>
                  <CheckCircleFillIcon fill="var(--fgColor-success)" />
                </NavList.LeadingVisual>
              ) : showNumber ? (
                <NavList.LeadingVisual>
                  <CounterLabel>{index + 1}</CounterLabel>
                </NavList.LeadingVisual>
              ) : null;
              if (item.children?.length) {
                // Mục cha chỉ mở/thu gọn menu con; bấm mục con mới cuộn tới nhóm
                return (
                  <NavList.Item key={item.key} defaultOpen>
                    {leadingVisual}
                    {renderTitle(item.title)}
                    <NavList.SubNav>
                      {item.children.map((child) => (
                        <NavList.Item
                          key={child.key}
                          href={`#${child.key}`}
                          aria-current={activeKey === child.key ? "location" : undefined}
                          onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            scrollTo(child.key);
                          }}
                        >
                          {renderTitle(child.title)}
                          {child.isDone && (
                            <NavList.TrailingVisual>
                              <CheckCircleFillIcon fill="var(--fgColor-success)" />
                            </NavList.TrailingVisual>
                          )}
                        </NavList.Item>
                      ))}
                    </NavList.SubNav>
                  </NavList.Item>
                );
              }
              return (
                <NavList.Item
                  key={item.key}
                  href={`#${item.key}`}
                  aria-current={activeKey === item.key ? "location" : undefined}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    scrollTo(item.key);
                  }}
                >
                  {leadingVisual}
                  {renderTitle(item.title)}
                </NavList.Item>
              );
            })}
          </NavList>
          {sideFooter}
        </div>

        <div
          ref={contentRef}
          className={clsx(styles.content, contentClassName)}
          style={{ maxHeight: contentMaxHeight }}
          onScroll={handleContentScroll}
        >
          {children}
        </div>
      </div>
    </SectionNavContext.Provider>
  );
});
SectionNavLayoutBase.displayName = "SectionNavLayout";

interface ISectionProps {
  sectionKey: string;
  /** tiêu đề nhóm; bỏ trống nếu nhóm tự vẽ tiêu đề (vd: CollapseAbleComponent) */
  title?: React.ReactNode;
  /** chú thích nhỏ bên phải tiêu đề (text hoặc React node) */
  description?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const Section = ({ sectionKey, title, description, className, children }: ISectionProps) => {
  const context = useContext(SectionNavContext);
  const depth = useContext(SectionDepthContext);
  const isSub = depth > 0;
  return (
    <section
      ref={(el) => context?.register(sectionKey, el)}
      className={clsx(styles.section, isSub ? "py-3" : "py-4", className)}
    >
      {(title || description) && (
        <div className={clsx("d-flex items-baseline justify-between gap-2", isSub ? "mb-2" : "mb-3")}>
          {title &&
            renderTitle(title, isSub ? "fw-bold fs-1 text-default" : "fw-bold fs-2 text-muted upper-case")}
          {description && renderTitle(description, "fs-0 text-muted")}
        </div>
      )}
      <SectionDepthContext.Provider value={depth + 1}>{children}</SectionDepthContext.Provider>
    </section>
  );
};

const SectionNavLayout = Object.assign(SectionNavLayoutBase, { Section });
export default SectionNavLayout;
