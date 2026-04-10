"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.DatabaseService = void 0;
const mongodb_1 = require("mongodb");
const mongodb_2 = require("../config/mongodb");
function toAppFormat(doc) {
    if (!doc)
        return null;
    const { _id, ...rest } = doc;
    return {
        ...rest,
        id: rest.id || _id?.toString(),
    };
}
function isValidObjectId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
}
/**
 * Generic MongoDB database service
 * Provides CRUD operations for all collections
 */
class DatabaseService {
    async find(collectionName, filter = {}, options = {}) {
        await (0, mongodb_2.ensureConnected)();
        const collection = mongodb_2.mongodb.getCollection(collectionName);
        let cursor = collection.find(filter);
        if (options.sort)
            cursor = cursor.sort(options.sort);
        if (options.skip)
            cursor = cursor.skip(options.skip);
        if (options.limit)
            cursor = cursor.limit(options.limit);
        const results = await cursor.toArray();
        return results.map(doc => toAppFormat(doc));
    }
    async findOne(collectionName, filter) {
        await (0, mongodb_2.ensureConnected)();
        const collection = mongodb_2.mongodb.getCollection(collectionName);
        const result = await collection.findOne(filter);
        return toAppFormat(result);
    }
    async findById(collectionName, id) {
        await (0, mongodb_2.ensureConnected)();
        const collection = mongodb_2.mongodb.getCollection(collectionName);
        // Handle both MongoDB ObjectIds and UUIDs
        let filter;
        if (isValidObjectId(id)) {
            filter = { _id: new mongodb_1.ObjectId(id) };
        }
        else {
            // For UUIDs or other ID formats, search by id field
            filter = { id: id };
        }
        const result = await collection.findOne(filter);
        return toAppFormat(result);
    }
    async insertOne(collectionName, document) {
        await (0, mongodb_2.ensureConnected)();
        const collection = mongodb_2.mongodb.getCollection(collectionName);
        const docToInsert = {
            ...document,
            created_at: document.created_at || new Date().toISOString(),
            updated_at: document.updated_at || new Date().toISOString(),
        };
        const result = await collection.insertOne(docToInsert);
        return {
            ...docToInsert,
            _id: result.insertedId,
            id: result.insertedId.toString(),
        };
    }
    async insertMany(collectionName, documents) {
        await (0, mongodb_2.ensureConnected)();
        const collection = mongodb_2.mongodb.getCollection(collectionName);
        const docsToInsert = documents.map(doc => ({
            ...doc,
            created_at: doc.created_at || new Date().toISOString(),
            updated_at: doc.updated_at || new Date().toISOString(),
        }));
        const result = await collection.insertMany(docsToInsert);
        return docsToInsert.map((doc, index) => ({
            ...doc,
            _id: result.insertedIds[index],
            id: result.insertedIds[index].toString(),
        }));
    }
    async updateOne(collectionName, filter, update) {
        await (0, mongodb_2.ensureConnected)();
        const collection = mongodb_2.mongodb.getCollection(collectionName);
        const updateDoc = {
            ...update,
            $set: {
                ...(update.$set || {}),
                updated_at: new Date().toISOString(),
            },
        };
        const result = await collection.updateOne(filter, updateDoc);
        return result.modifiedCount > 0;
    }
    async updateById(collectionName, id, update) {
        await (0, mongodb_2.ensureConnected)();
        const collection = mongodb_2.mongodb.getCollection(collectionName);
        // Handle both MongoDB ObjectIds and UUIDs
        let filter;
        if (isValidObjectId(id)) {
            filter = { _id: new mongodb_1.ObjectId(id) };
        }
        else {
            // For UUIDs or other ID formats, search by id field
            filter = { id: id };
        }
        const result = await collection.updateOne(filter, {
            $set: {
                ...update,
                updated_at: new Date().toISOString(),
            },
        });
        return result.modifiedCount > 0;
    }
    async deleteOne(collectionName, filter) {
        await (0, mongodb_2.ensureConnected)();
        const collection = mongodb_2.mongodb.getCollection(collectionName);
        const result = await collection.deleteOne(filter);
        return result.deletedCount > 0;
    }
    async deleteById(collectionName, id) {
        await (0, mongodb_2.ensureConnected)();
        const collection = mongodb_2.mongodb.getCollection(collectionName);
        // Handle both MongoDB ObjectIds and UUIDs
        let filter;
        if (isValidObjectId(id)) {
            filter = { _id: new mongodb_1.ObjectId(id) };
        }
        else {
            // For UUIDs or other ID formats, search by id field
            filter = { id: id };
        }
        const result = await collection.deleteOne(filter);
        return result.deletedCount > 0;
    }
    async count(collectionName, filter = {}) {
        await (0, mongodb_2.ensureConnected)();
        const collection = mongodb_2.mongodb.getCollection(collectionName);
        return await collection.countDocuments(filter);
    }
    async upsert(collectionName, filter, document) {
        await (0, mongodb_2.ensureConnected)();
        const collection = mongodb_2.mongodb.getCollection(collectionName);
        const result = await collection.findOneAndUpdate(filter, {
            $set: {
                ...document,
                updated_at: new Date().toISOString(),
            },
            $setOnInsert: {
                created_at: new Date().toISOString(),
            },
        }, { upsert: true, returnDocument: 'after' });
        return toAppFormat(result);
    }
}
exports.DatabaseService = DatabaseService;
exports.db = new DatabaseService();
