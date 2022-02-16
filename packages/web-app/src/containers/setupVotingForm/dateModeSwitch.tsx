import React from 'react';
import styled from 'styled-components';
import {ButtonText} from '@aragon/ui-components';
import {useTranslation} from 'react-i18next';

export type EndDateType = 'duration' | 'date';

export type DateModeSwitchProps = {
  value: EndDateType;
  setValue: (value: EndDateType) => void;
};

export const DateModeSwitch: React.FC<DateModeSwitchProps> = ({
  value,
  setValue,
}) => {
  const {t} = useTranslation();

  return (
    <SwitchContainer>
      <ButtonText
        mode="secondary"
        label={t('labels.days')}
        isActive={value === 'duration'}
        onClick={() => setValue('duration')}
      />
      <ButtonText
        mode="secondary"
        label={t('labels.dateTime')}
        isActive={value === 'date'}
        onClick={() => setValue('date')}
      />
    </SwitchContainer>
  );
};

const SwitchContainer = styled.div.attrs({
  className: 'inline-flex p-0.5 space-x-0.5 bg-ui-0 rounded-xl',
})`
  height: fit-content;
`;
