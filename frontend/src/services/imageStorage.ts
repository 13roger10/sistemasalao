/**
 * Service for storing large images using IndexedDB
 * Solves the quota exceeded error when using sessionStorage
 */

const DB_NAME = "BelezzaImageDB";
const STORE_NAME = "images";
const DB_VERSION = 1;

interface ImageRecord {
  key: string;
  data: string; // base64 image
  timestamp: number;
}

class ImageStorageService {
  private db: IDBDatabase | null = null;

  /**
   * Initialize the IndexedDB database
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };
    });
  }

  /**
   * Store an image in IndexedDB
   */
  async setItem(key: string, data: string): Promise<void> {
    try {
      const db = await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        const record: ImageRecord = {
          key,
          data,
          timestamp: Date.now(),
        };

        const request = store.put(record);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(new Error(`Failed to store image: ${key}`));
        };
      });
    } catch (error) {
      console.error("[ImageStorage] Error storing image:", error);
      throw error;
    }
  }

  /**
   * Retrieve an image from IndexedDB
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const db = await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const record = request.result as ImageRecord | undefined;
          resolve(record ? record.data : null);
        };

        request.onerror = () => {
          reject(new Error(`Failed to retrieve image: ${key}`));
        };
      });
    } catch (error) {
      console.error("[ImageStorage] Error retrieving image:", error);
      return null;
    }
  }

  /**
   * Remove an image from IndexedDB
   */
  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(new Error(`Failed to remove image: ${key}`));
        };
      });
    } catch (error) {
      console.error("[ImageStorage] Error removing image:", error);
      throw error;
    }
  }

  /**
   * Clear all images from IndexedDB
   */
  async clear(): Promise<void> {
    try {
      const db = await this.initDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(new Error("Failed to clear images"));
        };
      });
    } catch (error) {
      console.error("[ImageStorage] Error clearing images:", error);
      throw error;
    }
  }

  /**
   * Clean up old images (older than 24 hours)
   */
  async cleanupOldImages(): Promise<void> {
    try {
      const db = await this.initDB();
      const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.openCursor();

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const record = cursor.value as ImageRecord;
            if (record.timestamp < cutoffTime) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = () => {
          reject(new Error("Failed to cleanup old images"));
        };
      });
    } catch (error) {
      console.error("[ImageStorage] Error cleaning up old images:", error);
    }
  }
}

// Export singleton instance
export const imageStorage = new ImageStorageService();

// Clean up old images on initialization
if (typeof window !== "undefined") {
  imageStorage.cleanupOldImages().catch(console.error);
}
