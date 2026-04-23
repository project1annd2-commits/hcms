const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:5000');

export type Document = { id?: string } & Record<string, unknown>;
export type Filter<_T> = Record<string, unknown>;
export type UpdateFilter<_T> = Record<string, unknown>;
export type OptionalId<T> = T & { id?: string };

class DatabaseService {
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${API_URL}${endpoint}`;
        const token = localStorage.getItem('hcms_jwt_token');
        
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers,
            },
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.error('Authentication failed. Clearing token.');
                localStorage.removeItem('hcms_jwt_token');
                // Optional: window.location.href = '/login';
            }
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    async find<T extends Document>(
        collectionName: string,
        filter: Filter<T> = {},
        options: { sort?: Record<string, 1 | -1>; limit?: number; skip?: number } = {}
    ): Promise<T[]> {
        try {
            const queryParams = new URLSearchParams();
            
            if (Object.keys(filter).length > 0) {
                queryParams.set('filter', JSON.stringify(filter));
            }
            if (options.sort) {
                queryParams.set('sort', JSON.stringify(options.sort));
            }
            if (options.limit) {
                queryParams.set('limit', options.limit.toString());
            }
            if (options.skip) {
                queryParams.set('skip', options.skip.toString());
            }

            const endpoint = `/api/${collectionName}?${queryParams.toString()}`;
            const results = await this.request<T[]>(endpoint);
            
            return results;
        } catch (error) {
            console.error(`Error finding documents in ${collectionName}:`, error);
            return [];
        }
    }

    async findOne<T extends Document>(
        collectionName: string,
        filter: Filter<T>
    ): Promise<T | null> {
        const results = await this.find<T>(collectionName, filter, { limit: 1 });
        return results[0] || null;
    }

    async findById<T extends Document>(
        collectionName: string,
        id: string
    ): Promise<T | null> {
        try {
            return await this.request<T | null>(`/api/${collectionName}/${id}`);
        } catch (error) {
            console.error(`Error finding document by ID in ${collectionName}:`, error);
            return null;
        }
    }

    async insertOne<T extends Document>(
        collectionName: string,
        document: OptionalId<T>
    ): Promise<T> {
        return this.request<T>(`/api/${collectionName}`, {
            method: 'POST',
            body: JSON.stringify(document),
        });
    }

    async insertMany<T extends Document>(
        collectionName: string,
        documents: OptionalId<T>[]
    ): Promise<T[]> {
        return this.request<T[]>(`/api/${collectionName}/bulk`, {
            method: 'POST',
            body: JSON.stringify({ documents }),
        });
    }

    async updateById<T extends Document>(
        collectionName: string,
        id: string,
        update: Partial<T>
    ): Promise<boolean> {
        try {
            await this.request(`/api/${collectionName}/${id}`, {
                method: 'PUT',
                body: JSON.stringify(update),
            });
            return true;
        } catch (error) {
            console.error(`Error updating document ${id} in ${collectionName}:`, error);
            return false;
        }
    }

    async updateOne<T extends Document>(
        collectionName: string,
        filter: Filter<T>,
        update: Partial<T>
    ): Promise<boolean> {
        try {
            const doc = await this.findOne(collectionName, filter);
            if (!doc) return false;
            return await this.updateById(collectionName, doc.id!, update);
        } catch (error) {
            console.error(`Error updating document in ${collectionName}:`, error);
            return false;
        }
    }

    async deleteById(collectionName: string, id: string): Promise<boolean> {
        try {
            await this.request(`/api/${collectionName}/${id}`, {
                method: 'DELETE',
            });
            return true;
        } catch (error) {
            console.error(`Error deleting document ${id} from ${collectionName}:`, error);
            return false;
        }
    }

    async deleteMany<T extends Document>(
        collectionName: string,
        filter: Filter<T>
    ): Promise<boolean> {
        try {
            await this.request(`/api/${collectionName}`, {
                method: 'DELETE',
                body: JSON.stringify(filter),
            });
            return true;
        } catch (error) {
            console.error(`Error deleting multiple documents from ${collectionName}:`, error);
            return false;
        }
    }

    async count<T extends Document>(
        collectionName: string,
        filter: Filter<T> = {}
    ): Promise<number> {
        try {
            const queryParams = new URLSearchParams();
            if (Object.keys(filter).length > 0) {
                queryParams.set('filter', JSON.stringify(filter));
            }
            
            const result = await this.request<{ count: number }>(
                `/api/${collectionName}/count?${queryParams.toString()}`
            );
            return result.count;
        } catch (error) {
            console.error(`Error counting documents in ${collectionName}:`, error);
            return 0;
        }
    }

    subscribe<T extends Document>(
        collectionName: string,
        filter: Filter<T>,
        callback: (documents: T[]) => void,
        options: { sort?: Record<string, 1 | -1>; limit?: number } = {}
    ): () => void {
        let isActive = true;
        
        const poll = async () => {
            if (!isActive) return;
            try {
                const results = await this.find<T>(collectionName, filter, options);
                if (isActive) callback(results);
            } catch (error) {
                console.error(`Error in subscription for ${collectionName}:`, error);
            }
        };
        
        poll();
        const intervalId = setInterval(poll, 30000);
        
        return () => {
            isActive = false;
            clearInterval(intervalId);
        };
    }

    async logActivity(activity: {
        user_id: string;
        user_name: string;
        user_role: string;
        action: string;
        view?: string;
        description?: string;
        details?: string;
        school_id?: string;
    }): Promise<void> {
        try {
            await this.request('/api/activity_logs', {
                method: 'POST',
                body: JSON.stringify(activity),
            });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    async upsert<T extends Document>(
        collectionName: string,
        filter: Filter<T>,
        update: Partial<T>
    ): Promise<T> {
        const existing = await this.findOne<T>(collectionName, filter);
        if (existing) {
            await this.updateById(collectionName, (existing as any).id, update);
            return { ...existing, ...update } as T;
        } else {
            return await this.insertOne(collectionName, { ...filter, ...update } as OptionalId<T>);
        }
    }
}

export const db = new DatabaseService();
