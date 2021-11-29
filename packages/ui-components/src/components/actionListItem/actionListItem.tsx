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
   * Whether item fits its container
   */
  wide?: boolean;
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
  wide = false,
  onClick,
}) => {
  return (
    <Container
      wide={wide}
      onClick={onClick}
      disabled={disabled}
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
type ContainerProps = {wide: boolean};
const Container = styled.button.attrs(({wide}: ContainerProps) => ({
  className: `${
    wide && 'w-full'
  } flex justify-between items-center py-1.5 px-2 space-x-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 box-border border-2 border-ui-100 active:border-ui-800 hover:border-ui-300 disabled:border-ui-200 disabled:bg-ui-100 rounded-xl`,
}))<ContainerProps>``;

const TextContainer = styled.div.attrs({
  className: 'text-left',
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
