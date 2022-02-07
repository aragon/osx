import {ButtonText, CheckboxSimple} from '@aragon/ui-components';
import React from 'react';
import styled from 'styled-components';

export type DescriptionListProps = {
  title: string;
  onEditClick: () => void;
  onChecked: () => void;
};

export const DescriptionListContainer: React.FC<DescriptionListProps> = ({
  title,
  children,
  onEditClick,
  onChecked,
}) => (
  <Container>
    <TitleText>{title}</TitleText>
    <DlContainer>{children}</DlContainer>
    <HStack>
      <ButtonText label="Edit" mode="ghost" onClick={onEditClick} />
      <div className="flex-shrink-0 tablet:w-3/4">
        <CheckboxSimple
          label="These values are correct"
          multiSelect
          onClick={onChecked}
        />
      </div>
    </HStack>
  </Container>
);

export const Dt: React.FC = ({children}) => (
  <DtContainer>{children}</DtContainer>
);

export const Dd: React.FC = ({children}) => (
  <DdContainer>{children}</DdContainer>
);

export const Dl: React.FC = ({children}) => (
  <DlContainer>
    <ListItemContainer>{children}</ListItemContainer>
  </DlContainer>
);

const DescriptionList = {
  Container: DescriptionListContainer,
  Dl,
  Dt,
  Dd,
};

export default DescriptionList;

const Container = styled.div.attrs({
  className: 'p-2 tablet:p-3 space-y-2 tablet:space-y-3 rounded-xl bg-ui-0',
})``;

const TitleText = styled.h1.attrs({
  className: 'text-lg font-bold text-ui-800',
})``;

const DlContainer = styled.dl.attrs({
  className: 'space-y-2',
})``;

const ListItemContainer = styled.div.attrs({
  className:
    'tablet:flex justify-between tablet:space-x-2 space-y-0.5 tablet:space-y-0',
})``;

const DtContainer = styled.dt.attrs({
  className: 'font-bold text-ui-800',
})``;

const DdContainer = styled.dd.attrs({
  className: 'flex-shrink-0 tablet:w-3/4 text-ui-600',
})``;

const HStack = styled.div.attrs({
  className:
    'flex flex-wrap flex-row-reverse tablet:flex-row justify-between items-center',
})``;
