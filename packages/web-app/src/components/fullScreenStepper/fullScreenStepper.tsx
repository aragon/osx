import {
  IconChevronLeft,
  Wizard,
  ButtonText,
  IconChevronRight,
} from '@aragon/ui-components';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import React, {createContext, useContext, useMemo} from 'react';

import {useStepper} from 'hooks/useStepper';
import {StepProps} from './step';

export type FullScreenStepperProps = {
  wizardProcessName: string;
  totalFormSteps?: number;
  children: React.FunctionComponentElement<StepProps>[];
};

type FullScreenStepperContextType = {
  currentStep: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  prev: () => void;
  next: () => void;
};

const FullScreenStepperContext = createContext<
  FullScreenStepperContextType | undefined
>(undefined);

export const useFormStep = () =>
  useContext(FullScreenStepperContext) as FullScreenStepperContextType;

export const FullScreenStepper: React.FC<FullScreenStepperProps> = ({
  totalFormSteps,
  wizardProcessName,
  children,
}) => {
  const {t} = useTranslation();

  const {currentStep, prev, next, setStep} = useStepper(children.length);

  const currentIndex = currentStep - 1;
  const {
    wizardTitle,
    wizardDescription,
    hideWizard,
    fullWidth,
    customHeader,
    customFooter,
    backButtonLabel,
    nextButtonLabel,
    isNextButtonDisabled,
    onBackButtonClicked,
    onNextButtonClicked,
  } = children[currentIndex].props;

  const value = {currentStep, setStep, prev, next};

  const currentFormStep = useMemo(() => {
    return !totalFormSteps || totalFormSteps === children.length
      ? currentStep
      : currentStep - (children.length - totalFormSteps);
  }, [children.length, currentStep, totalFormSteps]);

  return (
    <FullScreenStepperContext.Provider value={value}>
      <Layout>
        {!hideWizard && (
          <Wizard
            processName={wizardProcessName}
            title={wizardTitle || ''}
            description={wizardDescription || ''}
            totalSteps={totalFormSteps || children.length}
            currentStep={currentFormStep}
          />
        )}
        {customHeader}
        <FormLayout fullWidth={fullWidth || false}>
          {children[currentIndex]}
          {customFooter ? (
            <>{customFooter}</>
          ) : (
            <FormFooter>
              <ButtonText
                mode="secondary"
                size="large"
                label={backButtonLabel || t('labels.back')}
                onClick={() =>
                  onBackButtonClicked ? onBackButtonClicked() : prev()
                }
                disabled={currentStep === 1}
                iconLeft={<IconChevronLeft />}
              />
              <ButtonText
                label={nextButtonLabel || t('labels.continue')}
                size="large"
                onClick={() =>
                  onNextButtonClicked ? onNextButtonClicked() : next()
                }
                disabled={isNextButtonDisabled}
                iconRight={<IconChevronRight />}
              />
            </FormFooter>
          )}
        </FormLayout>
      </Layout>
    </FullScreenStepperContext.Provider>
  );
};

const Layout = styled.div.attrs({
  className: 'tablet:m-auto tablet:mt-3 tablet:w-8/12 font-medium text-ui-600',
})``;

type FormLayoutProps = {
  fullWidth: boolean;
};

const FormLayout = styled.div.attrs(({fullWidth}: FormLayoutProps) => ({
  className: `my-5 px-2 tablet:px-0 tablet:my-8 tablet:mx-auto space-y-5 ${
    !fullWidth && 'tablet:w-3/4'
  }`,
}))<FormLayoutProps>``;

const FormFooter = styled.div.attrs({
  className: 'flex justify-between pt-8',
})``;
