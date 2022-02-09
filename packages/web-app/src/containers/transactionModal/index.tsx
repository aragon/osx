import React from 'react';
import {
  AlertInline,
  ButtonText,
  IconReload,
  LinearProgress,
  Spinner,
} from '@aragon/ui-components';
import {useStepper} from 'hooks/useStepper';
import ModalBottomSheetSwitcher from 'components/modalBottomSheetSwitcher';
import {useGlobalModalContext} from 'context/globalModals';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';

export enum TransactionState {
  WAITING = 'WAITING',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

type TransactionModalProps = {
  title: string;
  footerButtonLabel: string;
  state: TransactionState;
  callback: () => void;
  subtitle?: string;
  successLabel?: string;
  errorLabel?: string;
  approveStepNeeded?: boolean;
  approveCallback?: () => void;
};

const icons = {
  [TransactionState.WAITING]: undefined,
  [TransactionState.LOADING]: <Spinner size="xs" color="white" />,
  [TransactionState.SUCCESS]: undefined,
  [TransactionState.ERROR]: <IconReload />,
};

const TransactionModal: React.FC<TransactionModalProps> = ({
  title,
  footerButtonLabel,
  state,
  callback,
  subtitle,
  successLabel,
  errorLabel,
  approveStepNeeded = false,
  approveCallback,
}) => {
  const {isTransactionOpen, close} = useGlobalModalContext();
  const {currentStep, next} = useStepper(2);
  const {t} = useTranslation();

  const label = {
    [TransactionState.WAITING]: footerButtonLabel,
    [TransactionState.LOADING]: footerButtonLabel,
    [TransactionState.SUCCESS]: t('TransactionModal.dismiss'),
    [TransactionState.ERROR]: t('TransactionModal.tryAgain'),
  };

  const handleApproveClick = () => {
    if (approveCallback) {
      approveCallback();
    }
    next();
  };

  return (
    <ModalBottomSheetSwitcher
      isOpen={isTransactionOpen}
      onClose={() => close('transaction')}
      title={title}
      subtitle={subtitle}
    >
      <GasCostTableContainer>
        <GasCostEthContainer>
          <VStack>
            <Label>{t('TransactionModal.estimatedFees')}</Label>
            <p className="text-sm text-ui-500">
              {`${t('TransactionModal.synced', {time: 30})}`}
            </p>
          </VStack>
          <VStack>
            <StrongText>{'0.001ETH'}</StrongText>
            <p className="text-sm text-right text-ui-500">{'127gwei'}</p>
          </VStack>
        </GasCostEthContainer>

        <GasCostUSDContainer>
          <Label>{t('TransactionModal.totalCost')}</Label>
          <StrongText>{'$16.28'}</StrongText>
        </GasCostUSDContainer>
      </GasCostTableContainer>

      {approveStepNeeded ? (
        <ApproveTxContainer>
          <WizardContainer>
            <PrimaryColoredText>
              {currentStep === 1
                ? t('TransactionModal.approveToken')
                : t('TransactionModal.signDeposit')}
            </PrimaryColoredText>
            <p className="text-ui-400">{`${t('labels.step')} ${currentStep} ${t(
              'labels.of'
            )} 2`}</p>
          </WizardContainer>

          <LinearProgress max={2} value={currentStep} />

          <ApproveSubtitle>
            {t('TransactionModal.approveSubtitle')}
          </ApproveSubtitle>
          <HStack>
            <ButtonText
              className="mt-3 w-full"
              label={t('TransactionModal.approveToken')}
              iconLeft={icons[state]}
              onClick={handleApproveClick}
              disabled={currentStep !== 1}
            />
            <ButtonText
              className="mt-3 w-full"
              label={label[state]}
              iconLeft={icons[state]}
              onClick={callback}
              disabled={currentStep !== 2}
            />
          </HStack>

          {state === TransactionState.ERROR && (
            <AlertInlineContainer>
              <AlertInline
                label={errorLabel || t('TransactionModal.errorLabel')}
                mode="critical"
              />
            </AlertInlineContainer>
          )}
          {state === TransactionState.SUCCESS && (
            <AlertInlineContainer>
              <AlertInline
                label={successLabel || t('TransactionModal.successLabel')}
                mode="success"
              />
            </AlertInlineContainer>
          )}
        </ApproveTxContainer>
      ) : (
        <ButtonContainer>
          <ButtonText
            className="mt-3 w-full"
            label={label[state]}
            iconLeft={icons[state]}
            onClick={callback}
          />

          {state === TransactionState.ERROR && (
            <AlertInlineContainer>
              <AlertInline
                label={errorLabel || 'Error while confirmation'}
                mode="critical"
              />
            </AlertInlineContainer>
          )}
          {state === TransactionState.SUCCESS && (
            <AlertInlineContainer>
              <AlertInline
                label={successLabel || 'Transaction successful'}
                mode="success"
              />
            </AlertInlineContainer>
          )}
        </ButtonContainer>
      )}
    </ModalBottomSheetSwitcher>
  );
};

export default TransactionModal;

const GasCostTableContainer = styled.div.attrs({
  className: 'm-3 bg-white rounded-xl border border-ui-100',
})``;

const GasCostEthContainer = styled.div.attrs({
  className: 'flex justify-between py-1.5 px-2',
})``;

const GasCostUSDContainer = styled.div.attrs({
  className: 'flex justify-between py-1.5 px-2 rounded-b-xl bg-ui-100',
})``;

const ApproveTxContainer = styled.div.attrs({
  className: 'p-3 bg-white rounded-b-xl',
})``;

const AlertInlineContainer = styled.div.attrs({
  className: 'mx-auto mt-2 w-max',
})``;

const HStack = styled.div.attrs({
  className: 'flex space-x-2',
})``;

const WizardContainer = styled.div.attrs({
  className: 'flex justify-between mb-1 text-sm',
})``;

const ButtonContainer = styled.div.attrs({
  className: 'px-3 pb-3 rounded-b-xl',
})``;

const VStack = styled.div.attrs({
  className: 'space-y-0.25',
})``;

const StrongText = styled.p.attrs({
  className: 'font-bold text-right text-ui-600',
})``;

const Label = styled.p.attrs({
  className: 'text-ui-600',
})``;

const PrimaryColoredText = styled.p.attrs({
  className: 'font-bold text-primary-500',
})``;

const ApproveSubtitle = styled.p.attrs({
  className: 'mt-1 text-sm text-ui-600',
})``;
