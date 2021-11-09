import React, {ButtonHTMLAttributes} from 'react';
import styled from 'styled-components';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The text to display in the button.
   */
  mode: 'primary' | 'secondary' | 'tertiary' | 'ghost';
  size: 'small' | 'default';
  functionality: 'add' | 'open' | 'normal';
  label: string;
}

/**
 * Primary UI component for user interaction
 */
export const Button: React.FC<ButtonProps> = ({
  mode = 'primary',
  size = 'default',
  functionality = 'normal',
  label,
  onClick,
}) => {
  return (
    <StyledButton mode={mode} size={size} onClick={onClick}>
      <Content label={label} functionality={functionality} />
    </StyledButton>
  );
};

// Content Components ======================================================

type ContentProps = {
  label: ButtonProps['label'];
  functionality: ButtonProps['functionality'];
};

/**
 * Provides the content for the button. The content depends on the Button's
 * functionality prop. If the functionality is 'add', or 'open', the content
 * will be a label and an icon. If the functionality is 'normal', the content
 * will be just a label.
 */
const Content: React.FC<ContentProps> = ({label, functionality}) => {
  // TODO replace image holder with correct icons. [VR 09-11-2021]
  if (functionality === 'add') {
    return (
      <FlexDiv className="flex">
        <AddIcon />
        {label}
      </FlexDiv>
    );
  } else if (functionality === 'open') {
    return (
      <FlexDiv className="flex">
        {label}
        <OpenIcon />
      </FlexDiv>
    );
  } else {
    return <div className="flex">{label}</div>;
  }
};

const FlexDiv = styled.div`
  display: flex;
`;

const AddIcon = styled.img.attrs({
  src: 'https://place-hold.it/150x150',
  className: 'mr-2 w-3 h-3',
})``;

const OpenIcon = styled.img.attrs({
  src: 'https://place-hold.it/150x150',
  className: 'ml-2 w-3 h-3',
})``;

type SizedButtonProps = {
  size: ButtonProps['size'];
};

// Base Button Components ======================================================

/**
 * Extends the button element with the desired size.
 */
const SizedButton = styled.button.attrs(({size}: SizedButtonProps) => {
  const className = `px-4 ${
    size === 'default' ? 'py-3 rounded-2xl' : 'py-2 rounded-xl'
  }`;
  return {className};
})<SizedButtonProps>``;

type StyledButtonProps = {
  mode: ButtonProps['mode'];
  size: ButtonProps['size'];
};

/**
 * Extends the SizedButton element with the desired styling
 */
const StyledButton = styled(SizedButton).attrs(({mode}: StyledButtonProps) => {
  let className;

  if (mode === 'primary') {
    className =
      'text-ui-0 bg-primary-400 hover:bg-primary-500 active:bg-primary-700';
  } else if (mode === 'secondary') {
    className =
      'text-primary-500 bg-primary-100 hover:text-primary-800 active:bg-primary-200 active:text-primary-800';
  } else if (mode === 'tertiary') {
    className =
      'text-ui-600 bg-ui-0 border-2 border-ui-100 hover:border-ui-300 active:border-ui-800';
  } else if (mode === 'ghost') {
    className =
      'text-primary-500 bg-ui-0 hover:text-primary-800 active:bg-primary-50';
  }

  return {className};
})<StyledButtonProps>``;
