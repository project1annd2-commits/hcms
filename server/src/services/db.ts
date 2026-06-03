import { Document, Filter, UpdateFilter, OptionalId, ObjectId } from 'mongodb';
import { mongodb, ensureConnected } from '../config/mongodb';

function toAppFormat<T extends { _id?: ObjectId; id?: string }>(doc: T | null): T | null {
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return {
        ...rest,
        id: rest.id || _id?.toString(),
    } as T;
}

function isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Generic MongoDB database service  
 * Provides CRUD operations for all collections
 */
export class DatabaseService {
    async find<T extends Document>(
        collectionName: string,
        filter: Filter<T> = {},
        options: {
            sort?: Record<string, 1 | -1>;
            limit?: number;
            skip?: number;
        } = {}
    ): Promise<T[]> {
        await ensureConnected();
        const collection = mongodb.getCollection<T>(collectionName);

        let cursor = collection.find(filter);

        if (options.sort) cursor = cursor.sort(options.sort);
        if (options.skip) cursor = cursor.skip(options.skip);
        if (options.limit) cursor = cursor.limit(options.limit);

        const results = await cursor.toArray();
        return results.map(doc => toAppFormat(doc as any) as T);
    }

    async findOne<T extends Document>(
        collectionName: string,
        filter: Filter<T>
    ): Promise<T | null> {
        await ensureConnected();
        const collection = mongodb.getCollection<T>(collectionName);
        const result = await collection.findOne(filter);
        return toAppFormat(result as any) as T | null;
    }

    async findById<T extends Document>(
        collectionName: string,
        id: string
    ): Promise<T | null> {
        await ensureConnected();
        const collection = mongodb.getCollection<T>(collectionName);

        // Handle both MongoDB ObjectIds and UUIDs
        let filter: any;
        if (isValidObjectId(id)) {
            filter = { _id: new ObjectId(id) };
        } else {
            // For UUIDs or other ID formats, search by id field
            filter = { id: id };
        }

        const result = await collection.findOne(filter);
        return toAppFormat(result as any) as T | null;
    }

    async insertOne<T extends Document>(
        collectionName: string,
        document: OptionalId<T>
    ): Promise<T> {
        await ensureConnected();
        const collection = mongodb.getCollection<T>(collectionName);

        const docToInsert = {
            ...document,
            created_at: document.created_at || new Date().toISOString(),
            updated_at: document.updated_at || new Date().toISOString(),
        } as OptionalId<T>;

        const result = await collection.insertOne(docToInsert as any);
        return {
            ...docToInsert,
            _id: result.insertedId,
            id: result.insertedId.toString(),
        } as T;
    }

    async insertMany<T extends Document>(
        collectionName: string,
        documents: OptionalId<T>[]
    ): Promise<T[]> {
        await ensureConnected();
        const collection = mongodb.getCollection<T>(collectionName);

        const docsToInsert = documents.map(doc => ({
            ...doc,
            created_at: doc.created_at || new Date().toISOString(),
            updated_at: doc.updated_at || new Date().toISOString(),
        }));

        const result = await collection.insertMany(docsToInsert as any);
        return docsToInsert.map((doc, index) => ({
            ...doc,
            _id: result.insertedIds[index],
            id: result.insertedIds[index].toString(),
        })) as T[];
    }

    async updateOne<T extends Document>(
        collectionName: string,
        filter: Filter<T>,
        update: UpdateFilter<T>
    ): Promise<boolean> {
        await ensureConnected();
        const collection = mongodb.getCollection<T>(collectionName);

        const updateDoc = {
            ...update,
            $set: {
                ...((update as any).$set || {}),
                updated_at: new Date().toISOString(),
            },
        };

        const result = await collection.updateOne(filter, updateDoc);
        return result.modifiedCount > 0;
    }

    async updateById<T extends Document>(
        collectionName: string,
        id: string,
        update: Partial<T>
    ): Promise<boolean> {
        await ensureConnected();
        const collection = mongodb.getCollection<T>(collectionName);

        // Handle both MongoDB ObjectIds and UUIDs
        let filter: any;
        if (isValidObjectId(id)) {
            filter = { _id: new ObjectId(id) };
        } else {
            // For UUIDs or other ID formats, search by id field
            filter = { id: id };
        }

        const result = await collection.updateOne(
            filter,
            {
                $set: {
                    ...update,
                    updated_at: new Date().toISOString(),
                } as any,
            }
        );

        return result.modifiedCount > 0;
    }

    async deleteOne<T extends Document>(
        collectionName: string,
        filter: Filter<T>
    ): Promise<boolean> {
        await ensureConnected();
        const collection = mongodb.getCollection<T>(collectionName);
        const result = await collection.deleteOne(filter);
        return result.deletedCount > 0;
    }

    async deleteById(collectionName: string, id: string): Promise<boolean> {
        await ensureConnected();
        const collection = mongodb.getCollection(collectionName);

        // Handle both MongoDB ObjectIds and UUIDs
        let filter: any;
        if (isValidObjectId(id)) {
            filter = { _id: new ObjectId(id) };
        } else {
            // For UUIDs or other ID formats, search by id field
            filter = { id: id };
        }

        const result = await collection.deleteOne(filter);
        return result.deletedCount > 0;
    }

    async count<T extends Document>(
        collectionName: string,
        filter: Filter<T> = {}
    ): Promise<number> {
        await ensureConnected();
        const collection = mongodb.getCollection<T>(collectionName);
        return await collection.countDocuments(filter);
    }

    async upsert<T extends Document>(
        collectionName: string,
        filter: Filter<T>,
        document: Partial<T>
    ): Promise<T> {
        await ensureConnected();
        const collection = mongodb.getCollection<T>(collectionName);

        const result = await collection.findOneAndUpdate(
            filter,
            {
                $set: {
                    ...document,
                    updated_at: new Date().toISOString(),
                } as any,
                $setOnInsert: {
                    created_at: new Date().toISOString(),
                } as any,
            },
            { upsert: true, returnDocument: 'after' }
        );

        return toAppFormat(result as any) as T;
    }
}

export const db = new DatabaseService();