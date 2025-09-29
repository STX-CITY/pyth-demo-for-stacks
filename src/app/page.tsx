"use client";

import { useCallback, useMemo, useState } from 'react';
import {
  openDecode,
  openGetPrice,
  openReadPrice,
  openVerifyAndUpdate,
} from '../lib/stacks';
import { HermesClient } from '@pythnetwork/hermes-client';

const DEFAULT_FEED_ID =
  '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';

export default function Home() {
  const [feedId, setFeedId] = useState<string>(DEFAULT_FEED_ID);
  const [vaaHex, setVaaHex] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const hermes = useMemo(() => new HermesClient('https://hermes.pyth.network'), []);

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

  const handleDecode = useCallback(async () => {
    if (!vaaHex) return setStatus('VAA is empty');
    setStatus('Opening wallet for decode-price-feeds...');
    await openDecode(vaaHex);
  }, [vaaHex]);

  const handleVerify = useCallback(async () => {
    if (!vaaHex) return setStatus('VAA is empty');
    setStatus('Opening wallet for verify-and-update-price-feeds...');
    await openVerifyAndUpdate(vaaHex);
  }, [vaaHex]);

  const handleRead = useCallback(async () => {
    setStatus('Opening wallet for read-price-feed...');
    await openReadPrice(feedId);
  }, [feedId]);

  const handleGet = useCallback(async () => {
    setStatus('Opening wallet for get-price...');
    await openGetPrice(feedId);
  }, [feedId]);

  return (
    <div className="min-h-screen p-6 sm:p-10 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Pyth Oracle V3 on Stacks — Demo</h1>
        <p className="text-sm text-gray-500">
          Contract: SP3R4F6C1J3JQWWCVZ3S7FRRYPMYG6ZW6RZK31FXY.pyth-oracle-v3
        </p>

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
          <pre className="w-full min-h-12 border rounded p-2 text-xs whitespace-pre-wrap">{status}</pre>
        </div>
      </div>
    </div>
  );
}
