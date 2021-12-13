import React from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {ActionListItem, DaoCard, IconLinkExternal} from '@aragon/ui-components';

const TEMP_ICON =
  'https://banner2.cleanpng.com/20180325/sxw/kisspng-computer-icons-avatar-avatar-5ab7529a8e4e14.9936310115219636745829.jpg';

type DaoSwitcherMenuProps = {
  daos?: {name: string; ens: string; icon: string}[];

  // Note: This onClick function must be called to close the popover
  onClick: () => void;
};

const DaoSwitcherMenu: React.FC<DaoSwitcherMenuProps> = ({
  daos = [],
  onClick,
}) => {
  const {t} = useTranslation();

  return (
    <Container>
      <DaoListContainer>
        {/* NOTE: Temporarily static  */}
        <DaoCard
          daoAddress="bushido.aragonid.eth"
          daoName="Bushido DAO"
          includeSwitch={false}
          onClick={onClick}
          src={TEMP_ICON}
          wide
        />
        {daos.map(({name, ens, icon}) => (
          <div key={name}>
            <DaoCard
              daoAddress={ens}
              daoName={name}
              includeSwitch={false}
              onClick={onClick}
              src={icon}
              wide
            />
          </div>
        ))}
      </DaoListContainer>
      <ActionListItem
        icon={<IconLinkExternal />}
        onClick={onClick}
        title={t('daoSwitcher.title')}
        subtitle={t('daoSwitcher.subtitle')}
        disabled
      />
    </Container>
  );
};

export default DaoSwitcherMenu;

const Container = styled.div.attrs({className: 'space-y-3'})`
  padding: 20px 16px;
`;

const DaoListContainer = styled.div.attrs({className: 'space-y-2'})``;
