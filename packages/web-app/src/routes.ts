import Home from './pages/home'
import NotFound from './pages/notFound'

export type PageRoute = {
  name: string
  path: string
  component: React.FC
}

export const routes: PageRoute[] = [
  { name: 'Homepage', path: '/', component: Home },
  { name: '404NotFound', path: '*', component: NotFound }
]
