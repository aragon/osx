import React from 'react';
import styled from 'styled-components';
import {CardDao} from '@aragon/ui-components';

import NavLinks from 'components/navLinks';
import BottomSheet from 'components/bottomSheet';
import {useGlobalModalContext} from 'context/globalModals';

type MobileNavMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

const MobileNavMenu: React.FC<MobileNavMenuProps> = props => {
  const {open} = useGlobalModalContext();

  return (
    <BottomSheet isOpen={props.isOpen} onClose={props.onClose}>
      <div className="tablet:w-50">
        <CardWrapper className="rounded-xl">
          <CardDao
            daoAddress="dao-name.dao.eth"
            daoName="DAO Name"
            onClick={() => open('selectDao')}
            src=""
          />
        </CardWrapper>
        <div className="py-3 px-2 space-y-3">
          <NavLinks onItemClick={props.onClose} />
        </div>
      </div>
    </BottomSheet>
  );
};

export default MobileNavMenu;

const CardWrapper = styled.div`
  box-shadow: 0px 4px 8px rgba(31, 41, 51, 0.04),
    0px 0px 2px rgba(31, 41, 51, 0.06), 0px 0px 1px rgba(31, 41, 51, 0.04);
`;
