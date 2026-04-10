import { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, User } from 'lucide-react';
import { ChatMessage } from '../lib/models';
import { chatService } from '../lib/services/chat';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';

interface Props {
    sessionId: string;
    currentUserId: string;
    currentUserType: 'teacher' | 'employee';
    otherUserName: string;
    otherUserRole?: 'teacher' | 'employee';
    onClose: () => void;
    className?: string;
}

export default function ChatWindow({ sessionId, currentUserId, currentUserType, otherUserName, otherUserRole, onClose, className }: Props) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = db.subscribe<ChatMessage>(
            Collections.CHAT_MESSAGES,
            { session_id: sessionId },
            (data) => {
                const sorted = data.sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
                setMessages(sorted);
                setLoading(false);
                chatService.markAsRead(sessionId, currentUserType);
            }
        );

        return () => unsubscribe();
    }, [sessionId, currentUserType]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await chatService.sendMessage(sessionId, currentUserId, currentUserType, newMessage.trim());
            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    // When embedded (className provided), use that styling
    // Otherwise use fixed positioning for floating chat
    const isEmbedded = !!className;

    return (
        <div
            className={isEmbedded
                ? `${className} bg-white flex flex-col overflow-hidden`
                : "fixed bottom-4 right-4 w-80 md:w-96 h-[500px] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-50"
            }
        >
            {/* Header - Fixed at top */}
            <div
                className="bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-3 flex justify-between items-center flex-shrink-0"
                style={{ borderRadius: isEmbedded ? '0' : '0.5rem 0.5rem 0 0' }}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <User size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-base">{otherUserName}</h3>
                        <p className="text-xs text-green-100">
                            {otherUserRole === 'employee' ? 'Colleague' : (currentUserType === 'teacher' ? 'Coordinator' : 'Teacher')}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Messages - Scrollable middle section with WhatsApp-like background */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
                style={{
                    backgroundColor: '#e5ddd5',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23c9c0b6\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
                }}
            >
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center mb-4 shadow-sm">
                            <MessageSquare size={32} className="text-green-600 opacity-60" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">No messages yet</p>
                        <p className="text-xs text-gray-500 mt-1">Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_type === currentUserType;
                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm relative ${isMe
                                        ? 'bg-green-100 text-gray-800 rounded-tr-none'
                                        : 'bg-white text-gray-800 rounded-tl-none'
                                        }`}
                                    style={{
                                        wordBreak: 'break-word'
                                    }}
                                >
                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-green-700' : 'text-gray-400'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Input - Fixed at bottom, always visible */}
            <div
                className="flex-shrink-0 bg-gray-100 border-t border-gray-200"
                style={{ borderRadius: isEmbedded ? '0' : '0 0 0.5rem 0.5rem' }}
            >
                <form onSubmit={handleSend} className="p-3">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="w-10 h-10 flex items-center justify-center bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
