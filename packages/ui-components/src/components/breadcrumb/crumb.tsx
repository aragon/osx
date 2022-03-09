import React, {ReactComponentElement} from 'react';
import styled from 'styled-components';

import {IconType} from '../icons';
import {BadgeProps} from '../badge';

type CrumbProps = {
  first?: boolean;
  label: string;
  last?: boolean;
  icon?: ReactComponentElement<IconType>;
  tag?: React.FunctionComponentElement<BadgeProps>;
  onClick?: React.MouseEventHandler;
};

const Crumb: React.FC<CrumbProps> = props => {
  return (
    <CrumbContainer
      onClick={props.onClick}
      className={props.last ? 'text-ui-600 cursor-default' : 'text-primary-500'}
    >
      {props.first &&
        props.icon &&
        React.cloneElement(props.icon, {
          className: 'desktop:w-2.5 desktop:h-2.5',
        })}
      <p className="font-bold">{props.label}</p>
      {props.last && props.tag}
    </CrumbContainer>
  );
};

export default Crumb;

const CrumbContainer = styled.button.attrs({
  className: 'flex items-center space-x-1 desktop:space-x-1.5' as string,
})``;
