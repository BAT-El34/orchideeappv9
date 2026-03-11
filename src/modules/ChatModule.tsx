import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Clock, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: {
    full_name: string;
    role: string;
  };
}

export const ChatModule = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUserAndMessages();

    const channel = supabase
      .channel('chat_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        fetchNewMessage(payload.new.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchUserAndMessages = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setCurrentUser(userData);
      fetchMessages();
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, user:users(full_name, role)')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNewMessage = async (id: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*, user:users(full_name, role)')
      .eq('id', id)
      .single();
    
    if (data) {
      setMessages(prev => [...prev, data]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase
        .from('messages')
        .insert([{
          content,
          user_id: currentUser.id,
          entity_id: currentUser.entity_id
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Erreur lors de l\'envoi du message');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-neutral-50 rounded-sm border border-neutral-200 overflow-hidden max-w-4xl mx-auto shadow-sm">
      <header className="p-4 bg-white border-b border-neutral-200 flex items-center gap-3">
        <div className="p-2 bg-[#B45309]/10 text-[#B45309] rounded-full">
          <MessageSquare size={20} />
        </div>
        <div>
          <h2 className="font-bold text-neutral-900">Espace de Discussion Interne</h2>
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Partagez les infos essentielles</p>
        </div>
      </header>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/50"
      >
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral-400 text-sm italic">
            Chargement des messages...
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isOwn = msg.user_id === currentUser?.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase">{msg.user?.full_name}</span>
                      <span className="text-[8px] bg-neutral-200 text-neutral-600 px-1 rounded-sm uppercase font-bold">{msg.user?.role}</span>
                    </div>
                    <div className={`p-3 rounded-2xl shadow-sm text-sm ${
                      isOwn 
                        ? 'bg-[#B45309] text-white rounded-tr-none' 
                        : 'bg-white text-neutral-800 border border-neutral-100 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-[8px] text-neutral-400 mt-1 flex items-center gap-1">
                      <Clock size={8} />
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-neutral-300">
            <MessageSquare size={48} className="opacity-10 mb-4" />
            <p className="text-sm italic">Aucun message pour le moment. Soyez le premier à parler !</p>
          </div>
        )}
      </div>

      <form 
        onSubmit={handleSendMessage}
        className="p-4 bg-white border-t border-neutral-200 flex gap-2"
      >
        <input 
          type="text"
          placeholder="Écrivez votre message ici..."
          className="flex-1 bg-neutral-50 border border-neutral-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button 
          type="submit"
          disabled={!newMessage.trim()}
          className="p-2 bg-[#B45309] text-white rounded-full hover:bg-[#92400E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-[#B45309]/20"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};
