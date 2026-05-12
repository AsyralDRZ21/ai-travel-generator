import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import './InboxPage.css';

export default function InboxPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [inboxList, setInboxList] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    // Check if we came from PublicProfilePage with a pre-selected user ID to chat with
    if (location.state?.startChatWith) {
      const targetUser = location.state.startChatWith;
      setActiveChatId(targetUser._id);
      setActiveChatUser(targetUser);
      fetchThread(targetUser._id);
    }
    
    fetchInbox();
    // eslint-disable-next-line
  }, [token, location.state]);

  useEffect(() => {
    // Auto-scroll to bottom of chat
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchInbox = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/dm/inbox/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setInboxList(data);
    } catch (err) {
      console.error('Failed to fetch inbox:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchThread = async (targetUserId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/dm/${targetUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(data);
        fetchInbox(); // Refresh unread count
      }
    } catch (err) {
      console.error('Failed to fetch thread:', err);
    }
  };

  const selectChat = (targetUser) => {
    setActiveChatId(targetUser._id);
    setActiveChatUser(targetUser);
    fetchThread(targetUser._id);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId) return;
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/dm/${activeChatId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: newMessage })
      });
      if (res.ok) {
        const sentMsg = await res.json();
        setMessages([...messages, sentMsg]);
        setNewMessage('');
        fetchInbox(); // Update side panel latest message
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <div className="inbox-container page-transition">
      <Navbar />
      
      <div className="inbox-layout">
        <div className="inbox-sidebar">
          <div className="sidebar-header">
            <h2>💬 Direct Messages</h2>
          </div>
          
          <div className="sidebar-list">
            {loading ? (
               <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Loading...</div>
            ) : inboxList.length === 0 ? (
               <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No messages yet.</div>
            ) : (
              inboxList.map(thread => (
                <div 
                  key={thread._id._id} 
                  className={`inbox-item ${activeChatId === thread._id._id ? 'active' : ''}`}
                  onClick={() => selectChat(thread._id)}
                >
                  <div className="inbox-avatar">
                   {thread._id.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="inbox-info">
                    <div className="inbox-name-row">
                      <span className="inbox-name">{thread._id.fullName}</span>
                      {thread.unreadCount > 0 && <span className="unread-badge">{thread.unreadCount}</span>}
                    </div>
                    <div className="inbox-preview">{thread.latestMessage}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="inbox-chatBox">
          {activeChatUser ? (
            <>
              <div className="chat-header">
                <Link to={`/user/${activeChatUser._id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
                  <div className="chat-avatar">{activeChatUser.fullName.charAt(0).toUpperCase()}</div>
                  <strong style={{ fontSize: '1.2rem' }}>{activeChatUser.fullName}</strong>
                </Link>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tap name to view profile</div>
              </div>
              
              <div className="chat-history">
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
                    Say hello to {activeChatUser.fullName}! 👋
                  </div>
                )}
                {messages.map(msg => {
                  const isMine = msg.sender._id === user.id;
                  return (
                    <div key={msg._id} className={`msg-bubble-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                      {!isMine && <div className="msg-bubble-avatar">{msg.sender.fullName.charAt(0).toUpperCase()}</div>}
                      <div className={`msg-bubble ${isMine ? 'my-msg' : 'their-msg'}`}>
                        {msg.text}
                        <div className="msg-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              
              <form className="chat-composer" onSubmit={handleSendMessage}>
                <input 
                  type="text" 
                  placeholder={`Message ${activeChatUser.fullName}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button type="submit" disabled={!newMessage.trim()}>Send</button>
              </form>
            </>
          ) : (
            <div className="empty-chat-state">
              <div style={{ fontSize: '4rem', opacity: 0.5, marginBottom: 16 }}>✉️</div>
              <h2>Your Messages</h2>
              <p style={{ color: 'var(--text-muted)' }}>Select a conversation from the left to start chatting.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
