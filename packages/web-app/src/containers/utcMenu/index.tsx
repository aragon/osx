import React, {useState} from 'react';
import styled from 'styled-components';
import {useTranslation} from 'react-i18next';
import {
  IconChevronRight,
  ListItemAction,
  SearchInput,
} from '@aragon/ui-components';

import {useGlobalModalContext} from 'context/globalModals';
import {timezones} from './utcData';
import ModalBottomSheetSwitcher from 'components/modalBottomSheetSwitcher';

type UtcMenuProps = {
  onTimezoneSelect: (timezone: string) => void;
};

const UtcMenu: React.FC<UtcMenuProps> = ({onTimezoneSelect}) => {
  const {isUtcOpen, close} = useGlobalModalContext();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const {t} = useTranslation();

  const handleUtcClick = (tz: string) => {
    onTimezoneSelect(tz);
    close('utc');
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredTimezones = timezones.filter(tz => {
    const lowerCaseTz = tz.toLocaleLowerCase();
    const lowercaseTerm = searchTerm.toLocaleLowerCase();
    return lowerCaseTz.includes(lowercaseTerm);
  });

  return (
    <ModalBottomSheetSwitcher
      isOpen={isUtcOpen}
      onClose={() => close('utc')}
      title={t('newWithdraw.configureWithdraw.utcMenu.title')}
    >
      <ModalBody>
        <SearchInput
          placeholder="Type to filter"
          value={searchTerm}
          onChange={handleChange}
        />
        <Container>
          <ScrollableDiv>
            {filteredTimezones.map((tz: string) => {
              return (
                <ListItemAction
                  mode="default"
                  key={tz}
                  title={tz}
                  iconRight={<IconChevronRight />}
                  onClick={() => handleUtcClick(tz)}
                />
              );
            })}
          </ScrollableDiv>
        </Container>
      </ModalBody>
    </ModalBottomSheetSwitcher>
  );
};

export default UtcMenu;

const ModalBody = styled.div.attrs({className: 'space-y-1 p-3'})``;

const Container = styled.div.attrs({
  className: 'space-y-1 overflow-y-auto',
})``;
const ScrollableDiv = styled.div.attrs({
  className: 'h-25 space-y-1 p-1',
})``;
