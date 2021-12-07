import {
  ActionItem,
  MenuItem,
  IconFinance,
  IconCommunity,
  IconDashboard,
  IconGovernance,
} from '@aragon/ui-components';
import React from 'react';
import {useTranslation} from 'react-i18next';

import NavLink from 'components/navLink';
import {Dashboard, Community, Finance, Governance} from 'utils/paths';

type NavLinksProps = {
  isDropdown?: boolean;
  selected?: string;
  onItemClick?: () => void;
};

const NavLinks: React.FC<NavLinksProps> = ({
  isDropdown = false,
  selected,
  onItemClick,
}) => {
  const {t} = useTranslation();

  // TODO: Investigate string interpolation with react-i18next
  return (
    <div
      data-testid="navLinks"
      className={
        isDropdown
          ? 'flex flex-col space-y-1.5'
          : 'flex space-x-1.5 items-center'
      }
    >
      <NavLink
        to={Dashboard}
        onClick={onItemClick}
        selected={selected}
        component={
          isDropdown ? (
            <ActionItem
              wide
              icon={<IconDashboard />}
              label={t('navLinks.dashboard')}
            />
          ) : (
            <MenuItem
              icon={<IconDashboard />}
              label={t('navLinks.dashboard')}
            />
          )
        }
      />
      <NavLink
        to={Governance}
        onClick={onItemClick}
        selected={selected}
        component={
          isDropdown ? (
            <ActionItem
              wide
              icon={<IconGovernance />}
              label={t('navLinks.governance')}
            />
          ) : (
            <MenuItem
              icon={<IconGovernance />}
              label={t('navLinks.governance')}
            />
          )
        }
      />
      <NavLink
        to={Finance}
        onClick={onItemClick}
        selected={selected}
        component={
          isDropdown ? (
            <ActionItem
              wide
              icon={<IconFinance />}
              label={t('navLinks.finance')}
            />
          ) : (
            <MenuItem icon={<IconFinance />} label={t('navLinks.finance')} />
          )
        }
      />
      <NavLink
        to={Community}
        onClick={onItemClick}
        selected={selected}
        component={
          isDropdown ? (
            <ActionItem
              wide
              icon={<IconCommunity />}
              label={t('navLinks.community')}
            />
          ) : (
            <MenuItem
              icon={<IconCommunity />}
              label={t('navLinks.community')}
            />
          )
        }
      />
    </div>
  );
};

export default NavLinks;
