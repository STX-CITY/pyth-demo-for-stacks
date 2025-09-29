// Lightweight helper to ensure the Hiro Wallet is connected
// Tries the modern `connect()` API; falls back to `showConnect()` if needed.

export async function connectWallet(): Promise<any> {
  const mod: any = await import('@stacks/connect');
  const appDetails = { name: 'Pyth Oracle Demo', icon: '' };

  if (typeof mod.connect === 'function') {
    // New API returns connection response
    return await mod.connect({ appDetails });
  }

  if (typeof mod.showConnect === 'function') {
    return await new Promise((resolve, reject) => {
      try {
        mod.showConnect({
          appDetails,
          onFinish: (payload: any) => resolve(payload),
          onCancel: () => reject(new Error('User canceled')),
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  throw new Error('No compatible connect function found in @stacks/connect');
}

export async function resolveStxAddress(): Promise<string | null> {
  const mod: any = await import('@stacks/connect');
  try {
    if (typeof mod.getLocalStorage === 'function') {
      const data = mod.getLocalStorage();
      const stxAddresses = data?.addresses?.stx;
      if (Array.isArray(stxAddresses) && stxAddresses.length > 0) {
        return stxAddresses[0]?.address || null;
      }
    }
  } catch {}

  try {
    if (typeof mod.request === 'function') {
      const accounts = await mod.request('stx_getAccounts');
      const first = accounts?.addresses?.[0];
      return first?.address || null;
    }
  } catch {}

  return null;
}

export async function disconnectWallet(): Promise<void> {
  const mod: any = await import('@stacks/connect');

  // Try the disconnect method if available
  if (typeof mod.disconnect === 'function') {
    await mod.disconnect();
    return;
  }

  // Clear local storage as fallback
  if (typeof window !== 'undefined') {
    // Clear Hiro wallet related storage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('blockstack') || key.includes('stacks') || key.includes('hiro'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}
