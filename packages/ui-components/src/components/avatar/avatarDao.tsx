import React, {useCallback, useMemo, useState} from 'react';
import styled from 'styled-components';

export type AvatarDaoProps = {
  contentMode?: 'right' | 'below' | 'none';
  domain?: string;
  label: string;
  src?: string;
  onClick?: () => void;
};

export const AvatarDao: React.FC<AvatarDaoProps> = ({
  contentMode = 'right',
  domain,
  label,
  src,
  onClick,
}) => {
  const [error, setError] = useState(false);

  const getDaoInitials = useCallback(() => {
    const arr = label.split(' ');
    return arr.length === 0 ? arr[0][0] : arr[0][0] + arr[1][0];
  }, [label]);

  const DaoAvatar = useMemo(() => {
    return error === true || !src ? (
      <FallBackAvatar>
        <DaoInitials>{getDaoInitials()}</DaoInitials>
      </FallBackAvatar>
    ) : (
      <Avatar src={src} alt="dao avatar" onError={() => setError(true)} />
    );
    //TODO: @Fabrice, check the dependency array [VR 04-01-2022]
    // eslint-disable-next-line
  }, [error, label, src]);

  return (
    <Container contentMode={contentMode} onClick={onClick}>
      {DaoAvatar}
      {contentMode !== 'none' && (
        <Content>
          <DaoName>{label}</DaoName>
          {contentMode === 'right' && <Ens>{domain}</Ens>}
        </Content>
      )}
    </Container>
  );
};

const contentModeStyles = {
  right: 'inline-flex flex-row items-center space-x-1.5',
  below: 'inline-flex flex-col items-center space-y-0.5',
  none: '',
};

type ModeProps = {
  contentMode?: 'right' | 'below' | 'none';
};

const Container = styled.div.attrs(({contentMode = 'right'}: ModeProps) => ({
  className: `${contentModeStyles[contentMode]} cursor-pointer`,
}))<ModeProps>``;

const Avatar = styled.img.attrs({
  className: 'h-6 w-6 rounded-xl',
})``;

const FallBackAvatar = styled.div.attrs({
  className:
    'flex items-center justify-center font-bold text-ui-0 bg-gradient-to-r from-primary-500 to-primary-800 h-6 w-6 rounded-xl border',
})``;

const DaoInitials = styled.p.attrs({
  className: 'w-4 h-4 flex items-center justify-center',
})``;

const Content = styled.div.attrs({
  className: 'flex flex-col',
})``;

const DaoName = styled.p.attrs({
  className: 'font-bold text-ui-800',
})``;

const Ens = styled.p.attrs({
  className: 'text-sm text-ui-600',
})``;
