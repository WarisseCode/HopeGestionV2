// frontend/src/components/ChatBot.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2, Minus, MapPin, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mockProperties } from '../data/mockProperties';
import { playNotificationSound } from '../utils/sound';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'properties' | 'options' | 'contact_form';
  data?: any;
}


interface QuickSuggestion {
  label: string;
  value: string;
}

const QUICK_SUGGESTIONS: QuickSuggestion[] = [
  { label: '🏠 Voir les biens', value: 'Montre-moi les biens disponibles' },
  { label: '💰 Budget', value: 'Quel est le loyer moyen ?' },
  { label: '📞 Contact', value: 'Comment vous contacter ?' },
  { label: '📍 Localisation', value: 'Dans quels quartiers ?' },
];

const ChatBot: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);



  // 10. Message Proactif
  useEffect(() => {
    const timer = setTimeout(() => {
      // Si le chat n'est pas ouvert, qu'il n'y a pas eu d'interaction et que l'historique est vide (ou juste message d'accueil)
      if (!isOpen && !hasInteracted && messages.length <= 1) {
        setIsOpen(true);
        playSound();
      }
    }, 30000); // 30 secondes

    return () => clearTimeout(timer);
  }, [hasInteracted, isOpen, messages.length]);

  // 5. Historique Persistant
  useEffect(() => {
    const savedMessages = localStorage.getItem('chat_messages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        // Correct Date objects restoration
        const hydrated = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(hydrated);
      } catch (e) {
        initWelcomeMessage();
      }
    } else {
      initWelcomeMessage();
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chat_messages', JSON.stringify(messages));
      scrollToBottom();
    }
  }, [messages]);

  const initWelcomeMessage = () => {
    setMessages([
      {
        id: 1,
        text: "Bonjour ! 👋 Je suis Hope, votre assistant virtuel. Comment puis-je vous aider aujourd'hui ? Choisissez une option ou posez votre question.",
        sender: 'bot',
        timestamp: new Date(),
        type: 'options',
        data: QUICK_SUGGESTIONS
      }
    ]);
  };

  const playSound = () => {
    // 2. Son de notification
    playNotificationSound();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const findProperties = (keyword: string) => {
    const lower = keyword.toLowerCase();
    // Recherche basique dans les types et descriptions
    return mockProperties.filter(p => 
      p.type.toLowerCase().includes(lower) || 
      p.quartier.toLowerCase().includes(lower) || 
      p.ville.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower)
    ).slice(0, 5); // Limiter à 5 résultats
  };

  const getBotResponse = (userMessage: string): Message => {
    const message = userMessage.toLowerCase();
    const baseResponse: Partial<Message> = {
      sender: 'bot',
      timestamp: new Date(),
      id: Date.now(),
    };

    // 7. Recherche Contextuelle & 6. Lien vers les biens
    if (message.includes('appartement') || message.includes('maison') || message.includes('villa') || message.includes('studio') || message.includes('bien') || message.includes('chercher')) {
      let type = '';
      if (message.includes('appartement')) type = 'appartement';
      else if (message.includes('maison')) type = 'maison';
      else if (message.includes('villa')) type = 'villa';
      else if (message.includes('studio')) type = 'studio';
      else type = ''; // Recherche générale

      const results = type ? findProperties(type) : mockProperties.slice(0, 5);
      
      if (results.length > 0) {
        return {
          ...baseResponse,
          text: type ? `J'ai trouvé quelques ${type}s pour vous :` : "Voici nos derniers biens disponibles :",
          type: 'properties',
          data: results
        } as Message;
      }
    }

    if (message.includes('budget') || message.includes('prix') || message.includes('loyer') || message.includes('coût')) {
       return {
         ...baseResponse,
         text: "Quel est votre budget approximatif ?",
         type: 'options',
         data: [
           { label: '< 100.000 FCFA', value: 'Budget moins de 100000' },
           { label: '100k - 300k', value: 'Budget entre 100000 et 300000' },
           { label: '> 300.000 FCFA', value: 'Budget prestige' }
         ]
       } as Message;
    }

    // 9. Formulaire de contact
    if (message.includes('contact') || message.includes('joindre') || message.includes('téléphone') || message.includes('email') || message.includes('parler')) {
      return {
        ...baseResponse,
        text: "Vous pouvez remplir ce formulaire rapide, un agent vous rappellera dans les 15 minutes.",
        type: 'contact_form'
      } as Message;
    }

    // Logique Budget
    if (message.includes('moins de 100000')) {
       const results = mockProperties.filter(p => p.loyer < 100000).slice(0,5);
       return { ...baseResponse, text: "Voici nos meilleures offres à petit prix :", type: 'properties', data: results } as Message;
    }
    
    if (message.includes('entre 100000') || message.includes('300000')) {
        const results = mockProperties.filter(p => p.loyer >= 100000 && p.loyer <= 300000).slice(0,5);
        return { ...baseResponse, text: "Voici notre sélection moyenne gamme :", type: 'properties', data: results } as Message;
    }

    if (message.includes('prestige') || message.includes('plus de 300000')) {
        const results = mockProperties.filter(p => p.loyer > 300000).slice(0,5);
        return { ...baseResponse, text: "Découvrez nos biens de prestige :", type: 'properties', data: results } as Message;
    }

    // Réponses par défaut
    if (message.includes('bonjour') || message.includes('salut')) {
      return { ...baseResponse, text: "Bonjour ! 👋 Comment puis-je vous aider ?" } as Message;
    }
    
    if (message.includes('merci')) {
        return { ...baseResponse, text: "Je vous en prie ! N'hésitez pas si vous avez d'autres questions." } as Message;
    }

    return { 
      ...baseResponse, 
      text: "Je ne suis pas sûr de comprendre. Voici ce que je peux faire pour vous :",
      type: 'options', 
      data: QUICK_SUGGESTIONS 
    } as Message;
  };

  const handleSendMessage = (text: string = inputValue) => {
    if (!text.trim()) return;

    setHasInteracted(true);
    const userMessage: Message = {
      id: Date.now(),
      text: text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulation délai réseau
    setTimeout(() => {
      const response = getBotResponse(text);
      setMessages(prev => [...prev, { ...response, id: Date.now() + 1 }]);
      setIsTyping(false);
      playSound();
    }, 1000 + Math.random() * 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 8. Navigation Assistée
  const handleNavigate = (path: string) => {
    // Si on est sur mobile, on ferme
    if (window.innerWidth < 768) setIsOpen(false);
    navigate(path);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Bouton Flottant Uniquement si fermé ou minimisé */}
      {(!isOpen || isMinimized) && (
      <motion.button
        onClick={() => { 
            setIsOpen(true); 
            setIsMinimized(false);
            setHasInteracted(true); 
        }}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center bg-gradient-to-br from-primary to-secondary hover:scale-110 transition-all duration-300 group"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
      >
        <MessageCircle size={28} className="text-white" />
        {/* Badge Notification */}
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-error rounded-full flex items-center justify-center text-xs text-white font-bold animate-bounce shadow-sm border-2 border-base-100">
          1
        </span>
        
        {/* Tooltip */}
        <span className="absolute right-full mr-4 bg-base-300 text-base-content px-3 py-1 rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            Besoin d'aide ?
        </span>
      </motion.button>
      )}

      {/* Fenêtre de Chat */}
      <AnimatePresence>
        {(isOpen && !isMinimized) && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-base-100 rounded-2xl shadow-2xl border border-base-200 flex flex-col overflow-hidden font-sans ring-1 ring-black/5"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-secondary p-4 flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                  <Bot size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg leading-tight">Hope Assistant</h3>
                  <div className="flex items-center gap-1.5 opacity-90">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                    </span>
                    <span className="text-xs text-white font-medium">En ligne</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                 {/* 4. Minimize Button */}
                <button 
                  onClick={() => setIsMinimized(true)} 
                  className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
                  title="Réduire"
                >
                  <Minus size={20} />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
                  title="Fermer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-base-200/50 scroll-smooth">
                {/* Date separator (optional improvement, skip for now) */}
                
              {messages.map((message) => (
                <div key={message.id} className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}>
                  <div className={`flex items-end gap-2 max-w-[90%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-base-content/5 ${
                      message.sender === 'bot' ? 'bg-gradient-to-br from-primary to-secondary' : 'bg-base-100'
                    }`}>
                      {message.sender === 'bot' ? <Bot size={16} className="text-white" /> : <User size={16} className="text-base-content" />}
                    </div>
                    
                    {/* Bubble */}
                    <div className={`px-4 py-3 rounded-2xl shadow-sm relative group text-sm leading-relaxed ${
                      message.sender === 'user'
                        ? 'bg-primary text-primary-content rounded-br-none'
                        : 'bg-white text-gray-700 border border-gray-100 rounded-bl-none'
                    }`}>
                      <p className="whitespace-pre-line">{message.text}</p>
                      
                      {/* 3. Timestamps */}
                      <span className={`text-[10px] absolute -bottom-5 min-w-[40px] ${message.sender === 'user' ? 'right-0 text-right' : 'left-0 text-left'} text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity`}>
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Render Rich Content based on type */}
                  {message.sender === 'bot' && (
                    <div className="ml-10 mt-2 w-[85%] space-y-2">
                      {/* 6. Property Links (Mini Cards) */}
                      {message.type === 'properties' && message.data && (
                        <div className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent px-1">
                          {message.data.map((prop: any) => (
                            <div key={prop.id} className="min-w-[200px] w-[200px] bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 snap-center flex-shrink-0 hover:shadow-md transition-all cursor-pointer group"
                                 onClick={() => handleNavigate(`/biens`)}> 
                                 {/* Note: In real app, /biens/${prop.id} */}
                              <div className="h-28 bg-gray-200 relative overflow-hidden">
                                <img src={prop.image} alt={prop.titre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                                <span className="absolute bottom-2 right-2 bg-primary/90 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm shadow-sm">
                                  {prop.loyer.toLocaleString()} F
                                </span>
                              </div>
                              <div className="p-3">
                                <h4 className="font-bold text-xs truncate mb-1 text-gray-800" title={prop.titre}>{prop.titre}</h4>
                                <div className="flex items-center text-xs text-gray-500 mb-2">
                                  <MapPin size={10} className="mr-1 text-primary" />
                                  <span className="truncate">{prop.quartier}</span>
                                </div>
                                <button className="w-full py-1.5 bg-base-100 hover:bg-base-200 text-xs font-medium rounded text-base-content/70 transition-colors border border-base-200">
                                  Voir détails
                                </button>
                              </div>
                            </div>
                          ))}
                          <button 
                            onClick={() => handleNavigate('/biens')}
                            className="min-w-[100px] flex flex-col items-center justify-center bg-base-100 rounded-xl border-2 border-dashed border-base-300 text-base-content/60 hover:bg-base-200 hover:text-primary hover:border-primary/30 transition-all gap-2"
                          >
                             <div className="w-10 h-10 rounded-full bg-base-200 flex items-center justify-center">
                                <ExternalLink size={18} />
                             </div>
                             <span className="text-xs font-bold">Voir tout</span>
                          </button>
                        </div>
                      )}

                      {/* Options / Chips inside message */}
                      {(message.type === 'options' || (message.type === 'text' && !message.data)) && message.data && (
                        <div className="flex flex-wrap gap-2 animate-fadeIn">
                          {message.data.map((opt: QuickSuggestion, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => handleSendMessage(opt.value)}
                              className="px-4 py-2 bg-white hover:bg-primary hover:text-white text-primary rounded-full text-xs font-semibold transition-all shadow-sm border border-primary/10 hover:shadow-md hover:-translate-y-0.5"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* 9. Contact Form */}
                      {message.type === 'contact_form' && (
                         <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-full animate-fadeIn">
                           <div className="space-y-3">
                              <div>
                                <label className="text-xs font-medium text-gray-500 ml-1">Email</label>
                                <input type="email" placeholder="exemple@email.com" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-gray-50 transition-all" />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-500 ml-1">Téléphone</label>
                                <input type="tel" placeholder="+229 ..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-gray-50 transition-all" />
                              </div>
                              <button className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-bold hover:bg-primary-focus shadow-lg shadow-primary/20 transition-all active:scale-95">
                                Envoyer mes infos
                              </button>
                           </div>
                         </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex items-center gap-2 ml-1 animate-pulse">
                   <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm">
                     <Bot size={16} className="text-white" />
                   </div>
                   <div className="bg-base-200 px-4 py-3 rounded-2xl rounded-bl-none">
                     <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                     </div>
                   </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100 z-10">
               {/* 1. Suggestions rapides (au dessus de l'input) */}
              {messages.length > 0 && messages[messages.length - 1].sender === 'bot' && !messages[messages.length - 1].data && (
                <div className="flex gap-2 overflow-x-auto pb-3 mb-1 scrollbar-hide">
                  {QUICK_SUGGESTIONS.map((sugg, i) => (
                    <button 
                      key={i}
                      onClick={() => handleSendMessage(sugg.value)}
                      className="whitespace-nowrap px-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-full transition-colors flex items-center gap-1 font-medium"
                    >
                      {sugg.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2 relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Écrivez votre message..."
                  className="flex-1 px-4 py-3 bg-gray-50 border-transparent focus:bg-white border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/20 transition-all text-sm placeholder:text-gray-400"
                />
                <motion.button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isTyping}
                  className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send size={20} />
                </motion.button>
              </div>
              
              <div className="flex justify-center mt-3">
                 <p className="text-[10px] text-gray-300 flex items-center gap-1 font-medium">
                    ⚡ Propulsé par Hope AI
                 </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
