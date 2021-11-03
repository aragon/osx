import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Button} from '../.';
import './index.css';

const App = () => {
  return (
    <div>
      <Button label="button" primary />
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
