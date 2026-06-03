import { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { db } from '../lib/services/db';

export function SuggestionBox() {
    const [suggestion, setSuggestion] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!suggestion.trim()) return;
        setSubmitting(true);
        try {
            const userId = JSON.parse(localStorage.getItem('currentUser') || '{}')?.user?.id;
            const userName = JSON.parse(localStorage.getItem('currentUser') || '{}')?.user?.full_name;
            await db.create('suggestions', {
                user_id: userId || 'anonymous',
                user_name: userName || 'Anonymous',
                content: suggestion.trim(),
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
            setSuggestion('');
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 3000);
        } catch (error) {
            console.error('Error submitting suggestion:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={18} className="text-blue-600" />
                <h3 className="font-semibold text-gray-800">Suggestion Box</h3>
            </div>
            {submitted ? (
                <div className="text-center py-4">
                    <p className="text-green-600 font-medium">✓ Thank you for your suggestion!</p>
                </div>
            ) : (
                <>
                    <textarea
                        value={suggestion}
                        onChange={e => setSuggestion(e.target.value)}
                        placeholder="Share your ideas or suggestions..."
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none h-24"
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={!suggestion.trim() || submitting}
                        className="mt-2 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        <Send size={14} /> {submitting ? 'Sending...' : 'Submit'}
                    </button>
                </>
            )}
        </div>
    );
}
