
import { openDB, IDBPDatabase, DBSchema } from 'idb';
import { ChatMessage, SimplifiedFeatureKey } from '../types';

const DB_NAME = 'TroLyAI_DB';
const DB_VERSION = 1;
const CHAT_HISTORY_STORE = 'chatHistories';

interface ChatHistoryRecord {
  id: string; // Composite key: `${userId}_${featureKey}`
  userId: string;
  featureKey: SimplifiedFeatureKey;
  history: ChatMessage[];
  lastUpdated: Date;
}

interface MyDB extends DBSchema {
  [CHAT_HISTORY_STORE]: {
    key: string; // Composite key: `${userId}_${featureKey}`
    value: ChatHistoryRecord;
    indexes: { 'by-userId': string }; // Example index if needed later
  };
}

let dbPromise: Promise<IDBPDatabase<MyDB>> | null = null;

const initDB = (): Promise<IDBPDatabase<MyDB>> => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = openDB<MyDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(CHAT_HISTORY_STORE)) {
        const store = db.createObjectStore(CHAT_HISTORY_STORE, { keyPath: 'id' });
        store.createIndex('by-userId', 'userId');
      }
    },
  });
  return dbPromise;
};

const getCompositeKey = (userId: string, featureKey: SimplifiedFeatureKey): string => {
  return `${userId}_${featureKey}`;
};

export const saveChatHistory = async (
  userId: string,
  featureKey: SimplifiedFeatureKey,
  history: ChatMessage[]
): Promise<void> => {
  if (!userId) {
    console.warn('Cannot save chat history without userId');
    return;
  }
  try {
    const db = await initDB();
    const key = getCompositeKey(userId, featureKey);
    const record: ChatHistoryRecord = {
      id: key,
      userId,
      featureKey,
      history,
      lastUpdated: new Date(),
    };
    await db.put(CHAT_HISTORY_STORE, record);
  } catch (error) {
    console.error('Lỗi khi lưu lịch sử chat vào IndexedDB:', error);
  }
};

export const loadChatHistory = async (
  userId: string,
  featureKey: SimplifiedFeatureKey
): Promise<ChatMessage[] | null> => {
  if (!userId) {
    console.warn('Cannot load chat history without userId');
    return null;
  }
  try {
    const db = await initDB();
    const key = getCompositeKey(userId, featureKey);
    const record = await db.get(CHAT_HISTORY_STORE, key);
    return record ? record.history : null;
  } catch (error) {
    console.error('Lỗi khi tải lịch sử chat từ IndexedDB:', error);
    return null;
  }
};

export const clearChatHistory = async (
  userId: string,
  featureKey: SimplifiedFeatureKey
): Promise<void> => {
   if (!userId) {
    console.warn('Cannot clear chat history without userId');
    return;
  }
  try {
    const db = await initDB();
    const key = getCompositeKey(userId, featureKey);
    await db.delete(CHAT_HISTORY_STORE, key);
  } catch (error) {
    console.error('Lỗi khi xóa lịch sử chat khỏi IndexedDB:', error);
  }
};

export const clearAllUserChatHistory = async (userId: string): Promise<void> => {
    if (!userId) {
      console.warn('Cannot clear all chat history without userId');
      return;
    }
    try {
      const db = await initDB();
      const tx = db.transaction(CHAT_HISTORY_STORE, 'readwrite');
      const index = tx.store.index('by-userId');
      let cursor = await index.openCursor(userId);
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
      await tx.done;
      console.log(`Đã xóa tất cả lịch sử chat cho người dùng: ${userId}`);
    } catch (error) {
      console.error('Lỗi khi xóa tất cả lịch sử chat của người dùng:', error);
    }
};