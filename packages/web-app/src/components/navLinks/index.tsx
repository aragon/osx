import {
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
  isMobile?: boolean;
  selected?: string;
  onClick?: () => void;
};

const NavLinks: React.FC<NavLinksProps> = ({
  isMobile = false,
  selected,
  onClick,
}) => {
  const {t} = useTranslation();

  // TODO: Investigate string interpolation with react-i18next
  return (
    <div
      data-testid="navLinks"
      className={
        isMobile ? 'flex flex-col space-y-1.5' : 'flex space-x-1.5 items-center'
      }
    >
      <NavLink
        to={Dashboard}
        icon={<IconDashboard />}
        label={t('navLinks.dashboard')}
        onClick={onClick}
        selected={selected}
        isMobile={isMobile}
      />
      <NavLink
        to={Governance}
        icon={<IconGovernance />}
        label={t('navLinks.governance')}
        onClick={onClick}
        selected={selected}
        isMobile={isMobile}
      />
      <NavLink
        to={Finance}
        icon={<IconFinance />}
        label={t('navLinks.finance')}
        onClick={onClick}
        selected={selected}
        isMobile={isMobile}
      />
      <NavLink
        to={Community}
        icon={<IconCommunity />}
        label={t('navLinks.community')}
        onClick={onClick}
        selected={selected}
        isMobile={isMobile}
      />
    </div>
  );
};

export default NavLinks;
