"use client";

import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  openDecode,
  openGetPrice,
  openReadPrice,
  openVerifyAndUpdate,
} from '../lib/stacks';
import { HermesClient } from '@pythnetwork/hermes-client';
import { connectWallet, resolveStxAddress } from '../lib/wallet';
import { PRICE_FEEDS } from '../lib/feeds';
import { getTransactionResult, formatTimestamp } from '../lib/hiro-api';

const DEFAULT_FEED_ID = PRICE_FEEDS.BTC_USD;

export default function Home() {
  const [feedId, setFeedId] = useState<string>(DEFAULT_FEED_ID);
  const [vaaHex, setVaaHex] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [principal, setPrincipal] = useState<string>('');
  const [txResults, setTxResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTxId, setCurrentTxId] = useState<string | null>(null);

  const hermes = useMemo(() => new HermesClient('https://hermes.pyth.network'), []);

  // Detect already-connected wallet on mount
  useEffect(() => {
    (async () => {
      const addr = await resolveStxAddress();
      if (addr) {
        setPrincipal(addr);
        setConnected(true);
      }
    })();
  }, []);

  function toHexFromBytes(bytes: Uint8Array): string {
    let hex = '0x';
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
    return hex;
  }

  function base64ToHex(b64: string): string {
    const binStr = atob(b64);
    let hex = '0x';
    for (let i = 0; i < binStr.length; i++) hex += (binStr.charCodeAt(i) & 0xff).toString(16).padStart(2, '0');
    return hex;
  }

  const fetchVaa = useCallback(async () => {
    setStatus('Fetching VAA from Hermes...');
    try {
      const h: any = hermes as any;
      let hex: string | null = null;

      if (typeof h.getLatestVaas === 'function') {
        const out = await h.getLatestVaas({ ids: [feedId] });
        // Try known shapes
        if (Array.isArray(out) && out.length) {
          if (typeof out[0] === 'string') hex = base64ToHex(out[0]);
          else if (out[0] instanceof Uint8Array) hex = toHexFromBytes(out[0]);
          else if (out[0]?.vaa) {
            const v = out[0].vaa;
            if (typeof v === 'string') hex = base64ToHex(v);
            else if (v instanceof Uint8Array) hex = toHexFromBytes(v);
          }
        }
      } else if (typeof h.getLatestVaa === 'function') {
        const v = await h.getLatestVaa({ id: feedId });
        if (typeof v === 'string') hex = base64ToHex(v);
        else if (v instanceof Uint8Array) hex = toHexFromBytes(v);
        else if (v?.vaa) {
          const val = v.vaa;
          hex = typeof val === 'string' ? base64ToHex(val) : toHexFromBytes(val);
        }
      }

      if (!hex) {
        // Fallback to REST endpoint
        const url = `https://hermes.pyth.network/api/latest_vaas?ids[]=${encodeURIComponent(feedId)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arr: string[] = await res.json();
        if (!arr?.length) throw new Error('No VAA returned');
        hex = base64ToHex(arr[0]);
      }

      setVaaHex(hex);
      setStatus('Fetched latest VAA');
    } catch (e: any) {
      console.error(e);
      setStatus('Failed to fetch VAA: ' + (e?.message || 'unknown error'));
    }
  }, [feedId, hermes]);

  const handleTxResult = useCallback(async (txResult: any, functionName: string) => {
    if (txResult?.txid) {
      setCurrentTxId(txResult.txid);
      setStatus(`Transaction submitted: ${txResult.txid}`);
      setIsLoading(true);
      setTxResults(null);

      // Wait a bit for transaction to be indexed
      setTimeout(async () => {
        try {
          const result = await getTransactionResult(txResult.txid, 'mainnet');
          setTxResults(result);
          if (result.success) {
            setStatus(`Transaction successful for ${functionName}`);
          } else {
            setStatus(`Transaction failed: ${result.error || result.status}`);
          }
        } catch (error: any) {
          setStatus(`Failed to fetch transaction details: ${error.message}`);
        } finally {
          setIsLoading(false);
        }
      }, 3000); // Wait 3 seconds for transaction to be indexed
    }
  }, []);

  const handleDecode = useCallback(async () => {
    if (!vaaHex) return setStatus('VAA is empty');
    // Ensure wallet connection
    if (!connected) {
      try {
        setStatus('Connecting wallet...');
        const resp: any = await connectWallet();
        const addr = (await resolveStxAddress()) || resp?.addresses?.mainnet || resp?.stxAddress || '';
        if (addr) setPrincipal(addr);
        setConnected(true);
      } catch (e: any) {
        setStatus('Wallet connection canceled or failed');
        return;
      }
    }
    setStatus('Opening wallet for decode-price-feeds...');
    const txResult = await openDecode(vaaHex);
    await handleTxResult(txResult, 'decode-price-feeds');
  }, [vaaHex, connected, handleTxResult]);

  const handleVerify = useCallback(async () => {
    if (!vaaHex) return setStatus('VAA is empty');
    if (!connected) {
      try {
        setStatus('Connecting wallet...');
        const resp: any = await connectWallet();
        const addr = (await resolveStxAddress()) || resp?.addresses?.mainnet || resp?.stxAddress || '';
        if (addr) setPrincipal(addr);
        setConnected(true);
      } catch (e: any) {
        setStatus('Wallet connection canceled or failed');
        return;
      }
    }
    setStatus('Opening wallet for verify-and-update-price-feeds...');
    const txResult = await openVerifyAndUpdate(vaaHex);
    await handleTxResult(txResult, 'verify-and-update-price-feeds');
  }, [vaaHex, connected, handleTxResult]);

  const handleRead = useCallback(async () => {
    if (!connected) {
      try {
        setStatus('Connecting wallet...');
        const resp: any = await connectWallet();
        const addr = (await resolveStxAddress()) || resp?.addresses?.mainnet || resp?.stxAddress || '';
        if (addr) setPrincipal(addr);
        setConnected(true);
      } catch (e: any) {
        setStatus('Wallet connection canceled or failed');
        return;
      }
    }
    setStatus('Opening wallet for read-price-feed...');
    const txResult = await openReadPrice(feedId);
    await handleTxResult(txResult, 'read-price-feed');
  }, [feedId, connected, handleTxResult]);

  const handleGet = useCallback(async () => {
    if (!connected) {
      try {
        setStatus('Connecting wallet...');
        const resp: any = await connectWallet();
        const addr = (await resolveStxAddress()) || resp?.addresses?.mainnet || resp?.stxAddress || '';
        if (addr) setPrincipal(addr);
        setConnected(true);
      } catch (e: any) {
        setStatus('Wallet connection canceled or failed');
        return;
      }
    }
    setStatus('Opening wallet for get-price...');
    const txResult = await openGetPrice(feedId);
    await handleTxResult(txResult, 'get-price');
  }, [feedId, connected, handleTxResult]);

  return (
    <div className="min-h-screen p-6 sm:p-10 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Pyth Oracle V3 on Stacks — Demo</h1>
        <p className="text-sm text-gray-500">
          Contract: SP3R4F6C1J3JQWWCVZ3S7FRRYPMYG6ZW6RZK31FXY.pyth-oracle-v3
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              try {
                setStatus('Connecting wallet...');
                const resp: any = await connectWallet();
                const addr = (await resolveStxAddress()) || resp?.addresses?.mainnet || resp?.stxAddress || '';
                if (addr) setPrincipal(addr);
                setConnected(true);
                setStatus('Wallet connected');
              } catch (e) {
                setStatus('Wallet connection canceled or failed');
              }
            }}
            className="px-3 py-2 rounded border text-sm"
          >
            {connected ? 'Wallet Connected' : 'Connect Wallet'}
          </button>
          {connected && (
            <div className="text-xs text-gray-600 truncate">
              <span className="font-medium">Address:</span> {principal}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Select Preset Feed</label>
          <select
            className="w-full border rounded px-3 py-2 text-sm"
            value={feedId}
            onChange={(e) => setFeedId(e.target.value)}
          >
            <option value={PRICE_FEEDS.BTC_USD}>BTC / USD</option>
            <option value={PRICE_FEEDS.STX_USD}>STX / USD</option>
            <option value={PRICE_FEEDS.ETH_USD}>ETH / USD</option>
            <option value={PRICE_FEEDS.USDC_USD}>USDC / USD</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Pyth Price Feed ID (hex)</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={feedId}
            onChange={(e) => setFeedId(e.target.value)}
            placeholder="0x..."
          />
        </div>

        <div className="space-y-2">
          <button
            onClick={fetchVaa}
            className="px-4 py-2 rounded bg-black text-white hover:opacity-90 text-sm"
          >
            Fetch VAA from Hermes
          </button>
          <textarea
            className="w-full h-24 border rounded p-2 text-xs"
            value={vaaHex}
            readOnly
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={handleDecode} className="px-3 py-2 rounded border text-sm">
            Decode Price Feeds
          </button>
          <button onClick={handleVerify} className="px-3 py-2 rounded border text-sm">
            Verify & Update Price
          </button>
          <button onClick={handleRead} className="px-3 py-2 rounded border text-sm">
            Read Price Feed
          </button>
          <button onClick={handleGet} className="px-3 py-2 rounded border text-sm">
            Get Price
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium">Status</label>
          <div className="w-full min-h-12 border rounded p-2 text-xs space-y-2">
            <pre className="whitespace-pre-wrap">{status}</pre>
            {currentTxId && (
              <div className="pt-2 border-t">
                <span className="font-medium">Transaction ID: </span>
                <a
                  href={`https://explorer.hiro.so/txid/${currentTxId}?chain=mainnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline break-all"
                >
                  {currentTxId}
                </a>
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="border rounded p-4 bg-blue-50">
            <p className="text-sm">Loading transaction details...</p>
          </div>
        )}

        {txResults && !isLoading && (
          <div className="border rounded p-4 space-y-3">
            <h3 className="font-semibold text-sm">Transaction Result</h3>

            {txResults.success && txResults.priceData && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Price:</span>
                    <span className="ml-2 text-green-600 font-bold">
                      {txResults.formattedPrice}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Raw Price:</span>
                    <span className="ml-2">{txResults.priceData.price}</span>
                  </div>
                  <div>
                    <span className="font-medium">EMA Price:</span>
                    <span className="ml-2">{txResults.priceData.emaPrice}</span>
                  </div>
                  <div>
                    <span className="font-medium">Confidence:</span>
                    <span className="ml-2">{txResults.priceData.conf}</span>
                  </div>
                  <div>
                    <span className="font-medium">Exponent:</span>
                    <span className="ml-2">{txResults.priceData.expo}</span>
                  </div>
                  <div>
                    <span className="font-medium">Publish Time:</span>
                    <span className="ml-2">{formatTimestamp(txResults.priceData.publishTime)}</span>
                  </div>
                </div>
                {txResults.priceData.priceIdentifier && (
                  <div className="text-sm">
                    <span className="font-medium">Price ID:</span>
                    <span className="ml-2 font-mono text-xs break-all">
                      {txResults.priceData.priceIdentifier}
                    </span>
                  </div>
                )}
              </div>
            )}

            {txResults.success && txResults.raw && (
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Raw Result:</span>
                  <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                    {txResults.result}
                  </pre>
                </div>
              </div>
            )}

            {txResults.events && txResults.events.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Events:</div>
                <div className="text-xs bg-gray-50 p-2 rounded">
                  {txResults.events.map((event: any, idx: number) => (
                    <div key={idx} className="mb-1">
                      Event {idx + 1}: {event.event_type}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!txResults.success && (
              <div className="text-red-600 text-sm">
                Error: {txResults.error || 'Transaction failed'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
