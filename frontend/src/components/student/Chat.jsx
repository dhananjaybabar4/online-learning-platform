// frontend/src/components/student/Chat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

const Chat = ({ user, onLogout }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.chat.sendMessage({
        userId: user?.id,
        message: input,
        history: messages
      });

      if (response.success) {
        const botMessage = {
          role: 'assistant',
          content: response.message,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header - same as Home.jsx */}
      <div className="bg-[#3e2f7f] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex flex-col leading-none">
              <div className="text-white font-extrabold text-[22px] tracking-wide">ATL</div>
              <div className="text-white text-[10px] font-medium tracking-[0.2em] opacity-85">ANYTIME LEARNING</div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              {['Dashboard', 'Lessons', 'Practice', 'Chat', 'Resources'].map(item => (
                <button
                  key={item}
                  onClick={() => navigate(item === 'Dashboard' ? '/dashboard' : '/' + item.toLowerCase())}
                  className={`text-white text-sm font-medium transition-colors ${item === 'Chat' ? 'border-b-2 border-white pb-1' : 'hover:text-gray-200'}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <button onClick={handleLogout} className="bg-white text-[#4d4398] px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 shadow-md">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Chat Box */}
      <div style={{ flex: 1, maxWidth: '720px', width: '100%', margin: '24px auto', backgroundColor: 'white', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>

        {/* Bot Header */}
        <div style={{ backgroundColor: '#3e2f7f', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>ATL Support Bot</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>Always here to help • English, Hindi, Marathi</div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '400px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '40px', fontSize: '14px' }}>
              Ask me anything about coding!
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                backgroundColor: msg.role === 'user' ? '#3e2f7f' : '#f0f0f0',
                color: msg.role === 'user' ? 'white' : '#222',
                fontSize: '14px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ backgroundColor: '#f0f0f0', padding: '10px 16px', borderRadius: '16px 16px 16px 4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[0, 150, 300].map(delay => (
                  <div key={delay} style={{
                    width: '7px', height: '7px', backgroundColor: '#999', borderRadius: '50%',
                    animation: 'bounce 1s infinite',
                    animationDelay: `${delay}ms`
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid #eee', padding: '14px 16px', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage(e)}
            placeholder="Type your message..."
            disabled={loading}
            style={{
              flex: 1, padding: '10px 14px', border: '1px solid #ddd', borderRadius: '8px',
              fontSize: '14px', outline: 'none', backgroundColor: loading ? '#fafafa' : 'white'
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            style={{
              backgroundColor: '#3e2f7f', color: 'white', border: 'none',
              padding: '10px 20px', borderRadius: '8px', cursor: 'pointer',
              fontWeight: '600', fontSize: '14px', opacity: (loading || !input.trim()) ? 0.5 : 1
            }}
          >
            Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
};

export default Chat;
