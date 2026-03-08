
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Post, Comment, ChatMessage, CmsContent } from '../types';
import { socialService, storageService, authService, messageService, notificationService, cmsService } from '../services/supabaseService';
import { getNyxResponse } from '../services/nyxService';
import { 
  Home, Heart, MessageCircle, X, Loader2, Send, ShieldCheck, Zap, Camera, Image as ImageIcon, Users, BrainCircuit, ShoppingBag, MessageSquare, RefreshCw, Wifi
} from 'lucide-react';

interface SocialHubProps {
  user: User;
  onNavigate: (view: any) => void;
  onPostShared: () => void;
}

interface NyxMessage {
  role: 'user' | 'nyx';
  content: string;
}

// Helper to determine if a user is "online"
const isUserOnline = (u: User) => {
    if (u.is_online !== undefined) return u.is_online;
    if (!u.last_active) return false;
    const diff = Date.now() - new Date(u.last_active).getTime();
    return diff < 15 * 60 * 1000;
}

const PostItem: React.FC<{ 
    post: Post, 
    user: User, 
    activeComments: Record<string, string>, 
    setActiveComments: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    handleComment: (postId: string) => Promise<void>,
    loadPosts: (showLoader?: boolean) => Promise<void>
}> = ({ post, user, activeComments, setActiveComments, handleComment, loadPosts }) => {
    const userLiked = post.likes?.some(l => l.user_id === user.id);
    const handleLike = async () => {
        if (userLiked) await socialService.unlikePost(user.id, post.id);
        else await socialService.likePost(user.id, post.id);
        // Refresh manually since auto-refresh is disabled
        await loadPosts(false);
    };
    const authorName = post.author ? `${post.author.first_name} ${post.author.last_name}` : 'Unknown Member';
    const authorRegion = post.author?.region || 'GEN';
    const authorAvatar = post.author?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}`;

    return (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden animate-fade-in group">
            <div className="p-8 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-4">
                    <img src={authorAvatar} className="w-14 h-14 rounded-full border-4 border-slate-50 shadow-md object-cover" />
                    <div>
                        <p className="font-black text-sm uppercase text-[#003366] tracking-tight">{authorName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[8px] text-amber-600 font-black uppercase tracking-widest">{authorRegion} MEMBER TRANSMISSION</span>
                          <span className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">• {new Date(post.created_at).toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              {post.image_url && (
                  <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white group-hover:scale-[1.01] transition-transform duration-500">
                      <img src={post.image_url} className="w-full h-auto max-h-[600px] object-cover" />
                  </div>
              )}
            </div>
            <>
                <div className="p-6 px-8 flex gap-10 text-slate-500 border-t border-slate-50 bg-slate-50/20">
                    <button onClick={handleLike} className={`flex items-center gap-2.5 text-[10px] font-black uppercase transition-all ${userLiked ? 'text-red-500 scale-110' : 'hover:text-red-400'}`}>
                        <Heart size={24} fill={userLiked ? 'currentColor' : 'none'} strokeWidth={2.5} /> {post.likes?.length || 0}
                    </button>
                    <button className="flex items-center gap-2.5 text-[10px] font-black uppercase hover:text-[#003366] transition-colors"><MessageCircle size={24} strokeWidth={2.5} /> {post.comments?.length || 0}</button>
                </div>
                <div className="p-8 space-y-6 border-t border-slate-50 bg-slate-50/10">
                    <div className="space-y-4">
                      {post.comments?.map(c => (
                          <div key={c.id} className="flex gap-4 animate-fade-in">
                              <img src={c.author?.avatar_url || `https://ui-avatars.com/api/?name=${c.author?.first_name}`} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
                              <div className="bg-slate-100 p-4 rounded-3xl flex-grow">
                                  <p className="text-[10px] font-black text-[#003366] uppercase mb-1">{c.author ? `${c.author.first_name} ${c.author.last_name}` : 'Unknown'}</p>
                                  <p className="text-[11px] text-slate-700 leading-relaxed font-medium">{c.content}</p>
                              </div>
                          </div>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-2">
                        <input 
                            value={activeComments[post.id] || ''}
                            onChange={e => setActiveComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyPress={e => { if (e.key === 'Enter') handleComment(post.id); }}
                            placeholder="Add your verified comment..." 
                            className="flex-grow bg-white border border-slate-200 rounded-full px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#003366]/20 transition-all" 
                        />
                        <button onClick={() => handleComment(post.id)} className="bg-[#003366] text-white p-4 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"><Send size={18}/></button>
                    </div>
                </div>
            </>
        </div>
    );
};

const SocialHub: React.FC<SocialHubProps> = ({ user, onNavigate, onPostShared }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'feed' | 'messages'>('feed');
    
    // Admin Info
    const [adminId, setAdminId] = useState<string>('');
    
    // Posting State
    const [postText, setPostText] = useState('');
    const [postImageUrl, setPostImageUrl] = useState('');
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isCreatingPost, setIsCreatingPost] = useState(false);

    // Comment State
    const [activeComments, setActiveComments] = useState<Record<string, string>>({});

    // Chat State
    const [exclusiveMembers, setExclusiveMembers] = useState<User[]>([]);
    const [selectedChatUser, setSelectedChatUser] = useState<{ id: string, name: string, avatar: string } | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // NYX State
    const [isNyxModalOpen, setIsNyxModalOpen] = useState(false);
    const [nyxConversation, setNyxConversation] = useState<NyxMessage[]>([
        { role: 'nyx', content: 'WELCOME TO AI nyx. How may I assist you with the Blessed Doctrine?' }
    ]);
    const [nyxInput, setNyxInput] = useState('');
    const [isNyxThinking, setIsNyxThinking] = useState(false);
    const nyxChatEndRef = useRef<HTMLDivElement>(null);
    
    // CMS State
    const [cms, setCms] = useState<CmsContent | null>(null);

    useEffect(() => {
        cmsService.getContent().then(setCms);
    }, []);

    const loadPosts = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) setLoading(true);
            const feed = await socialService.getFeedPosts();
            setPosts(feed);
        } catch (e) { 
            console.error("Feed Sync Fault:", e); 
        } finally {
            if (showLoader) setLoading(false);
        }
    }, []);

    const loadUsers = useCallback(async () => {
        try {
            const [onlineUsers, adminProfile] = await Promise.all([
                authService.getOnlineUsers().catch(() => []),
                authService.getAdminProfile().catch(() => null)
            ]);
            
            // Filter: All users can see everyone else who is online
            let others = onlineUsers.filter(u => 
                String(u.id) !== String(user.id)
            );
            
            setExclusiveMembers(others);
            if (adminProfile) setAdminId((adminProfile as any).id);
        } catch (e) { console.error("User Sync Fault:", e); }
    }, [user.id]);

    const loadData = useCallback(async () => {
        await Promise.all([loadPosts(), loadUsers()]);
    }, [loadPosts, loadUsers]);

    const loadChatMessages = useCallback(async (targetUser: { id: string, name: string, avatar: string } | null) => {
      if (!targetUser) {
        setChatMessages([]);
        return;
      }
      try {
        const messages = await messageService.getMessages(user.id, targetUser.id);
        setChatMessages(messages);
        
        // Mark notifications as read for this conversation
        const notifs = await notificationService.getNotifications(user.id);
        const unreadFromThisUser = notifs.filter(n => !n.is_read && (n.message.includes(targetUser.name) || n.title.includes('GLOBAL BROADCAST')));
        for (const n of unreadFromThisUser) {
            await notificationService.markAsRead(n.id);
        }
      } catch (e) { console.error("Chat sync error:", e); }
    }, [user.id]);

    useEffect(() => {
        loadData();
        
        // OPTIMIZATION: Removed Realtime Feed Subscription to save quota.
        // Users will now use "Refresh Feed" or pull-to-refresh to see new posts.
        // This prevents the "6 Million Realtime Messages" issue.
        
        // Only subscribe to personal notifications/messages if absolutely necessary
        const unsubMessages = messageService.subscribe(() => {
          if (selectedChatUser) loadChatMessages(selectedChatUser);
        });
        
        const unsubProfiles = authService.subscribe(() => {
            loadUsers();
        });

        return () => { 
            unsubMessages(); 
            unsubProfiles();
        };
    }, [loadData, loadChatMessages, selectedChatUser, loadUsers]);

    useEffect(() => {
      if (activeView === 'messages' && selectedChatUser) {
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    }, [chatMessages, activeView, selectedChatUser]);

    useEffect(() => {
        if (isNyxModalOpen) {
          setTimeout(() => nyxChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    }, [nyxConversation, isNyxModalOpen]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        setIsUploadingImage(true);
        try {
            const url = await storageService.uploadImage(e.target.files[0], cms?.storageBucketName);
            setPostImageUrl(url);
        } catch (e) { 
          alert("Photo Upload Error: Registry storage full or link broken."); 
        } finally { 
          setIsUploadingImage(false); 
        }
    };

    const handleCreatePost = async () => {
        if (!postText.trim() && !postImageUrl) return;
        setIsCreatingPost(true);
        
        try {
            await socialService.createPost({ user_id: user.id, content: postText, image_url: postImageUrl || null });
            setPostText('');
            setPostImageUrl('');
            // DELAY: Wait 1s for DB propagation before reloading to ensure post appears
            await new Promise(resolve => setTimeout(resolve, 1000));
            await loadPosts();
        } catch (e) { 
            console.error(e);
            alert("Broadcast failed: Member signal lost."); 
        }
        finally { 
            setIsCreatingPost(false); 
        }
    };

    const handleComment = async (postId: string) => {
        const text = activeComments[postId];
        if (!text?.trim()) return;

        setActiveComments(prev => ({ ...prev, [postId]: '' }));

        try {
            await socialService.createComment({ user_id: user.id, post_id: postId, content: text });
            // Refresh manually since auto-refresh is disabled
            await loadPosts(false);
        } catch (e) {
            alert("Transmission error. Your comment could not be sent.");
        }
    };
    
    const handleSendMessage = async () => {
      if (!chatInput.trim() || !selectedChatUser || isSending) return;

      setIsSending(true);
      
      try {
        await messageService.sendMessage({
          senderId: user.id,
          senderName: `${user.first_name} ${user.last_name}`,
          receiverId: selectedChatUser.id,
          text: chatInput
        });
        setChatInput('');
        await loadChatMessages(selectedChatUser);
      } catch (e) {
        alert("Message transmission failed.");
      } finally {
        setIsSending(false);
      }
    };

    const handleSendNyxMessage = async () => {
        if (!nyxInput.trim() || isNyxThinking) return;
        const userMessage: NyxMessage = { role: 'user', content: nyxInput };
        setNyxConversation(prev => [...prev, userMessage]);
        setNyxInput('');
        setIsNyxThinking(true);

        try {
            await new Promise(res => setTimeout(res, 800)); // Simulate thinking
            const response = getNyxResponse(userMessage.content);
            const nyxMessage: NyxMessage = { role: 'nyx', content: response };
            setNyxConversation(prev => [...prev, nyxMessage]);
        } catch (e) {
            const errorMessage: NyxMessage = { role: 'nyx', content: 'Neural Link Error: Transmission interrupted.' };
            setNyxConversation(prev => [...prev, errorMessage]);
        } finally {
            setIsNyxThinking(false);
        }
    };

    const handleSelectChatUser = (targetUser: { id: string, name: string, avatar: string }) => {
      setSelectedChatUser(targetUser);
      loadChatMessages(targetUser);
      setActiveView('messages');
    };

    return (
      <>
        <div className="min-h-screen bg-[#F0F2F5] pb-32 pt-12">
            <div className="max-w-[1400px] mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* LEFT COLUMN: NAVIGATION */}
                    <div className="lg:col-span-3 hidden lg:block">
                        <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 p-8 sticky top-28 space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-4 mb-4">Command Channels</h4>
                            <button onClick={() => user.is_exclusive ? setActiveView('feed') : alert("Exclusive Membership Required")} className={`w-full flex items-center gap-4 p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'feed' ? 'bg-[#003366] text-white shadow-xl scale-105' : 'text-slate-600 hover:bg-slate-50'}`}><Home size={20}/> Member Feed</button>
                            <button onClick={() => user.is_exclusive ? setActiveView('messages') : alert("Exclusive Membership Required")} className={`w-full flex items-center gap-4 p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'messages' ? 'bg-[#003366] text-white shadow-xl scale-105' : 'text-slate-600 hover:bg-slate-50'}`}><MessageCircle size={20}/> Messages</button>
                            <button onClick={() => onNavigate({ view: 'portal', tab: 'marketplace' })} className="w-full flex items-center gap-4 p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"><ShoppingBag size={20}/> Marketplace</button>
                            <button onClick={() => setIsNyxModalOpen(true)} className="w-full flex items-center gap-4 p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"><Zap size={20}/> AI nyx</button>
                        </div>
                    </div>

                    {/* MIDDLE COLUMN: CONTENT */}
                    <div className="lg:col-span-6 space-y-8">
                        {activeView === 'feed' && (
                            <>
                                <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-slate-100 space-y-8">
                                    <div className="flex gap-6">
                                        <img src={user.avatar_url} className="w-16 h-16 rounded-full border-4 border-slate-50 shadow-md object-cover" />
                                        <div className="flex-grow space-y-6">
                                            {user.is_exclusive ? (
                                                <>
                                                    <textarea 
                                                        value={postText}
                                                        onChange={e => setPostText(e.target.value)}
                                                        placeholder={`Transmit a status update to the community, ${user.first_name}...`} 
                                                        className="w-full bg-slate-50 border-none rounded-[2rem] p-8 text-sm font-bold outline-none focus:ring-2 focus:ring-[#003366]/10 min-h-[150px] resize-none" 
                                                    />
                                                    {postImageUrl && (
                                                        <div className="relative w-full aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white group">
                                                            <img src={postImageUrl} className="w-full h-full object-cover" />
                                                            <button onClick={() => setPostImageUrl('')} className="absolute top-4 right-4 p-3 bg-black/60 text-white rounded-full hover:bg-red-500 transition-colors"><X size={20}/></button>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center border-t border-slate-100 pt-6">
                                                        <div className="flex gap-4">
                                                            <label className="px-6 py-4 bg-slate-50 text-[#003366] rounded-2xl cursor-pointer hover:bg-slate-100 transition-all flex items-center gap-3 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                                                {isUploadingImage ? <Loader2 className="animate-spin" size={18}/> : <><Camera size={18}/> Add Photo</>}
                                                                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                                            </label>
                                                        </div>
                                                        <button onClick={handleCreatePost} disabled={isCreatingPost || (!postText.trim() && !postImageUrl)} className="bg-[#003366] text-white px-12 py-5 rounded-2xl font-black text-[11px] uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50">
                                                            {isCreatingPost ? <Loader2 className="animate-spin" /> : <><Send size={18}/> Transmit Status</>}
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="h-full flex flex-col justify-center items-center bg-slate-50 rounded-[2rem] p-8 text-center border-2 border-dashed border-slate-200">
                                                    <ShieldCheck className="text-amber-500 mb-4" size={48} />
                                                    <h3 className="text-lg font-black text-[#003366] uppercase tracking-tighter mb-2">Exclusive Access Required</h3>
                                                    <p className="text-xs text-slate-500 font-bold mb-6">You must upgrade to an Exclusive Member to transmit status updates to the community feed.</p>
                                                    <button onClick={() => onNavigate({ view: 'portal', tab: 'upgrade' })} className="bg-amber-500 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-colors">Upgrade Now</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* MANUAL FEED REFRESH */}
                                    <div className="flex justify-end">
                                        <button onClick={() => loadPosts()} className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-[#003366] uppercase tracking-widest transition-colors">
                                            {loading ? <Loader2 className="animate-spin" size={12}/> : <RefreshCw size={12}/>} Refresh Feed
                                        </button>
                                    </div>
                                </div>
                                {loading && posts.length === 0 ? (
                                    <div className="py-32 flex flex-col items-center justify-center gap-6">
                                        <Loader2 className="animate-spin text-[#003366]" size={64}/>
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Scanning Communication Channels...</p>
                                    </div>
                                ) : posts.length === 0 ? (
                                    <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-300">
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No Transmissions Yet</p>
                                        <button onClick={() => loadPosts()} className="mt-4 text-[#003366] font-bold text-xs hover:underline">Check again</button>
                                    </div>
                                ) : posts.map(p => (
                                    <PostItem 
                                        key={p.id} 
                                        post={p} 
                                        user={user} 
                                        activeComments={activeComments} 
                                        setActiveComments={setActiveComments} 
                                        handleComment={handleComment} 
                                        loadPosts={loadPosts} 
                                    />
                                ))}
                            </>
                        )}
                        {activeView === 'messages' && (
                           <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 h-[80vh] flex overflow-hidden">
                               {!user.is_exclusive ? (
                                   <div className="w-full h-full flex flex-col justify-center items-center bg-slate-50 p-12 text-center">
                                       <ShieldCheck className="text-amber-500 mb-6" size={64} />
                                       <h3 className="text-2xl font-black text-[#003366] uppercase tracking-tighter mb-4">Secure Messaging Locked</h3>
                                       <p className="text-sm text-slate-500 font-bold mb-8 max-w-md">Direct member-to-member messaging is a premium feature reserved for Exclusive Members to ensure network integrity.</p>
                                       <button onClick={() => onNavigate({ view: 'portal', tab: 'upgrade' })} className="bg-amber-500 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-colors shadow-lg">Upgrade to Exclusive</button>
                                   </div>
                               ) : (
                                   <>
                                       <div className="w-1/3 border-r bg-slate-50/50 flex flex-col">
                                           <div className="p-6 border-b flex justify-between items-center">
                                               <h4 className="text-sm font-black text-slate-500 tracking-widest">Member Directory</h4>
                                               <button onClick={loadUsers} className="text-slate-400 hover:text-[#003366]"><RefreshCw size={14}/></button>
                                           </div>
                                           <div className="overflow-y-auto flex-grow custom-scrollbar">
                                               {/* Dynamic Admin Button */}
                                               {adminId && (
                                                   <button onClick={() => handleSelectChatUser({ id: adminId, name: 'HQ Command', avatar: '' })} className={`w-full text-left p-6 border-b flex items-center gap-4 hover:bg-slate-100 ${selectedChatUser?.id === adminId ? 'bg-blue-50' : ''}`}>
                                                       <div className="w-12 h-12 rounded-full bg-[#003366] flex items-center justify-center text-white font-black flex-shrink-0"><ShieldCheck size={24}/></div>
                                                       <div className="overflow-hidden"><p className="font-black text-sm text-[#003366] truncate">HQ Command</p><p className="text-[9px] text-slate-400 truncate">ADMIN SUPPORT</p></div>
                                                   </button>
                                               )}
                                               {exclusiveMembers.length === 0 ? (
                                                   <p className="p-6 text-[10px] text-slate-400 font-bold text-center">No other exclusive members found.</p>
                                               ) : (
                                                   exclusiveMembers.map(m => (
                                                       <button key={m.id} onClick={() => handleSelectChatUser({ id: m.id, name: `${m.first_name} ${m.last_name}`, avatar: m.avatar_url || '' })} className={`w-full text-left p-6 border-b flex items-center gap-4 hover:bg-slate-100 ${selectedChatUser?.id === m.id ? 'bg-blue-50' : ''}`}>
                                                           <img src={m.avatar_url || `https://ui-avatars.com/api/?name=${m.first_name}`} className="w-12 h-12 rounded-full object-cover bg-slate-200 flex-shrink-0" />
                                                           <div className="overflow-hidden"><p className="font-bold text-xs text-slate-800 truncate">{m.first_name} {m.last_name}</p><p className="text-[9px] text-slate-400 uppercase truncate">{m.region} MEMBER</p></div>
                                                       </button>
                                                   ))
                                               )}
                                           </div>
                                       </div>
                                       <div className="w-2/3 flex flex-col">
                                           {selectedChatUser ? (
                                             <>
                                               <div className="p-6 border-b flex items-center gap-4 bg-white">
                                                  {selectedChatUser.id === adminId ? <div className="w-10 h-10 rounded-full bg-[#003366] flex items-center justify-center text-white"><ShieldCheck size={20}/></div> : <img src={selectedChatUser.avatar} className="w-10 h-10 rounded-full object-cover bg-slate-200"/>}
                                                  <p className="font-black text-slate-800">{selectedChatUser.name}</p>
                                               </div>
                                               <div className="flex-grow p-8 space-y-4 overflow-y-auto bg-slate-50 custom-scrollbar">
                                                  {chatMessages.length === 0 && <p className="text-center text-slate-400 text-xs font-bold py-10">Start a secure transmission...</p>}
                                                  {chatMessages.map(msg => (
                                                      <div key={msg.id} className={`flex items-end gap-3 ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                                                          <div className={`max-w-md p-4 rounded-3xl shadow-sm ${msg.senderId === user.id ? 'bg-[#003366] text-white' : 'bg-white text-slate-800'} ${msg.isBroadcast ? 'border-2 border-amber-400' : ''}`}>
                                                              {msg.isBroadcast && <p className="text-[8px] font-black uppercase text-amber-500 mb-1 tracking-widest">Global Broadcast</p>}
                                                              <p className="text-sm font-medium">{msg.text}</p>
                                                          </div>
                                                      </div>
                                                  ))}
                                                  <div ref={chatEndRef}></div>
                                               </div>
                                               <div className="p-6 border-t flex gap-4 bg-white">
                                                   <input 
                                                      value={chatInput} 
                                                      onChange={e => setChatInput(e.target.value)} 
                                                      onKeyPress={e => e.key === 'Enter' && handleSendMessage()} 
                                                      placeholder="Transmit message..." 
                                                      className="flex-grow p-4 bg-slate-100 border rounded-2xl text-sm font-bold" 
                                                   />
                                                   <button 
                                                      onClick={handleSendMessage} 
                                                      disabled={isSending} 
                                                      className="bg-[#003366] text-white p-4 rounded-2xl shadow-lg disabled:opacity-50"
                                                   >
                                                      <Send/>
                                                   </button>
                                               </div>
                                             </>
                                           ) : (<div className="flex-grow flex items-center justify-center"><p className="text-slate-400 font-bold text-sm uppercase">Select a Member to Transmit</p></div>)}
                                       </div>
                                   </>
                               )}
                           </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: ONLINE EXCLUSIVE MEMBERS */}
                    <div className="lg:col-span-3 hidden lg:block">
                        <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 p-8 sticky top-28 h-[calc(100vh-140px)] flex flex-col">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-4 mb-4 flex items-center justify-between">
                                <span>Online Members</span>
                                <span className="flex items-center gap-1 text-[#003366]"><Wifi size={10}/> {exclusiveMembers.length}</span>
                            </h4>
                            <div className="overflow-y-auto flex-grow space-y-4 pr-2 custom-scrollbar">
                                {exclusiveMembers.length === 0 && (
                                    <p className="text-center text-[9px] text-slate-400 font-bold uppercase py-4">No active members detected</p>
                                )}
                                {exclusiveMembers.map(m => {
                                    const isOnline = isUserOnline(m);
                                    return (
                                    <button 
                                        key={m.id} 
                                        onClick={() => handleSelectChatUser({ id: m.id, name: `${m.first_name} ${m.last_name}`, avatar: m.avatar_url || '' })}
                                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors group text-left"
                                    >
                                        <div className="relative">
                                            <img src={m.avatar_url || `https://ui-avatars.com/api/?name=${m.first_name}`} className="w-10 h-10 rounded-full object-cover border-2 border-slate-100 group-hover:border-[#003366] transition-colors" />
                                            {isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-black text-[#003366] truncate">{m.first_name} {m.last_name}</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide truncate">{m.region}</p>
                                        </div>
                                        <MessageSquare size={14} className="ml-auto text-slate-300 group-hover:text-[#003366] transition-colors" />
                                    </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {isNyxModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in">
                <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl border border-white/10 flex flex-col overflow-hidden h-[80vh]">
                    <div className="p-8 border-b flex justify-between items-center bg-slate-50 flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-patriot-navy rounded-2xl flex items-center justify-center text-amber-400"><BrainCircuit size={24}/></div>
                            <div>
                                <h3 className="font-serif font-black text-patriot-navy text-2xl uppercase tracking-tighter">AI nyx</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Official Knowledge Base (Books 1 & 2)</p>
                            </div>
                        </div>
                        <button onClick={() => setIsNyxModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
                    </div>
                    <div className="flex-grow flex flex-col bg-slate-100 overflow-hidden">
                        <div className="flex-grow p-8 space-y-4 overflow-y-auto">
                            {nyxConversation.map((msg, index) => (
                                <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.role === 'nyx' && <div className="w-8 h-8 bg-patriot-navy text-amber-400 rounded-full flex items-center justify-center flex-shrink-0"><BrainCircuit size={16}/></div>}
                                    <div className={`max-w-xl p-4 rounded-3xl ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-slate-800'}`}>
                                        <p className="text-sm font-medium whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                    {msg.role === 'user' && <img src={user.avatar_url} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />}
                                </div>
                            ))}
                             {isNyxThinking && (
                                <div className="flex items-start gap-4 justify-start">
                                    <div className="w-8 h-8 bg-patriot-navy text-amber-400 rounded-full flex items-center justify-center flex-shrink-0"><Loader2 size={16} className="animate-spin"/></div>
                                    <div className="max-w-xl p-4 rounded-3xl bg-white text-slate-400 italic">
                                        <p className="text-sm font-medium">AI nyx is accessing the registry...</p>
                                    </div>
                                </div>
                            )}
                            <div ref={nyxChatEndRef} />
                        </div>
                        <div className="p-6 border-t flex gap-4 bg-white">
                            <input
                                value={nyxInput}
                                onChange={e => setNyxInput(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleSendNyxMessage()}
                                placeholder="Query AI nyx..."
                                className="flex-grow p-4 bg-slate-100 border rounded-2xl text-sm font-bold"
                            />
                            <button onClick={handleSendNyxMessage} disabled={isNyxThinking} className="bg-patriot-navy text-white p-4 rounded-2xl shadow-lg disabled:opacity-50">
                                <Send />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </>
    );
};

export default SocialHub;
