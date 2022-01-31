import React, {ReactElement} from 'react';

export type StepProps = {
  wizardTitle?: string;
  wizardDescription?: string;
  hideWizard?: boolean;
  fullWidth?: boolean;
  customHeader?: ReactElement;
  customFooter?: ReactElement;
  backButtonLabel?: string;
  nextButtonLabel?: string;
  isNextButtonDisabled?: boolean;
  onBackButtonClicked?: () => void;
  onNextButtonClicked?: () => void;
};

export const Step: React.FC<StepProps> = ({children}) => {
  return <>{children}</>;
};
