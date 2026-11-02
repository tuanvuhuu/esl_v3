'use client';

import { KeyIcon, SignOutIcon } from '@primer/octicons-react';
import { ActionList, ActionMenu, IconButton, Text } from '@primer/react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { ICommonUser, useCommonContext } from '../_adapters/commonContext';
import { localizedResourceMap } from '../_adapters/localizedResourceMap';
import { LanguageSelection } from '../_adapters/uploadComponents';
import UserAvatar from '../user-avatar';
import { IBaseComponentProps } from '../utils/types/IBaseComponentProps';
import styles from './user-panel.module.css';

export interface IUserPanelProps extends IBaseComponentProps {
  user?: ICommonUser;
  changePasswordHref?: string;
  logoutHref?: string;
  onLogout?: () => void;
}

const UserPanel = (props: IUserPanelProps): React.JSX.Element => {
  const router = useRouter();
  const { translate, user: contextUser } = useCommonContext();
  const user = props.user ?? contextUser;

  const handleLogout = () => {
    if (props.onLogout) {
      props.onLogout();
      return;
    }
    router.push(props.logoutHref ?? '/logout');
  };

  const UserIcon = () => (
    <div className={styles.userIcon_box}>
      <UserAvatar fullName={user?.full_name ?? ''} url={user?.avatar} size="medium" />
    </div>
  );

  return (
    <ActionMenu>
      <ActionMenu.Anchor>
        <IconButton icon={UserIcon} aria-label="Tài khoản người dùng" variant="invisible" />
      </ActionMenu.Anchor>

      <ActionMenu.Overlay width="auto">
        <ActionList>
          <ActionList.Item>
            <div className="d-flex">
              <div>
                <UserAvatar
                  fullName={user?.full_name ?? ''}
                  url={user?.avatar}
                  size="large"
                />
              </div>
              <div className="flex-1 pl-2">
                <Text className="fw-bold">{user?.full_name}</Text>
                <br />
                <Text>{user?.username}</Text>
              </div>
            </div>
          </ActionList.Item>
          <ActionList.Divider />
          <ActionList.Item
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {translate(localizedResourceMap.BASE.LANGUAGE)}
            <ActionList.TrailingVisual>
              <div className={styles.userPanel_box3}>
                <LanguageSelection />
              </div>
            </ActionList.TrailingVisual>
          </ActionList.Item>
          <ActionList.Divider />
          <ActionList.Item
            onSelect={() => {
              router.push(props.changePasswordHref ?? '/doi-mat-khau');
            }}
          >
            <ActionList.LeadingVisual>
              <KeyIcon />
            </ActionList.LeadingVisual>
            Đổi mật khẩu
          </ActionList.Item>
          <ActionList.Divider />
          <ActionList.Item variant="danger" onSelect={handleLogout}>
            <ActionList.LeadingVisual>
              <SignOutIcon />
            </ActionList.LeadingVisual>
            {translate(localizedResourceMap.BASE.LOG_OUT)}
          </ActionList.Item>
        </ActionList>
      </ActionMenu.Overlay>
    </ActionMenu>
  );
};

export default UserPanel;
