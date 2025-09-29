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

export const network = 'mainnet';
export const contractAddress = 'SP3R4F6C1J3JQWWCVZ3S7FRRYPMYG6ZW6RZK31FXY';
export const contractName = 'pyth-oracle-v3';

// Trait implementors on mainnet
const PYN_STORAGE = 'pyth-storage-v3';
const PYN_DECODER = 'pyth-pnau-decoder-v2';
const WORMHOLE_CORE = 'wormhole-core-v3';

function hexToBuff(hexWith0x: string) {
  const h = hexWith0x.startsWith('0x') ? hexWith0x.slice(2) : hexWith0x;
  return Buffer.from(h, 'hex');
}

function traitTuple() {
  return tupleCV({
    'pyth-storage-contract': contractPrincipalCV(contractAddress, PYN_STORAGE),
    'pyth-decoder-contract': contractPrincipalCV(contractAddress, PYN_DECODER),
    'wormhole-core-contract': contractPrincipalCV(contractAddress, WORMHOLE_CORE),
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
export async function openDecode(vaaHex: string) {
  const { request } = await import('@stacks/connect');
  const functionArgs: ClarityValue[] = [bufferCV(hexToBuff(vaaHex))];
  return request('stx_callContract', {
    contract: `${contractAddress}.${contractName}`,
    functionName: 'decode-price-feeds',
    functionArgs: functionArgs.map(cvToHex),
    postConditionMode: 'allow',
    network: 'mainnet',
  });
}

export async function openVerifyAndUpdate(vaaHex: string) {
  const { request } = await import('@stacks/connect');
  const functionArgs: ClarityValue[] = [bufferCV(hexToBuff(vaaHex)), traitTuple()];
  const postConditions = await buildOneStxPostConditionHex();
  return request('stx_callContract', {
    contract: `${contractAddress}.${contractName}`,
    functionName: 'verify-and-update-price-feeds',
    functionArgs: functionArgs.map(cvToHex),
    postConditionMode: 'allow',
    network: 'mainnet',
    postConditions,
  });
}

export async function openReadPrice(feedIdHex: string) {
  const { request } = await import('@stacks/connect');
  const functionArgs: ClarityValue[] = [
    bufferCV(hexToBuff(feedIdHex)),
    contractPrincipalCV(contractAddress, PYN_STORAGE),
  ];
  return request('stx_callContract', {
    contract: `${contractAddress}.${contractName}`,
    functionName: 'read-price-feed',
    functionArgs: functionArgs.map(cvToHex),
    postConditionMode: 'allow',
    network: 'mainnet',
    
  });
}

export async function openGetPrice(feedIdHex: string) {
  const { request } = await import('@stacks/connect');
  const functionArgs: ClarityValue[] = [
    bufferCV(hexToBuff(feedIdHex)),
    contractPrincipalCV(contractAddress, PYN_STORAGE),
  ];
  return request('stx_callContract', {
    contract: `${contractAddress}.${contractName}`,
    functionName: 'get-price',
    functionArgs: functionArgs.map(cvToHex),
    postConditionMode: 'allow',
    network: 'mainnet',
    
  });
}

// Optional: programmatic build without wallet (requires senderKey). Kept for reference.
// Programmatic builder removed in favor of wallet request('stx_callContract', ...)
