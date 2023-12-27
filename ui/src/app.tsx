import Router, { Route } from 'preact-router';
import { HomePage } from './pages/home/home';
import { DetailsPage } from './pages/details/details';

export function App() {
 
  return (
    <Router>
      <Route path={'/post/:id'} component={DetailsPage}/>
      <Route path={'/'} component={HomePage}/>
    </Router>
  )
}