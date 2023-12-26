import { DrawerLayout } from './components/Layouts/DrawerLayout';

export function App() {

  return (
    <DrawerLayout>
      <div class="bg-cloud-100 border rounded border-cloud-400 shadow-md p-4">
        <h2 className="text-2xl" >Posts</h2>
      </div>
    </DrawerLayout>
  )
}
