// Wallet connection helpers using the new Hiro Connect API

export async function connectWallet(): Promise<any> {
  const { connect, isConnected, getLocalStorage } = await import('@stacks/connect');

  // Check if already connected
  if (isConnected()) {
    console.log('Already authenticated');
    // Get stored addresses from local storage
    const userData = getLocalStorage();
    if (userData?.addresses) {
      console.log('STX:', userData.addresses.stx?.[0]?.address);
      console.log('BTC:', userData.addresses.btc?.[0]?.address);
      return { addresses: userData.addresses };
    }
  }

  // Connect to wallet with app details
  const appDetails = {
    name: 'Pyth Oracle Demo',
    icon: window.location.origin + '/icon.png' // Optional: add an icon
  };

  try {
    const response = await connect();
    console.log('Connected:', response.addresses);
    return response;
  } catch (error) {
    console.error('Connection failed:', error);
    throw error;
  }
}

export async function resolveStxAddress(): Promise<string | null> {
  const { isConnected, getLocalStorage } = await import('@stacks/connect');

  // Check if connected first
  if (!isConnected()) {
    return null;
  }

  try {
    // Get stored addresses from local storage
    const userData = getLocalStorage();

    if (userData?.addresses?.stx?.[0]?.address) {
      return userData.addresses.stx[0].address;
    }
  } catch (error) {
    console.error('Error resolving address:', error);
  }

  return null;
}

export async function isWalletConnected(): Promise<boolean> {
  const { isConnected } = await import('@stacks/connect');
  return isConnected();
}

export async function disconnectWallet(): Promise<void> {
  const { disconnect } = await import('@stacks/connect');

  try {
    // Use the new disconnect method
    disconnect();
    console.log('Wallet disconnected');
  } catch (error) {
    console.error('Error disconnecting wallet:', error);

    // Fallback: Clear wallet-related storage manually if disconnect fails
    if (typeof window !== 'undefined') {
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
}
