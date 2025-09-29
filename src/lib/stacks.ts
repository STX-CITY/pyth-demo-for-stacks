import {
  AnchorMode,
  PostConditionMode,
  bufferCV,
  contractPrincipalCV,
  makeContractCall,
  tupleCV,
  ClarityValue,
} from '@stacks/transactions';
import { STACKS_MAINNET, StacksNetwork } from '@stacks/network';
import { openContractCall } from '@stacks/connect';
import { Buffer } from 'buffer';

export const network: StacksNetwork = STACKS_MAINNET;

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

// Wallet-driven calls (recommended)
export async function openDecode(vaaHex: string) {
  const functionArgs: ClarityValue[] = [bufferCV(hexToBuff(vaaHex))];
  return openContractCall({
    contractAddress,
    contractName,
    functionName: 'decode-price-feeds',
    functionArgs,
    network,
    postConditionMode: PostConditionMode.Deny,
    anchorMode: AnchorMode.Any,
    onFinish: (data) => console.log('decode tx:', data),
    appDetails: { name: 'Pyth Oracle Demo', icon: '' },
  });
}

export async function openVerifyAndUpdate(vaaHex: string) {
  const functionArgs: ClarityValue[] = [bufferCV(hexToBuff(vaaHex)), traitTuple()];
  return openContractCall({
    contractAddress,
    contractName,
    functionName: 'verify-and-update-price-feeds',
    functionArgs,
    network,
    postConditionMode: PostConditionMode.Deny,
    anchorMode: AnchorMode.Any,
    onFinish: (data) => console.log('verify/update tx:', data),
    appDetails: { name: 'Pyth Oracle Demo', icon: '' },
  });
}

export async function openReadPrice(feedIdHex: string) {
  const functionArgs: ClarityValue[] = [
    bufferCV(hexToBuff(feedIdHex)),
    contractPrincipalCV(contractAddress, PYN_STORAGE),
  ];
  return openContractCall({
    contractAddress,
    contractName,
    functionName: 'read-price-feed',
    functionArgs,
    network,
    postConditionMode: PostConditionMode.Deny,
    anchorMode: AnchorMode.Any,
    onFinish: (data) => console.log('read-price-feed tx:', data),
    appDetails: { name: 'Pyth Oracle Demo', icon: '' },
  });
}

export async function openGetPrice(feedIdHex: string) {
  const functionArgs: ClarityValue[] = [
    bufferCV(hexToBuff(feedIdHex)),
    contractPrincipalCV(contractAddress, PYN_STORAGE),
  ];
  return openContractCall({
    contractAddress,
    contractName,
    functionName: 'get-price',
    functionArgs,
    network,
    postConditionMode: PostConditionMode.Deny,
    anchorMode: AnchorMode.Any,
    onFinish: (data) => console.log('get-price tx:', data),
    appDetails: { name: 'Pyth Oracle Demo', icon: '' },
  });
}

// Optional: programmatic build without wallet (requires senderKey). Kept for reference.
export async function buildContractCall(
  functionName: string,
  functionArgs: ClarityValue[]
) {
  return makeContractCall({
    contractAddress,
    contractName,
    functionName,
    functionArgs,
    network,
    postConditionMode: PostConditionMode.Deny,
    // senderKey is required to sign; use openContractCall for wallet flows
    senderKey: '0'.repeat(64),
  });
}

