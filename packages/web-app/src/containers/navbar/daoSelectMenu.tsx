import {
  ButtonIcon,
  ButtonText,
  IconChevronLeft,
  IconLinkExternal,
  ListItemDao,
} from '@aragon/ui-components';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import React, {useState} from 'react';

import {useGlobalModalContext} from 'context/globalModals';
import ModalBottomSheetSwitcher from 'components/modalBottomSheetSwitcher';

// This should be gotten from cache
const DAOS = [
  {daoAddress: 'dao-name.dao.eth', daoName: 'DAO name'},
  {daoAddress: 'dao-name-two.dao.eth', daoName: 'DAO name 2'},
  {daoAddress: 'dao-name-three.dao.eth', daoName: 'DAO name 3'},
];

// NOTE: the state setting is temporary until backend integration
const DaoSelectMenu: React.FC = () => {
  const {t} = useTranslation();
  const [selectedDao, setSelectedDao] = useState(DAOS[0]);
  const {isSelectDaoOpen, close} = useGlobalModalContext();

  const handleDaoSelect = (dao: {daoName: string; daoAddress: string}) => {
    setSelectedDao(dao);
    close('selectDao');
  };

  return (
    <ModalBottomSheetSwitcher
      isOpen={isSelectDaoOpen}
      onClose={() => close('selectDao')}
    >
      <ModalHeader>
        <ButtonIcon
          mode="secondary"
          size="small"
          bgWhite
          icon={<IconChevronLeft />}
          onClick={() => close('selectDao')}
        />
        <Title>{t('daoSwitcher.title')}</Title>
        <div role="presentation" className="w-4 h-4" />
      </ModalHeader>
      <ModalContentContainer>
        <ListGroup>
          <ListItemDao
            {...selectedDao}
            key={selectedDao.daoAddress}
            selected
            onClick={() => handleDaoSelect(selectedDao)}
          />
          {DAOS.filter(dao => dao.daoAddress !== selectedDao.daoAddress).map(
            dao => (
              <ListItemDao
                {...dao}
                key={dao.daoAddress}
                onClick={() => handleDaoSelect(dao)}
              />
            )
          )}
        </ListGroup>
        {/* TODO: Change click */}
        <ButtonText
          mode="secondary"
          size="large"
          label={t('daoSwitcher.subtitle')}
          iconLeft={<IconLinkExternal />}
          className="w-full"
          onClick={() => close('selectDao')}
        />
      </ModalContentContainer>
    </ModalBottomSheetSwitcher>
  );
};

export default DaoSelectMenu;

const ModalHeader = styled.div.attrs({
  className: 'flex items-center p-2 space-x-2 bg-ui-0 rounded-xl',
})`
  box-shadow: 0px 4px 8px rgba(31, 41, 51, 0.04),
    0px 0px 2px rgba(31, 41, 51, 0.06), 0px 0px 1px rgba(31, 41, 51, 0.04);
  border-radius: 12px;
`;

const Title = styled.div.attrs({
  className: 'flex-1 font-bold text-center text-ui-800',
})``;

const ModalContentContainer = styled.div.attrs({
  className: 'p-3 space-y-3',
})``;

const ListGroup = styled.div.attrs({
  className: 'space-y-1.5',
})``;
