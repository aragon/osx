import React from 'react';
import {ButtonProps} from './button';
import {IconButton} from './iconButton';

/** Button to add stuff. Comes with a plus sign icon  */
export const AddButton: React.FC<ButtonProps> = ({
  mode = 'primary',
  size = 'default',
  disabled = false,
  label,
  onClick,
}) => {
  // TODO replace with correct icon src [VR 10-11-2021]
  const addIcon = 'https://place-hold.it/150x150';
  return (
    <IconButton
      iconSrc={addIcon}
      label={label}
      side="left"
      mode={mode}
      size={size}
      disabled={disabled}
      onClick={onClick}
    />
  );
};
