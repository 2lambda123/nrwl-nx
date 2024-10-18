# Function: formatFiles

▸ **formatFiles**(`tree`, `sortRootTsConfigPaths?`): `Promise`\<`void`\>

Formats all the created or updated files using Prettier

#### Parameters

| Name                     | Type                                  | Description                                                                                                                                                |
| :----------------------- | :------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tree`                   | [`Tree`](../../devkit/documents/Tree) | the file system tree                                                                                                                                       |
| `sortRootTsConfigPaths?` | `boolean`                             | TODO(v21): Stop sorting tsconfig paths by default, paths are now less common/important in Nx workspace setups, and the sorting causes comments to be lost. |

#### Returns

`Promise`\<`void`\>
