/* eslint-disable */
/* prettier-ignore */

/* auto-generated by NAPI-RS */

const __nodeFs = require('node:fs')
const __nodePath = require('node:path')
const { WASI: __nodeWASI } = require('node:wasi')
const { Worker } = require('node:worker_threads')

const {
  instantiateNapiModuleSync: __emnapiInstantiateNapiModuleSync,
  getDefaultContext: __emnapiGetDefaultContext,
  createOnMessage: __wasmCreateOnMessageForFsProxy,
} = require('@napi-rs/wasm-runtime')

const __rootDir = __nodePath.parse(process.cwd()).root

const __wasi = new __nodeWASI({
  version: 'preview1',
  env: process.env,
  preopens: {
    [__rootDir]: __rootDir,
  }
})

const __emnapiContext = __emnapiGetDefaultContext()

const __sharedMemory = new WebAssembly.Memory({
  initial: 1024,
  maximum: 32768,
  shared: true,
})

let __wasmFilePath = __nodePath.join(__dirname, 'nx.wasm32-wasi.wasm')
const __wasmDebugFilePath = __nodePath.join(__dirname, 'nx.wasm32-wasi.debug.wasm')

if (__nodeFs.existsSync(__wasmDebugFilePath)) {
  __wasmFilePath = __wasmDebugFilePath
} else if (!__nodeFs.existsSync(__wasmFilePath)) {
  try {
    __wasmFilePath = __nodePath.resolve('@nx/nx-wasm32-wasi')
  } catch {
    throw new Error('Cannot find nx.wasm32-wasi.wasm file, and @nx/nx-wasm32-wasi package is not installed.')
  }
}

const { instance: __napiInstance, module: __wasiModule, napiModule: __napiModule } = __emnapiInstantiateNapiModuleSync(__nodeFs.readFileSync(__wasmFilePath), {
  context: __emnapiContext,
  asyncWorkPoolSize: (function() {
    const threadsSizeFromEnv = Number(process.env.NAPI_RS_ASYNC_WORK_POOL_SIZE ?? process.env.UV_THREADPOOL_SIZE)
    // NaN > 0 is false
    if (threadsSizeFromEnv > 0) {
      return threadsSizeFromEnv
    } else {
      return 4
    }
  })(),
  wasi: __wasi,
  onCreateWorker() {
    const worker = new Worker(__nodePath.join(__dirname, 'wasi-worker.mjs'), {
      env: process.env,
      execArgv: ['--experimental-wasi-unstable-preview1'],
    })
    worker.onmessage = ({ data }) => {
      __wasmCreateOnMessageForFsProxy(__nodeFs)(data)
    }
    return worker
  },
  overwriteImports(importObject) {
    importObject.env = {
      ...importObject.env,
      ...importObject.napi,
      ...importObject.emnapi,
      memory: __sharedMemory,
    }
    return importObject
  },
  beforeInit({ instance }) {
    __napi_rs_initialize_modules(instance)
  }
})

function __napi_rs_initialize_modules(__napiInstance) {
  __napiInstance.exports['__napi_register__expand_outputs_0']?.()
  __napiInstance.exports['__napi_register__get_files_for_outputs_1']?.()
  __napiInstance.exports['__napi_register__remove_2']?.()
  __napiInstance.exports['__napi_register__copy_3']?.()
  __napiInstance.exports['__napi_register__CachedResult_struct_4']?.()
  __napiInstance.exports['__napi_register__NxCache_struct_5']?.()
  __napiInstance.exports['__napi_register__NxCache_impl_13']?.()
  __napiInstance.exports['__napi_register__hash_array_14']?.()
  __napiInstance.exports['__napi_register__hash_file_15']?.()
  __napiInstance.exports['__napi_register__IS_WASM_16']?.()
  __napiInstance.exports['__napi_register__get_binary_target_17']?.()
  __napiInstance.exports['__napi_register__ImportResult_struct_18']?.()
  __napiInstance.exports['__napi_register__find_imports_19']?.()
  __napiInstance.exports['__napi_register__transfer_project_graph_20']?.()
  __napiInstance.exports['__napi_register__ExternalNode_struct_21']?.()
  __napiInstance.exports['__napi_register__Target_struct_22']?.()
  __napiInstance.exports['__napi_register__Project_struct_23']?.()
  __napiInstance.exports['__napi_register__ProjectGraph_struct_24']?.()
  __napiInstance.exports['__napi_register__HashedTask_struct_25']?.()
  __napiInstance.exports['__napi_register__TaskDetails_struct_26']?.()
  __napiInstance.exports['__napi_register__TaskDetails_impl_29']?.()
  __napiInstance.exports['__napi_register__HashPlanner_struct_30']?.()
  __napiInstance.exports['__napi_register__HashPlanner_impl_34']?.()
  __napiInstance.exports['__napi_register__HashDetails_struct_35']?.()
  __napiInstance.exports['__napi_register__HasherOptions_struct_36']?.()
  __napiInstance.exports['__napi_register__TaskHasher_struct_37']?.()
  __napiInstance.exports['__napi_register__TaskHasher_impl_40']?.()
  __napiInstance.exports['__napi_register__TaskRun_struct_41']?.()
  __napiInstance.exports['__napi_register__NxTaskHistory_struct_42']?.()
  __napiInstance.exports['__napi_register__NxTaskHistory_impl_46']?.()
  __napiInstance.exports['__napi_register__Task_struct_47']?.()
  __napiInstance.exports['__napi_register__TaskTarget_struct_48']?.()
  __napiInstance.exports['__napi_register__TaskGraph_struct_49']?.()
  __napiInstance.exports['__napi_register__FileData_struct_50']?.()
  __napiInstance.exports['__napi_register__InputsInput_struct_51']?.()
  __napiInstance.exports['__napi_register__FileSetInput_struct_52']?.()
  __napiInstance.exports['__napi_register__RuntimeInput_struct_53']?.()
  __napiInstance.exports['__napi_register__EnvironmentInput_struct_54']?.()
  __napiInstance.exports['__napi_register__ExternalDependenciesInput_struct_55']?.()
  __napiInstance.exports['__napi_register__DepsOutputsInput_struct_56']?.()
  __napiInstance.exports['__napi_register__NxJson_struct_57']?.()
  __napiInstance.exports['__napi_register__WorkspaceContext_struct_58']?.()
  __napiInstance.exports['__napi_register__WorkspaceContext_impl_67']?.()
  __napiInstance.exports['__napi_register__WorkspaceErrors_68']?.()
  __napiInstance.exports['__napi_register__NxWorkspaceFiles_struct_69']?.()
  __napiInstance.exports['__napi_register__NxWorkspaceFilesExternals_struct_70']?.()
  __napiInstance.exports['__napi_register__UpdatedWorkspaceFiles_struct_71']?.()
  __napiInstance.exports['__napi_register__FileMap_struct_72']?.()
  __napiInstance.exports['__napi_register____test_only_transfer_file_map_73']?.()
}
module.exports.HashPlanner = __napiModule.exports.HashPlanner
module.exports.ImportResult = __napiModule.exports.ImportResult
module.exports.NxCache = __napiModule.exports.NxCache
module.exports.NxTaskHistory = __napiModule.exports.NxTaskHistory
module.exports.TaskDetails = __napiModule.exports.TaskDetails
module.exports.TaskHasher = __napiModule.exports.TaskHasher
module.exports.WorkspaceContext = __napiModule.exports.WorkspaceContext
module.exports.copy = __napiModule.exports.copy
module.exports.expandOutputs = __napiModule.exports.expandOutputs
module.exports.findImports = __napiModule.exports.findImports
module.exports.getBinaryTarget = __napiModule.exports.getBinaryTarget
module.exports.getFilesForOutputs = __napiModule.exports.getFilesForOutputs
module.exports.hashArray = __napiModule.exports.hashArray
module.exports.hashFile = __napiModule.exports.hashFile
module.exports.IS_WASM = __napiModule.exports.IS_WASM
module.exports.remove = __napiModule.exports.remove
module.exports.testOnlyTransferFileMap = __napiModule.exports.testOnlyTransferFileMap
module.exports.transferProjectGraph = __napiModule.exports.transferProjectGraph
module.exports.WorkspaceErrors = __napiModule.exports.WorkspaceErrors
