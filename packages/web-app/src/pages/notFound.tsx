import React from 'react';
import {withTransaction} from '@elastic/apm-rum-react';

const NotFound: React.FC = () => {
  return <h1>404 Page not found</h1>;
};

export default withTransaction('NotFound', 'component')(NotFound);
