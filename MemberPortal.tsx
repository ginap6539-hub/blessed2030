
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, UserRole, CmsContent } from '../types';
import { authService, messageService, notificationService } from '../services/supabaseService';
import { Shield, Menu, X, LogOut, Lock, MessageSquare, Zap, Mail, Phone, MapPin, Bell } from 'lucide-react';
// notificationService imported above

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  cms: CmsContent;
  onLogout: () => void;
  onAdminUnlock: () => void;
  onNavigate: (view: any) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, cms, onLogout, onAdminUnlock, onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [broadcastPopup, setBroadcastPopup] = useState<{ title: string, message: string } | null>(null);
  const [popupTimer, setPopupTimer] = useState(0);
  const notificationSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    notificationSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const notifs = await notificationService.getNotifications(user.id);
    const unread = notifs.filter(n => !n.is_read).length;
    setUnreadCount(unread);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    
    // Subscribe to personal notifications
    const unsubNotifs = notificationService.subscribe(user.id, () => {
      loadNotifications();
      // Play sound and trigger visual ring
      if (notificationSound.current) {
          notificationSound.current.currentTime = 0;
          notificationSound.current.play().catch(e => console.warn("Sound blocked:", e));
      }
    });

    // Subscribe to GLOBAL BROADCASTS (since we bypass the DB trigger for them)
    const unsubMsgs = messageService.subscribe((payload: any) => {
        if (payload?.new?.is_broadcast === true) {
            // If I am the sender, don't play sound or show popup
            if (payload.new.sender_id === user.id) return;
            
            // Play sound for broadcast
            if (notificationSound.current) {
                notificationSound.current.currentTime = 0;
                notificationSound.current.play().catch(e => console.warn("Sound blocked:", e));
            }
            
            // Trigger global popup
            setBroadcastPopup({
                title: 'GLOBAL BROADCAST',
                message: payload.new.text
            });
            setPopupTimer(15); // 15 seconds display
        }
    });

    return () => { 
        unsubNotifs(); 
        unsubMsgs();
    };
  }, [user, loadNotifications]);

  useEffect(() => {
    let interval: any;
    if (broadcastPopup && popupTimer > 0) {
      interval = setInterval(() => {
        setPopupTimer(prev => prev - 1);
      }, 1000);
    } else if (popupTimer === 0) {
      setBroadcastPopup(null);
    }
    return () => clearInterval(interval);
  }, [broadcastPopup, popupTimer]);

  const handleLogoClick = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastClickTime > 1000) {
      setClickCount(1);
      setLastClickTime(now);
      onNavigate('home');
    } else {
      const nextCount = clickCount + 1;
      setClickCount(nextCount);
      setLastClickTime(now);

      if (nextCount === 7) {
        setClickCount(0);
        setLastClickTime(0);
        setTimeout(() => {
          const pin = window.prompt("ENTER COMMAND CENTER DECRYPTION KEY:");
          if (pin && pin.trim() === 'Blessed2030') {
            localStorage.setItem('blessed_admin_unlocked', 'true');
            onAdminUnlock();
          } else if (pin !== null) {
            alert("ACCESS DENIED: INVALID DECRYPTION KEY.");
          }
        }, 100);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setClickCount(0);
    }, 2000);
    return () => clearTimeout(timer);
  }, [clickCount]);

  const cacheBust = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return cms.updatedAt ? `${url}${separator}v=${cms.updatedAt}` : url;
  };

  const NavigationButtons = ({ isMobile = false }) => (
    <>
      <button onClick={() => { onNavigate('home'); if (isMobile) setIsMenuOpen(false); }} className="hover:text-blue-600 px-3 py-2 rounded-md text-xs uppercase tracking-widest font-black transition-colors font-sans text-left">Home</button>
      <button onClick={() => { onNavigate('about'); if (isMobile) setIsMenuOpen(false); }} className="hover:text-blue-600 px-3 py-2 rounded-md text-xs uppercase tracking-widest font-black transition-colors font-sans text-left">About Us</button>
      <button onClick={() => { onNavigate('team'); if (isMobile) setIsMenuOpen(false); }} className="hover:text-blue-600 px-3 py-2 rounded-md text-xs uppercase tracking-widest font-black transition-colors font-sans text-left">Our Team</button>
      <button onClick={() => { onNavigate('contact'); if (isMobile) setIsMenuOpen(false); }} className="hover:text-blue-600 px-3 py-2 rounded-md text-xs uppercase tracking-widest font-black transition-colors font-sans text-left">Support Member</button>
      
      {user ? (
        <div className={`flex ${isMobile ? 'flex-col gap-4 pt-4' : 'items-center gap-4 ml-6'}`}>
          <button onClick={() => { onNavigate('social'); if (isMobile) setIsMenuOpen(false); }} className="text-xs font-black text-blue-800 uppercase tracking-widest hover:underline font-sans text-left">Member Hub</button>
          <button onClick={() => { onNavigate('portal'); if (isMobile) setIsMenuOpen(false); }} className="text-xs font-black text-amber-600 uppercase tracking-widest hover:underline font-sans text-left">My Profile</button>
          <button onClick={() => { onLogout(); if (isMobile) setIsMenuOpen(false); }} className="flex items-center bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 px-6 py-2 rounded-xl border border-slate-200 transition-all text-[9px] font-black uppercase tracking-widest font-sans w-fit"><LogOut className="w-3 h-3 mr-2" /> Disconnect</button>
        </div>
      ) : (
        <button onClick={() => { onNavigate('auth'); if (isMobile) setIsMenuOpen(false); }} className={`${isMobile ? 'w-full mt-4' : ''} bg-blue-800 hover:bg-blue-700 text-white font-black px-8 py-3 rounded-2xl shadow-xl transition-all transform hover:scale-105 uppercase tracking-widest text-[9px] font-sans`}>Login / Join Member</button>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-500 selection:text-white">
      <nav className="fixed w-full z-[60] bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center cursor-pointer select-none group" onClick={handleLogoClick}>
              <img src={cacheBust(cms.logoUrl)} alt="Blessed Logo" referrerPolicy="no-referrer" className={`h-12 w-12 mr-3 transition-transform ${clickCount > 4 ? 'animate-pulse scale-110' : 'group-hover:scale-105'}`} />
              <div>
                <h1 className="text-xl font-serif font-black text-blue-900 tracking-tight uppercase leading-none">Blessed Movement</h1>
                <p className="text-[0.55rem] text-amber-600 tracking-[0.2em] uppercase font-black mt-1 font-sans">Service • Integrity • Wealth</p>
              </div>
            </div>

            <div className="hidden md:block">
              <div className="ml-10 flex items-center space-x-6">
                <NavigationButtons />
                {user && (
                  <button onClick={() => onNavigate('social')} className="relative p-2 text-slate-400 hover:text-blue-800 transition-colors group">
                    <Bell size={20} className={unreadCount > 0 ? 'animate-ring' : ''} />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="md:hidden flex items-center">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="p-3 rounded-xl text-slate-500 hover:text-blue-800 hover:bg-slate-100 transition-all active:scale-95"
                aria-label="Toggle Menu"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu drawer */}
        <div 
          className={`md:hidden fixed inset-0 z-[70] transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        >
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
          <div className={`absolute right-0 top-0 bottom-0 w-4/5 max-w-sm bg-white shadow-2xl p-8 pt-24 transition-transform duration-300 flex flex-col ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="space-y-6 flex flex-col">
              <NavigationButtons isMobile={true} />
            </div>
            
            <div className="mt-auto pt-12 text-center border-t">
              <img src={cacheBust(cms.logoUrl)} className="h-16 w-16 mx-auto mb-4 grayscale opacity-30" alt="Logo" referrerPolicy="no-referrer" />
              <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">Blessed Movement OS v7.2</p>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-20">
        {children}
      </main>

      <footer className="bg-slate-950 text-white py-24 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-10">
           <iframe className="w-full h-full object-cover" src={`https://www.youtube.com/embed/${cms.heroVideoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${cms.heroVideoId}`} title="Footer" />
        </div>
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-16 relative z-10">
           <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <img src={cacheBust(cms.logoUrl)} className="h-12 w-12" alt="Blessed" referrerPolicy="no-referrer" />
                 <h3 className="font-serif text-2xl font-black text-[#FFC107] uppercase tracking-tighter">Blessed</h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">Empowering Filipino families through cooperative synergy and financial stewardship.</p>
           </div>
           <div>
              <h4 className="font-black mb-8 uppercase text-xs tracking-[0.3em] text-white/50 font-sans">Navigation</h4>
              <ul className="space-y-4 text-xs text-slate-400 uppercase font-black tracking-widest font-sans">
                  <li><button onClick={() => onNavigate('about')} className="hover:text-[#FFC107]">Foundation</button></li>
                  <li><button onClick={() => onNavigate('team')} className="hover:text-[#FFC107]">Vanguard</button></li>
                  <li><button onClick={() => onNavigate('contact')} className="hover:text-[#FFC107]">Support</button></li>
              </ul>
           </div>
           <div>
              <h4 className="font-black mb-8 uppercase text-xs tracking-[0.3em] text-white/50 font-sans">Contact</h4>
               <ul className="space-y-5 text-xs text-slate-400 font-bold tracking-widest font-sans">
                  <li className="flex gap-3"><Mail className="text-[#FFC107]" size={14} /><span className="uppercase">{cms.contactEmail}</span></li>
                  <li className="flex gap-3"><Phone className="text-[#FFC107]" size={14} /><span>{cms.contactPhone}</span></li>
                  <li className="flex gap-3"><MapPin className="text-[#FFC107]" size={14} /><span className="uppercase leading-tight">{cms.contactAddress}</span></li>
              </ul>
           </div>
           <div>
              <h4 className="font-black mb-8 uppercase text-xs tracking-[0.3em] text-white/50 font-sans">Broadcasts</h4>
              <p className="text-[10px] text-slate-500 mb-6 font-black uppercase tracking-widest font-sans">Secure your link to official command broadcasts.</p>
              <div className="flex bg-slate-900 border border-white/10 rounded-2xl overflow-hidden p-1">
                  <input className="bg-transparent border-none text-[10px] p-3 flex-grow text-white outline-none font-bold uppercase font-sans" placeholder="ENCRYPTED EMAIL" />
                  <button className="bg-[#FFC107] text-slate-900 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest font-sans">ACTIVATE</button>
              </div>
           </div>
        </div>
      </footer>

      {broadcastPopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(220,38,38,0.4)] border-[6px] border-red-600 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            <div className="bg-red-600 p-10 text-white text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,white_1px,transparent_1px)] [background-size:20px_20px] animate-[spin_60s_linear_infinite]"></div>
              </div>
              
              <div className="absolute top-6 right-10 flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                <div className="text-[11px] font-black uppercase tracking-widest text-white/80">System Alert: {popupTimer}s</div>
              </div>
              
              <div className="relative z-10">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border-4 border-red-400 animate-bounce">
                  <Zap size={48} className="text-red-600" />
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tighter leading-tight mb-2">{broadcastPopup.title}</h3>
                <div className="inline-block px-4 py-1 bg-white/20 rounded-full border border-white/30">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">HQ COMMAND TRANSMISSION</p>
                </div>
              </div>
            </div>
            
            <div className="p-12 text-center space-y-8 bg-slate-50">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-inner border border-slate-100">
                <p className="text-slate-700 text-sm font-bold leading-relaxed whitespace-pre-wrap">
                  {broadcastPopup.message}
                </p>
              </div>
              
              <button 
                onClick={() => setBroadcastPopup(null)}
                className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-lg transition-all active:scale-95"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
