import {
  bufferCV,
  contractPrincipalCV,
  tupleCV,
  ClarityValue,
  cvToHex,
  Pc,
  PostCondition
} from '@stacks/transactions';
import { Buffer } from 'buffer';

export type Network = 'mainnet' | 'testnet';

// Mainnet contracts
const MAINNET_ADDRESS = 'SP1CGXWEAMG6P6FT04W66NVGJ7PQWMDAC19R7PJ0Y';
const MAINNET_ORACLE = 'pyth-oracle-v4';

// Testnet contracts
const TESTNET_ADDRESS = 'STR738QQX1PVTM6WTDF833Z18T8R0ZB791TCNEFM';
const TESTNET_ORACLE = 'pyth-oracle-v4';

// Trait implementors (same names on both networks)
const PYN_STORAGE = 'pyth-storage-v4';
const PYN_DECODER = 'pyth-pnau-decoder-v3';
const WORMHOLE_CORE = 'wormhole-core-v4';

export function getContractAddress(network: Network): string {
  return network === 'mainnet' ? MAINNET_ADDRESS : TESTNET_ADDRESS;
}

export function getContractName(network: Network): string {
  return network === 'mainnet' ? MAINNET_ORACLE : TESTNET_ORACLE;
}

// Legacy exports for backward compatibility
export const network = 'mainnet';
export const contractAddress = MAINNET_ADDRESS;
export const contractName = MAINNET_ORACLE;

function hexToBuff(hexWith0x: string) {
  const h = hexWith0x.startsWith('0x') ? hexWith0x.slice(2) : hexWith0x;
  return Buffer.from(h, 'hex');
}

function traitTuple(network: Network) {
  const address = getContractAddress(network);
  return tupleCV({
    'pyth-storage-contract': contractPrincipalCV(address, PYN_STORAGE),
    'pyth-decoder-contract': contractPrincipalCV(address, PYN_DECODER),
    'wormhole-core-contract': contractPrincipalCV(address, WORMHOLE_CORE),
  });
}

async function buildOneStxPostConditionHex(): Promise<PostCondition[]> {
  // 1 STX = 1_000_000 microSTX
  const MICRO_STX = 1000000;
  const { resolveStxAddress } = await import('./wallet');
  const addr = await resolveStxAddress();
  if (!addr) return [];
  const pc = Pc.principal(addr).willSendLte(MICRO_STX).ustx();
  return [pc];
}

// Wallet-driven calls (recommended)
export async function openDecode(vaaHex: string, network: Network = 'mainnet') {
  const { request } = await import('@stacks/connect');
  const address = getContractAddress(network);
  const contractNameStr = getContractName(network);
  const functionArgs: ClarityValue[] = [bufferCV(hexToBuff(vaaHex)), traitTuple(network)];
  return request('stx_callContract', {
    contract: `${address}.${contractNameStr}`,
    functionName: 'decode-price-feeds',
    functionArgs: functionArgs.map(cvToHex),
    postConditionMode: 'allow',
    network,
  });
}

export async function openVerifyAndUpdate(vaaHex: string, network: Network = 'mainnet') {
  const { request } = await import('@stacks/connect');
  const address = getContractAddress(network);
  const contractNameStr = getContractName(network);
  const functionArgs: ClarityValue[] = [bufferCV(hexToBuff(vaaHex)), traitTuple(network)];
  const postConditions = await buildOneStxPostConditionHex();
  return request('stx_callContract', {
    contract: `${address}.${contractNameStr}`,
    functionName: 'verify-and-update-price-feeds',
    functionArgs: functionArgs.map(cvToHex),
    postConditionMode: 'allow',
    network,
    postConditions,
  });
}

export async function openReadPrice(feedIdHex: string, network: Network = 'mainnet') {
  const { request } = await import('@stacks/connect');
  const address = getContractAddress(network);
  const contractNameStr = getContractName(network);
  const functionArgs: ClarityValue[] = [
    bufferCV(hexToBuff(feedIdHex)),
    contractPrincipalCV(address, PYN_STORAGE),
  ];
  return request('stx_callContract', {
    contract: `${address}.${contractNameStr}`,
    functionName: 'read-price-feed',
    functionArgs: functionArgs.map(cvToHex),
    postConditionMode: 'allow',
    network,

  });
}

export async function openGetPrice(feedIdHex: string, network: Network = 'mainnet') {
  const { request } = await import('@stacks/connect');
  const address = getContractAddress(network);
  const contractNameStr = getContractName(network);
  const functionArgs: ClarityValue[] = [
    bufferCV(hexToBuff(feedIdHex)),
    contractPrincipalCV(address, PYN_STORAGE),
  ];
  return request('stx_callContract', {
    contract: `${address}.${contractNameStr}`,
    functionName: 'get-price',
    functionArgs: functionArgs.map(cvToHex),
    postConditionMode: 'allow',
    network,

  });
}

// Optional: programmatic build without wallet (requires senderKey). Kept for reference.
// Programmatic builder removed in favor of wallet request('stx_callContract', ...)
