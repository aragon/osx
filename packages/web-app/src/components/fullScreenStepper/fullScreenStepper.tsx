import {
  IconChevronLeft,
  Wizard,
  ButtonText,
  IconChevronRight,
  Breadcrumb,
} from '@aragon/ui-components';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import React, {createContext, useContext, useMemo} from 'react';

import {useStepper} from 'hooks/useStepper';
import {StepProps} from './step';
import {useNavigate} from 'react-router-dom';

export type FullScreenStepperProps = {
  navLabel: string;
  returnPath: string;
  wizardProcessName: string;
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
  wizardProcessName,
  children,
  navLabel,
  returnPath,
}) => {
  const {t} = useTranslation();
  const navigate = useNavigate();

  const {currentStep, prev, next, setStep} = useStepper(children.length);

  const currentIndex = currentStep - 1;
  const {
    includeStepper = true,
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

  const totalSteps = useMemo(() => {
    let total = 0;
    children.forEach((_, index) => {
      if (!children[index].props.hideWizard) total++;
    });
    return total;
  }, [children]);

  const value = {currentStep, setStep, prev, next};

  const currentFormStep = useMemo(() => {
    return hideWizard ? currentStep : currentStep - 1;
  }, [currentStep, hideWizard]);

  return (
    <FullScreenStepperContext.Provider value={value}>
      <Layout>
        {!hideWizard && (
          <Wizard
            includeStepper={includeStepper}
            processName={wizardProcessName}
            title={wizardTitle || ''}
            description={wizardDescription || ''}
            totalSteps={totalSteps}
            currentStep={currentFormStep}
            nav={
              <Breadcrumb
                crumbs={{label: navLabel, path: returnPath}}
                onClick={(path: string) => navigate(path)}
              />
            }
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
