import React from 'react';
import styled from 'styled-components';

export type BadgeProps = {
  /** Changes a badge's color scheme */
  colorScheme?: 'neutral' | 'success' | 'critical';
  /** Text displayed on the badge */
  label: string;
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  colorScheme = 'neutral',
}) => {
  return (
    <StyledBadge data-testid="badge" colorScheme={colorScheme}>
      <p>{label}</p>
    </StyledBadge>
  );
};

type StyledBadgeProps = {
  colorScheme: BadgeProps['colorScheme'];
};

const StyledBadge = styled.div.attrs(({colorScheme}: StyledBadgeProps) => {
  let colorCode;
  if (colorScheme === 'success') {
    colorCode = 'bg-success-200 text-success-800';
  } else if (colorScheme === 'critical') {
    colorCode = 'bg-critical-200 text-critical-800';
  } else {
    colorCode = 'bg-ui-50 text-ui-600';
  }

  const className: string = `text-sm px-0.5 font-bold rounded ${colorCode}`;

  return {className, style: {paddingTop: 2, paddingBottom: 2}};
})<StyledBadgeProps>``;
