import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, MessageCircle, Mail, Paperclip, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { messageApi } from '../../api/messageApi';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface ChatWindowProps {
    contextType: 'task' | 'ticket' | 'general';
    contextId: number;
    recipientId?: number; // Optional if context implies recipient
    title: string;
    onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ contextType, contextId, recipientId, title, onClose }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [channel, setChannel] = useState('internal');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, [contextId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const data = await messageApi.getMessages(contextType, contextId);
            setMessages(data);
        } catch (e) {
            console.error(e);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;
        setLoading(true);
        try {
            await messageApi.sendMessage({
                context_type: contextType,
                context_id: contextId,
                recipient_id: recipientId, // Can be null if generic task chat where everyone sees
                channel,
                content: newMessage
            });
            setNewMessage('');
            fetchMessages();
        } catch (e) {
            toast.error("Erreur envoi");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-lg shadow-lg border overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 dark:bg-slate-900/50 p-4 border-b flex justify-between items-center">
                <div>
                    <h3 className="font-bold">{title}</h3>
                    <div className="flex gap-2 text-xs mt-1">
                        <button onClick={() => setChannel('internal')} className={`px-2 py-0.5 rounded ${channel === 'internal' ? 'bg-primary text-white' : 'bg-gray-200'}`}>Interne</button>
                        <button onClick={() => setChannel('whatsapp')} className={`px-2 py-0.5 rounded ${channel === 'whatsapp' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>WhatsApp</button>
                        <button onClick={() => setChannel('email')} className={`px-2 py-0.5 rounded ${channel === 'email' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>Email</button>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-300"><X size={20}/></button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-900/50">
                {messages.map((msg) => {
                    const isMe = msg.sender_id; // Need current user ID logic here, implied for now or check generic
                    // Simplified display
                    return (
                        <div key={msg.id} className={`flex flex-col ${msg.channel === 'internal' ? 'items-start' : 'items-end'}`}> 
                            <div className={`max-w-[80%] rounded-lg p-3 ${msg.channel === 'internal' ? 'bg-white dark:bg-slate-800 border' : 'bg-blue-100'}`}>
                                <div className="text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">{msg.sender_name} <span className="font-normal opacity-70">via {msg.channel}</span></div>
                                <p className="text-sm">{msg.content}</p>
                                <div className="text-right text-[10px] text-gray-400 mt-1">{format(new Date(msg.created_at), 'dd/MM HH:mm')}</div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t bg-white dark:bg-slate-800 flex gap-2 items-center">
                <button className="text-gray-400 hover:text-gray-600 dark:text-gray-300"><Paperclip size={20}/></button>
                <input 
                    className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder={`Message (${channel})...`}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSend()}
                />
                <Button 
                    size="sm" 
                    className="rounded-full w-10 h-10 p-0 flex items-center justify-center"
                    onClick={handleSend}
                    disabled={loading}
                >
                    <Send size={18} />
                </Button>
            </div>
        </div>
    );
};

export default ChatWindow;
