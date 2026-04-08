import Router, { Route } from 'preact-router';
import { HomePage } from './pages/home/home';
import { DetailsPage } from './pages/details/details';
import { TagsPage } from './pages/tags/tags';
import { JobsPage } from './pages/jobs/jobs';

export function App() {
 
  return (
    <Router>
      <Route path={'/post/:id'} component={DetailsPage}/>
      <Route path={'/tags'} component={TagsPage}/>
      <Route path={'/jobs'} component={JobsPage}/>
      <Route path={'/'} component={HomePage}/>
    </Router>
  )
}