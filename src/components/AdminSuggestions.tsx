import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { MessageSquare, Search, Check, Clock, Trash2 } from 'lucide-react';

export function AdminSuggestions() {
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { loadSuggestions(); }, []);

    const loadSuggestions = async () => {
        try {
            setLoading(true);
            const data = await db.find('suggestions', {});
            setSuggestions(data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } catch (error) {
            console.error('Error loading suggestions:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await db.update('suggestions', id, { status, updated_at: new Date().toISOString() });
            loadSuggestions();
        } catch (error) {
            console.error('Error updating suggestion:', error);
        }
    };

    const deleteSuggestion = async (id: string) => {
        if (!confirm('Delete this suggestion?')) return;
        try {
            await db.delete('suggestions', id);
            loadSuggestions();
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    const filtered = suggestions.filter(s =>
        (s.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.user_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="text-blue-600" size={28} />
                <h2 className="text-2xl font-bold text-gray-800">Employee Suggestions</h2>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm">{suggestions.length}</span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search suggestions..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(s => (
                        <div key={s.id} className="bg-white rounded-xl shadow-sm border p-5">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-semibold text-gray-800">{s.user_name || 'Anonymous'}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${s.status === 'reviewed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {s.status || 'pending'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600">{s.content}</p>
                                    <p className="text-xs text-gray-400 mt-2">{s.created_at ? new Date(s.created_at).toLocaleString() : ''}</p>
                                </div>
                                <div className="flex gap-2 ml-4">
                                    {s.status !== 'reviewed' && (
                                        <button onClick={() => updateStatus(s.id, 'reviewed')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Mark reviewed">
                                            <Check size={16} />
                                        </button>
                                    )}
                                    <button onClick={() => deleteSuggestion(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && <p className="text-center text-gray-500 py-8">No suggestions found</p>}
                </div>
            )}
        </div>
    );
}
