import React from 'react';
import styled from 'styled-components';
import { LinearProgress } from '../progress';

export type WizardProps = {
  processName: string;
  currentStep: number;
  totalSteps: number;
  title: string;
  description: string;
}

export const Wizard: React.FC<WizardProps> = ({processName, currentStep, totalSteps, title, description}) => {
  return (
    <StepCard data-testid="wizard">
      <CenteredFlex>
        <p className="font-bold text-primary-500">
          {processName}
        </p>
        {/* TODO: Check how to do i18n for the Step x of y format */}
        <p className="text-ui-400">Step {currentStep} of {totalSteps}</p>
      </CenteredFlex>
      <LinearProgress max={totalSteps} value={currentStep} />
      <StepTitle>{title}</StepTitle>
      <StepSubTitle>
        {description}
      </StepSubTitle>
    </StepCard>
  );
};

const StepCard = styled.div.attrs({
  className: 'py-3 px-2 tablet:px-3 lg:px-6 lg:py-6 rounded-xl bg-ui-0',
})``;

const StepTitle = styled.h1.attrs({
  className: 'mt-4 text-2xl lg:text-3xl font-bold text-ui-800',
})``;

const StepSubTitle = styled.p.attrs({
  className: 'mt-2 text-base lg:text-lg',
})``;

const CenteredFlex = styled.div.attrs({
  className: 'flex justify-between items-baseline text-sm lg:text-base',
})``;