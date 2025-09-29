// Price feed IDs (Pyth mainnet)
export const PRICE_FEEDS = {
  BTC_USD:
    '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  STX_USD:
    '0xec7a775f46379b5e943c3526b1c8d54cd49749176b0b98e02dde68d1bd335c17',
  ETH_USD:
    '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  USDC_USD:
    '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  BNB_USD:
    '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
  LINK_USD:
    '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221'
} as const;

export type FeedKey = keyof typeof PRICE_FEEDS;

