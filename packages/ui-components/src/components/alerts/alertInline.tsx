import React from 'react';
import styled from 'styled-components';

import {IconInfo, IconSuccess, IconWarning} from '../icons';

export type AlertInlineProps = {
  /** type and severity of alert */
  mode?: 'neutral' | 'success' | 'warning' | 'critical';

  /** alert copy */
  label: string;
};

const styles = {
  neutral: {
    icon: <IconInfo className="text-info-500" />,
    color: 'text-info-800',
  },
  success: {
    icon: <IconSuccess className="text-success-500" />,
    color: 'text-success-800',
  },
  warning: {
    icon: <IconWarning className="text-warning-500" />,
    color: 'text-warning-800',
  },
  critical: {
    icon: <IconWarning className="text-critical-500" />,
    color: 'text-critical-800',
  },
};

/**
 * Inline alert used in combination with form-fields
 */
export const AlertInline: React.FC<AlertInlineProps> = ({
  mode = 'neutral',
  label,
}) => {
  return (
    <Container data-testid="alertInline" mode={mode}>
      {styles[mode].icon} <p>{label}</p>
    </Container>
  );
};

type ContainerProps = {
  mode: NonNullable<AlertInlineProps['mode']>;
};
const Container = styled.div.attrs(({mode}: ContainerProps) => ({
  className: `flex items-center space-x-1 text-sm font-bold ${styles[mode].color}`,
}))<ContainerProps>``;
