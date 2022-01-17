import React from 'react';
import styled from 'styled-components';

export type ActionListItemProps = {
  /**
   * Whether list item is disabled
   */
  disabled?: boolean;
  /**
   * Icon to display to the right of the item text
   */
  // eslint-disable-next-line
  icon: any; // TODO: Set proper type
  /**
   * Action subtitle
   */
  subtitle?: string;
  /**
   * Action label
   */
  title: string;
  /**
   * Background color
   */
  background?: string;
  onClick?: () => void;
};

/**
 * List group action item
 */
export const ActionListItem: React.FC<ActionListItemProps> = ({
  disabled = false,
  icon,
  subtitle,
  title,
  onClick,
  background,
}) => {
  return (
    <Container
      {...{onClick, disabled, background}}
      data-testid="actionListItem"
    >
      <TextContainer>
        <Title>{title}</Title>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
      </TextContainer>
      <IconContainer>{icon}</IconContainer>
    </Container>
  );
};

// TODO: Investigate group flexibility when children have different styles based
// on parent state
type ContainerProps = Pick<ActionListItemProps, 'background'>;
const Container = styled.button.attrs(({background}: ContainerProps) => ({
  className: `w-full flex justify-between items-center py-1.5 
  px-2 space-x-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 
  box-border border-ui-100 active:border-ui-800 hover:border-ui-300 
  disabled:border-ui-200 disabled:bg-ui-100 rounded-xl
  ${background && `bg-${background}`} `,
}))``;

const TextContainer = styled.div.attrs({
  className: 'text-left',
})``;

const Title = styled.p.attrs({
  className: 'font-bold',
})`
  color: #52606d; //UI-600

  ${Container}:active & {
    color: #323f4b; //UI-800
  }

  ${Container}:hover & {
    color: #003bf5; //PRIMARY-800
  }

  ${Container}:disabled & {
    color: #9aa5b1; //UI-300
  }
`;

const Subtitle = styled.p.attrs({
  className: 'text-sm',
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
