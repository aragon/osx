import Home from './pages/home';
import NotFound from './pages/notFound';

export type PageRoute = {
  exact: boolean;
  name: string;
  path: string;
  component: React.FC;
};

// Note that order matters if all routes aren't exact
export const routes: PageRoute[] = [
  {name: 'Homepage', path: '/', component: Home, exact: true},
  {name: '404NotFound', path: '*', component: NotFound, exact: false},
];
