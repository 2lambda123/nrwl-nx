import { MenusApi } from '@nrwl/nx-dev/data-access-menu';
import menus from '../public/documentation/generated/manifests/menus.json';

export const menusApi = new MenusApi(menus);
