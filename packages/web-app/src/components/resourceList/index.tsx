import React from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {ListItemLink, ListItemLinkProps} from '@aragon/ui-components';

type ResourceListProps = {
  links?: ListItemLinkProps[];
};

const ResourceList: React.FC<ResourceListProps> = ({links = []}) => {
  const {t} = useTranslation();

  return (
    <Container data-testid="resourceList">
      <Title>{t('labels.resources')}</Title>
      <ListItemContainer>
        {links.map((link, index) => (
          <ListItemLink {...link} key={index} />
        ))}
      </ListItemContainer>
    </Container>
  );
};

export default ResourceList;

const Container = styled.div.attrs({className: 'p-3 bg-ui-0 rounded-xl'})``;

const Title = styled.p.attrs({className: 'text-lg font-bold text-ui-800'})``;

const ListItemContainer = styled.div.attrs({className: 'mt-3 space-y-2'})``;
