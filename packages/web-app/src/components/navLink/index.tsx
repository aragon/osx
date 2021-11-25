import React, {useCallback} from 'react';
import {ActionItem, MenuItem} from '@aragon/ui-components';
import {useHistory, useRouteMatch} from 'react-router-dom';

type NavLinkProps = {
  icon: React.ReactElement;
  isMobile: boolean;
  label: string;
  to: string;
  selected?: string;
  onClick?: () => void;
};

const NavLink: React.FC<NavLinkProps> = ({
  isMobile,
  icon,
  selected = false,
  label,
  to,
  onClick,
}) => {
  const history = useHistory();
  const isMatch = useRouteMatch({path: to, exact: true});

  const handleClick = useCallback(() => {
    if (!isMatch) {
      history.push(to);
    }

    if (onClick) {
      onClick();
    }
  }, [history, isMatch, onClick, to]);

  const getIsSelected = useCallback(() => {
    return (!selected ? isMatch : selected === to) as boolean;
  }, [isMatch, selected, to]);

  const props = {
    icon,
    label,
    onClick: handleClick,
    isSelected: getIsSelected(),
  };
  return isMobile ? <ActionItem {...props} /> : <MenuItem {...props} />;
};

export default NavLink;
