import { GlobalStateProvider } from './state.provider';
import { themeInit } from './theme-resolver';
import { rankDirInit } from './rankdir-resolver';
import {
  createBrowserRouter,
  RouterProvider,
  createHashRouter,
} from 'react-router-dom';
import { routes } from './routes';
import { getEnvironmentConfig } from './hooks/use-environment-config';

themeInit();
rankDirInit();

const environmentConfig = getEnvironmentConfig();

let routerCreate = createBrowserRouter;
if (environmentConfig.localMode === 'build') {
  routerCreate = createHashRouter;
}

const router = routerCreate(routes);

export function App() {
  return (
    <GlobalStateProvider>
      <RouterProvider router={router} />
    </GlobalStateProvider>
  );
}

export default App;
