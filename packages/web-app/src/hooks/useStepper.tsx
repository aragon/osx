import {useCallback, useState} from 'react';

export const useStepper = (totalSteps: number) => {
  const [currentStep, setStep] = useState<number>(1);

  /**************************************************
   *            Functions and Callbacks             *
   **************************************************/
  /** Function used for navigating to the next step in the process */
  const gotoNextStep = useCallback(() => {
    if (currentStep !== totalSteps) {
      setStep(current => current + 1);
    }
  }, [currentStep, totalSteps]);

  /** Function used for navigating to the previous step in the process */
  const gotoPreviousStep = useCallback(() => {
    if (currentStep !== 1) {
      setStep(current => current - 1);
    }
  }, [currentStep]);

  return {currentStep, prev: gotoPreviousStep, next: gotoNextStep, setStep};
};
