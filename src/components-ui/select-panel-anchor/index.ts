import type { HTMLAttributes } from 'react';

/**
 * Props mà SelectPanel/ActionMenu truyền cho `renderAnchor`.
 * Từ @primer/react v38 type của `renderAnchor` bỏ `aria-labelledby` khỏi props (runtime vẫn truyền khi tự nối label),
 * nên khai báo lại để destructure `'aria-labelledby'` được.
 */
export type SelectPanelAnchorProps = HTMLAttributes<HTMLElement>;
