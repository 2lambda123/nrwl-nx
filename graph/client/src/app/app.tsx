import { themeInit } from './theme-resolver';
import { rankDirInit } from './rankdir-resolver';
import {
  createBrowserRouter,
  createHashRouter,
  RouterProvider,
} from 'react-router-dom';
import { getRoutesForEnvironment } from './routes';
import { getEnvironmentConfig } from './hooks/use-environment-config';

themeInit();
rankDirInit();

const environmentConfig = getEnvironmentConfig();

let routerCreate = createBrowserRouter;
if (environmentConfig.localMode === 'build') {
  routerCreate = createHashRouter;
}

const router = routerCreate(getRoutesForEnvironment());

export function App() {
  return <RouterProvider router={router} />;
}

export default App;
