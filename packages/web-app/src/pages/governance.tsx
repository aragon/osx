import React from 'react';
import {withTransaction} from '@elastic/apm-rum-react';

const Governance: React.FC = () => {
  return <h1>Governance Page</h1>;
};

export default withTransaction('Governance', 'component')(Governance);
