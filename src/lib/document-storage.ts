import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  query, 
  where,
  orderBy,
  serverTimestamp,
  DocumentData,
  enableNetwork,
  disableNetwork,
  waitForPendingWrites
} from 'firebase/firestore';
import { CVAnalyzer } from './cv-analyzer';
import { EmbeddingsStore } from './embeddings-store';
import { parseDocument } from './document-parser';
import { toast } from 'sonner';
import type { CVData } from '@/types';

export class DocumentStorage {
  private static readonly USERS_COLLECTION = 'users';
  private static readonly DOCUMENTS_COLLECTION = 'documents';
  private static readonly INTERVIEW_STATES_COLLECTION = 'interview_states';
  private static isOffline = false;

  static async getDocument(path: string): Promise<DocumentData | null> {
    try {
      console.debug('Fetching document:', { path });
      const docRef = doc(db, path);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.debug('Document not found:', { path });
        return null;
      }
      
      return docSnap.data();
    } catch (error) {
      console.error('Error fetching document:', { path, error });
      this.handleStorageError(error);
      return null;
    }
  }

  static async updateDocument(path: string, data: any): Promise<void> {
    try {
      if (this.isOffline) {
        toast.warning('Changes will sync when online');
      }

      console.debug('Updating document:', { path });
      const docRef = doc(db, path);
      await setDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (!this.isOffline) {
        await waitForPendingWrites(db);
      }
      
      console.debug('Document updated successfully:', { path });
    } catch (error) {
      console.error('Error updating document:', { path, error });
      this.handleStorageError(error);
    }
  }

  static async storeDocument(file: File, userId: string): Promise<CVData> {
    try {
      if (this.isOffline) {
        throw new Error('Cannot process documents while offline');
      }

      console.debug('Processing document:', { fileName: file.name, userId });

      // Extract text from document
      const text = await parseDocument(file);
      console.debug('Document text extracted:', { textLength: text.length });

      // Analyze CV content
      const cvData = await CVAnalyzer.analyze(text);
      console.debug('CV analysis complete');

      // Create and store embeddings
      const embedding = await EmbeddingsStore.createEmbedding(text);
      await EmbeddingsStore.storeEmbedding(text, embedding, {
        type: 'cv_document',
        userId,
        timestamp: Date.now()
      });
      console.debug('CV embeddings stored');

      // Store CV data
      const docRef = doc(collection(db, this.USERS_COLLECTION, userId, this.DOCUMENTS_COLLECTION));
      await setDoc(docRef, {
        fileName: file.name,
        fileType: file.type,
        cvData,
        createdAt: serverTimestamp()
      });

      await waitForPendingWrites(db);
      console.debug('CV data stored successfully');

      return cvData;
    } catch (error) {
      console.error('Error storing document:', { userId, error });
      this.handleStorageError(error);
      throw error;
    }
  }

  static async getUserDocuments(userId: string): Promise<DocumentData[]> {
    try {
      console.debug('Fetching user documents:', { userId });
      const docsQuery = query(
        collection(db, this.USERS_COLLECTION, userId, this.DOCUMENTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(docsQuery);
      console.debug('Documents fetched:', { count: snapshot.size });
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching user documents:', { userId, error });
      this.handleStorageError(error);
      return [];
    }
  }

  private static handleStorageError(error: unknown) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    if (message.includes('network') || message.includes('offline')) {
      this.isOffline = true;
      toast.error('Network error', {
        description: 'Please check your internet connection'
      });
    } else {
      toast.error('Storage error', {
        description: message
      });
    }
  }

  static async enableOfflineMode() {
    try {
      await disableNetwork(db);
      this.isOffline = true;
      toast.info('Offline mode enabled', {
        description: 'Changes will sync when connection is restored'
      });
    } catch (error) {
      console.error('Error enabling offline mode:', error);
    }
  }

  static async enableOnlineMode() {
    try {
      await enableNetwork(db);
      this.isOffline = false;
      toast.success('Online mode enabled', {
        description: 'Changes are now syncing'
      });
    } catch (error) {
      console.error('Error enabling online mode:', error);
    }
  }
}