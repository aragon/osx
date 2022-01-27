import React from 'react';
import styled from 'styled-components';

import {IconType} from '../icons';

export type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  /** activated status of the link */
  active?: boolean;
  disabled?: boolean;
  /** whether link should open new tab to external location */
  external?: boolean;
  iconRight?: React.FunctionComponentElement<IconType>;
  iconLeft?: React.FunctionComponentElement<IconType>;
  /** optional label for the link, defaults to the href if value not provided */
  label?: string;
  size?: 'small' | 'default' | 'large';
};

/** Default link component */
export const Link: React.FC<LinkProps> = ({
  active = false,
  disabled = false,
  external = true,
  iconLeft,
  iconRight,
  label,
  href,
  size = 'default',
  ...props
}) => {
  return (
    <StyledLink
      href={disabled ? undefined : href}
      rel="noopener noreferrer"
      active={active}
      disabled={disabled}
      {...(external ? {target: '_blank'} : {})}
      {...props}
      data-testid="link"
    >
      <div className="inline-flex justify-start items-center space-x-1.5">
        {iconLeft && iconLeft}
        <Label {...{size}}>{label || href}</Label>
        {!iconLeft && iconRight && iconRight}
      </div>
    </StyledLink>
  );
};

type StyledLinkProps = {disabled: boolean; active: boolean};
const StyledLink = styled.a.attrs(({active, disabled}: StyledLinkProps) => {
  let className = `overflow-hidden text-primary-500 hover:text-primary-700 rounded 
     focus:ring-2 focus:ring-primary-500 focus:outline-none`;

  className += ` ${
    disabled ? 'text-ui-300 pointer-events-none' : 'text-primary-500'
  } ${active ? 'text-primary-800' : 'text-primary-500'} `;

  return {className};
})<StyledLinkProps>``;

type LabelType = Pick<LinkProps, 'size'>;
const Label = styled.span.attrs(({size = 'default'}: LabelType) => {
  const sizes = {
    small: 'text-sm',
    default: 'text-base',
    large: 'text-lg',
  };
  const className = `${sizes[size]} font-bold`;
  return {className};
})<LabelType>``;
