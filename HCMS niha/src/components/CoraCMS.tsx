import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Bot, Plus, Search, Edit, Trash2, X, Save } from 'lucide-react';

interface ContentItem {
    id?: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    status: 'published' | 'draft';
    created_at: string;
    updated_at: string;
}

export default function CoraCMS() {
    const [items, setItems] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
    const [formData, setFormData] = useState({ title: '', content: '', category: 'general', tags: '', status: 'draft' as const });

    useEffect(() => { loadItems(); }, []);

    const loadItems = async () => {
        try {
            setLoading(true);
            const data = await db.find<ContentItem>('cora_content', {});
            setItems(data.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const now = new Date().toISOString();
            const payload = { ...formData, tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean) };
            if (editingItem) {
                await db.update('cora_content', editingItem.id!, { ...payload, updated_at: now });
            } else {
                await db.create('cora_content', { ...payload, created_at: now, updated_at: now });
            }
            setShowForm(false);
            setEditingItem(null);
            setFormData({ title: '', content: '', category: 'general', tags: '', status: 'draft' });
            loadItems();
        } catch (error) {
            console.error('Error saving:', error);
        }
    };

    const handleEdit = (item: ContentItem) => {
        setEditingItem(item);
        setFormData({ title: item.title, content: item.content, category: item.category, tags: (item.tags || []).join(', '), status: item.status });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this content?')) return;
        await db.delete('cora_content', id);
        loadItems();
    };

    const filtered = items.filter(i => i.title.toLowerCase().includes(searchTerm.toLowerCase()) || i.content.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Bot className="text-blue-600" size={28} />
                    <h2 className="text-2xl font-bold text-gray-800">Cora CMS</h2>
                </div>
                <button onClick={() => { setShowForm(true); setEditingItem(null); setFormData({ title: '', content: '', category: 'general', tags: '', status: 'draft' }); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    <Plus size={18} /> Add Content
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search content..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between mb-4">
                            <h3 className="text-lg font-bold">{editingItem ? 'Edit' : 'Add'} Content</h3>
                            <button onClick={() => setShowForm(false)}><X size={20} /></button>
                        </div>
                        <div className="space-y-3">
                            <input placeholder="Title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                            <textarea placeholder="Content..." value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} className="w-full px-3 py-2 border rounded-lg h-40 resize-none" />
                            <div className="grid grid-cols-2 gap-3">
                                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="px-3 py-2 border rounded-lg">
                                    <option value="general">General</option>
                                    <option value="announcement">Announcement</option>
                                    <option value="guide">Guide</option>
                                    <option value="faq">FAQ</option>
                                </select>
                                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className="px-3 py-2 border rounded-lg">
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                </select>
                            </div>
                            <input placeholder="Tags (comma separated)" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                            <button onClick={handleSave} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"><Save size={16} /> Save</button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {filtered.map(item => (
                        <div key={item.id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="font-bold text-gray-800">{item.title}</h3>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${item.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{item.status}</span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-3 mb-3">{item.content}</p>
                            <div className="flex items-center justify-between">
                                <div className="flex gap-1">{(item.tags || []).map((t, i) => <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{t}</span>)}</div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleEdit(item)} className="p-1.5 hover:bg-gray-100 rounded"><Edit size={14} /></button>
                                    <button onClick={() => handleDelete(item.id!)} className="p-1.5 hover:bg-red-50 text-red-600 rounded"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && <p className="text-gray-500 col-span-full text-center py-8">No content found</p>}
                </div>
            )}
        </div>
    );
}
