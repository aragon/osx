import React from 'react';
import styled from 'styled-components';
import {Badge} from '../badge';

export type LabelProps = {
  label: string;
  helpText?: string;
  isOptional?: boolean;
  badgeLabel?: string;
};

export const Label: React.FC<LabelProps> = ({
  label,
  helpText,
  isOptional = false,
  badgeLabel
}) => {
  return (
    <VStack data-testid="label">
      <LabelLine>
        <Heading>{label}</Heading>
        {isOptional && <Badge label={badgeLabel || 'Optional'} />}
      </LabelLine>
      {helpText && <HelpText>{helpText}</HelpText>}
    </VStack>
  );
};

const VStack = styled.div.attrs({
  className: "space-y-0.5",
})``;

const LabelLine = styled.div.attrs({
  className: "flex space-x-1.5",
})``;

const Heading = styled.p.attrs({
  className: "font-bold text-ui-800",
})``;

const HelpText = styled.p.attrs({
  className: "text-sm font-normal text-ui-600",
})``;
