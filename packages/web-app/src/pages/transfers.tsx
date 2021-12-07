import React from 'react';
import {withTransaction} from '@elastic/apm-rum-react';

const Transfers: React.FC = () => {
  return <h1>All Transfers Page</h1>;
};

export default withTransaction('Transfers', 'component')(Transfers);
