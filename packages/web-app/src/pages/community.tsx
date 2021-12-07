import React from 'react';
import {withTransaction} from '@elastic/apm-rum-react';

const Community: React.FC = () => {
  return <h1>Community Page</h1>;
};

export default withTransaction('Community', 'component')(Community);
