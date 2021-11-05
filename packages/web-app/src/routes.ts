import HomePage from 'pages/home';
import NotFoundPage from 'pages/notFound';
import {Dashboard, NotFound} from 'utils/paths';

export type PageRoute = {
  exact: boolean;
  name: string;
  path: string;
  component: React.FC;
};

// Note that order matters if all routes aren't exact
export const routes: PageRoute[] = [
  {name: 'Dashboard', path: Dashboard, component: HomePage, exact: true},
  {name: 'NotFound', path: NotFound, component: NotFoundPage, exact: false},
];
