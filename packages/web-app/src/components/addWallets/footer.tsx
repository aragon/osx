import React from 'react';
import styled from 'styled-components';
import {Label} from '@aragon/ui-components';
import {useTranslation} from 'react-i18next';
import {useFormContext} from 'react-hook-form';

type WalletsFooterProps = {
  totalAddresses: number;
};

const AddWalletsFooter: React.FC<WalletsFooterProps> = ({totalAddresses}) => {
  const {t} = useTranslation();
  const {getValues} = useFormContext();
  const totalSupply = getValues('tokenTotalSupply');

  return (
    <Container>
      <FooterItem1>
        <Label
          label={t('labels.walletList.addresses', {count: totalAddresses - 1})}
        />
      </FooterItem1>
      <FooterItem1>
        <StyledLabel>{totalSupply}</StyledLabel>
      </FooterItem1>
      <FooterItem2>
        <StyledLabel>100%</StyledLabel>
      </FooterItem2>
      <div className="w-8" />
    </Container>
  );
};

export default AddWalletsFooter;

export const Container = styled.div.attrs({
  className: 'hidden tablet:flex p-2 space-x-2 bg-ui-0',
})``;

export const FooterItem1 = styled.div.attrs({
  className: 'flex-1',
})``;

export const FooterItem2 = styled.div.attrs({
  className: 'w-8',
})``;

const StyledLabel = styled.p.attrs({
  className: 'font-bold text-ui-800 text-right',
})``;
