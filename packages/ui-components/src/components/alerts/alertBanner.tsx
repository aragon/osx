import React from 'react';
import styled from 'styled-components';

export type AlertBannerProps = {
  /** type and severity of alert */
  mode?: 'info' | 'success' | 'warning' | 'critical';

  /** alert copy */
  label: string;
};

export const AlertBanner: React.FC<AlertBannerProps> = ({
  mode = 'info',
  label,
}) => {
  return (
    <Container role="alert" mode={mode}>
      <p>{label}</p>
    </Container>
  );
};

const styles = {
  info: 'text-info-900 bg-info-100',
  success: 'text-success-900 bg-success-100',
  warning: 'text-warning-900 bg-warning-100',
  critical: 'text-critical-900 bg-critical-100',
};

type ContainerProps = {
  mode: NonNullable<AlertBannerProps['mode']>;
};

const Container = styled.div.attrs(({mode}: ContainerProps) => ({
  className: `text-xs py-0.5 px-2 text-center font-bold ${styles[mode]}`,
}))<ContainerProps>``;
