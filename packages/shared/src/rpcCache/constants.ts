import { IMPL_EVM } from '../engine/engineConsts';

export const EVM_CACHEABLE_METHODS = [
  'eth_blockNumber',
  'eth_call',
  'eth_compileLLL',
  'eth_compileSerpent',
  'eth_compileSolidity',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getBlockTransactionCountByHash',
  'eth_getBlockTransactionCountByNumber',
  'eth_getCode',
  'eth_getCompilers',
  'eth_getFilterLogs',
  'eth_getLogs',
  'eth_getStorageAt',
  'eth_getTransactionByBlockNumberAndIndex',
  'eth_getUncleByBlockHashAndIndex',
  'eth_getUncleByBlockNumberAndIndex',
  'eth_getUncleCountByBlockHash',
  'eth_getUncleCountByBlockNumber',
  'eth_protocolVersion',
  'shh_version',
  'web3_clientVersion',
  'web3_sha3',
];

export const RpcCacheMethodMap: Record<string, string[]> = {
  [IMPL_EVM]: EVM_CACHEABLE_METHODS,
};

export const EVM_SAFE_RPC_METHODS = [
  'eth_blockNumber',
  'eth_call',
  'eth_chainId',
  'eth_coinbase',
  'eth_decrypt',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getBlockTransactionCountByHash',
  'eth_getBlockTransactionCountByNumber',
  'eth_getCode',
  'eth_getEncryptionPublicKey',
  'eth_getFilterChanges',
  'eth_getFilterLogs',
  'eth_getLogs',
  'eth_getProof',
  'eth_getStorageAt',
  'eth_getTransactionByBlockHashAndIndex',
  'eth_getTransactionByBlockNumberAndIndex',
  'eth_getTransactionByHash',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_getUncleByBlockHashAndIndex',
  'eth_getUncleByBlockNumberAndIndex',
  'eth_getUncleCountByBlockHash',
  'eth_getUncleCountByBlockNumber',
  'eth_getWork',
  'eth_hashrate',
  'eth_mining',
  'eth_newBlockFilter',
  'eth_newFilter',
  'eth_newPendingTransactionFilter',
  'eth_protocolVersion',
  'eth_sendRawTransaction',
  'eth_sendTransaction',
  'eth_submitHashrate',
  'eth_submitWork',
  'eth_syncing',
  'eth_uninstallFilter',
  'net_version',
  'wallet_getPermissions',
  'wallet_requestPermissions',
  'wallet_revokePermissions',
];