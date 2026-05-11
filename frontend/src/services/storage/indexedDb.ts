const DATABASE_NAME = 'ref2image-studio';
const DATABASE_VERSION = 1;
const STORE_IMAGES = 'images';

let dbPromise: Promise<IDBDatabase> | null = null;

export function resetImageDbConnectionForTests(): void {
  dbPromise = null;
}

export async function putBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_IMAGES, 'readwrite');
  const store = transaction.objectStore(STORE_IMAGES);
  await requestToPromise(store.put(blob, id));
  await transactionToPromise(transaction);
}

export async function getBlob(id: string): Promise<Blob | null> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_IMAGES, 'readonly');
  const store = transaction.objectStore(STORE_IMAGES);
  const result: unknown = await requestToPromise(store.get(id));
  return isBlob(result) ? result : null;
}

export async function deleteBlob(id: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_IMAGES, 'readwrite');
  const store = transaction.objectStore(STORE_IMAGES);
  await requestToPromise(store.delete(id));
  await transactionToPromise(transaction);
}

export async function clearBlobs(): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_IMAGES, 'readwrite');
  const store = transaction.objectStore(STORE_IMAGES);
  await requestToPromise(store.clear());
  await transactionToPromise(transaction);
}

function openDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_IMAGES)) {
          database.createObjectStore(STORE_IMAGES);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`无法打开 IndexedDB 数据库：${request.error?.message ?? '未知错误'}`));
      };

      request.onblocked = () => {
        reject(new Error('IndexedDB 打开请求被另一个浏览器标签页阻止。'));
      };
    });
  }
  return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(new Error(`IndexedDB 请求失败：${request.error?.message ?? '未知错误'}`));
    };
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(new Error(`IndexedDB 事务失败：${transaction.error?.message ?? '未知错误'}`));
    };
    transaction.onabort = () => {
      reject(new Error(`IndexedDB 事务已中止：${transaction.error?.message ?? '未知错误'}`));
    };
  });
}

function isBlob(value: unknown): value is Blob {
  return (
    value instanceof Blob ||
    (typeof value === 'object' &&
      value !== null &&
      'size' in value &&
      'type' in value &&
      'slice' in value)
  );
}
