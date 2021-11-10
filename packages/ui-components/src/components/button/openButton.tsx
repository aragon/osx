import React from 'react';
import {ButtonProps} from './button';
import {IconButton} from './iconButton';

/** Button used to open dropdowns or popovers. Comes with a downward-facing
 * arrowhead icon  */
export const OpenButton: React.FC<ButtonProps> = ({
  mode = 'primary',
  size = 'default',
  disabled = false,
  label,
  onClick,
}) => {
  // TODO replace with correct icon src [VR 10-11-2021]
  const addIcon = 'https://place-hold.it/150x150';

  // TODO make component keep track of open/closed state and change icon acordingly.
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
