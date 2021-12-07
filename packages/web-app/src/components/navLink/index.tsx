import React, {useCallback} from 'react';
import {useMatch, useNavigate, useResolvedPath} from 'react-router-dom';

type NavLinkProps = {
  to: string;
  component: React.FunctionComponentElement<{
    isSelected: boolean;
    onClick?: () => void;
  }>;
  selected?: string;
  onClick?: () => void;
};

const NavLink: React.FC<NavLinkProps> = ({
  to,
  onClick,
  selected,
  component,
}) => {
  const resolved = useResolvedPath(to);
  const isMatch = useMatch({path: resolved.pathname, end: true});
  const navigate = useNavigate();

  const getSelected = useCallback(() => {
    return (selected ? selected === to : isMatch) as boolean;
  }, [isMatch, selected, to]);

  const handleClick = () => {
    if (onClick) onClick();
    navigate(to);
  };
  return (
    <>
      {React.cloneElement(component, {
        isSelected: getSelected(),
        onClick: handleClick,
      })}
    </>
  );
};

export default NavLink;
