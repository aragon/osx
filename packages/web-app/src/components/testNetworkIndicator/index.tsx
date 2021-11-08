import React from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';

const TestNetworkIndicator: React.FC = () => {
  const {t} = useTranslation();

  return <Container>{t('testnetIndicator')}</Container>;
};

export default TestNetworkIndicator;

const Container = styled.div.attrs({
  className:
    'flex justify-center items-center p-0.5 text-xs font-extrabold text-primary-100 bg-primary-900',
})``;
