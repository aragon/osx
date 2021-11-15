import React from 'react';
import styled from 'styled-components';

import {IconChevronRight} from '../../';

export type ActionListItemProps = {
  /**
   * Whether list item is disabled
   */
  disabled?: boolean;
  onClick?: () => void;
  /**
   * Action subtitle
   */
  subtitle: string;
  /**
   * Action label
   */
  title: string;
};

/**
 * List group action item
 */
export const ActionListItem: React.FC<ActionListItemProps> = ({
  disabled = false,
  onClick,
  subtitle,
  title,
}) => {
  return (
    <Container
      disabled={disabled}
      onClick={onClick}
      data-testid="actionListItem"
    >
      <TextContainer>
        <Title>{title}</Title>
        <Subtitle>{subtitle}</Subtitle>
      </TextContainer>
      <IconContainer>
        <IconChevronRight />
      </IconContainer>
    </Container>
  );
};

// TODO: Investigate group flexibility when children have different styles based
// on parent state
const Container = styled.button.attrs({
  className: `flex justify-between items-center py-1.5 px-2 space-x-1.5
  .box-border border-2 border-ui-100 active:border-ui-800 hover:border-ui-300
   disabled:border-ui-200 disabled:bg-ui-100 rounded-xl `,
})``;

const TextContainer = styled.div.attrs({
  className: 'text-left font-semibold',
})``;

const Title = styled.p.attrs({})`
  color: #52606d; //UI-600

  ${Container}:active & {
    color: #323f4b; //UI-800
  }

  ${Container}:disabled & {
    color: #9aa5b1; //UI-300
  }
`;

const Subtitle = styled.p.attrs({
  className: 'text-xs',
})`
  color: #7b8794; //UI-400

  ${Container}:disabled & {
    color: #9aa5b1; //UI-300
  }
`;

const IconContainer = styled.div.attrs({
  className: 'h-2 w-2',
})`
  color: #9aa5b1; //UI-300

  ${Container}:hover & {
    color: #52606d; //UI-600
  }

  ${Container}:active & {
    color: #323f4b; //UI-800
  }

  ${Container}:disabled & {
    color: #9aa5b1; //UI-300
  }
`;
