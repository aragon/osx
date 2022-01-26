import React from 'react';
import styled from 'styled-components';
import {withTransaction} from '@elastic/apm-rum-react';
import {useNavigate, useParams} from 'react-router-dom';

import {useProposal} from '../hooks/useProposal';
import * as paths from 'utils/paths';

const Proposal: React.FC = () => {
  const navigate = useNavigate();
  const {id} = useParams();
  if (!id) {
    navigate(paths.NotFound);
  }
  const definedId = id as string;
  const {
    data: proposalData,
    isLoading,
    error,
  } = useProposal('0x0000000000', definedId);

  return (
    // TODO: assemble proposal overview page here. Mock data can be obtained by
    // the useProposal hook.
    <Content>
      <Header>Proposal {id}</Header>
      <p>This page contains the overview for proposal {id}</p>
      <br />
      {isLoading ? (
        <p>Loading...</p>
      ) : error ? (
        <p>Error: {error.message}</p>
      ) : (
        <p>{JSON.stringify(proposalData, null, 2)}</p>
      )}
    </Content>
  );
};

export default withTransaction('Proposal', 'component')(Proposal);

const Content = styled.div.attrs({className: 'tablet:w-2/3 m-auto'})``;
const Header = styled.p.attrs({className: 'text-bold text-xl'})``;
