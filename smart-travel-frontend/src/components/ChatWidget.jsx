import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import './ChatWidget.css';

export default function ChatWidget() {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Fetch messages
  useEffect(() => {
    let interval;
    if (isOpen && token && user?.role !== 'admin') {
      fetchMessages();
      // Poll every 5 seconds for new replies
      interval = setInterval(fetchMessages, 5000);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [isOpen, token, user]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/chat`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch chat', error);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: inputText })
      });

      if (res.ok) {
        await fetchMessages();
        setInputText('');
      }
    } catch (error) {
      console.error('Send failed', error);
    } finally {
      setLoading(false);
    }
  };

  // Hide widget entirely if not logged in or if user is admin 
  // (Admin has a dedicated Inbox page instead)
  if (!user || !token || user.role === 'admin') return null;

  return (
    <div className="chat-widget-wrapper">
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>💬 Support Support</h3>
            <button className="chat-close-btn" onClick={() => setIsOpen(false)}>✖</button>
          </div>
          
          <div className="chat-body">
            {messages.length === 0 ? (
              <div className="chat-empty">
                <p>No messages yet.</p>
                <p>How can we help you today?</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg._id} className={`chat-message ${msg.senderRole === 'user' ? 'msg-user' : 'msg-admin'}`}>
                  {msg.text}
                  <span className="msg-time">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-footer chat-input-form" onSubmit={handleSend}>
            <input 
              type="text" 
              className="chat-input"
              placeholder="Type your message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="chat-send-btn" disabled={loading || !inputText.trim()}>
              ➤
            </button>
          </form>
        </div>
      )}

      {!isOpen && (
        <button className="chat-toggle-btn" onClick={() => setIsOpen(true)}>
          💬
        </button>
      )}
    </div>
  );
}
