import {
  IconChevronLeft,
  ButtonIcon,
  IconMenuVertical,
  ButtonWallet,
  Wizard,
  ButtonText,
  IconChevronRight,
} from '@aragon/ui-components';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import React, {createContext, useCallback, useContext, useMemo} from 'react';

import {useWallet} from 'context/augmentedWallet';
import {useStepper} from 'hooks/useStepper';
import {NavigationBar} from 'containers/navbar';
import {useWalletProps} from 'containers/walletMenu';
import {useWalletMenuContext} from 'context/walletMenu';
import {StepProps} from './step';
import {Link} from 'react-router-dom';

export type FullScreenStepperProps = {
  navbarLabel: string;
  navbarBackUrl: string;
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
  navbarLabel,
  navbarBackUrl,
  totalFormSteps,
  wizardProcessName,
  children,
}) => {
  const {t} = useTranslation();
  const {open} = useWalletMenuContext();
  const {currentStep, prev, next, setStep} = useStepper(children.length);
  const {connect, isConnected, account, ensName, ensAvatarUrl}: useWalletProps =
    useWallet();

  const handleWalletButtonClick = useCallback(() => {
    isConnected() ? open() : connect('injected');
  }, [connect, isConnected, open]);

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
      <NavigationBar>
        <HStack>
          <InsetButton>
            <InsetIconContainer to={navbarBackUrl}>
              <IconChevronLeft />
            </InsetIconContainer>
            <InsetButtonText>{navbarLabel}</InsetButtonText>
          </InsetButton>

          {/* TODO: Add action after knowing the purpose of this button */}
          <ButtonIcon
            mode="secondary"
            size="large"
            icon={<IconMenuVertical />}
          />
        </HStack>

        <ButtonWallet
          onClick={handleWalletButtonClick}
          isConnected={isConnected()}
          label={
            isConnected() ? ensName || account : t('navButtons.connectWallet')
          }
          src={ensAvatarUrl || account}
        />
      </NavigationBar>

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
              {/* Should change this to secondary on gray which is unsupported now */}
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

const HStack = styled.div.attrs({
  className: 'flex space-x-1.5',
})``;

const InsetButton = styled.div.attrs({
  className: 'flex items-center p-0.5 rounded-xl bg-ui-0',
})``;

const InsetIconContainer = styled(Link).attrs({
  className: 'p-1.5 rounded-lg bg-ui-50',
})``;

const InsetButtonText = styled.div.attrs({
  className: 'pr-2 pl-1.5 font-bold text-ui-700',
})``;

const FormFooter = styled.div.attrs({
  className: 'flex justify-between mt-8',
})``;
