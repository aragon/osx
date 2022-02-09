import React from 'react';
import styled from 'styled-components';
import {Label} from '@aragon/ui-components';
import {useTranslation} from 'react-i18next';

const AddLinksHeader: React.FC = () => {
  const {t} = useTranslation();

  return (
    <Container>
      <HeaderItem>
        <Label label={t('labels.label')} />
      </HeaderItem>
      <HeaderItem>
        <Label label={t('labels.link')} />
      </HeaderItem>
      <div className="w-6" />
    </Container>
  );
};

export default AddLinksHeader;

export const Container = styled.div.attrs({
  className: 'hidden tablet:flex p-2 space-x-2 bg-ui-0',
})``;

export const HeaderItem = styled.div.attrs({
  className: 'flex-1',
})``;
