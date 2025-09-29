// Hiro API interface for fetching and parsing transaction details

export interface TransactionDetails {
  tx_id: string;
  tx_status: string;
  tx_result?: {
    hex: string;
    repr: string;
  };
  contract_call?: {
    function_name: string;
    function_args?: Array<{
      hex: string;
      repr: string;
      name: string;
      type: string;
    }>;
  };
  events?: Array<{
    event_type: string;
    contract_log?: {
      value: {
        repr: string;
      };
    };
  }>;
}

export interface PriceData {
  price: number;
  emaPrice: number;
  conf: number;
  emaConf: number;
  expo: number;
  publishTime: number;
  prevPublishTime: number;
  priceIdentifier?: string;
}

export async function fetchTransactionDetails(txId: string, network: 'mainnet' | 'testnet' = 'mainnet'): Promise<TransactionDetails> {
  const baseUrl = network === 'mainnet'
    ? 'https://api.mainnet.hiro.so'
    : 'https://api.testnet.hiro.so';

  const response = await fetch(`${baseUrl}/extended/v1/tx/${txId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch transaction: ${response.statusText}`);
  }

  return response.json();
}

function parseUInt(value: string): number {
  // Parse values like "u1759136578" or "11215387861762"
  const match = value.match(/u?(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export function parsePriceFromResult(repr: string): PriceData | null {
  // Parse response like: (ok (tuple (conf u3430861762) (ema-conf u3403732000) ...))

  // Using [\s\S] instead of 's' flag for compatibility
  const tupleMatch = repr.match(/\(ok \((?:tuple|list.*tuple) \(([\s\S]*?)\)\)\)/);
  if (!tupleMatch) return null;

  const content = tupleMatch[1];
  const data: Partial<PriceData> = {};

  // Parse conf
  const confMatch = content.match(/conf u(\d+)/);
  if (confMatch) data.conf = parseInt(confMatch[1], 10);

  // Parse ema-conf
  const emaConfMatch = content.match(/ema-conf u(\d+)/);
  if (emaConfMatch) data.emaConf = parseInt(emaConfMatch[1], 10);

  // Parse ema-price
  const emaPriceMatch = content.match(/ema-price (\d+)/);
  if (emaPriceMatch) data.emaPrice = parseInt(emaPriceMatch[1], 10);

  // Parse price
  const priceMatch = content.match(/price (\d+|u\d+)/);
  if (priceMatch) data.price = parseUInt(priceMatch[1]);

  // Parse expo (exponent)
  const expoMatch = content.match(/expo (-?\d+)/);
  if (expoMatch) data.expo = parseInt(expoMatch[1], 10);

  // Parse publish-time
  const publishTimeMatch = content.match(/publish-time u(\d+)/);
  if (publishTimeMatch) data.publishTime = parseInt(publishTimeMatch[1], 10);

  // Parse prev-publish-time
  const prevPublishTimeMatch = content.match(/prev-publish-time u(\d+)/);
  if (prevPublishTimeMatch) data.prevPublishTime = parseInt(prevPublishTimeMatch[1], 10);

  // Parse price-identifier if present
  const identifierMatch = content.match(/price-identifier (0x[a-f0-9]+)/);
  if (identifierMatch) data.priceIdentifier = identifierMatch[1];

  return data as PriceData;
}

export function calculateActualPrice(priceData: PriceData): number {
  // Calculate actual price: ema-price / 10^expo
  // Since expo is typically negative (e.g., -8), this divides by 10^8
  return priceData.emaPrice / Math.pow(10, Math.abs(priceData.expo));
}

export function parsePriceUpdateEvent(events: TransactionDetails['events']): PriceData | null {
  if (!events) return null;

  for (const event of events) {
    if (event.event_type === 'smart_contract_log' && event.contract_log) {
      const repr = event.contract_log.value.repr;

      // Look for price-feed update events
      if (repr.includes('action "updated"') && repr.includes('type "price-feed"')) {
        // Parse the data tuple within the event
        // Using [\s\S] instead of 's' flag for compatibility
        const dataMatch = repr.match(/data \(tuple ([\s\S]*?)\)\)/);
        if (dataMatch) {
          const tupleContent = `(ok (tuple ${dataMatch[1]}))`;
          return parsePriceFromResult(tupleContent);
        }
      }
    }
  }

  return null;
}

export async function getTransactionResult(txId: string, network: 'mainnet' | 'testnet' = 'mainnet') {
  const txDetails = await fetchTransactionDetails(txId, network);

  if (txDetails.tx_status !== 'success') {
    return {
      success: false,
      status: txDetails.tx_status,
      error: 'Transaction failed or pending'
    };
  }

  const functionName = txDetails.contract_call?.function_name;

  switch (functionName) {
    case 'get-price':
    case 'read-price-feed': {
      const priceData = parsePriceFromResult(txDetails.tx_result?.repr || '');
      if (priceData) {
        const actualPrice = calculateActualPrice(priceData);
        return {
          success: true,
          functionName,
          priceData,
          actualPrice,
          formattedPrice: `$${actualPrice.toFixed(2)}`
        };
      }
      break;
    }

    case 'decode-price-feeds': {
      return {
        success: true,
        functionName,
        result: txDetails.tx_result?.repr || '',
        raw: true
      };
    }

    case 'verify-and-update-price-feeds': {
      const priceData = parsePriceUpdateEvent(txDetails.events);
      if (priceData) {
        const actualPrice = calculateActualPrice(priceData);
        return {
          success: true,
          functionName,
          priceData,
          actualPrice,
          formattedPrice: `$${actualPrice.toFixed(2)}`,
          events: txDetails.events
        };
      }
      break;
    }

    default:
      return {
        success: true,
        functionName,
        rawResult: txDetails.tx_result
      };
  }

  return {
    success: false,
    error: 'Unable to parse transaction result'
  };
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}