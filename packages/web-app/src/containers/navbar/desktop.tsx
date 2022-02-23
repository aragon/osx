import {
  Breadcrumb,
  ButtonIcon,
  ButtonWallet,
  CardDao,
  IconMenuVertical,
} from '@aragon/ui-components';
import styled from 'styled-components';
import NavLinks from 'components/navLinks';
import {useNavigate} from 'react-router-dom';
import useBreadcrumbs from 'use-react-router-breadcrumbs';
import {useTranslation} from 'react-i18next';
import React, {useMemo, useState} from 'react';

import {useWallet} from 'context/augmentedWallet';
import {useWalletProps} from 'containers/walletMenu';
import NetworkIndicator from './networkIndicator';
import {BreadcrumbDropdown} from './breadcrumbDropdown';
import {Dashboard, NotFound} from 'utils/paths';
import {NetworkIndicatorStatus} from 'utils/types';

const MIN_ROUTE_DEPTH_FOR_BREADCRUMBS = 2;

type DesktopNavProp = {
  status?: NetworkIndicatorStatus;
  returnURL?: string;
  processLabel?: string;
  onWalletClick: () => void;
};

const DesktopNav: React.FC<DesktopNavProp> = props => {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const [showCrumbMenu, setShowCrumbMenu] = useState(false);
  const {isConnected, account, ensName, ensAvatarUrl}: useWalletProps =
    useWallet();

  const isProcess = useMemo(
    () => props.returnURL && props.processLabel,
    [props.processLabel, props.returnURL]
  );

  const breadcrumbs = useBreadcrumbs(undefined, {
    excludePaths: [Dashboard, NotFound, 'governance/proposals'],
  }).map(item => ({
    path: item.match.pathname,
    label: item.breadcrumb as string,
  }));

  if (isProcess) {
    return (
      <Container>
        <NetworkIndicator status={props.status} />
        <Menu>
          <ProcessMenuItems>
            <Breadcrumb
              process
              crumbs={[{label: props.processLabel!, path: props.returnURL!}]}
              onClick={(path: string) => navigate(path)}
            />
            <ButtonIcon
              mode="secondary"
              size="large"
              icon={<IconMenuVertical />}
            />
          </ProcessMenuItems>
          <ButtonWallet
            src={ensAvatarUrl || account}
            onClick={props.onWalletClick}
            isConnected={isConnected()}
            label={
              isConnected() ? ensName || account : t('navButtons.connectWallet')
            }
          />
        </Menu>
      </Container>
    );
  }

  return (
    <Container data-testid="navbar">
      <NetworkIndicator status={props.status} />
      <Menu>
        <Content>
          <div>
            <CardDao
              daoName="DAO Name"
              daoAddress="patito.eth.dao"
              onClick={() => null}
              src="https://banner2.cleanpng.com/20180325/sxw/kisspng-computer-icons-avatar-avatar-5ab7529a8e4e14.9936310115219636745829.jpg"
            />
          </div>
          <LinksWrapper>
            {breadcrumbs.length < MIN_ROUTE_DEPTH_FOR_BREADCRUMBS ? (
              <NavLinks />
            ) : (
              <BreadcrumbDropdown
                open={showCrumbMenu}
                crumbs={breadcrumbs}
                onClose={() => setShowCrumbMenu(false)}
                onOpenChange={setShowCrumbMenu}
                onCrumbClick={path => navigate(path)}
              />
            )}
          </LinksWrapper>
        </Content>

        <ButtonWallet
          src={ensAvatarUrl || account}
          onClick={props.onWalletClick}
          isConnected={isConnected()}
          label={
            isConnected() ? ensName || account : t('navButtons.connectWallet')
          }
        />
      </Menu>
    </Container>
  );
};

export default DesktopNav;

const Container = styled.header.attrs({
  className: 'sticky top-0 w-full',
})``;

const Menu = styled.nav.attrs({
  className: `flex mx-auto justify-between items-center max-w-screen-wide
     px-5 py-3 bg-gradient-to-b from-ui-50 to-transparent backdrop-blur-xl`,
})``;

const Content = styled.div.attrs({
  className: 'flex items-center space-x-6',
})``;

const ProcessMenuItems = styled.div.attrs({
  className: 'flex space-x-1.5',
})``;

const LinksWrapper = styled.div.attrs({
  className: 'flex items-center space-x-1.5',
})``;
