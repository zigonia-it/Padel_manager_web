window.PadelstarOfflineStorage = (() => {
  const databaseName = "padelstar-offline";
  const databaseVersion = 1;
  const storeName = "records";

  function isSupported() {
    return typeof indexedDB !== "undefined";
  }

  function openDatabase() {
    if (!isSupported()) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, databaseVersion);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(storeName, { keyPath: "key" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function withStore(mode, callback) {
    return openDatabase().then((database) => {
      if (!database) return null;
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const result = callback(store);
        transaction.oncomplete = () => {
          database.close();
          resolve(result);
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
      });
    });
  }

  function saveRecord(key, value) {
    return withStore("readwrite", (store) => store.put({ key, value, updatedAt: new Date().toISOString() }));
  }

  function removeRecord(key) {
    return withStore("readwrite", (store) => store.delete(key));
  }

  function loadRecord(key) {
    return openDatabase().then((database) => {
      if (!database) return null;
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, "readonly");
        const request = transaction.objectStore(storeName).get(key);
        request.onsuccess = () => resolve(request.result?.value ?? null);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
      });
    });
  }

  function saveJson(key, value) {
    return saveRecord(key, JSON.stringify(value));
  }

  function mirrorFromLocalStorage(keys, storage) {
    return Promise.all(keys.map((key) => {
      const value = storage.getItem(key);
      return value === null ? removeRecord(key) : saveRecord(key, value);
    }));
  }

  return {
    databaseName,
    isSupported,
    loadRecord,
    mirrorFromLocalStorage,
    removeRecord,
    saveJson,
    saveRecord,
  };
})();
