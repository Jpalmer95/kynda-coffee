/**
 * Lightweight IndexedDB wrapper for Kynda PWA offline storage.
 * Stores: cart backup, pending offline orders, user preferences.
 */

const DB_NAME = "kynda-offline";
const DB_VERSION = 1;

interface KyndaDB {
  carts: { key: string; value: unknown };
  pending_orders: { key: string; value: PendingOrder };
}

export interface PendingOrder {
  id: string;
  type: "menu" | "shop";
  payload: unknown;
  created_at: string;
  attempts: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("carts")) {
        db.createObjectStore("carts");
      }
      if (!db.objectStoreNames.contains("pending_orders")) {
        db.createObjectStore("pending_orders", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getStore(store: string, mode: IDBTransactionMode = "readonly") {
  const db = await openDB();
  return db.transaction(store, mode).objectStore(store);
}

export async function idbGet(store: string, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    getStore(store)
      .then((s) => {
        const req = s.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
      .catch(reject);
  });
}

export async function idbSet(store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    getStore(store, "readwrite")
      .then((s) => {
        const req = s.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      })
      .catch(reject);
  });
}

export async function idbDelete(store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    getStore(store, "readwrite")
      .then((s) => {
        const req = s.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      })
      .catch(reject);
  });
}

export async function idbGetAll(store: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    getStore(store)
      .then((s) => {
        const req = s.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
      .catch(reject);
  });
}

// --- Pending Orders Queue ---

export async function addPendingOrder(order: PendingOrder): Promise<void> {
  await idbSet("pending_orders", order.id, order);
}

export async function getPendingOrders(): Promise<PendingOrder[]> {
  const all = await idbGetAll("pending_orders");
  return all as PendingOrder[];
}

export async function removePendingOrder(id: string): Promise<void> {
  await idbDelete("pending_orders", id);
}

export async function updatePendingOrder(order: PendingOrder): Promise<void> {
  await idbSet("pending_orders", order.id, order);
}

// --- Cart Backup ---

export async function backupCart(key: string, items: unknown): Promise<void> {
  await idbSet("carts", key, { items, timestamp: Date.now() });
}

export async function restoreCart(key: string): Promise<{ items: unknown; timestamp: number } | null> {
  const data = await idbGet("carts", key);
  return (data as { items: unknown; timestamp: number }) || null;
}
