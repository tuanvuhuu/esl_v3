'use client';

import { IconButton } from "@primer/react";
import clsx from "clsx";
import {
   ChevronDownIcon,
   ChevronRightIcon,
   ChevronUpIcon,
} from "@primer/octicons-react";
import React, { useState } from "react";
import AnimatedBox from "../box-animation";

interface ICollapseAbleComponentProps extends React.HTMLAttributes<HTMLDivElement> {
   caption: string | React.ReactNode;
   icon?: React.ReactNode;
   isExpanded?: boolean;
   isExpandBtnDislayEnd?: boolean;
   /** class cho dòng tiêu đề (thay cho headerSx cũ) */
   headerClassName?: string;
   isExpandOnHeaderClick?: boolean;
   /** gọi khi người dùng thu/mở (để component cha đồng bộ state của mình) */
   onExpandedChange?: (isExpanded: boolean) => void;
}
const CollapseAbleComponent = (props: ICollapseAbleComponentProps) => {
   const {
      caption,
      icon,
      isExpanded: isExpandedProp,
      isExpandBtnDislayEnd,
      headerClassName,
      isExpandOnHeaderClick,
      onExpandedChange,
      children,
      ...divProps
   } = props;
   const [isExpanded, setIsExpanded] = useState(isExpandedProp);
   const [prevExpandedProp, setPrevExpandedProp] = useState(isExpandedProp);
   if (isExpandedProp !== prevExpandedProp) {
      setPrevExpandedProp(isExpandedProp);
      setIsExpanded(isExpandedProp);
   }
   const toggle = () => {
      setIsExpanded(!isExpanded);
      onExpandedChange?.(!isExpanded);
   };
   // IconButton nằm trong header: chặn nổi bọt để không bị đảo trạng thái 2 lần khi isExpandOnHeaderClick
   const handleIconClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      toggle();
   };
   return (
      <div {...divProps}>
         <div className="d-grid gap-2">
            <div
               className={clsx("d-flex items-center gap-1", isExpandOnHeaderClick && "cursor-pointer", headerClassName)}
               onClick={isExpandOnHeaderClick ? toggle : undefined}
            >
               {icon && <>{icon}</>}
               {isExpandBtnDislayEnd !== true && (
                  <div>
                     <IconButton
                        icon={isExpanded ? ChevronUpIcon : ChevronDownIcon}
                        aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
                        variant="invisible"
                        onClick={handleIconClick}
                     />
                  </div>
               )}
               <div className="flex-1">{caption}</div>
               {isExpandBtnDislayEnd === true && (
                  <div>
                     <IconButton
                        icon={isExpanded ? ChevronDownIcon : ChevronRightIcon}
                        aria-label={isExpanded ? "Thu gọn" : "Mở rộng"}
                        variant="invisible"
                        onClick={handleIconClick}
                     />
                  </div>
               )}
            </div>
            {isExpanded && (
               <AnimatedBox variant="slideDown">{children}</AnimatedBox>
            )}
         </div>
      </div>
   );
};

export default CollapseAbleComponent;
