'use client';

import { Icon, KebabHorizontalIcon, XIcon } from "@primer/octicons-react";
import { ActionList, ActionMenu, IconButton, Spinner } from "@primer/react";
import clsx from "clsx";
import AnimatedBox from "../box-animation";
import styles from './bulk-action-bar.module.css';

export interface IBulkActionBarAction {
   key: string;
   label: string;
   icon?: Icon;
   variant?: "default" | "danger";
   isLoading?: boolean;
   disabled?: boolean;
   onClick: () => void;
   render?: () => React.ReactNode;
}

export interface IBulkActionBarProps {
   /** Số dòng đang được chọn - bar tự ẩn khi <= 0 */
   count: number;
   /** vd: "bệnh án", "sản phẩm"... mặc định "mục" */
   itemLabel?: string;
   onClear: () => void;
   /** Các hành động hiển thị trực tiếp trên bar */
   actions: IBulkActionBarAction[];
   /** Hành động phụ, gom vào nút "..." nếu quá nhiều để tránh chật */
   moreActions?: IBulkActionBarAction[];
}

/**
 * Thanh bulk-action nổi ở đáy khi có dòng được chọn trong DataGrid (kiểu ClickUp),
 * dùng thay cho việc nhồi thêm nút vào header của bảng.
 *
 * Bar được đặt `position: absolute` và render tại chỗ (không portal ra document.body),
 * nên nó neo/căn giữa theo container cha gần nhất có `position` (ví dụ thẻ `Page`),
 * chứ không phải giữa toàn bộ viewport trình duyệt. Vì vậy component này cần được
 * render bên trong một container có `position: relative|absolute|fixed` (Page đã set sẵn).
 */
const BulkActionBar = (props: IBulkActionBarProps) => {
   const { count, itemLabel = "mục", onClear, actions, moreActions } = props;
   if (count <= 0) return null;

   const content = (
      // Box ngoài cùng mới là box chịu trách nhiệm position/căn giữa: nó là con trực tiếp
      // (không transform) của container cha gần nhất có `position` (Page truyền
      // position:"relative"), nên containing block đúng là Page - không phải viewport.
      // AnimatedBox (framer-motion) LUÔN set `transform` -> tự tạo containing block riêng,
      // nên phải để nó nằm BÊN TRONG (chỉ lo animation), không được là box ngoài cùng -
      // nếu không, phần "bottom" sẽ tính theo chiều cao co về 0 của AnimatedBox (vì con bị
      // position:absolute lấy ra khỏi flow) thay vì theo đáy thật của Page, khiến bar bị kéo
      // lên lẫn vào DataGrid thay vì nằm ở đáy Page.
      <div
         className={styles.bulkActionBar_box}
      >
         <AnimatedBox variant="slideUp">
            <div
               className={styles.bulkActionBar_box2}
            >
               <div
                  className={styles.bulkActionBar_box3}
               >
                  {count} {itemLabel} đã chọn
                  <IconButton
                     icon={XIcon}
                     aria-label="Bỏ chọn"
                     variant="invisible"
                     onClick={onClear}
                     className={styles.bulkActionBar_iconButton}
                  />
               </div>
               <div
                  className={styles.bulkActionBar_box4}
               />
               <div className={styles.bulkActionBar_box5}>
                  {actions.map((action) => (
                     <div
                        key={action.key}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                           if (!action.disabled && !action.isLoading) action.onClick();
                        }}
                        className={clsx(
                           styles.bulkActionBar_item,
                           (action.disabled || action.isLoading) && styles.bulkActionBar_itemBlocked,
                           action.disabled && styles.bulkActionBar_itemDisabled,
                           action.variant === "danger" && styles.bulkActionBar_itemDanger,
                        )}
                     >
                        {action.render && action.render()}
                        {!action.render && <>
                           {action.isLoading ? (
                              <Spinner size="small" className={styles.bulkActionBar_spinner} />
                           ) : (
                              action.icon && <action.icon size={16} />
                           )}
                           {action.label}
                        </>}

                     </div>
                  ))}
                  {moreActions && moreActions.length > 0 && (
                     <ActionMenu>
                        <ActionMenu.Anchor>
                           <div
                              role="button"
                              tabIndex={0}
                              className={styles.bulkActionBar_box6}
                           >
                              <KebabHorizontalIcon size={16} />
                           </div>
                        </ActionMenu.Anchor>
                        <ActionMenu.Overlay>
                           <ActionList>
                              {moreActions.map((action) => (
                                 <ActionList.Item
                                    key={action.key}
                                    disabled={action.disabled || action.isLoading}
                                    variant={
                                       action.variant === "danger" ? "danger" : "default"
                                    }
                                    onSelect={action.onClick}
                                 >
                                    {action.icon && (
                                       <ActionList.LeadingVisual>
                                          <action.icon />
                                       </ActionList.LeadingVisual>
                                    )}
                                    {action.label}
                                 </ActionList.Item>
                              ))}
                           </ActionList>
                        </ActionMenu.Overlay>
                     </ActionMenu>
                  )}
               </div>
            </div>
         </AnimatedBox>
      </div>
   );

   return content;
};

export default BulkActionBar;
