import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    limit,
    getCountFromServer,
    DocumentData,
    QueryConstraint,
    writeBatch,
    onSnapshot,
    orderBy
} from 'firebase/firestore';
import { db as firestore } from '../firebase';

// Define generic types to replace MongoDB driver types
export type Document = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Filter<_T> = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type UpdateFilter<_T> = Record<string, unknown>;
export type OptionalId<T> = T & { _id?: string };

/**
 * Frontend Database Service
 * Replaces direct MongoDB connection with Firebase Firestore SDK
 */
class DatabaseService {
    /**
     * Clean document data by removing undefined values (unsupported by Firestore)
     */
    private cleanData(data: Record<string, unknown>): Record<string, unknown> {
        const cleaned: Record<string, unknown> = {};
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
                // Also clean nested objects recursively if they are plain objects
                if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
                    cleaned[key] = this.cleanData(value as Record<string, unknown>);
                } else {
                    cleaned[key] = value;
                }
            }
        });
        return cleaned;
    }

    /**
     * Find multiple documents in a collection
     */
    async find<T extends Document>(
        collectionName: string,
        filter: Filter<T> = {},
        options: {
            sort?: Record<string, 1 | -1>;
            limit?: number;
            skip?: number; // Firestore doesn't support skip efficiently, we might need to ignore or use cursors
        } = {}
    ): Promise<T[]> {
        try {
            const constraints: QueryConstraint[] = [];
            let hasInFilter = false;
            let inKey = '';
            let inValues: unknown[] = [];

            // Apply filters with MongoDB-style operator support
            Object.entries(filter).forEach(([key, value]) => {
                if (value !== undefined) {
                    // Check if value is an object with operators
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        Object.entries(value).forEach(([operator, operand]) => {
                            switch (operator) {
                                case '$in':
                                    if (Array.isArray(operand)) {
                                        // Validate non-empty array
                                        if (operand.length === 0) {
                                            // Return empty result early if $in array is empty
                                            console.warn(`Empty array for $in filter on field '${key}', returning empty results`);
                                            hasInFilter = true;
                                            inValues = [];
                                        } else if (operand.length > 30) {
                                            // Firestore limit: max 30 values per 'in' query
                                            // We'll need to batch this
                                            hasInFilter = true;
                                            inKey = key;
                                            inValues = operand;
                                        } else {
                                            constraints.push(where(key, 'in', operand));
                                        }
                                    }
                                    break;
                                case '$lte':
                                    constraints.push(where(key, '<=', operand));
                                    break;
                                case '$gte':
                                    constraints.push(where(key, '>=', operand));
                                    break;
                                case '$lt':
                                    constraints.push(where(key, '<', operand));
                                    break;
                                case '$gt':
                                    constraints.push(where(key, '>', operand));
                                    break;
                                case '$ne':
                                    constraints.push(where(key, '!=', operand));
                                    break;
                                default:
                                    // Unknown operator, treat as equality
                                    constraints.push(where(key, '==', value));
                            }
                        });
                    } else {
                        // Simple equality
                        constraints.push(where(key, '==', value));
                    }
                }
            });

            // Handle empty $in array early
            if (hasInFilter && inValues.length === 0) {
                return [];
            }

            // Handle large $in arrays (> 30 items) by batching
            if (hasInFilter && inValues.length > 30) {
                const results: T[] = [];
                const batches = Math.ceil(inValues.length / 30);

                for (let i = 0; i < batches; i++) {
                    const batchValues = inValues.slice(i * 30, (i + 1) * 30);
                    const batchConstraints = [...constraints, where(inKey, 'in', batchValues)];

                    if (options.limit) {
                        batchConstraints.push(limit(options.limit));
                    }

                    const q = query(collection(firestore, collectionName), ...batchConstraints);
                    const querySnapshot = await getDocs(q);

                    querySnapshot.docs.forEach(doc => {
                        results.push({
                            id: doc.id,
                            ...doc.data()
                        } as unknown as T);
                    });

                    // If we've hit the limit, stop
                    if (options.limit && results.length >= options.limit) {
                        break;
                    }
                }

                // Apply limit if specified
                return options.limit ? results.slice(0, options.limit) : results;
            }

            // Apply sort
            // NOTE: Server-side sorting disabled to avoid Firestore index requirements.
            // Sorting should be handled client-side after fetching data.
            // if (options.sort) {
            //     Object.entries(options.sort).forEach(([key, direction]) => {
            //         constraints.push(orderBy(key, direction === 1 ? 'asc' : 'desc'));
            //     });
            // }

            // Apply limit
            if (options.limit) {
                constraints.push(limit(options.limit));
            }

            // Note: 'skip' is not directly supported in Firestore in the same way as MongoDB.
            // For now, we'll ignore it or handle pagination differently in the UI if needed.

            const q = query(collection(firestore, collectionName), ...constraints);
            const querySnapshot = await getDocs(q);

            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as unknown as T[];
        } catch (error) {
            console.error(`Error finding documents in ${collectionName}:`, error);
            return [];
        }
    }

    /**
     * Find a single document in a collection
     */
    async findOne<T extends Document>(
        collectionName: string,
        filter: Filter<T>
    ): Promise<T | null> {
        const results = await this.find<T>(collectionName, filter, { limit: 1 });
        return results[0] || null;
    }

    /**
     * Find a document by ID
     */
    async findById<T extends Document>(
        collectionName: string,
        id: string
    ): Promise<T | null> {
        try {
            const docRef = doc(firestore, collectionName, id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...docSnap.data()
                } as unknown as T;
            } else {
                return null;
            }
        } catch (error) {
            console.error(`Error finding document by ID in ${collectionName}:`, error);
            return null;
        }
    }

    /**
     * Insert a single document
     */
    async insertOne<T extends Document>(
        collectionName: string,
        document: OptionalId<T>
    ): Promise<T> {
        try {
            // If document has an ID, use setDoc, otherwise addDoc
            const { _id, id, ...data } = document as { _id?: string, id?: string, [key: string]: unknown };
            const docId = id || _id;
            const cleanedData = this.cleanData(data);

            if (docId) {
                await setDoc(doc(firestore, collectionName, docId), cleanedData);
                return { id: docId, ...cleanedData } as unknown as T;
            } else {
                const docRef = await addDoc(collection(firestore, collectionName), cleanedData);
                return { id: docRef.id, ...cleanedData } as unknown as T;
            }
        } catch (error) {
            console.error(`Error inserting document into ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Insert multiple documents
     */
    async insertMany<T extends Document>(
        collectionName: string,
        documents: OptionalId<T>[]
    ): Promise<T[]> {
        try {
            const batch = writeBatch(firestore);
            const results: T[] = [];

            documents.forEach(docData => {
                const { _id, id, ...data } = docData as { _id?: string, id?: string, [key: string]: unknown };
                const docId = id || _id;
                const cleanedData = this.cleanData(data);

                let docRef;
                if (docId) {
                    docRef = doc(firestore, collectionName, docId);
                } else {
                    docRef = doc(collection(firestore, collectionName));
                }

                batch.set(docRef, cleanedData);
                results.push({ id: docRef.id, ...cleanedData } as unknown as T);
            });

            await batch.commit();
            return results;
        } catch (error) {
            console.error(`Error inserting multiple documents into ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Update a document by ID
     */
    async updateById<T extends Document>(
        collectionName: string,
        id: string,
        update: Partial<T>
    ): Promise<boolean> {
        try {
            const docRef = doc(firestore, collectionName, id);
            const cleanedUpdate = this.cleanData(update as DocumentData);
            await updateDoc(docRef, cleanedUpdate);
            return true;
        } catch (error) {
            console.error(`Error updating document ${id} in ${collectionName}:`, error);
            return false;
        }
    }

    /**
     * Delete a document by ID
     */
    async deleteById(collectionName: string, id: string): Promise<boolean> {
        try {
            await deleteDoc(doc(firestore, collectionName, id));
            return true;
        } catch (error) {
            console.error(`Error deleting document ${id} from ${collectionName}:`, error);
            return false;
        }
    }

    /**
     * Delete multiple documents
     */
    async deleteMany<T extends Document>(
        collectionName: string,
        filter: Filter<T>
    ): Promise<boolean> {
        try {
            const items = await this.find<T>(collectionName, filter);
            if (items.length === 0) return true;

            const batch = writeBatch(firestore);
            items.forEach(item => {
                const id = (item as { id?: string, _id?: string }).id || (item as { id?: string, _id?: string })._id;
                if (id) {
                    batch.delete(doc(firestore, collectionName, id));
                }
            });

            await batch.commit();
            return true;
        } catch (error) {
            console.error(`Error deleting multiple documents from ${collectionName}:`, error);
            return false;
        }
    }

    /**
     * Count documents
     */
    async count<T extends Document>(
        collectionName: string,
        filter: Filter<T> = {}
    ): Promise<number> {
        try {
            const constraints: QueryConstraint[] = [];
            let hasEmptyInFilter = false;
            let inKey = '';
            let inValues: unknown[] = [];
            let hasInFilter = false;

            // Apply filters with MongoDB-style operator support
            Object.entries(filter).forEach(([key, value]) => {
                if (value !== undefined) {
                    // Check if value is an object with operators
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        Object.entries(value).forEach(([operator, operand]) => {
                            switch (operator) {
                                case '$in':
                                    if (Array.isArray(operand)) {
                                        // Validate non-empty array
                                        if (operand.length === 0) {
                                            console.warn(`Empty array for $in filter on field '${key}', returning 0 count`);
                                            hasEmptyInFilter = true;
                                        } else if (operand.length > 30) {
                                            // Firestore has 30-item limit, need to batch
                                            hasInFilter = true;
                                            inKey = key;
                                            inValues = operand;
                                        } else {
                                            constraints.push(where(key, 'in', operand));
                                        }
                                    }
                                    break;
                                case '$lte':
                                    constraints.push(where(key, '<=', operand));
                                    break;
                                case '$gte':
                                    constraints.push(where(key, '>=', operand));
                                    break;
                                case '$lt':
                                    constraints.push(where(key, '<', operand));
                                    break;
                                case '$gt':
                                    constraints.push(where(key, '>', operand));
                                    break;
                                case '$ne':
                                    constraints.push(where(key, '!=', operand));
                                    break;
                                default:
                                    // Unknown operator, treat as equality
                                    constraints.push(where(key, '==', value));
                            }
                        });
                    } else {
                        // Simple equality
                        constraints.push(where(key, '==', value));
                    }
                }
            });

            // Return 0 if empty $in array
            if (hasEmptyInFilter) {
                return 0;
            }

            // Handle large $in arrays (> 30 items) by batching
            if (hasInFilter && inValues.length > 30) {
                let totalCount = 0;
                const batches = Math.ceil(inValues.length / 30);

                for (let i = 0; i < batches; i++) {
                    const batchValues = inValues.slice(i * 30, (i + 1) * 30);
                    const batchConstraints = [...constraints, where(inKey, 'in', batchValues)];

                    const q = query(collection(firestore, collectionName), ...batchConstraints);
                    const snapshot = await getCountFromServer(q);
                    totalCount += snapshot.data().count;
                }

                return totalCount;
            }

            const q = query(collection(firestore, collectionName), ...constraints);
            const snapshot = await getCountFromServer(q);
            return snapshot.data().count;
        } catch (error) {
            console.error(`Error counting documents in ${collectionName}:`, error);
            return 0;
        }
    }

    /**
     * Upsert a document
     */
    async upsert<T extends Document>(
        collectionName: string,
        filter: Filter<T>,
        document: Partial<T>
    ): Promise<T> {
        try {
            const existing = await this.findOne<T>(collectionName, filter);
            if (existing) {
                const id = ((existing as { id?: string, _id?: string }).id || (existing as { id?: string, _id?: string })._id)!;
                await this.updateById(collectionName, id, document);
                return { ...existing, ...document };
            } else {
                return await this.insertOne(collectionName, document as OptionalId<T>);
            }
        } catch (error) {
            console.error(`Error upserting document in ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Aggregate (simulated via find)
     */
    async aggregate<T extends Document>(
        collectionName: string
    ): Promise<T[]> {
        console.warn('Aggregation not fully supported in Firestore client. Using find fallback.');
        // Fallback: fetch all and let the caller handle logic (inefficient but safe for small datasets)
        return this.find<T>(collectionName, {});
    }

    /**
     * Subscribe to real-time updates
     */
    subscribe<T extends Document>(
        collectionName: string,
        filter: Filter<T>,
        callback: (data: T[]) => void,
        options: {
            sort?: Record<string, 1 | -1>;
            limit?: number;
        } = {}
    ): () => void {
        try {
            const constraints: QueryConstraint[] = [];

            // Apply filters
            Object.entries(filter).forEach(([key, value]) => {
                if (value !== undefined) {
                    constraints.push(where(key, '==', value));
                }
            });

            // Apply sort
            if (options.sort) {
                Object.entries(options.sort).forEach(([key, direction]) => {
                    constraints.push(orderBy(key, direction === 1 ? 'asc' : 'desc'));
                });
            }

            // Apply limit
            if (options.limit) {
                constraints.push(limit(options.limit));
            }

            const q = query(collection(firestore, collectionName), ...constraints);

            return onSnapshot(q, (snapshot) => {
                const results = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as unknown as T[];
                callback(results);
            }, (error) => {
                console.error(`Error subscribing to ${collectionName}:`, error);
            });
        } catch (error) {
            console.error(`Error setting up subscription for ${collectionName}:`, error);
            return () => { };
        }
    }

    // Convenience aliases
    async create<T extends Document>(collectionName: string, data: OptionalId<T>): Promise<T> {
        return this.insertOne<T>(collectionName, data);
    }

    async update<T extends Document>(collectionName: string, id: string, data: Partial<T>): Promise<boolean> {
        return this.updateById<T>(collectionName, id, data);
    }

    async updateOne<T extends Document>(collectionName: string, id: string, data: Partial<T>): Promise<boolean> {
        return this.updateById<T>(collectionName, id, data);
    }

    async delete(collectionName: string, id: string): Promise<boolean> {
        return this.deleteById(collectionName, id);
    }

    // Activity logging
    async logActivity(data: {
        user_id: string;
        user_name: string;
        user_role: string;
        action: string;
        view?: string;
        details?: string;
        school_id?: string;
    }): Promise<void> {
        try {
            await this.insertOne('activity_logs', {
                ...data,
                created_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    /**
     * Get the smallest available roll number globally (recyclable)
     */
    async getSmallestAvailableRollNumber(): Promise<string> {
        try {
            const students = await this.find<{ roll_number?: string }>('students', {});
            const usedNumbers = students
                .map(s => parseInt(s.roll_number || '0', 10))
                .filter(n => n > 0)
                .sort((a, b) => a - b);

            let nextNumber = 1;
            for (const num of usedNumbers) {
                if (num === nextNumber) {
                    nextNumber++;
                } else if (num > nextNumber) {
                    break;
                }
            }
            return nextNumber.toString();
        } catch (error) {
            console.error('Error getting smallest available roll number:', error);
            return '1';
        }
    }

    /**
     * Assign roll numbers to all existing students who don't have one.
     */
    async initializeRollNumbers(): Promise<{ success: boolean; count: number }> {
        try {
            const students = await this.find<any>('students', {});
            const missingRoll = students.filter(s => !s.roll_number);
            const withRoll = students.filter(s => !!s.roll_number);
            
            if (missingRoll.length === 0) return { success: true, count: 0 };

            const usedNumbers = new Set(withRoll.map(s => parseInt(s.roll_number!, 10)));
            let currentNum = 1;
            let updatedCount = 0;

            // Sort by creation date if available to maintain some order, else use ID
            const sortedMissing = missingRoll.sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateA - dateB || a.id.localeCompare(b.id);
            });

            for (const student of sortedMissing) {
                while (usedNumbers.has(currentNum)) {
                    currentNum++;
                }
                const rollNumber = currentNum.toString();
                await this.update('students', student.id, { roll_number: rollNumber });
                usedNumbers.add(currentNum);
                updatedCount++;
            }

            return { success: true, count: updatedCount };
        } catch (error) {
            console.error('Error initializing roll numbers:', error);
            throw error;
        }
    }
}

export const db = new DatabaseService();
