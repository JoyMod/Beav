const { app, safeStorage } = require('electron');

app.whenReady().then(() => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Electron safeStorage is unavailable');
  }

  const plaintext = 'beav-safe-storage-smoke';
  const encrypted = safeStorage.encryptString(plaintext);
  if (encrypted.toString('utf8').includes(plaintext)) {
    throw new Error('Encrypted value contains plaintext');
  }
  if (safeStorage.decryptString(encrypted) !== plaintext) {
    throw new Error('safeStorage roundtrip failed');
  }

  console.log('safeStorage roundtrip passed');
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
