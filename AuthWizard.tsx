
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CmsContent, Group, User, TeamMember, PayoutRequest, UpgradeRequest, ChatMessage, Product, Order, Post, WalletTransaction, Chapter } from '../types';
import { INITIAL_CMS_CONTENT } from '../constants';
import { cmsService, authService, messageService, storageService, payoutService, ecommerceService, upgradeService, socialService, walletService, notificationService, supabase } from '../services/supabaseService';
import * as XLSX from 'xlsx';
import NetworkMap from './NetworkMap';
import { 
  Save, X, Plus, Trash2, TrendingUp, Users, Image as ImageIcon, Camera, UploadCloud, 
  Megaphone, Loader2, DollarSign, Shield as ShieldIcon, CheckCircle, XCircle, Map, CreditCard, 
  Send, LayoutGrid, Zap, Search, MessageSquare, Power, Edit, RefreshCw, ShoppingBag, Package, Video, UserPlus, Layers, Eye, EyeOff, UserCheck, MapPin, Globe, Heart, QrCode, Lock, Truck, Youtube, AlignLeft, Phone, Wallet, ArrowRightLeft
} from 'lucide-react';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';

interface AdminPanelProps {
  currentCms: CmsContent;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentCms: initialCms, onClose }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [cmsData, setCmsData] = useState<CmsContent>({...initialCms});
  const [users, setUsers] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [allUsersForFund, setAllUsersForFund] = useState<User[]>([]);
  const [totalMemberCount, setTotalMemberCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Admin Identity State (Real UUID)
  const [currentAdminId, setCurrentAdminId] = useState<string>('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  
  // Registry Modules State
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [communityFund, setCommunityFund] = useState(0);
  const [circulatingSupply, setCirculatingSupply] = useState(0);
  const MAX_BLESSED_SUPPLY = 21000000000;

  const calculateCommunityFund = (transactions: WalletTransaction[]) => {
    const fund = transactions.reduce((acc, tx) => {
      if (tx.type === 'EMERGENCY_DEDUCTION' && tx.reference_code?.startsWith('ED-MASS-')) {
        return acc + (tx.amount || 0);
      } else if (tx.type === 'EMERGENCY_GRANT') {
        return acc - (tx.amount || 0);
      }
      return acc;
    }, 0);
    setCommunityFund(fund);
  };
  const [socialPosts, setSocialPosts] = useState<Post[]>([]);
  const [isEditingProduct, setIsEditingProduct] = useState<Partial<Product> | null>(null);
  const [marketplaceView, setMarketplaceView] = useState<'products' | 'orders' | 'pos'>('products');

  // Payout Proof State
  const [isSettlingPayout, setIsSettlingPayout] = useState<PayoutRequest | null>(null);
  const [settlementProofUrl, setSettlementProofUrl] = useState('');
  const [settlementMessage, setSettlementMessage] = useState('');
  
  // Chapter Registry State
  const [newChapterName, setNewChapterName] = useState('');

  // Team Member Management State
  const [editingMember, setEditingMember] = useState<Partial<TeamMember> | null>(null);

  // Communications State
  const [conversations, setConversations] = useState<{userId: string, userName: string}[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<{userId: string, userName: string} | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [adminChatInput, setAdminChatInput] = useState('');
  const [broadcastInput, setBroadcastInput] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Emergency Fund State
  const [emergencyAmount, setEmergencyAmount] = useState('');
  const [emergencyTargetUser, setEmergencyTargetUser] = useState<User | null>(null);
  const [isGrantingEmergency, setIsGrantingEmergency] = useState(false);
  
  // Mass Deduction State
  const [massDeductAmount, setMassDeductAmount] = useState('');
  const [isMassDeducting, setIsMassDeducting] = useState(false);
  const [lastMassDeductResult, setLastMassDeductResult] = useState<{total: number, count: number} | null>(null);

  const [assistanceDeductAmount, setAssistanceDeductAmount] = useState('5');
  const [isAssistanceDeducting, setIsAssistanceDeducting] = useState(false);
  const [assistancePopup, setAssistancePopup] = useState<{ id: string, title: string, description: string, coverage: string } | null>(null);

  // Member Registry Search
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Dynamic Fund Calculation
  const exclusiveUserCount = allUsersForFund.filter(u => u.is_exclusive).length;
  const calculatedTreasury = exclusiveUserCount * 200;
  const calculatedServiceFund = exclusiveUserCount * 10;

  const checkAdminAuth = useCallback(async () => {
      try {
          const currentUser = await authService.getCurrentUser();
          console.log("DEBUG: Current User from authService:", currentUser);
          // Check if user is authenticated AND has ADMIN role
          if (currentUser && currentUser.role === 'ADMIN') {
              setCurrentAdminId(currentUser.id);
              setIsAdminAuthenticated(true);
              return true;
          } else if (currentUser && currentUser.email === 'admin@blessed.ph') {
              // Master admin fallback: if email matches but role is wrong, force update
              await authService.updateUser(currentUser.id, { role: 'ADMIN' });
              setCurrentAdminId(currentUser.id);
              setIsAdminAuthenticated(true);
              return true;
          } else {
              console.log("DEBUG: No admin user authenticated.");
              setIsAdminAuthenticated(false);
              return false;
          }
      } catch (e) {
          console.error("Auth check failed:", e);
          setIsAdminAuthenticated(false);
          return false;
      }
  }, []);

  useEffect(() => {
    const channel = supabase.channel('profiles-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, payload => {
        if (payload.eventType === 'UPDATE') {
          const updatedUser = payload.new as User;
          setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
          setAllUsersForFund(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
          
          // Update online users list
          if (updatedUser.is_online) {
            setOnlineUsers(prev => {
              if (prev.some(u => u.id === updatedUser.id)) {
                return prev.map(u => u.id === updatedUser.id ? updatedUser : u);
              }
              return [...prev, updatedUser];
            });
          } else {
            setOnlineUsers(prev => prev.filter(u => u.id !== updatedUser.id));
          }
        } else if (payload.eventType === 'INSERT') {
          const newUser = payload.new as User;
          setUsers(prev => [...prev, newUser]);
          setAllUsersForFund(prev => [...prev, newUser]);
          setTotalMemberCount(prev => prev + 1);
          if (newUser.is_online) {
            setOnlineUsers(prev => [...prev, newUser]);
          }
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id;
          setUsers(prev => prev.filter(u => u.id !== deletedId));
          setAllUsersForFund(prev => prev.filter(u => u.id !== deletedId));
          setTotalMemberCount(prev => prev - 1);
          setOnlineUsers(prev => prev.filter(u => u.id !== deletedId));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);


  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (userSearchTerm.trim()) {
        const results = await authService.searchUsers(userSearchTerm);
        setUsers(results);
        // Also update allUsersForFund so the dropdown can access these specific search results
        setAllUsersForFund(prev => {
          const newUsers = [...prev];
          results.forEach(r => {
            if (!newUsers.some(u => u.id === r.id)) {
              newUsers.push(r);
            }
          });
          return newUsers;
        });
      } else {
        const allUsers = await authService.getAllUsers();
        setUsers(allUsers);
        setAllUsersForFund(allUsers);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [userSearchTerm]);

  const loadData = useCallback(async () => {
    try {
      const isAuth = await checkAdminAuth();
      if (!isAuth) {
          setIsLoading(false);
          return; 
      }


      const safeLoad = async <T,>(promise: Promise<T>, fallback: T): Promise<T> => {
          try { return await promise; } catch (e) { console.warn("Module Load Fault:", e); return fallback; }
      };

      const freshCms = await safeLoad(cmsService.getContent(), initialCms);
      if (freshCms) {
          const mergedCms = { ...INITIAL_CMS_CONTENT, ...freshCms };
          if (!mergedCms.chapters || mergedCms.chapters.length === 0) {
              mergedCms.chapters = INITIAL_CMS_CONTENT.chapters; 
          }
          setCmsData(mergedCms);
      }

      const [
          currentUser,
          totalUsers,
          convos,
          prods,
          allOrders,
          upgrades,
          payouts,
          allUsers,
          activeOnlineUsers,
          posts,
          walletTx,
          totalCirculatingSupply
      ] = await Promise.all([
          safeLoad(authService.getCurrentUser(), null),
          safeLoad(authService.getTotalUserCount(), 0), // Get REAL count of NEW users
          safeLoad(messageService.getAllUserConversations(), []),
          safeLoad(ecommerceService.getProducts(), []),
          safeLoad(ecommerceService.getOrders(), []),
          safeLoad(upgradeService.getUpgradeRequests(), []),
          safeLoad(payoutService.getPayouts(), []),
          safeLoad(authService.getAllUsers(), []),
          safeLoad(authService.getOnlineUsers(), []),
          safeLoad(socialService.getFeedPosts(), []),
          safeLoad(walletService.getTransactions(), []),
          safeLoad(walletService.getTotalCirculatingSupply(), 0)
      ]);

      setOnlineUsers(activeOnlineUsers);

      const combinedUsersForFund = [...allUsers];
      if (currentUser && !allUsers.some(u => u.id === currentUser.id)) {
        combinedUsersForFund.unshift(currentUser);
      }

      setCirculatingSupply(totalCirculatingSupply);
      // Logic: Show Real Member Count + Base Static Count
      setTotalMemberCount(20172 + totalUsers); 
      const finalConvos = [{ userId: 'GLOBAL_BROADCAST', userName: 'GLOBAL BROADCAST' }, ...convos];
      setConversations(finalConvos);
      setProducts(prods);
      setOrders(allOrders);
      setUpgradeRequests(upgrades);
      setPayoutRequests(payouts);
      setUsers(allUsers);
      setAllUsersForFund(combinedUsersForFund);
      setSocialPosts(posts);
      setWalletTransactions(walletTx);
      calculateCommunityFund(walletTx);

    } catch (e) { 
      console.error("OS Command Error:", e); 
    } finally {
      setIsLoading(false);
    }
  }, [initialCms, checkAdminAuth]);

  const handleAdminLogin = async () => {
      try {
          setIsLoading(true);
          console.log("DEBUG: Attempting login for:", adminEmail);
          
          try {
            const user = await authService.login(adminEmail, adminPass);
            console.log("DEBUG: Login successful. User:", user);
            await new Promise(resolve => setTimeout(resolve, 800));
            await loadData();
          } catch (loginErr: any) {
            // If login fails and it's the master admin, try to register
            if (adminEmail === 'admin@blessed.ph' && (loginErr.message?.includes('Invalid login credentials') || loginErr.message?.includes('Email not confirmed'))) {
              console.log("DEBUG: Admin account missing or unconfirmed. Attempting auto-registration...");
              try {
                await authService.register({
                  email: adminEmail,
                  password: adminPass,
                  firstName: 'System',
                  lastName: 'Admin'
                });
                // Try login again after registration
                const user = await authService.login(adminEmail, adminPass);
                console.log("DEBUG: Auto-registration and login successful.");
                await loadData();
              } catch (regErr: any) {
                console.error("Auto-registration failed:", regErr);
                if (regErr.message?.includes('User already registered')) {
                  alert("Admin Login Failed: The admin account exists but the password you entered is incorrect. Please use the correct password or reset it via Supabase Dashboard.");
                } else {
                  throw loginErr; 
                }
              }
            } else {
              throw loginErr;
            }
          }
      } catch (e: any) {
          console.error("Admin Login Error:", e);
          const msg = e.message || "";
          if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Network Error')) {
              alert(`Network Error: Unable to connect to Supabase.\n\nPossible Causes:\n1. Your internet connection is blocked.\n2. The Supabase Endpoint is incorrect.\n\nError Detail: ${msg}`);
          } else if (msg.includes('Invalid credentials') || msg.includes('Invalid login credentials')) {
              alert("Admin Login Failed: Invalid email or password. Please check your Supabase Auth section.");
          } else {
              alert(`Admin Login Failed: ${msg}`);
          }
          setIsLoading(false);
      }
  };

  const loadSpecificChat = useCallback(async (user: {userId: string, userName: string} | null) => {
      if (!user || !currentAdminId) {
        setChatMessages([]);
        setSelectedChatUser(null);
        return;
      }
      setSelectedChatUser(user);
      const msgs = await messageService.getMessages(currentAdminId, user.userId);
      setChatMessages(msgs);
  }, [currentAdminId]);

  useEffect(() => {
    if (selectedChatUser) {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [chatMessages, selectedChatUser]);

  useEffect(() => {
    loadData();
    const unsubCms = cmsService.subscribe(data => {
      if (data) {
        setCmsData(prev => ({ ...prev, ...data }));
      }
    });
    const unsubMsgs = messageService.subscribe(() => {
        if (isAdminAuthenticated) {
            messageService.getAllUserConversations().then(convos => {
                const finalConvos = [{ userId: 'GLOBAL_BROADCAST', userName: 'GLOBAL BROADCAST' }, ...convos];
                setConversations(finalConvos);
            });
            if (selectedChatUser) loadSpecificChat(selectedChatUser);
        }
    });
    const unsubProfiles = authService.subscribe(loadData); 
    const unsubUpgrades = upgradeService.subscribe(loadData);
    const unsubPayouts = payoutService.subscribe(loadData);
    const unsubOrders = ecommerceService.subscribeToOrders(loadData); 
    const unsubSocial = socialService.subscribeToSocialUpdates(loadData);
    const unsubWallet = walletService.subscribe(loadData);

    return () => { 
      unsubCms(); 
      unsubMsgs(); 
      unsubProfiles(); 
      unsubUpgrades(); 
      unsubPayouts(); 
      unsubOrders(); 
      unsubSocial();
      unsubWallet();
    };
  }, [loadData, selectedChatUser, loadSpecificChat, isAdminAuthenticated]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'cms' | 'product' | 'member' | 'payout', field?: keyof CmsContent | keyof TeamMember | keyof Product) => {
    if (!e.target.files?.[0]) return;
    try {
      const url = await storageService.uploadImage(e.target.files[0], cmsData.storageBucketName);
      if (target === 'product' && isEditingProduct) {
        setIsEditingProduct({ ...isEditingProduct, image_url: url });
      } else if (target === 'member' && editingMember) {
        setEditingMember({ ...editingMember, photoUrl: url });
      } else if (target === 'cms' && typeof field === 'string') {
        setCmsData(prev => ({ ...prev, [field]: url }));
      } else if (target === 'payout') {
        setSettlementProofUrl(url);
      }
    } catch (err: any) { 
        console.error("Registry Upload Fault:", err);
        if (err.message.includes('Failed to fetch')) {
            alert("Network Fault: Connection to storage server blocked. This is often caused by browser extensions (like AdBlockers) or a firewall. Please disable them and try again.");
        } else {
            alert(`Registry Asset Fault: ${err.message || 'Unknown Error'}`); 
        }
    } 
  };

  const handleSaveCms = async () => {
    setIsSaving(true);
    try {
        await cmsService.updateContent({ ...cmsData, updatedAt: Date.now() });
        alert("SOVEREIGN OS SYNCHRONIZED: All brand assets, page photos, team members, and chapters are permanently locked to the database.");
    } catch (e) { 
        console.error("Sync Fault:", e);
        alert("Sync failed. Check database connection."); 
    } finally { setIsSaving(false); }
  };

  const handlePayoutToggle = async () => {
    const newState = !cmsData.isPayoutActive;
    const updatedCmsData = { ...cmsData, isPayoutActive: newState };
    setCmsData(updatedCmsData);
    try {
      await cmsService.updateContent(updatedCmsData);
    } catch (e) {
      setCmsData(cmsData); 
      alert("Protocol Sync Failed.");
    }
  };

  const handleSaveMember = async () => {
    if (!editingMember || !editingMember.name) return;
    const currentMembers = [...(cmsData.teamMembers || [])];
    const index = currentMembers.findIndex(m => m.id === editingMember.id);
    if (index > -1) {
      currentMembers[index] = editingMember as TeamMember;
    } else {
      currentMembers.push({ ...editingMember, id: `tm-${Date.now()}` } as TeamMember);
    }
    const updatedCmsData = { ...cmsData, teamMembers: currentMembers };
    setCmsData(updatedCmsData);
    setEditingMember(null);
    
    try {
        await cmsService.updateContent({ ...updatedCmsData, updatedAt: Date.now() });
    } catch (e) {
        console.error("Auto-save failed:", e);
        alert("Failed to auto-save Vanguard Registry.");
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (window.confirm("Remove this member from the Vanguard Registry?")) {
      const filtered = (cmsData.teamMembers || []).filter(m => m.id !== id);
      const updatedCmsData = { ...cmsData, teamMembers: filtered };
      setCmsData(updatedCmsData);
      try {
          await cmsService.updateContent({ ...updatedCmsData, updatedAt: Date.now() });
      } catch (e) {
          console.error("Auto-save failed:", e);
          alert("Failed to auto-save Vanguard Registry.");
      }
    }
  };

  const handleDeletePost = async (postId: string) => {
      if (window.confirm("Are you sure you want to permanently delete this transmission? This cannot be undone.")) {
          try {
              await socialService.deletePost(postId);
              await loadData();
          } catch (error: any) {
              alert(`Deletion Failed: ${error.message}`);
          }
      }
  };

  const handleAddChapter = async (groupTypeOrEvent?: 'PARALLEL' | 'FEDERAL' | any) => {
    const groupType = (typeof groupTypeOrEvent === 'string' && (groupTypeOrEvent === 'PARALLEL' || groupTypeOrEvent === 'FEDERAL')) 
      ? groupTypeOrEvent 
      : 'FEDERAL';
      
    if (!newChapterName.trim()) return;
    const currentChapters = [...(cmsData.chapters || [])];
    if (currentChapters.some(c => c.name.toLowerCase() === newChapterName.trim().toLowerCase())) {
      alert("Chapter already exists.");
      return;
    }
    const updatedChapters: Chapter[] = [...currentChapters, { name: newChapterName.trim(), groupType }];
    const updatedCmsData: CmsContent = { ...cmsData, chapters: updatedChapters };
    setCmsData(updatedCmsData);
    setNewChapterName('');
    try {
        await cmsService.updateContent({ ...updatedCmsData, updatedAt: Date.now() });
    } catch (e) {
        console.error("Auto-save failed:", e);
        alert("Failed to auto-save Chapter Registry.");
    }
  };

  const handleRemoveChapter = async (name: string) => {
    if (window.confirm(`Remove ${name} from the Chapter Registry?`)) {
      const filtered = (cmsData.chapters || []).filter(c => c.name !== name);
      const updatedCmsData = { ...cmsData, chapters: filtered };
      setCmsData(updatedCmsData);
      try {
          await cmsService.updateContent({ ...updatedCmsData, updatedAt: Date.now() });
      } catch (e) {
          console.error("Auto-save failed:", e);
          alert("Failed to auto-save Chapter Registry.");
      }
    }
  };

  const handleUpdateChapterGroup = async (name: string, groupType: 'PARALLEL' | 'FEDERAL') => {
    const updated = (cmsData.chapters || []).map(c => 
      c.name === name ? { ...c, groupType } : c
    );
    const updatedCmsData = { ...cmsData, chapters: updated };
    setCmsData(updatedCmsData);
    try {
        await cmsService.updateContent({ ...updatedCmsData, updatedAt: Date.now() });
    } catch (e) {
        console.error("Auto-save failed:", e);
        alert("Failed to auto-save Chapter Registry.");
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastInput.trim() || !currentAdminId) return;
    setIsSendingMsg(true);
    try {
        await messageService.sendMessage({ senderId: currentAdminId, senderName: 'HQ COMMAND', text: broadcastInput, isBroadcast: true });
        setBroadcastInput('');
        alert("GLOBAL TRANSMISSION BROADCASTED.");
    } catch (e: any) {
        alert(`Broadcast Failed: ${e.message || 'System Link Error'}`);
    } finally {
        setIsSendingMsg(false);
    }
  };

  const handleSendAdminMessage = async () => {
    if (!adminChatInput.trim() || !selectedChatUser || !currentAdminId) return;
    setIsSendingMsg(true);
    try {
        const isBroadcast = selectedChatUser.userId === 'GLOBAL_BROADCAST';
        await messageService.sendMessage({ 
            senderId: currentAdminId, 
            senderName: 'HQ COMMAND', 
            receiverId: isBroadcast ? undefined : selectedChatUser.userId, 
            text: adminChatInput,
            isBroadcast: isBroadcast
        });
        setAdminChatInput('');
        await loadSpecificChat(selectedChatUser);
        if (isBroadcast) {
            alert("GLOBAL TRANSMISSION BROADCASTED.");
        }
    } catch (e: any) {
        console.error("Send Message Error:", e);
        alert(`Failed to send message: ${e.message || 'Unknown Error'}`);
    } finally {
        setIsSendingMsg(false);
    }
  };

  const handleApproveUpgrade = async (request: UpgradeRequest) => {
    if (window.confirm(`Verify payment and activate Exclusive Status for ${request.userName}? This will automatically count towards Treasury and Service Funds.`)) {
        await upgradeService.approveUpgrade(request.id, request.userId);
        await loadData();
    }
  };

  const handleRejectUpgrade = async (request: UpgradeRequest) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    try {
        await upgradeService.rejectUpgrade(request.id);
        alert("Upgrade Rejected.");
        await loadData();
    } catch (e) { alert("Rejection Error."); }
  };

  const handleRejectPayout = async (request: PayoutRequest) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    try {
        await payoutService.rejectPayout(request.id, reason);
        alert("Payout Rejected. Funds returned to member.");
        await loadData();
    } catch (e) { alert("Rejection Error."); }
  };

  const handleApprovePayout = async () => {
    if (!isSettlingPayout || !settlementProofUrl) {
      alert("Proof of payment is mandatory.");
      return;
    }
    try {
        await payoutService.approvePayout(isSettlingPayout.id, settlementProofUrl, settlementMessage);
        alert("Payout Settle Successful. Proof sent to member.");
        setIsSettlingPayout(null);
        setSettlementProofUrl('');
        setSettlementMessage('');
        await loadData();
    } catch (e) { alert("Settle Error."); }
  };
  
  const handleSaveProduct = async () => {
    if (!isEditingProduct) return;
    try {
      console.log("Saving product:", isEditingProduct);
      await ecommerceService.saveProduct(isEditingProduct);
      console.log("Product saved successfully");
      setIsEditingProduct(null);
      await loadData();
    } catch (e: any) { 
      console.error("Marketplace Sync Error:", e);
      alert("Marketplace Sync Error: " + (e.message || JSON.stringify(e))); 
    }
  };

  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [importText, setImportText] = useState('');

  const handleImportMembers = async () => {
    setImportText('');
    setIsImporting(true);
  };

  const processImportText = async (ocrText: string) => {
    if (!ocrText) return;

    const lines = ocrText.split('\n');
    const importedUsers = [];
    for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;

        // Try splitting by common delimiters (tabs, commas, semicolons)
        let parts = cleanLine.split(/[\t,;]+/);
        if (parts.length < 2) {
            // Fallback to space split
            parts = cleanLine.split(/\s+/);
        }

        if (parts.length >= 1) {
            const username = parts[0].trim();
            if (!username || username.toLowerCase() === 'username') continue;

            const region = parts.length > 1 ? parts[1].trim() : 'UNKNOWN';
            const position = parts.length > 2 ? parts.slice(2).join(' ').trim() : 'MEMBER';

            importedUsers.push({
                first_name: username,
                last_name: 'Member',
                email: `${username}@blessed.ph`,
                region: region,
                position: position,
                role: 'MEMBER',
                joined_at: new Date().toISOString()
            });
        }
    }

    if (importedUsers.length > 0) {
        if (window.confirm(`Import ${importedUsers.length} members?`)) {
            setIsLoading(true);
            try {
                for (const u of importedUsers) {
                    await authService.register(u);
                }
                alert("Import Successful.");
                loadData();
            } catch (e) {
                console.error("Import Error Details:", e);
                alert("Import failed. Check console for details.");
            } finally {
                setIsLoading(false);
                setIsImporting(false);
            }
        }
    } else {
        alert("No valid member data found in the provided text.");
        setIsImporting(false);
    }
  };

  const handleImportFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        processImportText(text);
    };
    reader.readAsText(file);
  };

  // GENERATE 20K MOCK USERS FOR MAP
  const generateMockUsers = () => {
    const mockUsers = [];
    const phBounds = {
        latMin: 5.0, latMax: 19.0,
        lngMin: 117.0, lngMax: 126.0
    };
    
    for (let i = 0; i < 20000; i++) {
        mockUsers.push({
            id: `mock-${i}`,
            first_name: 'Blessed',
            last_name: `Unit ${i}`,
            blessed_id: `B-${100000 + i}`,
            last_lat: phBounds.latMin + Math.random() * (phBounds.latMax - phBounds.latMin),
            last_lng: phBounds.lngMin + Math.random() * (phBounds.lngMax - phBounds.lngMin),
            is_online: Math.random() > 0.8,
            last_active: new Date().toISOString()
        });
    }
    console.log("Generated 20k mock users:", mockUsers.slice(0, 5));
    return mockUsers;
  };

  const [allMapUsers, setAllMapUsers] = useState<any[]>([]);
  useEffect(() => {
    if (activeTab === 'geo' && users.length > 0) {
        setAllMapUsers(users);
    }
  }, [activeTab, users]);

  const handleUpdateOrderStatus = async (order: Order, status: Order['status']) => {
    if (window.confirm(`Update order status to ${status}?`)) {
      await ecommerceService.updateOrderStatus(order, status);
      
      // Grant Reward Points if GCash order is Accepted
      if (status === 'ACCEPTED' && order.payment_method === 'GCASH_BANK') {
          const points = Math.floor(order.total_amount / 300) * 5;
          if (points > 0) {
              try {
                  await walletService.grantRewardPoints(currentAdminId, order.user_id, points, order.id);
                  alert(`Order Accepted. ${points} Blessed Points rewarded to user.`);
              } catch (e) {
                  console.error("Failed to grant reward points:", e);
                  alert("Order accepted but failed to grant reward points. Please check logs.");
              }
          }
      }

      await loadData(); 
    }
  };

  const handleUpdateUserPosition = async (userId: string, newPosition: string) => {
      try {
          await authService.updateUser(userId, { position: newPosition });
          await loadData();
      } catch (e) {
          alert("Position update failed");
      }
  };

  const handleResetUserPassword = async (userId: string, email: string) => {
      const newPass = window.prompt(`ENTER NEW RECOVERY PASSWORD FOR ${email.toUpperCase()}:`, "Blessed2026");
      if (newPass && newPass.trim().length >= 6) {
          setIsSaving(true);
          try {
              await authService.adminResetPassword(userId, newPass.trim());
              alert("RECOVERY PASSWORD UPDATED IN REGISTRY. Member can now use this password to log in.");
              loadData();
          } catch (e) {
              alert("Failed to update registry password.");
          } finally {
              setIsSaving(false);
          }
      } else if (newPass) {
          alert("Password must be at least 6 characters.");
      }
  };

  const handleApproveWalletTransaction = async (tx: WalletTransaction) => {
    if (tx.type === 'CASH_IN' && circulatingSupply + tx.amount > MAX_BLESSED_SUPPLY) {
      alert(`Error: Approving this Cash In would exceed the maximum supply of ${MAX_BLESSED_SUPPLY.toLocaleString()} Blessed points.`);
      return;
    }

    if (window.confirm(`Approve ${tx.type} for ${tx.user_name} of ₱${tx.amount}?`)) {
      try {
        await walletService.approveTransaction(tx, currentAdminId);
        alert("Transaction approved and balance updated.");
        const newSupply = await walletService.getTotalCirculatingSupply();
        setCirculatingSupply(newSupply);
        await loadData();
      } catch (e) {
        alert("Approval failed.");
      }
    }
  };

  const handleRejectWalletTransaction = async (txId: string) => {
    if (window.confirm("Reject this transaction?")) {
      try {
        await walletService.rejectTransaction(txId, currentAdminId);
        alert("Transaction rejected.");
        await loadData();
      } catch (e) {
        alert("Rejection failed.");
      }
    }
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const handleGrantEmergencyFund = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    if (!emergencyTargetUser || !emergencyAmount) {
      setIsProcessing(false);
      return;
    }
    const amount = parseFloat(emergencyAmount);
    if (isNaN(amount) || amount <= 0) {
        setIsProcessing(false);
        return;
    }

    if (amount > communityFund) {
      alert('Error: The requested grant amount exceeds the community fund balance.');
      setIsProcessing(false);
      return;
    }

    if (circulatingSupply + amount > MAX_BLESSED_SUPPLY) {
      alert(`Error: This grant would exceed the maximum supply of ${MAX_BLESSED_SUPPLY.toLocaleString()} Blessed points.`);
      setIsProcessing(false);
      return;
    }

    if (window.confirm(`Grant ₱${amount} Emergency Fund to ${emergencyTargetUser.first_name}? This will be deducted from the community fund.`)) {
      setIsGrantingEmergency(true);
      try {
        await walletService.grantEmergencyFund(currentAdminId, emergencyTargetUser, amount);
        alert("Emergency Fund granted and deductions processed.");
        setEmergencyAmount('');
        setEmergencyTargetUser(null);
        
        // Refresh supply and data
        const newSupply = await walletService.getTotalCirculatingSupply();
        setCirculatingSupply(newSupply);
        await loadData();
      } catch (e) {
        alert(`Grant Failed: ${(e as Error).message}`);
      } finally {
        setIsGrantingEmergency(false);
        setIsProcessing(false);
      }
    }
  };

  const handleMassDeduct = async () => {
    let amount = parseFloat(massDeductAmount);
    if (isNaN(amount)) return;
    
    // Auto-correct negative amounts
    amount = Math.abs(amount);

    if (amount <= 0) {
        alert("Please enter a valid amount greater than 0.");
        return;
    }

    if (window.confirm(`WARNING: You are about to deduct ₱${amount.toLocaleString()} from ALL users with sufficient balance. This action cannot be undone.\n\nAre you sure you want to proceed?`)) {
        setIsMassDeducting(true);
        try {
            const result = await walletService.massDeductEmergencyFund(amount, currentAdminId);
            setLastMassDeductResult({ total: result.totalDeducted, count: result.userCount });
            alert(`Mass Deduction Complete.\n\nTotal Deducted: ₱${result.totalDeducted.toLocaleString()}\nUsers Affected: ${result.userCount}`);
            setMassDeductAmount('');
            const newSupply = await walletService.getTotalCirculatingSupply();
            setCirculatingSupply(newSupply);
            await loadData();
        } catch (e: any) {
            alert(`Mass Deduction Failed: ${e.message}`);
        } finally {
            setIsMassDeducting(false);
        }
    }
  };

  const handleAssistanceDeduct = async (program: { id: string, title: string, description: string }) => {
    let amount = parseFloat(assistanceDeductAmount);
    if (isNaN(amount)) return;
    
    amount = Math.abs(amount);

    if (amount <= 0 || amount > 10) {
        alert("Please enter a valid amount between ₱1 and ₱10.");
        return;
    }

    if (window.confirm(`BLESSED MOVEMENT ASSISTANCE PROGRAM\n\nProgram: ${program.title}\nAmount: ₱${amount.toLocaleString()}\n\nThis will deduct ₱${amount.toLocaleString()} from ALL users. Proceed?`)) {
        setIsAssistanceDeducting(true);
        try {
            const result = await walletService.massDeductEmergencyFund(amount, currentAdminId, `ASSISTANCE: ${program.title}`, program.description);
            alert(`Assistance Deduction Complete.\n\nProgram: ${program.title}\nTotal Deducted: ₱${result.totalDeducted.toLocaleString()}\nUsers Affected: ${result.userCount}`);
            const newSupply = await walletService.getTotalCirculatingSupply();
            setCirculatingSupply(newSupply);
            await loadData();
            setAssistancePopup(null);
        } catch (e: any) {
            alert(`Assistance Deduction Failed: ${e.message}`);
        } finally {
            setIsAssistanceDeducting(false);
        }
    }
  };

  const handleExportUsers = () => {
    const data = users.map(u => ({
      'ID': u.id,
      'Full Name': `${u.first_name} ${u.last_name}`,
      'Email': u.email,
      'Username': u.email.split('@')[0],
      'Password (Viewable)': u.password || 'NOT CAPTURED',
      'Region': u.region,
      'Position': u.position || 'Member',
      'Status': u.membership_status,
      'Exclusive': u.is_exclusive ? 'Yes' : 'No',
      'Wallet Balance': u.wallet_balance,
      'Joined At': new Date(u.joined_at).toLocaleString()
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Member Registry");
    XLSX.writeFile(wb, `Blessed_Member_Registry_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportTransactions = () => {
    const data = walletTransactions.map(tx => ({
      'ID': tx.id,
      'Date': new Date(tx.timestamp).toLocaleString(),
      'User': tx.user_name,
      'Email': tx.user_email,
      'Role': tx.user_role,
      'Member Type': tx.member_type,
      'Type': tx.type,
      'Amount': tx.amount,
      'Status': tx.status,
      'Reference': tx.reference_code,
      'Target User': tx.target_user_name || 'N/A',
      'Admin ID': tx.admin_id || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Wallet Transactions");
    XLSX.writeFile(wb, `Blessed_Wallet_Registry_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const NavItem = ({ active, onClick, icon, label }: any) => (
    <button onClick={onClick} className={`w-full text-left p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-5 transition-all ${active ? 'bg-[#003366] text-white shadow-2xl scale-105' : 'text-slate-400 hover:bg-white hover:text-[#003366]'}`}>
      {icon} <span className="hidden md:block">{label}</span>
    </button>
  );

  const CmsInput = ({ label, value, onChange, onUpload, type = 'text' }: any) => (
    <div className="p-6 bg-white rounded-[2rem] border border-slate-100 space-y-3 shadow-sm">
      <div className="flex justify-between items-center">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        {onUpload && (
          <label className="cursor-pointer bg-slate-50 text-[#003366] px-4 py-1.5 rounded-xl border border-slate-200 text-[8px] font-black uppercase hover:bg-white transition-colors shadow-sm">
             Replace Asset <input type="file" className="hidden" onChange={onUpload} />
          </label>
        )}
      </div>
      {type === 'image' ? (
        <div className="w-full p-4 bg-slate-50 border rounded-2xl flex items-center justify-center min-h-[100px]">
          {value ? <img src={value} className="max-h-32 rounded-lg" referrerPolicy="no-referrer" /> : <span className="text-slate-300"><QrCode size={40}/></span>}
        </div>
      ) : (
        <input value={value || ''} onChange={e => onChange(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#003366]/10" />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-xl p-4">
      <div className="bg-white w-full max-w-7xl h-[95vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20">
        {/* Assistance Program Popup */}
        {assistancePopup && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/20">
              <div className={`p-8 ${assistancePopup.id === 'kapatiran' ? 'bg-blue-600' : assistancePopup.id === 'damayan' ? 'bg-red-600' : assistancePopup.id === 'kakampi' ? 'bg-[#003366]' : 'bg-emerald-600'} text-white flex justify-between items-center`}>
                <div>
                  <h3 className="text-2xl font-serif font-black uppercase tracking-tighter">{assistancePopup.title}</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-1 opacity-80">Assistance Program Protocol</p>
                </div>
                <button onClick={() => setAssistancePopup(null)} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all"><X /></button>
              </div>
              <div className="p-10 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Users size={18} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Coverage Scope</p>
                  </div>
                  <p className="text-lg font-bold text-slate-700">{assistancePopup.coverage}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-400">
                    <AlignLeft size={18} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Program Details</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <p className="text-sm font-bold text-slate-600 leading-relaxed">{assistancePopup.description}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-emerald-600">
                    <Heart size={18} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Sagip Kapwa Continuous Assistance</p>
                  </div>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">
                    🚑 SAGIP KAPWA: Tulong para sa mga hindi miyembro lalo na sa panahon ng emergency. Relief operations, Disaster response, Food assistance, Community emergency support. 
                    This program ensures that the Blessed Movement remains a beacon of hope for the entire community, providing continuous support beyond our immediate membership.
                  </p>
                </div>

                <div className="flex items-center gap-4 pt-6">
                  <div className="flex-grow">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Deduction Amount</p>
                    <div className="text-2xl font-black text-[#003366]">₱{assistanceDeductAmount}</div>
                  </div>
                  <button 
                    onClick={() => handleAssistanceDeduct(assistancePopup)}
                    disabled={isAssistanceDeducting}
                    className="bg-[#003366] text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                  >
                    {isAssistanceDeducting ? <Loader2 className="animate-spin" /> : <><ArrowRightLeft size={18} /> Execute Deduction</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#003366] p-8 flex justify-between items-center text-white">
          <div className="flex items-center gap-5">
            <ShieldIcon className="w-10 h-10 text-[#FFC107]" />
            <div>
              <h2 className="font-serif font-black tracking-widest text-2xl uppercase leading-none">Command Center</h2>
              <p className="text-[10px] font-black text-[#FFC107] uppercase tracking-[0.3em] mt-1 font-sans">Blessed Access Governance</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-red-500/30 p-4 rounded-2xl transition-all"><X /></button>
        </div>

        {!isAdminAuthenticated ? (
            <div className="flex-grow flex items-center justify-center bg-slate-50">
                <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-200 max-w-md w-full space-y-8 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-[#003366] rounded-full flex items-center justify-center mx-auto text-[#FFC107]">
                        <Lock size={32} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-serif font-black text-[#003366] uppercase">Identity Verification</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Enter HQ Command Credentials</p>
                    </div>
                    <div className="space-y-4">
                        <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold" placeholder="admin@blessed.ph" />
                        <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold" placeholder="••••••••" />
                    </div>
                    <button onClick={handleAdminLogin} disabled={isLoading} className="w-full py-5 bg-[#003366] text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-3">
                        {isLoading ? <Loader2 className="animate-spin" /> : <ShieldIcon size={18} />}
                        {isLoading ? "Authenticating..." : "Authenticate System"}
                    </button>

                    <div className="pt-4 text-center">
                        <button 
                            onClick={async () => {
                                try {
                                    alert("Supabase Connection Check: This feature is not yet implemented for Supabase.");
                                } catch (e: any) {
                                    alert(`Connection Test Failed: ${e.message}`);
                                }
                            }}
                            className="text-[9px] text-slate-400 font-black uppercase tracking-widest hover:text-[#003366] transition-colors"
                        >
                            Run Connection Diagnostic
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            <div className="flex flex-grow overflow-hidden">
            <div className="w-20 md:w-72 bg-slate-50 border-r border-slate-100 p-8 space-y-3 overflow-y-auto">
                <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<TrendingUp />} label="Overview" />
                <NavItem active={activeTab === 'wallet_monitor'} onClick={() => setActiveTab('wallet_monitor')} icon={<Wallet />} label="Wallet & Payout" />
                <NavItem active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<ArrowRightLeft />} label="Transactions" />
                <NavItem active={activeTab === 'comms'} onClick={() => setActiveTab('comms')} icon={<MessageSquare />} label="Communications" />
                <NavItem active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users />} label="Member Registry" />
                <NavItem active={activeTab === 'marketplace'} onClick={() => setActiveTab('marketplace')} icon={<ShoppingBag />} label="Marketplace" />
                <NavItem active={activeTab === 'cms'} onClick={() => setActiveTab('cms')} icon={<ImageIcon />} label="CMS Control" />
                <NavItem active={activeTab === 'chapters'} onClick={() => setActiveTab('chapters')} icon={<MapPin />} label="Chapter Registry" />
                <NavItem active={activeTab === 'upgrades'} onClick={() => setActiveTab('upgrades')} icon={<ShieldIcon />} label="Upgrade Protocol" />
                <NavItem active={activeTab === 'social'} onClick={() => setActiveTab('social')} icon={<Globe />} label="Social Feed Monitor" />
                <NavItem active={activeTab === 'geo'} onClick={() => setActiveTab('geo')} icon={<Map />} label="Geo-Ops" />
            </div>

            <div className="flex-grow overflow-y-auto bg-slate-100 custom-scrollbar pb-32">
                {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center space-y-6">
                    <Loader2 className="animate-spin text-[#003366]" size={48} />
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.5em]">Synchronizing Command Center...</p>
                </div>
                ) : (
                <div className="p-12">
                    {/* DASHBOARD */}
                    {activeTab === 'dashboard' && (
                  <div className="animate-fade-in space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                       <div className="bg-white p-10 rounded-[3rem] border shadow-sm text-center">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Total Member Registry</p>
                          <p className="text-3xl font-serif font-black text-[#003366]">{totalMemberCount.toLocaleString()}</p>
                       </div>
                       <div className="bg-white p-10 rounded-[3rem] border shadow-sm text-center">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Online Members</p>
                          <p className="text-3xl font-serif font-black text-green-600">{onlineUsers.length.toLocaleString()}</p>
                       </div>
                       <div className="bg-white p-10 rounded-[3rem] border shadow-sm text-center">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Treasury Income (200)</p>
                          <p className="text-3xl font-serif font-black text-slate-600">₱{calculatedTreasury.toLocaleString()}</p>
                       </div>
                       <div className="bg-white p-10 rounded-[3rem] border shadow-sm text-center">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Service Fund (10)</p>
                          <p className="text-3xl font-serif font-black text-blue-600">₱{calculatedServiceFund.toLocaleString()}</p>
                       </div>
                       <div className="bg-white p-10 rounded-[3rem] flex flex-col items-center justify-center gap-3 shadow-sm border">
                          <p className="text-[9px] font-black uppercase text-slate-400">Payout Protocol Link</p>
                          <button onClick={handlePayoutToggle} className={`w-16 h-8 rounded-full relative transition-all ${cmsData.isPayoutActive ? 'bg-green-50' : 'bg-slate-300'}`}>
                             <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${cmsData.isPayoutActive ? 'left-9' : 'left-1'}`}></div>
                          </button>
                       </div>
                    </div>

                    <div className="bg-white p-12 rounded-[3.5rem] border shadow-sm space-y-8">
                        <div className="flex items-center gap-4 text-[#003366]">
                            <TrendingUp size={24}/>
                            <h4 className="font-black uppercase text-sm tracking-widest">Blessed Point Market Control</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Point Price (PHP)</label>
                                <div className="flex gap-4">
                                    <input 
                                        type="number" 
                                        value={cmsData.pointPrice} 
                                        onChange={e => setCmsData({...cmsData, pointPrice: parseFloat(e.target.value) || 0})}
                                        className="flex-grow p-4 bg-slate-50 border rounded-2xl text-xl font-black text-[#003366]" 
                                    />
                                    <button onClick={handleSaveCms} className="bg-[#003366] text-white px-8 rounded-2xl font-black text-[10px] uppercase shadow-lg">Update Price</button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Point Name</label>
                                <input 
                                    type="text" 
                                    value={cmsData.pointName} 
                                    onChange={e => setCmsData({...cmsData, pointName: e.target.value})}
                                    className="w-full p-4 bg-slate-50 border rounded-2xl text-xl font-black text-[#003366]" 
                                />
                            </div>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase text-center">
                            Updating the point price will instantly reflect in all member wallets and marketplace transactions.
                        </p>
                    </div>
                  </div>
                )}
                
                {/* WALLET & PAYOUT MONITORING */}
                {activeTab === 'wallet_monitor' && (
                  <div className="animate-fade-in space-y-10">
                    <div className="flex justify-between items-center">
                      <h3 className="text-3xl font-serif font-black text-[#003366] uppercase">Wallet & Payout Registry</h3>
                      <button onClick={handleExportTransactions} className="bg-green-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg">
                        <RefreshCw size={14}/> Export to Excel
                      </button>
                    </div>

                    {/* Payout Requests Section */}
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
                        <div className="flex items-center gap-4 text-[#003366]">
                            <CreditCard size={24}/>
                            <h4 className="font-black uppercase text-sm tracking-widest">Pending Payout Requests</h4>
                        </div>
                        <div className="space-y-4">
                            {payoutRequests.filter(r => r.status === 'PENDING').length === 0 ? (
                                <p className="text-slate-400 text-sm text-center py-4">No pending payout requests.</p>
                            ) : payoutRequests.filter(r => r.status === 'PENDING').map(req => (
                                <div key={req.id} className="bg-slate-50 p-6 rounded-[2rem] flex items-center justify-between border">
                                    <div className="flex gap-4">
                                        {req.member_id_url && <a href={req.member_id_url} target="_blank"><img src={req.member_id_url} className="w-16 h-12 object-cover rounded-lg border" referrerPolicy="no-referrer" /></a>}
                                        <div>
                                            <p className="font-black text-[#003366] uppercase text-sm">{req.userName}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{req.chapter} • {req.method} • {req.accountNumber}</p>
                                            <p className="text-xs font-bold text-amber-600 mt-1">Requesting: ₱{req.amount.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsSettlingPayout(req)} className="bg-green-600 text-white px-6 py-2 rounded-xl text-[10px] font-black mt-1 uppercase shadow-lg hover:scale-105 transition-all">Settle</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Emergency Fund Control */}
                    <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-red-600">
                        <ShieldIcon size={24}/>
                        <h4 className="font-black uppercase text-sm">Emergency Fund Protocol</h4>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-red-500">Community Fund Balance</p>
                          <p className="text-2xl font-bold text-red-600">₱{communityFund.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Blessed Point Supply Monitor */}
                      <div className="bg-white/50 p-6 rounded-3xl border border-red-200/50 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Zap size={16} className="text-yellow-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Blessed Point Supply Monitor</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] font-bold text-slate-400 uppercase">Max Supply: 21 Billion</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold uppercase">
                            <span className="text-slate-500">Circulating Supply</span>
                            <span className="text-slate-900">{circulatingSupply.toLocaleString()} Blessed</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-yellow-500 transition-all duration-1000" 
                              style={{ width: `${Math.min(100, (circulatingSupply / MAX_BLESSED_SUPPLY) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-bold uppercase">
                            <span className="text-slate-500">Remaining to Mint</span>
                            <span className="text-green-600">{(MAX_BLESSED_SUPPLY - circulatingSupply).toLocaleString()} Blessed</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <AsyncSelect
                          cacheOptions
                          defaultOptions={allUsersForFund.map(u => ({ 
                            value: u.id, 
                            label: `${u.wallet_code || 'NO-CODE'} - ${u.first_name} ${u.last_name} (${u.is_exclusive ? 'Exclusive' : u.membership_status || 'Volunteer'})`, 
                            user: u 
                          }))}
                          loadOptions={async (inputValue) => {
                            if (!inputValue) {
                              return allUsersForFund.map(u => ({ 
                                value: u.id, 
                                label: `${u.wallet_code || 'NO-CODE'} - ${u.first_name} ${u.last_name} (${u.is_exclusive ? 'Exclusive' : u.membership_status || 'Volunteer'})`, 
                                user: u 
                              }));
                            }
                            const results = await authService.searchUsers(inputValue);
                            return results.map(u => ({ 
                              value: u.id, 
                              label: `${u.wallet_code || 'NO-CODE'} - ${u.first_name} ${u.last_name} (${u.is_exclusive ? 'Exclusive' : u.membership_status || 'Volunteer'})`, 
                              user: u 
                            }));
                          }}
                          onChange={(selectedOption: any) => {
                            setEmergencyTargetUser(selectedOption ? selectedOption.user : null);
                          }}
                          value={emergencyTargetUser ? { 
                            value: emergencyTargetUser.id, 
                            label: `${emergencyTargetUser.wallet_code || 'NO-CODE'} - ${emergencyTargetUser.first_name} ${emergencyTargetUser.last_name} (${emergencyTargetUser.is_exclusive ? 'Exclusive' : emergencyTargetUser.membership_status || 'Volunteer'})`, 
                            user: emergencyTargetUser 
                          } : null}
                          placeholder="Search by Code, Name, or Status..."
                          isClearable
                          styles={{
                            control: (base) => ({ ...base, padding: '0.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '1rem', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold' }),
                            option: (base, state) => ({ ...base, backgroundColor: state.isSelected ? '#003366' : 'white', color: state.isSelected ? 'white' : '#334155', ':hover': { backgroundColor: state.isSelected ? '#003366' : '#f1f5f9' } })
                          }}
                        />
                        <input 
                          type="number" 
                          value={emergencyAmount} 
                          onChange={e => setEmergencyAmount(e.target.value)} 
                          placeholder="Grant Amount" 
                          className="p-4 bg-white border rounded-2xl text-xs font-bold" 
                        />
                        <button 
                          onClick={handleGrantEmergencyFund} 
                          disabled={isGrantingEmergency || !emergencyTargetUser || !emergencyAmount}
                          className="bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
                        >
                          {isGrantingEmergency ? <Loader2 className="animate-spin" /> : 'Execute Emergency Grant'}
                        </button>
                      </div>
                      <p className="text-[9px] font-bold text-red-400 uppercase text-center">Warning: This action will deduct the specified amount from the Community Fund, which is funded by the Mass Deduction Protocol.</p>
                    </div>

                    {/* BLESSED MOVEMENT ASSISTANCE PROGRAM */}
                    <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-indigo-600">
                          <Heart size={24}/>
                          <h4 className="font-black uppercase text-sm">Blessed Movement Assistance Program</h4>
                        </div>
                        <p className="text-[11px] font-bold text-indigo-600/70 uppercase tracking-tight ml-10">
                          ANO ITO? ito ay programa ng pagtulongan ng bawat miyembro ng blessed movement upang may nakahandang pondo para sa oras ng pangangailangan
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-indigo-400 uppercase">Deduction Amount:</span>
                          <input 
                            type="number" 
                            min="1" 
                            max="10"
                            value={assistanceDeductAmount} 
                            onChange={e => setAssistanceDeductAmount(e.target.value)} 
                            className="w-20 p-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-center" 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { 
                            id: 'kapatiran', 
                            title: '🤝 1. KAPATIRAN', 
                            color: 'bg-[#2563eb]', 
                            desc: '🤝 KAPATIRAN: Pagpapatibay ng pagkakaisa ng mga miyembro. Suporta sa may sakit, Pakikiramay sa namatayan, Moral at solidarity support.',
                            coverage: 'All BLESSED Officers and Members'
                          },
                          { 
                            id: 'damayan', 
                            title: '🏥 2. DAMAYAN', 
                            color: 'bg-[#dc2626]', 
                            desc: '🏥 DAMAYAN: Tulong pinansyal para sa miyembro at pamilya. Medical assistance, Hospitalization support, Funeral assistance, Tulong sa panahon ng kalamidad.',
                            coverage: 'All BLESSED Officers and Members’ Immediate Family'
                          },
                          { 
                            id: 'kakampi', 
                            title: '⚖ 3. KAKAMPI', 
                            color: 'bg-[#003366]', 
                            desc: '⚖ KAKAMPI: Legal at social protection para sa miyembro, kamag-anak at kaibigan. Legal consultation support, Referral at documentation assistance, Social mediation support.',
                            coverage: 'All BLESSED Officers and Members’ Friends and Associates'
                          },
                          { 
                            id: 'sagip_kapwa', 
                            title: '🚑 4. SAGIP KAPWA', 
                            color: 'bg-[#059669]', 
                            desc: '🚑 SAGIP KAPWA: Tulong para sa mga hindi miyembro lalo na sa panahon ng emergency. Relief operations, Disaster response, Food assistance, Community emergency support.',
                            coverage: 'All Non-BLESSED Members'
                          }
                        ].map(prog => (
                          <button
                            key={prog.id}
                            onClick={() => setAssistancePopup({ id: prog.id, title: prog.title, description: prog.desc, coverage: prog.coverage })}
                            disabled={isAssistanceDeducting}
                            className={`${prog.color} text-white p-6 rounded-[2rem] text-left transition-all hover:scale-[1.02] active:scale-95 shadow-lg flex flex-col justify-between h-full group disabled:opacity-50`}
                          >
                            <div>
                              <p className="font-black text-sm mb-2 tracking-tight">{prog.title}</p>
                              <p className="text-[9px] font-medium opacity-90 leading-tight">{prog.desc}</p>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                              <span className="text-[8px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100">Execute Deduction</span>
                              <ArrowRightLeft size={14} className="opacity-60 group-hover:opacity-100" />
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      <div className="bg-white/50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
                        <p className="text-[9px] font-bold text-indigo-400 uppercase">
                          Note: This will trigger an automatic ₱{assistanceDeductAmount} micro-donation from all members for the selected assistance case.
                        </p>
                        <button 
                          onClick={async () => {
                            if (!currentAdminId) return;
                            try {
                              await notificationService.subscribe(currentAdminId, () => {}); // Just to ensure service is ready
                              // We'll just trigger a damayan with 0 amount for testing if possible, 
                              // but better to just insert a test notification directly if we had a service for it.
                              // For now, let's just add a console log.
                              console.log("Test Alert Triggered");
                              alert("To test, click one of the program buttons above. Ensure you have executed the SQL in db_hotfix_v37.0.sql first.");
                            } catch (e) { console.error(e); }
                          }}
                          className="text-[8px] font-black uppercase text-indigo-600 hover:underline"
                        >
                          Verify System Connection
                        </button>
                      </div>
                    </div>

                    {/* Mass Deduction Protocol */}
                    <div className="bg-yellow-50 p-8 rounded-[2.5rem] border border-yellow-100 space-y-6">
                      <div className="flex items-center gap-4 text-yellow-600">
                        <Zap size={24}/>
                        <h4 className="font-black uppercase text-sm">Mass Deduction Protocol</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input 
                          type="number" 
                          value={massDeductAmount} 
                          onChange={e => setMassDeductAmount(e.target.value)} 
                          placeholder="Deduct Amount (PHP)" 
                          className="p-4 bg-white border rounded-2xl text-xs font-bold" 
                        />
                        <button 
                          onClick={handleMassDeduct} 
                          disabled={isMassDeducting || !massDeductAmount}
                          className="bg-yellow-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
                        >
                          {isMassDeducting ? <Loader2 className="animate-spin" /> : 'Execute Mass Deduction'}
                        </button>
                      </div>
                      {lastMassDeductResult && (
                        <div className="text-center bg-yellow-100 p-4 rounded-2xl">
                          <p className="text-[10px] font-bold text-yellow-700 uppercase">Last Operation Result</p>
                          <p className="text-xs font-black text-yellow-800">Total Deducted: ₱{lastMassDeductResult.total.toLocaleString()}</p>
                          <p className="text-xs font-black text-yellow-800">Users Affected: {lastMassDeductResult.count}</p>
                        </div>
                      )}
                      <p className="text-[9px] font-bold text-yellow-500 uppercase text-center">Warning: This action will deduct the specified amount from ALL registered users with sufficient balance.</p>
                    </div>
                  </div>
                )}
                
                {/* TRANSACTIONS LEDGER */}
                {activeTab === 'transactions' && (
                    <div className="animate-fade-in space-y-12">
                        <div className="space-y-8">
                            <h3 className="text-3xl font-serif font-black text-[#003366] uppercase">Payout Requests</h3>
                            <div className="space-y-4">
                                {payoutRequests.length === 0 ? <p className="text-slate-400 text-sm">No active payout requests.</p> : payoutRequests.map(req => (
                                    <div key={req.id} className="bg-white p-6 rounded-[2rem] shadow-sm flex items-center justify-between border">
                                        <div className="flex gap-4">
                                            {req.member_id_url && <a href={req.member_id_url} target="_blank"><img src={req.member_id_url} className="w-16 h-12 object-cover rounded-lg border" referrerPolicy="no-referrer" /></a>}
                                            <div>
                                                <p className="font-black text-[#003366] uppercase text-sm">{req.userName}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{req.chapter} • {req.method} • {req.accountNumber}</p>
                                                <p className="text-xs font-bold text-amber-600 mt-1">Requesting: ₱{req.amount.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase ${req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : req.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{req.status}</span>
                                            {req.status === 'PENDING' && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => setIsSettlingPayout(req)} className="bg-green-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg hover:scale-105 transition-all">Settle</button>
                                                    <button onClick={() => handleRejectPayout(req)} className="bg-red-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg hover:scale-105 transition-all">Reject</button>
                                                </div>
                                            )}
                                            {req.adminProofUrl && <a href={req.adminProofUrl} target="_blank" className="p-2 bg-slate-100 rounded-lg text-blue-600"><Eye size={16}/></a>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-8">
                            <h3 className="text-3xl font-serif font-black text-[#003366] uppercase">Transaction Ledger</h3>
                            <div className="bg-white rounded-[3rem] shadow-sm border overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                        <th className="p-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Transaction</th>
                                        <th className="p-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Member</th>
                                        <th className="p-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Type</th>
                                        <th className="p-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                        <th className="p-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                        <th className="p-6 text-[9px] font-black uppercase tracking-widest text-slate-400">Admin Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {walletTransactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-slate-50/50">
                                            <td className="p-6">
                                            <p className="text-[10px] font-black text-[#003366] uppercase">{tx.reference_code}</p>
                                            <p className="text-[9px] text-slate-400">{new Date(tx.timestamp).toLocaleString()}</p>
                                            </td>
                                            <td className="p-6">
                                            <p className="text-xs font-bold text-slate-700 uppercase">{tx.user_name}</p>
                                            <p className="text-[9px] text-slate-400 uppercase">{tx.member_type} • {tx.user_role}</p>
                                            </td>
                                            <td className="p-6">
                                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${
                                                tx.type.includes('IN') || tx.type.includes('RECEIVE') || tx.type.includes('GRANT') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                            }`}>
                                                {tx.type.replace('_', ' ')}
                                            </span>
                                            </td>
                                            <td className="p-6">
                                            <p className="text-sm font-black text-slate-800">₱{tx.amount.toLocaleString()}</p>
                                            </td>
                                            <td className="p-6">
                                            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${
                                                tx.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                                                tx.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {tx.status}
                                            </span>
                                            </td>
                                            <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                {tx.proof_url && <a href={tx.proof_url} target="_blank" className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100"><ImageIcon size={14}/></a>}
                                                {tx.withdrawal_details && <button onClick={() => alert(`Withdrawal Details: ${tx.withdrawal_details}`)} className="p-2 bg-slate-100 text-slate-600 rounded-xl border"><AlignLeft size={14}/></button>}
                                                {tx.status === 'PENDING' && (
                                                <>
                                                    <button onClick={() => handleApproveWalletTransaction(tx)} className="p-2 bg-green-50 text-green-600 rounded-xl border border-green-100"><CheckCircle size={14}/></button>
                                                    <button onClick={() => handleRejectWalletTransaction(tx.id)} className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100"><XCircle size={14}/></button>
                                                </>
                                                )}
                                            </div>
                                            </td>
                                        </tr>
                                        ))}
                                    </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* USERS REGISTRY */}
                {activeTab === 'users' && (
                    <div className="animate-fade-in space-y-8">
                        <div className="flex justify-between items-center">
                            <h3 className="text-3xl font-serif font-black text-[#003366] uppercase">Member Registry</h3>
                            <div className="flex items-center gap-4">
                                <button onClick={handleExportUsers} className="bg-green-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg">
                                    <RefreshCw size={14}/> Export Members
                                </button>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        value={userSearchTerm}
                                        onChange={e => setUserSearchTerm(e.target.value)}
                                        placeholder="SEARCH BY NAME..." 
                                        className="pl-12 pr-6 py-3 bg-white border rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none shadow-sm w-64 focus:w-80 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex justify-between items-center">
                            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                                <ShieldIcon size={12} />
                                Admin Tip: For members showing "NOT CAPTURED", click the "Fix" button to set a new password. This will make it 100% visible to you and allow the member to log in.
                            </p>
                            <div className="flex gap-2">
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleImportFileUpload} 
                                    className="hidden" 
                                    accept=".txt,.csv,.pdf"
                                />
                                <button onClick={() => fileInputRef.current?.click()} className="bg-white text-[#003366] border border-[#003366] px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-50 transition-colors">Upload File</button>
                                <button onClick={handleImportMembers} className="bg-[#003366] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Paste OCR Text</button>
                            </div>
                        </div>

                        {isImporting && (
                            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                                <div className="bg-white w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl animate-scale-in">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="text-xl font-black text-[#003366] uppercase">Import Member Data</h4>
                                        <button onClick={() => setIsImporting(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-4 uppercase font-bold">Paste the OCR text from your PDF below. The system will parse usernames, regions, and positions.</p>
                                    <textarea 
                                        className="w-full h-64 bg-slate-50 border rounded-2xl p-6 text-xs font-mono outline-none focus:ring-2 focus:ring-[#003366] transition-all"
                                        placeholder="Username Region Position..."
                                        value={importText}
                                        onChange={(e) => setImportText(e.target.value)}
                                    ></textarea>
                                    <div className="mt-6 flex justify-end gap-4">
                                        <button onClick={() => setIsImporting(false)} className="px-6 py-3 text-[10px] font-black uppercase text-slate-400">Cancel</button>
                                        <button onClick={() => processImportText(importText)} className="px-8 py-3 bg-[#003366] text-white rounded-xl text-[10px] font-black uppercase shadow-lg">Process Text</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-[3rem] shadow-sm border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Identity</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Region</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Geolocation</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Official Position</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Password</th>
                                            <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50/50">
                                                <td className="p-6 flex items-center gap-4">
                                                    <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.first_name}`} className="w-10 h-10 rounded-full bg-slate-200" referrerPolicy="no-referrer" />
                                                    <div>
                                                        <p className="font-bold text-xs text-[#003366] uppercase">{u.first_name} {u.last_name}</p>
                                                        <p className="text-[9px] text-slate-400">{u.email}</p>
                                                    </div>
                                                </td>
                                                <td className="p-6 text-xs font-bold text-slate-600 uppercase">{u.region}</td>
                                                <td className="p-6 text-xs font-bold text-slate-600 uppercase">
                                                    {u.last_lat && u.last_lng ? (
                                                        <a 
                                                            href={`https://www.google.com/maps?q=${u.last_lat},${u.last_lng}`} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="text-blue-500 hover:underline"
                                                        >
                                                            {u.last_lat.toFixed(4)}, {u.last_lng.toFixed(4)}
                                                        </a>
                                                    ) : 'N/A'}
                                                </td>
                                                <td className="p-6">
                                                    <input 
                                                        className="bg-transparent border-b border-slate-200 focus:border-[#003366] outline-none text-xs font-bold uppercase w-full max-w-[150px]"
                                                        defaultValue={u.position || 'Member'}
                                                        onBlur={(e) => handleUpdateUserPosition(u.id, e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`text-xs font-mono font-bold ${!u.password && visiblePasswords[u.id] ? 'text-red-400' : 'text-slate-500'}`}>
                                                            {visiblePasswords[u.id] ? (u.password || 'NOT CAPTURED') : '••••••••'}
                                                        </p>
                                                        <button 
                                                            onClick={() => setVisiblePasswords(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                                                            className="p-1 hover:bg-slate-100 rounded text-slate-400"
                                                            title="Toggle Visibility"
                                                        >
                                                            {visiblePasswords[u.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                        </button>
                                                        {!u.password ? (
                                                            <button 
                                                                onClick={() => handleResetUserPassword(u.id, u.email)}
                                                                className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[8px] font-black uppercase hover:bg-amber-200 transition-colors"
                                                                title="Fix Missing Password"
                                                            >
                                                                Fix
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleResetUserPassword(u.id, u.email)}
                                                                className="p-1 hover:bg-blue-50 rounded text-blue-400 hover:text-blue-600 transition-colors"
                                                                title="Reset Password"
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${u.is_exclusive ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                                                        {u.membership_status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* CMS */}
                {activeTab === 'cms' && (
                  <div className="animate-fade-in space-y-16">
                     <div className="flex justify-between items-center">
                      <h3 className="text-3xl font-serif font-black text-[#003366] uppercase">Identity & Asset Control</h3>
                      <div className="flex gap-4">
                        <button onClick={() => setCmsData({...INITIAL_CMS_CONTENT})} className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all">
                          <RefreshCw size={16}/> Restore Defaults
                        </button>
                        <button onClick={handleSaveCms} disabled={isSaving} className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all">
                          {isSaving ? <Loader2 className="animate-spin" /> : <Save size={16}/>} Synchronize Registry
                        </button>
                      </div>
                    </div>
                     <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          <CmsInput label="Primary Global Logo" value={cmsData.logoUrl} onChange={v => setCmsData({...cmsData, logoUrl: v})} onUpload={e => handleFileUpload(e, 'cms', 'logoUrl')} type="image" />
                          <CmsInput label="Wallet Point Logo" value={cmsData.walletPointLogoUrl || ''} onChange={v => setCmsData({...cmsData, walletPointLogoUrl: v})} onUpload={e => handleFileUpload(e, 'cms', 'walletPointLogoUrl')} type="image" />
                          <CmsInput label="Blessed Org Logo (PH)" value={cmsData.orgLogo} onChange={v => setCmsData({...cmsData, orgLogo: v})} onUpload={e => handleFileUpload(e, 'cms', 'orgLogo')} type="image" />
                          <CmsInput label="Movement Shield Emblem" value={cmsData.movementLogo} onChange={v => setCmsData({...cmsData, movementLogo: v})} onUpload={e => handleFileUpload(e, 'cms', 'movementLogo')} type="image" />
                          <CmsInput label="Cooperative Logo" value={cmsData.coopLogo} onChange={v => setCmsData({...cmsData, coopLogo: v})} onUpload={e => handleFileUpload(e, 'cms', 'coopLogo')} type="image" />
                          <CmsInput label="PMO Logo" value={cmsData.pmoLogo} onChange={v => setCmsData({...cmsData, pmoLogo: v})} onUpload={e => handleFileUpload(e, 'cms', 'pmoLogo')} type="image" />
                          <CmsInput label="GCash QR Code" value={cmsData.gcashQrUrl} onChange={v => setCmsData({...cmsData, gcashQrUrl: v})} onUpload={e => handleFileUpload(e, 'cms', 'gcashQrUrl')} type="image" />
                          <CmsInput label="Home Page Feature Photo" value={cmsData.homeAboutImageUrl} onChange={v => setCmsData({...cmsData, homeAboutImageUrl: v})} onUpload={e => handleFileUpload(e, 'cms', 'homeAboutImageUrl')} type="image" />
                          <CmsInput label="About Us Page Photo" value={cmsData.aboutPageImageUrl} onChange={v => setCmsData({...cmsData, aboutPageImageUrl: v})} onUpload={e => handleFileUpload(e, 'cms', 'aboutPageImageUrl')} type="image" />
                          
                          <CmsInput label="ID Card Logo (Left)" value={cmsData.idCardLogoLeft} onChange={v => setCmsData({...cmsData, idCardLogoLeft: v})} onUpload={e => handleFileUpload(e, 'cms', 'idCardLogoLeft')} type="image" />
                          <CmsInput label="ID Card Logo (Right)" value={cmsData.idCardLogoRight} onChange={v => setCmsData({...cmsData, idCardLogoRight: v})} onUpload={e => handleFileUpload(e, 'cms', 'idCardLogoRight')} type="image" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                            <CmsInput label="Hero Video ID (YouTube)" value={cmsData.heroVideoId} onChange={v => setCmsData({...cmsData, heroVideoId: v})} />
                            <CmsInput label="AVP Video ID (YouTube)" value={cmsData.avpVideoId} onChange={v => setCmsData({...cmsData, avpVideoId: v})} />
                            <CmsInput label="About Page Video URL" value={cmsData.aboutVideoUrl} onChange={v => setCmsData({...cmsData, aboutVideoUrl: v})} />
                            
                            <CmsInput label="Official Hero Title" value={cmsData.heroTitle} onChange={v => setCmsData({...cmsData, heroTitle: v})} />
                            <CmsInput label="Hero Subtitle / Motto" value={cmsData.heroSubtitle} onChange={v => setCmsData({...cmsData, heroSubtitle: v})} />
                            <CmsInput label="AVP Section Title" value={cmsData.avpTitle} onChange={v => setCmsData({...cmsData, avpTitle: v})} />
                            <CmsInput label="Contact Email" value={cmsData.contactEmail} onChange={v => setCmsData({...cmsData, contactEmail: v})} />
                            <CmsInput label="Contact Phone" value={cmsData.contactPhone} onChange={v => setCmsData({...cmsData, contactPhone: v})} />
                            <CmsInput label="HQ Address" value={cmsData.contactAddress} onChange={v => setCmsData({...cmsData, contactAddress: v})} />
                        </div>

                        <div className="mt-8">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">NYX Knowledge Base (System Prompt)</label>
                            <textarea 
                                value={cmsData.faqKnowledgeBase} 
                                onChange={e => setCmsData({...cmsData, faqKnowledgeBase: e.target.value})} 
                                className="w-full p-6 bg-white border border-slate-100 rounded-[2rem] text-xs font-medium focus:ring-2 focus:ring-[#003366]/10 min-h-[200px]"
                                placeholder="Enter the knowledge base for the AI..."
                            />
                        </div>

                        {/* Team Section in CMS */}
                        <div className="pt-12 border-t mt-12">
                            <div className="flex justify-between items-center mb-8">
                                <h4 className="text-xl font-serif font-black text-[#003366] uppercase">Vanguard Registry (Team)</h4>
                                <button onClick={() => setEditingMember({ name: '', title: '', quote: '', photoUrl: '', isLeadership: false })} className="bg-slate-100 text-[#003366] px-6 py-2 rounded-xl text-[10px] font-black uppercase"><Plus size={14}/> Add Member</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {(cmsData.teamMembers || []).map(m => (
                                    <div key={m.id} className="bg-white p-4 rounded-3xl border flex items-center gap-4">
                                        <img src={m.photoUrl} className="w-12 h-12 rounded-full object-cover bg-slate-100" referrerPolicy="no-referrer" />
                                        <div className="flex-grow">
                                            <p className="font-black text-xs text-[#003366] uppercase">{m.name}</p>
                                            <p className="text-[9px] text-slate-400 uppercase">{m.title}</p>
                                        </div>
                                        <button onClick={() => setEditingMember(m)} className="p-2 hover:bg-slate-100 rounded-full text-blue-600"><Edit size={14}/></button>
                                        <button onClick={() => handleDeleteMember(m.id)} className="p-2 hover:bg-red-50 rounded-full text-red-600"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                     </div>
                  </div>
                )}

                {/* CHAPTERS */}
                {activeTab === 'chapters' && (
                    <div className="animate-fade-in space-y-8">
                        <h3 className="text-3xl font-serif font-black text-[#003366] uppercase">Chapter Registry</h3>
                        <div className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-6">
                            <div className="flex gap-4">
                                <input value={newChapterName} onChange={e => setNewChapterName(e.target.value)} placeholder="ENTER NEW CHAPTER NAME" className="flex-grow p-4 bg-slate-50 border rounded-2xl text-xs font-bold uppercase" />
                                <button onClick={handleAddChapter} className="bg-[#003366] text-white px-8 rounded-2xl font-black text-[10px] uppercase shadow-lg">Add Chapter</button>
                                <button onClick={() => handleAddChapter('FEDERAL')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase">Add Federal</button>
                                <button onClick={() => handleAddChapter('PARALLEL')} className="bg-purple-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase">Add Parallel</button>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {(cmsData.chapters || []).map(c => {
                                    const chapterCount = users.filter(u => u.region === c.name).length;
                                    return (
                                    <div key={c.name} className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase text-slate-600">{c.name} <span className="text-blue-500 ml-1">({chapterCount})</span></span>
                                            <select 
                                                value={c.groupType} 
                                                onChange={(e) => handleUpdateChapterGroup(c.name, e.target.value as 'PARALLEL' | 'FEDERAL')}
                                                className="text-[8px] font-black uppercase text-blue-500 bg-transparent outline-none"
                                            >
                                                <option value="FEDERAL">Federal Group</option>
                                                <option value="PARALLEL">Parallel Group</option>
                                            </select>
                                        </div>
                                        <button onClick={() => handleRemoveChapter(c.name)} className="text-slate-400 hover:text-red-500"><X size={12}/></button>
                                    </div>
                                )})}
                            </div>
                            <div className="flex justify-end pt-4 border-t">
                                <button onClick={handleSaveCms} disabled={isSaving} className="bg-green-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px]">{isSaving ? <Loader2 className="animate-spin"/> : 'Save Changes'}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* UPGRADES */}
                {activeTab === 'upgrades' && (
                    <div className="animate-fade-in space-y-8">
                        <h3 className="text-3xl font-serif font-black text-[#003366] uppercase">Upgrade Protocol</h3>
                        <div className="space-y-4">
                            {upgradeRequests.length === 0 ? <p className="text-slate-400 text-sm">No pending upgrades.</p> : upgradeRequests.map(req => (
                                <div key={req.id} className="bg-white p-6 rounded-[2rem] shadow-sm flex items-center justify-between border">
                                    <div className="flex items-center gap-6">
                                        {req.proofUrl && <a href={req.proofUrl} target="_blank"><img src={req.proofUrl} className="w-16 h-16 rounded-xl object-cover border" referrerPolicy="no-referrer" /></a>}
                                        <div>
                                            <p className="font-black text-[#003366] uppercase text-sm">{req.userName}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Requested: {new Date(req.timestamp).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {req.status === 'PENDING' ? (
                                            <div className="flex gap-2">
                                                <button onClick={() => handleApproveUpgrade(req)} className="bg-green-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg hover:scale-105 transition-all">Approve</button>
                                                <button onClick={() => handleRejectUpgrade(req)} className="bg-red-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg hover:scale-105 transition-all">Reject</button>
                                            </div>
                                        ) : <span className="px-4 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase">{req.status}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* COMMS */}
                {activeTab === 'comms' && (
                    <div className="animate-fade-in h-[700px] flex flex-col bg-white rounded-[3rem] shadow-xl border overflow-hidden">
                        <div className="flex h-full">
                            <div className="w-1/3 border-r bg-slate-50/50 flex flex-col">
                                <div className="p-6 border-b"><h4 className="font-black text-[#003366] uppercase text-xs tracking-widest">Active Channels</h4></div>
                                <div className="overflow-y-auto flex-grow">
                                    {conversations.map(c => (
                                        <button key={c.userId} onClick={() => loadSpecificChat(c)} className={`w-full text-left p-6 border-b hover:bg-white transition-colors ${selectedChatUser?.userId === c.userId ? 'bg-blue-50' : ''} ${c.userId === 'GLOBAL_BROADCAST' ? 'bg-amber-50 border-l-4 border-amber-400' : ''}`}>
                                            <div className="flex items-center justify-between">
                                                <p className={`font-bold text-xs uppercase ${c.userId === 'GLOBAL_BROADCAST' ? 'text-amber-700' : 'text-slate-800'}`}>{c.userName}</p>
                                                {c.userId === 'GLOBAL_BROADCAST' && <Zap size={12} className="text-amber-500" />}
                                            </div>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                                                {c.userId === 'GLOBAL_BROADCAST' ? 'System-wide Transmission' : `ID: ${c.userId.substring(0,8)}...`}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="w-2/3 flex flex-col bg-slate-50">
                                {selectedChatUser ? (
                                    <>
                                        <div className="p-6 border-b bg-white flex justify-between items-center">
                                            <h4 className="font-black text-[#003366] uppercase">{selectedChatUser.userName}</h4>
                                        </div>
                                        <div className="flex-grow overflow-y-auto p-8 space-y-4">
                                            {chatMessages.map(msg => (
                                                <div key={msg.id} className={`flex ${msg.senderId === currentAdminId ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`p-4 rounded-2xl max-w-xs text-sm ${msg.senderId === currentAdminId ? 'bg-[#003366] text-white' : 'bg-white text-slate-800 shadow-sm'}`}>
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            ))}
                                            <div ref={chatEndRef}></div>
                                        </div>
                                        <div className="p-6 border-t bg-white flex gap-4">
                                            {selectedChatUser.userId === 'GLOBAL_BROADCAST' ? (
                                                <>
                                                    <input value={adminChatInput} onChange={e => setAdminChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendAdminMessage()} className="flex-grow bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs font-bold outline-none text-amber-900 placeholder-amber-400" placeholder="BROADCAST TO ALL UNITS..." />
                                                    <button onClick={handleSendAdminMessage} className="p-4 bg-amber-500 text-white rounded-2xl shadow-lg"><Megaphone size={16}/></button>
                                                </>
                                            ) : (
                                                <>
                                                    <input value={adminChatInput} onChange={e => setAdminChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendAdminMessage()} className="flex-grow bg-slate-100 border rounded-2xl p-4 text-xs font-bold outline-none" placeholder="Reply as HQ Command..." />
                                                    <button onClick={handleSendAdminMessage} className="p-4 bg-[#003366] text-white rounded-2xl shadow-lg"><Send size={16}/></button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-grow flex items-center justify-center text-slate-400 font-bold uppercase text-xs">Select a channel to monitor</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* SOCIAL */}
                {activeTab === 'social' && (
                    <div className="animate-fade-in space-y-8">
                        <div className="flex justify-between items-center">
                            <h3 className="text-3xl font-serif font-black text-[#003366] uppercase">Social Feed Monitor</h3>
                            <div className="flex gap-2">
                                <input value={broadcastInput} onChange={e => setBroadcastInput(e.target.value)} placeholder="GLOBAL BROADCAST MESSAGE..." className="w-64 bg-white border rounded-xl p-3 text-[10px] font-bold outline-none" />
                                <button onClick={handleBroadcast} disabled={isSendingMsg} className="bg-red-600 text-white px-6 rounded-xl font-black text-[10px] uppercase shadow-lg flex items-center gap-2"><Megaphone size={14}/> {isSendingMsg ? 'Sending...' : 'Broadcast'}</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            {socialPosts.map(post => (
                                <div key={post.id} className="bg-white p-6 rounded-[2rem] border shadow-sm flex gap-6">
                                    {post.image_url && <img src={post.image_url} className="w-24 h-24 rounded-2xl object-cover bg-slate-100" referrerPolicy="no-referrer" />}
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-black text-[#003366] uppercase text-xs">{post.author?.first_name} {post.author?.last_name}</p>
                                                <p className="text-[9px] text-slate-400 uppercase">{new Date(post.created_at).toLocaleString()}</p>
                                            </div>
                                            <button onClick={() => handleDeletePost(post.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                                        </div>
                                        <p className="mt-3 text-sm text-slate-700">{post.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* GEO OPS */}
                {activeTab === 'geo' && (
                    <div className="animate-fade-in space-y-8 h-[700px] flex flex-col">
                        <h3 className="text-3xl font-serif font-black text-[#003366] uppercase">Geo-Ops Surveillance</h3>
                        <div className="flex-grow bg-white rounded-[3rem] border shadow-xl overflow-hidden relative z-0">
                            <NetworkMap users={allMapUsers} />
                        </div>
                    </div>
                )}
                
                 {/* MARKETPLACE & ORDERS */}
                 {activeTab === 'marketplace' && (
                  <div className="animate-fade-in space-y-8">
                    <div className="flex justify-between items-center border-b pb-6">
                      <div className="flex items-center gap-4">
                          <h3 className="text-3xl font-serif font-black text-[#003366] uppercase">Marketplace Control</h3>
                          <div className="flex bg-slate-100 p-1 rounded-xl">
                              <button onClick={() => setMarketplaceView('products')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${marketplaceView === 'products' ? 'bg-[#003366] text-white shadow-md' : 'text-slate-500'}`}>Product Registry</button>
                              <button onClick={() => setMarketplaceView('orders')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${marketplaceView === 'orders' ? 'bg-[#003366] text-white shadow-md' : 'text-slate-500'}`}>Order Fulfillment</button>
                              <button onClick={() => setMarketplaceView('pos')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${marketplaceView === 'pos' ? 'bg-[#003366] text-white shadow-md' : 'text-slate-500'}`}>Point of Sale</button>
                          </div>
                      </div>
                      {marketplaceView === 'products' && (
                          <button onClick={() => setIsEditingProduct({ name: '', category: '', price: 0, stock: 0, image_url: '', delivery_fee: 0 })} className="bg-[#003366] text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase"><Plus size={14}/> Add Product</button>
                      )}
                    </div>
                    
                    {marketplaceView === 'products' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {products.map(p => (
                                <div key={p.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <img src={p.image_url} className="w-16 h-16 rounded-2xl object-contain bg-slate-50" referrerPolicy="no-referrer" />
                                    <div>
                                      <p className="font-black text-[11px] uppercase text-[#003366]">{p.name}</p>
                                      <p className="text-[10px] font-black text-amber-500">₱{p.price.toLocaleString()}</p>
                                      {p.delivery_fee && p.delivery_fee > 0 && <p className="text-[8px] font-bold text-slate-400">+₱{p.delivery_fee} Del.</p>}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsEditingProduct(p)} className="p-3 bg-slate-50 text-[#003366] border rounded-xl"><Edit size={16}/></button>
                                    <button onClick={() => ecommerceService.deleteProduct(p.id).then(loadData)} className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl"><Trash2 size={16}/></button>
                                </div>
                                </div>
                            ))}
                        </div>
                    ) : marketplaceView === 'orders' ? (
                        <div className="space-y-6">
                            {orders.length === 0 ? (
                                <div className="p-12 text-center bg-white rounded-[2rem] border border-dashed border-slate-300">
                                    <Package size={48} className="mx-auto text-slate-300 mb-4"/>
                                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No active orders in the queue</p>
                                </div>
                            ) : (
                                orders.map(order => (
                                    <div key={order.id} className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col lg:flex-row justify-between gap-8">
                                        <div className="flex gap-6">
                                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-[#003366] text-xl">
                                                {order.user_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-[#003366] uppercase text-sm mb-1">Order #{order.id.substring(0,8)}</p>
                                                <p className="text-xs font-bold text-slate-500 uppercase">{order.user_name}</p>
                                                <p className="text-[10px] font-black text-blue-600 uppercase mt-1">Payment: {order.payment_method || 'POINTS'}</p>
                                                <p className="text-[10px] font-medium text-slate-400 uppercase mt-1 flex items-center gap-2"><MapPin size={10}/> {order.user_address}</p>
                                                <div className="mt-4 flex gap-2 flex-wrap">
                                                    {(order.items || []).map((item, idx) => (
                                                        <span key={idx} className="px-3 py-1 bg-slate-50 border rounded-lg text-[10px] font-bold text-slate-600">
                                                            {item.name} (x{item.quantity})
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-4 min-w-[200px]">
                                            <p className="text-2xl font-black text-[#003366]">₱{order.total_amount.toLocaleString()}</p>
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${
                                                order.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                                                order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                                                order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {order.status}
                                            </span>
                                            <div className="flex gap-2 mt-auto">
                                                {order.payment_proof_url && (
                                                    <a href={order.payment_proof_url} target="_blank" className="p-3 bg-slate-50 text-blue-600 rounded-xl border border-slate-100 hover:bg-blue-50 transition-colors">
                                                        <Eye size={18}/>
                                                    </a>
                                                )}
                                                {order.status === 'PENDING' && (
                                                    <button onClick={() => handleUpdateOrderStatus(order, 'ACCEPTED')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg">
                                                        Accept
                                                    </button>
                                                )}
                                                {order.status === 'ACCEPTED' && (
                                                    <button onClick={() => handleUpdateOrderStatus(order, 'SHIPPED')} className="bg-[#003366] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg flex items-center gap-2">
                                                        <Truck size={14}/> Ship
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="bg-white p-12 rounded-[3.5rem] border shadow-sm max-w-2xl mx-auto space-y-8">
                            <div className="text-center space-y-2">
                                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-[#003366] mb-4">
                                    <QrCode size={40} />
                                </div>
                                <h4 className="text-2xl font-serif font-black text-[#003366] uppercase">Point of Sale</h4>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Deduct points via Digital Code</p>
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Member Digital Code</label>
                                    <input 
                                        type="text" 
                                        id="pos-wallet-code"
                                        placeholder="e.g. DW-ABC12345" 
                                        className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xl font-mono font-black text-center mt-2 focus:border-[#003366] outline-none transition-colors"
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Amount to Deduct (PHP / Points)</label>
                                    <input 
                                        type="number" 
                                        id="pos-amount"
                                        placeholder="0.00" 
                                        className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-3xl font-black text-center mt-2 focus:border-[#003366] outline-none transition-colors"
                                    />
                                </div>
                                
                                <button 
                                    onClick={async () => {
                                        const codeInput = document.getElementById('pos-wallet-code') as HTMLInputElement;
                                        const amountInput = document.getElementById('pos-amount') as HTMLInputElement;
                                        const code = codeInput?.value.trim();
                                        const amount = parseFloat(amountInput?.value);
                                        
                                        if (!code || isNaN(amount) || amount <= 0) {
                                            alert("Please enter a valid digital code and amount.");
                                            return;
                                        }
                                        
                                        const targetUser = allUsersForFund.find(u => u.wallet_code === code);
                                        if (!targetUser) {
                                            alert("Member not found with that digital code.");
                                            return;
                                        }
                                        
                                        if ((targetUser.wallet_balance || 0) < amount) {
                                            alert(`Insufficient balance. Member only has ₱${(targetUser.wallet_balance || 0).toLocaleString()}`);
                                            return;
                                        }
                                        
                                        if (window.confirm(`Deduct ₱${amount.toLocaleString()} from ${targetUser.first_name} ${targetUser.last_name}?`)) {
                                            try {
                                                const newBalance = (targetUser.wallet_balance || 0) - amount;
                                                await authService.updateUser(targetUser.id, { wallet_balance: newBalance });
                                                
                                                await walletService.createTransaction({
                                                    user_id: targetUser.id,
                                                    user_name: `${targetUser.first_name} ${targetUser.last_name}`,
                                                    type: 'MARKETPLACE_PURCHASE',
                                                    amount: amount,
                                                    status: 'APPROVED',
                                                    reference_code: `POS-${Date.now()}`
                                                }, currentAdminId);
                                                
                                                alert("Points deducted successfully!");
                                                codeInput.value = '';
                                                amountInput.value = '';
                                                loadData();
                                            } catch (e) {
                                                alert("Failed to deduct points.");
                                            }
                                        }
                                    }}
                                    className="w-full py-6 bg-[#003366] text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-xl hover:bg-blue-900 transition-colors"
                                >
                                    Process Transaction
                                </button>
                            </div>
                        </div>
                    )}
                  </div>
                )}


                </div>
                )}
            </div>
            </div>
        )}
      </div> 
      {/* Modals remain the same */}
      {editingMember && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
              {/* ... Same Member Edit Modal Content ... */}
              <div className="bg-white p-12 rounded-[4rem] w-full max-w-lg shadow-2xl space-y-6 border-t-8 border-[#003366]">
                  <div className="flex justify-between items-center"><h4 className="text-2xl font-serif font-black text-[#003366] uppercase">Vanguard Registry</h4><button onClick={() => setEditingMember(null)} className="p-2 hover:bg-slate-100 rounded-full"><X/></button></div>
                  <div className="space-y-4">
                    <input value={editingMember.name || ''} onChange={e => setEditingMember({...editingMember, name: e.target.value})} placeholder="Full Name" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold" />
                    <input value={editingMember.title || ''} onChange={e => setEditingMember({...editingMember, title: e.target.value})} placeholder="Official Title" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold" />
                    <textarea value={editingMember.quote || ''} onChange={e => setEditingMember({...editingMember, quote: e.target.value})} placeholder="Leadership Quote" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold min-h-[100px]" />
                    <div className="flex items-center gap-4">
                       <label className="flex items-center gap-2 font-black text-xs uppercase"><input type="checkbox" checked={editingMember.isLeadership || false} onChange={e => setEditingMember({...editingMember, isLeadership: e.target.checked})} className="w-5 h-5"/> Is Founding Leader?</label>
                    </div>
                     <div onClick={() => document.getElementById('member-img-upload')?.click()} className="h-48 bg-slate-50 border-2 border-dashed rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden"><input id="member-img-upload" type="file" className="hidden" onChange={e => handleFileUpload(e, 'member')} />{editingMember.photoUrl ? <img src={editingMember.photoUrl} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <ImageIcon className="text-slate-300"/>}</div>
                  </div>
                  <button onClick={handleSaveMember} className="w-full py-5 bg-[#003366] text-white font-black rounded-2xl uppercase text-[10px] tracking-widest">Update Registry</button>
              </div>
          </div>
      )}

      {isEditingProduct && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
            {/* ... Same Product Edit Modal Content ... */}
             <div className="bg-white p-12 rounded-[4rem] w-full max-w-lg shadow-2xl space-y-6 border-t-8 border-[#003366]">
                <div className="flex justify-between items-center"><h4 className="text-2xl font-serif font-black text-[#003366] uppercase">Marketplace Registry</h4><button onClick={() => setIsEditingProduct(null)} className="p-2 hover:bg-slate-100 rounded-full"><X/></button></div>
                <div className="space-y-4">
                  <input value={isEditingProduct.name || ''} onChange={e => setIsEditingProduct({...isEditingProduct, name: e.target.value})} placeholder="Product Name" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold" />
                  <input value={isEditingProduct.category || ''} onChange={e => setIsEditingProduct({...isEditingProduct, category: e.target.value})} placeholder="Category (e.g. Food, Clothing)" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" value={isEditingProduct.price || ''} onChange={e => setIsEditingProduct({...isEditingProduct, price: parseFloat(e.target.value) || 0})} placeholder="Price" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold" />
                    <input type="number" value={isEditingProduct.stock || ''} onChange={e => setIsEditingProduct({...isEditingProduct, stock: parseInt(e.target.value) || 0})} placeholder="Stock" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold" />
                  </div>
                  <input type="number" value={isEditingProduct.delivery_fee || ''} onChange={e => setIsEditingProduct({...isEditingProduct, delivery_fee: parseFloat(e.target.value) || 0})} placeholder="Delivery Fee" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold" />
                   <div onClick={() => document.getElementById('product-img-upload')?.click()} className="h-48 bg-slate-50 border-2 border-dashed rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden"><input id="product-img-upload" type="file" className="hidden" onChange={e => handleFileUpload(e, 'product')} />{isEditingProduct.image_url ? <img src={isEditingProduct.image_url} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <ImageIcon className="text-slate-300"/>}</div>
                </div>
                <button onClick={handleSaveProduct} className="w-full py-5 bg-[#003366] text-white font-black rounded-2xl uppercase text-[10px] tracking-widest">Save to Registry</button>
            </div>
        </div>
      )}

      {isSettlingPayout && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
              {/* ... Same Payout Modal Content ... */}
              <div className="bg-white p-12 rounded-[4rem] w-full max-w-lg shadow-2xl space-y-6 border-t-8 border-green-500">
                  <div className="flex justify-between items-center"><h4 className="text-2xl font-serif font-black text-[#003366] uppercase tracking-tighter">Settle Fund Transmission</h4><button onClick={() => setIsSettlingPayout(null)} className="p-2 hover:bg-slate-100 rounded-full"><X/></button></div>
                  <div className="p-6 bg-slate-50 rounded-3xl space-y-4"><p className="text-[10px] font-black text-slate-400 uppercase">Target Member Operator: {isSettlingPayout.userName}</p><p className="text-xl font-black text-[#003366]">Requesting ₱{isSettlingPayout.amount.toLocaleString()}</p></div>
                  <div className="space-y-4">
                      <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Mandatory Payment Proof</h5>
                      <div onClick={() => document.getElementById('proof-upload-admin')?.click()} className="aspect-video bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group">
                         {settlementProofUrl ? (<img src={settlementProofUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />) : (<div className="text-center"><Camera className="mx-auto text-slate-300 mb-2" size={40}/><p className="text-[9px] font-black uppercase text-slate-400">Upload Official Receipt Photo</p></div>)}
                         <input id="proof-upload-admin" type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'payout')} />
                      </div>
                      <textarea value={settlementMessage} onChange={e => setSettlementMessage(e.target.value)} placeholder="Add confirmation message to member..." className="w-full p-6 bg-slate-50 border rounded-2xl text-xs font-bold focus:ring-2 focus:ring-green-500 outline-none"/>
                  </div>
                  <button onClick={handleApprovePayout} className="w-full py-6 bg-green-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all">Confirm Settlement Transmission</button>
              </div>
          </div>
      )}
    </div>
  );
};
