
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, CmsContent, PayoutRequest, UpgradeRequest, Product, Order, CartItem, WalletTransaction } from '../types';
import { 
  User as UserIcon, MapPin, CreditCard, ShoppingBag,
  ChevronRight, Wallet, Loader2, Send, CheckCircle, XCircle, Clock, Save, Camera, LogOut, Zap, 
  UploadCloud, ShieldCheck, Star, MessageSquare, ImageIcon, AlertCircle, ShieldAlert, QrCode, ArrowRightLeft,
  ShoppingCart, Package, Trash2, TrendingUp, Heart, Shield, Globe, X, ChevronLeft
} from 'lucide-react';
import { cmsService, payoutService, storageService, authService, upgradeService, ecommerceService, walletService, notificationService, messageService } from '../services/supabaseService';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface MemberPortalProps {
  user: User;
  onProfileUpdate: () => void;
  onLogout: () => void;
  lat: number | null;
  lng: number | null;
  initialTab?: string;
}

export const MemberPortal: React.FC<MemberPortalProps> = ({ user, onProfileUpdate, onLogout, initialTab }) => {
  const [cms, setCms] = useState<CmsContent | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab || 'marketplace');
  const [userPayouts, setUserPayouts] = useState<PayoutRequest[]>([]);
  const [upgradeRequest, setUpgradeRequest] = useState<UpgradeRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPayoutAlert, setShowPayoutAlert] = useState(false);
  const [lastPayoutToggleState, setLastPayoutToggleState] = useState<boolean | null>(null);

  const cacheBust = useCallback((url?: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return cms?.updatedAt ? `${url}${separator}v=${cms.updatedAt}` : url;
  }, [cms?.updatedAt]);

  // Assistance Popup State
  const [assistancePopup, setAssistancePopup] = useState<{ title: string, message: string } | null>(null);
  const [popupTimer, setPopupTimer] = useState(10);
  const buzzerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (assistancePopup) {
      console.log("🖥️ Assistance Popup Active:", assistancePopup);
    }
  }, [assistancePopup]);

  // Initialize buzzer
  useEffect(() => {
    // Using a more reliable siren/buzzer sound
    buzzerRef.current = new Audio('https://www.soundjay.com/buttons/beep-01a.mp3');
    buzzerRef.current.loop = true;
  }, []);

  // Payout State
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [payoutChapter, setPayoutChapter] = useState(user.region || '');
  const [payoutIdUrl, setPayoutIdUrl] = useState('');
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [isIdUploading, setIsIdUploading] = useState(false);
  
  // Profile Editing State
  // Initialize with user, but we'll also sync via useEffect
  const [profileData, setProfileData] = useState<Partial<User>>({ ...user });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isMemberLogoUploading, setIsMemberLogoUploading] = useState(false);
  
  // Upgrade State
  const [upgradeProofUrl, setUpgradeProofUrl] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isRequestingUpgrade, setIsRequestingUpgrade] = useState(false);
  
  // Marketplace State
  const [products, setProducts] = useState<Product[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [marketView, setMarketView] = useState<'shop' | 'cart' | 'orders'>('shop');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderProofUrl, setOrderProofUrl] = useState('');
  const [isUploadingOrderProof, setIsUploadingOrderProof] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'POINTS' | 'GCASH_BANK'>('POINTS');
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [isProcessingQrPayment, setIsProcessingQrPayment] = useState(false);

  // Wallet State
  const [cashInAmount, setCashInAmount] = useState('');
  const [cashInProofUrl, setCashInProofUrl] = useState('');
  const [isUploadingCashInProof, setIsUploadingCashInProof] = useState(false);
  const [isRequestingCashIn, setIsRequestingCashIn] = useState(false);
  
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [cashOutDetails, setCashOutDetails] = useState('');
  const [isRequestingCashOut, setIsRequestingCashOut] = useState(false);
  
  const [sendAmount, setSendAmount] = useState('');
  const [sendTargetCode, setSendTargetCode] = useState('');
  const [isSendingPoints, setIsSendingPoints] = useState(false);

  // Lightbox State
  const [selectedProductImage, setSelectedProductImage] = useState<string | null>(null);
  const [currentProductImageIndex, setCurrentProductImageIndex] = useState(0);
  const [lightboxProducts, setLightboxProducts] = useState<Product[]>([]);

  // ID Card Flip State
  const [isIdFlipped, setIsIdFlipped] = useState(false);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price + (item.delivery_fee || 0)) * item.quantity, 0);
  const totalDeliveryFee = cart.reduce((sum, item) => sum + (item.delivery_fee || 0) * item.quantity, 0);

  // Updated QR Code to include Position
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      position: user.position || 'Member',
      region: user.region,
      status: user.membership_status
  }))}`;

  // Sync profileData when the user prop changes (e.g. after an upload triggers onProfileUpdate)
  useEffect(() => {
    setProfileData(prev => ({
      ...prev,
      ...user,
      // Preserve local edits if needed, but for now we prioritize the DB state on refresh
      avatar_url: user.avatar_url,
      member_logo_url: user.member_logo_url
    }));
  }, [user]);

  const loadBackendData = useCallback(async () => {
    try {
        const [cmsContent, payouts, existingUpgradeReq, marketProducts, memberOrders, walletTx] = await Promise.all([
          cmsService.getContent().catch(() => null),
          payoutService.getPayoutsForUser(user.id).catch(() => []),
          upgradeService.getUpgradeRequests().then(reqs => reqs.find(r => (r as any).user_id === user.id) || null).catch(() => null),
          ecommerceService.getProducts().catch(() => []),
          ecommerceService.getOrders(user.id).catch(() => []),
          walletService.getTransactions(user.id).catch(() => [])
        ]);

        if (cmsContent) {
          if (lastPayoutToggleState === false && cmsContent.isPayoutActive === true) {
            setShowPayoutAlert(true);
          }
          setLastPayoutToggleState(cmsContent.isPayoutActive);
          setCms(cmsContent);
        }
        setUserPayouts(payouts);
        setUpgradeRequest(existingUpgradeReq);
        setProducts(marketProducts);
        setUserOrders(memberOrders);
        setWalletTransactions(walletTx);

    } catch (e) { 
        console.error("Backend Sync Failure:", e);
    } finally { 
        setIsLoading(false); 
    }
  }, [user.id, lastPayoutToggleState]);

  useEffect(() => {
    if (showQrScanner) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(async (decodedText) => {
        scanner.clear();
        setShowQrScanner(false);
        try {
          const data = JSON.parse(decodedText);
          if (data.type === 'PRODUCT_PAYMENT' && data.productId) {
            const product = products.find(p => p.id === data.productId);
            if (product) {
              if (user.wallet_balance < product.price) {
                alert("Insufficient balance for this QR payment.");
                return;
              }
              
              if (confirm(`Confirm payment of ₱${product.price.toLocaleString()} for ${product.name}?`)) {
                setIsProcessingQrPayment(true);
                try {
                  await ecommerceService.placeOrder({
                    user_id: user.id,
                    user_name: `${user.first_name} ${user.last_name}`,
                    user_avatar: user.avatar_url || '',
                    user_address: user.address,
                    items: [{ product_id: product.id, name: product.name, price: product.price, quantity: 1, image_url: product.image_url }],
                    total_amount: product.price,
                    status: 'ACCEPTED',
                    payment_method: 'POINTS'
                  });
                  alert("QR Payment Successful!");
                  onProfileUpdate();
                  loadBackendData();
                } catch (e) {
                  alert("QR Payment failed.");
                } finally {
                  setIsProcessingQrPayment(false);
                }
              }
            }
          } else {
            alert("Invalid Blessed QR Code.");
          }
        } catch (e) {
          alert("Could not parse QR data.");
        }
      }, (error) => {});

      return () => {
        try { scanner.clear(); } catch (e) {}
      };
    }
  }, [showQrScanner, products, user, onProfileUpdate, loadBackendData]);

  const handleWalletUpdate = useCallback((payload?: any) => {
    loadBackendData();
    onProfileUpdate();

    // Check for Mass Deduction / Emergency Deduction
    if (payload?.eventType === 'INSERT' && payload.new) {
        const tx = payload.new;
        if (tx.user_id === user.id && tx.type === 'EMERGENCY_DEDUCTION') {
             console.log("🚨 Real-time Deduction Detected via Wallet Stream");
             setAssistancePopup({
                 title: 'BLESSED ASSISTANCE ALERT',
                 message: tx.withdrawal_details || 'A contribution has been deducted for the Assistance Program.'
             });
             setPopupTimer(10);
             if (buzzerRef.current) {
                buzzerRef.current.currentTime = 0;
                buzzerRef.current.play().catch(e => console.warn(e));
             }
        }
    }
  }, [loadBackendData, onProfileUpdate, user.id]);
  
  useEffect(() => {
    loadBackendData();
    const unsubCms = cmsService.subscribe(data => {
      if (data) {
        if (lastPayoutToggleState === false && data.isPayoutActive === true) {
          setShowPayoutAlert(true);
        }
        setLastPayoutToggleState(data.isPayoutActive);
        setCms(data);
      }
    });
    const unsubPayouts = payoutService.subscribe(loadBackendData);
    const unsubUpgrades = upgradeService.subscribe(loadBackendData);
    const unsubOrders = ecommerceService.subscribeToOrders(loadBackendData);
    const unsubWallet = walletService.subscribe(handleWalletUpdate);

    return () => { unsubCms(); unsubPayouts(); unsubUpgrades(); unsubOrders(); unsubWallet(); };
  }, [loadBackendData, lastPayoutToggleState, handleWalletUpdate]);

  // Isolated Notification Subscription for 100% Reliability
  useEffect(() => {
    if (!user.id) return;

    console.log("🔔 Initializing Assistance Alert Listener for User:", user.id);

    const unsubNotifs = notificationService.subscribe(user.id, (payload) => {
      console.log("📩 Notification Received:", payload);
      const newNotif = payload.new;
      if (!newNotif) return;

      // Aggressive check for any deduction-related notification
      // We check type, title, and message for maximum coverage
      const isAssistance = newNotif.type === 'assistance_deduction' || 
                           newNotif.type === 'system' ||
                           newNotif.type === 'wallet' ||
                           (newNotif.title && (
                             newNotif.title.toUpperCase().includes('ASSISTANCE') || 
                             newNotif.title.toUpperCase().includes('DEDUCTION') ||
                             newNotif.title.toUpperCase().includes('BLESSED MOVEMENT') ||
                             newNotif.title.toUpperCase().includes('KAPATIRAN') ||
                             newNotif.title.toUpperCase().includes('DAMAYAN') ||
                             newNotif.title.toUpperCase().includes('KAKAMPI') ||
                             newNotif.title.toUpperCase().includes('SAGIP KAPWA')
                           )) ||
                           (newNotif.message && (
                             newNotif.message.toUpperCase().includes('DEDUCTED') ||
                             newNotif.message.toUpperCase().includes('AMBAG')
                           ));
      
      if (isAssistance) {
        console.log("🚨 Assistance Deduction Detected! Triggering Popup...");
        const popupTitle = newNotif.title || 'BLESSED ASSISTANCE ALERT';
        const popupMessage = newNotif.message || 'A micro-donation has been processed for the Assistance Program.';
        
        setAssistancePopup({ 
          title: popupTitle, 
          message: popupMessage 
        });
        setPopupTimer(10);
        
        // Force buzzer play with multiple attempts
        if (buzzerRef.current) {
          buzzerRef.current.currentTime = 0;
          const playPromise = buzzerRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(e => {
              console.warn("🔊 Audio play blocked. Waiting for user interaction.", e);
            });
          }
        }

        // Refresh data to show new balance
        loadBackendData();
        onProfileUpdate();
      }
    });

    return () => { 
      console.log("🔕 Cleaning up Assistance Alert Listener");
      unsubNotifs(); 
    };
  }, [user.id, loadBackendData, onProfileUpdate]);

  useEffect(() => {
    let interval: any;
    if (assistancePopup && popupTimer > 0) {
      interval = setInterval(() => {
        setPopupTimer(prev => prev - 1);
      }, 1000);
    } else if (popupTimer === 0) {
      setAssistancePopup(null);
      if (buzzerRef.current) {
        buzzerRef.current.pause();
        buzzerRef.current.currentTime = 0;
      }
    }
    return () => clearInterval(interval);
  }, [assistancePopup, popupTimer]);

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setIsIdUploading(true);
        try {
            const url = await storageService.uploadImage(e.target.files[0], cms?.storageBucketName);
            setPayoutIdUrl(url);
        } catch (e) { alert("ID upload failed."); } finally { setIsIdUploading(false); }
    }
  };

  const handleProfileUpdate = async () => {
    setIsUpdatingProfile(true);
    try {
      await authService.updateUser(user.id, profileData);
      onProfileUpdate();
      alert("Member profile synchronized successfully.");
    } catch (e) {
      alert("Profile sync failed.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.[0]) return;
      setIsAvatarUploading(true);
      try {
          const url = await storageService.uploadImage(e.target.files[0], cms?.storageBucketName);
          setProfileData(prev => ({ ...prev, avatar_url: url }));
          await authService.updateUser(user.id, { avatar_url: url });
          onProfileUpdate(); // Triggers app-wide user refresh
      } catch (e) { alert("Avatar upload failed."); }
      finally { setIsAvatarUploading(false); }
  };

  const handleMemberLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.[0]) return;
      setIsMemberLogoUploading(true);
      try {
          const url = await storageService.uploadImage(e.target.files[0], cms?.storageBucketName);
          // 1. Update local state immediately for instant feedback
          setProfileData(prev => ({ ...prev, member_logo_url: url }));
          // 2. Persist to DB
          await authService.updateUser(user.id, { member_logo_url: url });
          // 3. Refresh App User State
          onProfileUpdate();
      } catch (e) { alert("Member Logo upload failed."); }
      finally { setIsMemberLogoUploading(false); }
  };
  
  const handleRequestUpgrade = async () => {
      if (!upgradeProofUrl) {
        alert("Please upload proof of payment to proceed.");
        return;
      }
      setIsRequestingUpgrade(true);
      try {
        await upgradeService.requestUpgrade(user.id, `${user.first_name} ${user.last_name}`, upgradeProofUrl);
        alert("Upgrade request submitted to HQ Command.");
        setUpgradeProofUrl('');
        loadBackendData();
      } catch (e) {
        alert("Upgrade request failed.");
      } finally {
        setIsRequestingUpgrade(false);
      }
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.[0]) return;
      setIsUploadingProof(true);
      try {
          const url = await storageService.uploadImage(e.target.files[0], cms?.storageBucketName);
          setUpgradeProofUrl(url);
      } catch(e) { alert("Proof upload failed."); }
      finally { setIsUploadingProof(false); }
  };

  const handlePayoutRequest = async () => {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0 || !payoutAccount.trim() || !payoutIdUrl || !payoutChapter) {
      alert("Verification Required: Please complete all fields and upload your Blessed Member ID photo."); 
      return;
    }
    setIsRequestingPayout(true);
    try {
      await payoutService.requestPayout({
        userId: user.id,
        userName: `${user.first_name} ${user.last_name}`,
        amount: amount,
        accountNumber: payoutAccount,
        chapter: payoutChapter,
        idUrl: payoutIdUrl
      });
      alert("PAYOUT PROTOCOL SYNCHRONIZED: HQ Command has received your settlement request for verification.");
      setPayoutAmount(''); setPayoutAccount(''); setPayoutIdUrl('');
      // Force reload to ensure list updates immediately
      await loadBackendData(); 
    } catch (error) { 
      alert("Transmission Failure: Member connection lost."); 
    } finally { 
      setIsRequestingPayout(false); 
    }
  };

  const handleAddToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product_id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { product_id: product.id, name: product.name, price: product.price, quantity: 1, image_url: product.image_url, delivery_fee: product.delivery_fee }];
    });
    setMarketView('cart');
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const handleOrderProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploadingOrderProof(true);
      try {
        const url = await storageService.uploadImage(e.target.files[0], cms?.storageBucketName);
        setOrderProofUrl(url);
      } catch (e) {
        alert("Proof upload failed.");
      } finally {
        setIsUploadingOrderProof(false);
      }
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      alert("Cart cannot be empty.");
      return;
    }
    if (paymentMethod === 'POINTS' && user.wallet_balance < cartTotal) {
      alert("You have insufficient points to place this order.");
      return;
    }
    if (paymentMethod === 'GCASH_BANK' && !orderProofUrl) {
      alert("Please upload proof of payment for GCash/Bank orders.");
      return;
    }
    setIsPlacingOrder(true);
    try {
      await ecommerceService.placeOrder({
        user_id: user.id,
        user_name: `${user.first_name} ${user.last_name}`,
        user_avatar: user.avatar_url || '',
        user_address: user.address,
        items: cart,
        total_amount: cartTotal,
        status: 'PENDING',
        payment_method: paymentMethod,
        payment_proof_url: orderProofUrl,
      });

      // Send real-time message if GCash/Bank
      if (paymentMethod === 'GCASH_BANK') {
        const adminProfile = await authService.getAdminProfile();
        if (adminProfile) {
          await messageService.sendMessage({
            senderId: user.id,
            senderName: `${user.first_name} ${user.last_name}`,
            receiverId: (adminProfile as any).id,
            text: `📢 NEW MARKETPLACE ORDER (GCash/Bank)\nAmount: ₱${cartTotal.toLocaleString()}\nProof of Payment: ${orderProofUrl}`,
            image_url: orderProofUrl
          });
        }
      }

      alert(paymentMethod === 'POINTS' ? "Order confirmed instantly! Points deducted." : "Order successfully transmitted to HQ Command.");
      setCart([]);
      setOrderProofUrl('');
      setMarketView('orders');
      onProfileUpdate(); // Refresh balance and data
    } catch (e: any) {
      alert("Order failed: " + (e.message || "Unknown error"));
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleCashInRequest = async () => {
    const amount = parseFloat(cashInAmount);
    if (isNaN(amount) || amount <= 0 || !cashInProofUrl) {
      alert("Please enter a valid amount and upload payment proof.");
      return;
    }
    setIsRequestingCashIn(true);
    try {
      await walletService.requestCashIn(user, amount, cashInProofUrl);
      alert("Cash In request submitted for admin approval.");
      setCashInAmount('');
      setCashInProofUrl('');
      loadBackendData();
    } catch (e) {
      alert("Cash In request failed.");
    } finally {
      setIsRequestingCashIn(false);
    }
  };

  const handleCashOutRequest = async () => {
    const amount = parseFloat(cashOutAmount);
    if (isNaN(amount) || amount <= 0 || !cashOutDetails.trim()) {
      alert("Please enter a valid amount and withdrawal details.");
      return;
    }
    if (user.wallet_balance < amount) {
      alert("Insufficient wallet balance.");
      return;
    }
    setIsRequestingCashOut(true);
    try {
      await walletService.requestCashOut(user, amount, cashOutDetails);
      alert("Cash Out request submitted for admin approval.");
      setCashOutAmount('');
      setCashOutDetails('');
      loadBackendData();
    } catch (e) {
      alert("Cash Out request failed.");
    } finally {
      setIsRequestingCashOut(false);
    }
  };

  const handleSendPoints = async () => {
    setIsSendingPoints(true);
    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0 || !sendTargetCode.trim()) {
      alert("Please enter a valid amount and recipient digital code.");
      setIsSendingPoints(false);
      return;
    }
    if (user.wallet_balance < amount) {
      alert("Insufficient wallet balance.");
      setIsSendingPoints(false);
      return;
    }
    try {
      await walletService.sendCoins(user, sendTargetCode, amount);
      alert("Points transferred successfully.");
      setSendAmount('');
      setSendTargetCode('');
      onProfileUpdate(); // This will re-fetch all necessary data
    } catch (e: any) {
      alert(e.message || "Transfer failed.");
    } finally {
      setIsSendingPoints(false);
    }
  };

  const handleCashInProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploadingCashInProof(true);
      try {
        const url = await storageService.uploadImage(e.target.files[0], cms?.storageBucketName);
        setCashInProofUrl(url);
      } catch (e) {
        alert("Proof upload failed.");
      } finally {
        setIsUploadingCashInProof(false);
      }
    }
  };

  if (isLoading || !cms) return <div className="h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-[#FFC107]" size={48} /></div>;

  return (
    <div className="bg-slate-50 min-h-screen py-16 px-4 font-sans relative">
      {showPayoutAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-amber-400 text-slate-900 rounded-[3rem] p-12 max-w-lg w-full shadow-2xl border-4 border-white text-center space-y-6 relative">
                <button onClick={() => setShowPayoutAlert(false)} className="absolute top-6 right-6 bg-black/10 p-3 rounded-full hover:bg-black/20 transition"><XCircle size={20}/></button>
                <Zap size={64} className="mx-auto animate-pulse" />
                <p className="text-xl font-bold mt-2 max-w-xs mx-auto">Now you can request payout!</p>
                <button onClick={() => { setActiveTab('payouts'); setShowPayoutAlert(false); }} className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase whitespace-nowrap shadow-lg hover:scale-105 transition-transform">
                    Click this now!
                </button>
            </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-12">
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl flex items-center space-x-6 border border-slate-100">
            <div className={`w-16 h-16 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-amber-400`}>
                {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <span className="font-black text-slate-300 text-xl">{user.first_name.charAt(0)}</span>}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Authenticated Member</p>
              <p className="text-lg font-black text-[#003366] tracking-tighter leading-none">{user.first_name}</p>
              <span className={`inline-block mt-2 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-400 text-slate-900`}>
                BLESSED MEMBER
              </span>
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
            <nav className="p-4 space-y-2">
              <button onClick={() => user.is_exclusive ? setActiveTab('marketplace') : alert("Exclusive Membership Required")} className={`w-full flex items-center p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'marketplace' ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><ShoppingBag size={20} className="mr-4"/>Marketplace</button>
              <button onClick={() => setActiveTab('wallet')} className={`w-full flex items-center p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'wallet' ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><Wallet size={20} className="mr-4"/>Blessed Points</button>
              <button onClick={() => setActiveTab('payouts')} className={`w-full flex items-center p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'payouts' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><Wallet size={20} className="mr-4"/>Settlement Center</button>
              <button onClick={() => user.is_exclusive ? setActiveTab('card') : alert("Exclusive Membership Required")} className={`w-full flex items-center p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'card' ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><CreditCard size={20} className="mr-4"/>Membership Card</button>
              <button onClick={() => user.is_exclusive ? setActiveTab('profile') : alert("Exclusive Membership Required")} className={`w-full flex items-center p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-[#003366] text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><UserIcon size={20} className="mr-4"/>My Profile</button>
            </nav>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white p-10 md:p-16 rounded-[3rem] shadow-2xl border border-slate-100 min-h-[750px]">
           {activeTab === 'card' && (
             <div className="animate-fade-in space-y-12">
                <div className="flex justify-between items-center border-b border-slate-200 pb-8">
                    <h2 className="text-2xl font-serif font-bold text-[#003366] uppercase tracking-[0.2em]">Blessed Member ID</h2>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse`}></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">BLESSED ACTIVE</p>
                    </div>
                </div>
                <div className="flex flex-col lg:flex-row gap-16 justify-center items-center pt-8">
                   <div className="group cursor-pointer" style={{ perspective: '1000px' }} onClick={() => setIsIdFlipped(!isIdFlipped)}>
                     <div className="relative w-[300px] h-[480px] transition-transform duration-700 ease-in-out" style={{ transformStyle: 'preserve-3d', transform: isIdFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                       {/* Front Side */}
                       <div className="absolute w-full h-full bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
                          <div className="h-[45%] bg-[#003366] p-6 flex justify-between items-start">
                              <img src={cacheBust(cms?.idCardLogoLeft || cms?.logoUrl)} className="w-14 h-14 object-contain drop-shadow-md" alt="Left Logo" referrerPolicy="no-referrer" />
                              <img src={cacheBust(cms?.idCardLogoRight || cms?.orgLogo)} className="w-14 h-14 object-contain drop-shadow-md" alt="Right Logo" referrerPolicy="no-referrer" />
                          </div>
                           <div className="absolute top-[calc(45%-64px)] left-1/2 -translate-x-1/2">
                              <img src={user.avatar_url} className="w-32 h-32 rounded-full border-8 border-white object-cover bg-white shadow-lg" alt="User Avatar" referrerPolicy="no-referrer" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 h-[55%] flex flex-col items-center justify-center text-center px-6 pt-16">
                              <h3 className="font-serif text-3xl font-bold text-[#003366] uppercase tracking-tighter">
                                  {user.first_name} {user.last_name}
                              </h3>
                              <p className="font-sans text-[12px] font-black text-amber-500 uppercase tracking-[0.3em] mt-2">
                                  {user.position || user.membership_status} 
                              </p>
                              {user.group_chapter && (
                                <p className="font-sans text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                                    {user.group_chapter}
                                </p>
                              )}
                              <div className="w-16 h-1 bg-slate-100 rounded-full mt-6"></div>
                          </div>
                       </div>
                       {/* Back Side */}
                       <div className="absolute w-full h-full bg-slate-50 rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden p-6 flex flex-col" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                           <div className="h-12 bg-slate-800 -m-6 mb-6"></div>
                           {/* Use profileData.member_logo_url which now syncs correctly via useEffect */}
                           <img src={cacheBust(profileData.member_logo_url || user.member_logo_url || cms?.movementLogo)} className="w-20 h-20 rounded-full border-4 border-white mx-auto object-contain bg-white shadow-lg -mt-12 mb-4" referrerPolicy="no-referrer" />
                           <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest my-2">Official Member Verification</p>
                           <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 mx-auto rounded-2xl border-4 border-white shadow-md"/>
                           <div className="text-center mt-auto space-y-1 border-t pt-2">
                              <p className="text-[9px] font-black uppercase text-slate-400">Position: <span className="text-[#003366]">{user.position || 'Member'}</span></p>
                              <p className="text-[9px] font-black uppercase text-slate-400">Chapter: <span className="text-[#003366]">{user.region}</span></p>
                              {/* Emergency Contact */}
                              <div className="mt-2 pt-2 border-t border-slate-200">
                                  <p className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-1">Emergency Contact</p>
                                  <p className="text-[9px] font-bold text-slate-700 uppercase">{user.emergency_name || 'NOT SET'}</p>
                                  <p className="text-[9px] font-bold text-slate-700 uppercase">{user.emergency_contact || ''}</p>
                              </div>
                           </div>
                       </div>
                     </div>
                   </div>
                   <div className="text-center max-w-[200px]">
                       <ArrowRightLeft className="mx-auto text-slate-300 mb-4" size={32} />
                       <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest leading-relaxed">
                           Click on your ID card to reveal your secure QR code and Member logo for official verification purposes.
                       </p>
                   </div>
                </div>
             </div>
          )}
          {activeTab === 'profile' && (
            <div className="animate-fade-in space-y-8">
              <h2 className="text-4xl font-serif font-black text-[#003366] uppercase tracking-tighter">Member Profile Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="flex flex-col items-center space-y-4 bg-slate-50 p-8 rounded-3xl border">
                      <div className="relative group w-40 h-40">
                        <img src={profileData.avatar_url} className="w-full h-full rounded-full object-cover border-8 border-white shadow-lg" referrerPolicy="no-referrer" />
                        <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                           {isAvatarUploading ? <Loader2 className="animate-spin" /> : <Camera />}
                           <input type="file" className="hidden" onChange={handleAvatarUpload} />
                        </label>
                      </div>
                      <p className="text-xs font-black uppercase text-slate-400">Update ID Photo (Front)</p>
                  </div>
                  <div className="flex flex-col items-center space-y-4 bg-slate-50 p-8 rounded-3xl border">
                      <div className="relative group w-40 h-40">
                          <img src={cacheBust(profileData.member_logo_url || cms?.movementLogo)} className="w-full h-full rounded-full object-contain p-4 bg-white border-8 border-white shadow-lg" referrerPolicy="no-referrer" />
                          <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                              {isMemberLogoUploading ? <Loader2 className="animate-spin" /> : <ImageIcon />}
                              <input type="file" className="hidden" onChange={handleMemberLogoUpload} />
                          </label>
                      </div>
                      <p className="text-xs font-black uppercase text-slate-400">Update Member Logo (Back)</p>
                  </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input value={profileData.first_name || ''} onChange={e => setProfileData({...profileData, first_name: e.target.value})} placeholder="First Name" className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold"/>
                  <input value={profileData.last_name || ''} onChange={e => setProfileData({...profileData, last_name: e.target.value})} placeholder="Last Name" className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold"/>
                </div>
                {/* NEW POSITION & GROUP/CHAPTER FIELDS */}
                <div className="grid grid-cols-2 gap-4">
                    <input value={profileData.position || ''} onChange={e => setProfileData({...profileData, position: e.target.value})} placeholder="Official Position (e.g. Chapter Head)" className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold"/>
                    <input value={profileData.group_chapter || ''} onChange={e => setProfileData({...profileData, group_chapter: e.target.value})} placeholder="Group / Chapter" className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold uppercase"/>
                </div>
                <div className="grid grid-cols-1">
                    <input value={profileData.region || ''} onChange={e => setProfileData({...profileData, region: e.target.value})} placeholder="Region (e.g. Manila)" className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold uppercase"/>
                </div>
                <input value={profileData.address || ''} onChange={e => setProfileData({...profileData, address: e.target.value})} placeholder="Full Address" className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold"/>
                <input value={profileData.phone || ''} onChange={e => setProfileData({...profileData, phone: e.target.value})} placeholder="Phone Number" className="w-full p-4 bg-slate-50 border rounded-xl text-sm font-bold"/>
              </div>
              <div className="bg-slate-50 p-8 rounded-3xl border mt-8 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400">Emergency & Social Links</h4>
                  <div className="grid grid-cols-2 gap-4">
                     <input value={profileData.emergency_name || ''} onChange={e => setProfileData({...profileData, emergency_name: e.target.value})} placeholder="Emergency Contact Name" className="w-full p-4 bg-white border rounded-xl text-sm"/>
                     <input value={profileData.emergency_contact || ''} onChange={e => setProfileData({...profileData, emergency_contact: e.target.value})} placeholder="Emergency Contact Number" className="w-full p-4 bg-white border rounded-xl text-sm"/>
                     <input value={profileData.facebook_account || ''} onChange={e => setProfileData({...profileData, facebook_account: e.target.value})} placeholder="Facebook Profile URL" className="w-full p-4 bg-white border rounded-xl text-sm"/>
                     <input value={profileData.messenger_account || ''} onChange={e => setProfileData({...profileData, messenger_account: e.target.value})} placeholder="Messenger Username" className="w-full p-4 bg-white border rounded-xl text-sm"/>
                  </div>
              </div>
              <button onClick={handleProfileUpdate} disabled={isUpdatingProfile} className="mt-8 w-full py-5 bg-green-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">
                 {isUpdatingProfile ? <Loader2 className="animate-spin"/> : <Save/>} Synchronize Profile
              </button>
            </div>
          )}
          {activeTab === 'upgrade' && (
             <div className="animate-fade-in space-y-8 text-center">
                 <h2 className="text-4xl font-serif font-black text-[#003366] uppercase tracking-tighter">Activate Exclusive Member</h2>
                 <p className="max-w-2xl mx-auto text-slate-500">Unlock full system access including the Settlement Center, Marketplace, and direct Command transmissions by verifying your Exclusive Member status.</p>
                {upgradeRequest?.status === 'PENDING' ? (
                  <div className="p-12 bg-amber-50 border-amber-300 border rounded-3xl space-y-4"><Clock className="text-amber-500 mx-auto" size={40}/><h4 className="font-black text-amber-800 uppercase">Verification Pending</h4><p className="text-sm text-amber-700">HQ Command is reviewing your submission. Please wait for confirmation.</p></div>
                ) : upgradeRequest?.status === 'APPROVED' ? (
                  <div className="p-12 bg-green-50 border-green-300 border rounded-3xl space-y-4"><CheckCircle className="text-green-600 mx-auto" size={40}/><h4 className="font-black text-green-800 uppercase">Member Activated!</h4><p className="text-sm text-green-700">Your Exclusive status is confirmed. Please log out and log back in to access new features.</p></div>
                ) : (
                 <div className="bg-slate-50 p-10 rounded-[3rem] border space-y-6">
                    <p className="text-xs font-black uppercase text-slate-400">Step 1: Process Verification Fee (₱210) via GCash</p>
                    <img src={cacheBust(cms?.gcashQrUrl)} className="w-56 h-56 mx-auto rounded-2xl border-4 border-white shadow-md" referrerPolicy="no-referrer" />
                    <p className="text-xs font-black uppercase text-slate-400">Step 2: Upload Proof of Payment</p>
                    <div onClick={() => document.getElementById('proof-upload')?.click()} className="h-48 bg-white border-2 border-dashed rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden">
                       <input id="proof-upload" type="file" className="hidden" onChange={handleProofUpload} />
                       {isUploadingProof ? <Loader2 className="animate-spin"/> : upgradeProofUrl ? <img src={upgradeProofUrl} className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" /> : <div className="text-center"><UploadCloud className="mx-auto text-slate-300 mb-2"/> <p className="text-[9px] font-black uppercase text-slate-400">Click to Upload Screenshot</p></div>}
                    </div>
                    <button onClick={handleRequestUpgrade} disabled={isRequestingUpgrade || !upgradeProofUrl} className="w-full py-5 bg-[#003366] text-white font-black rounded-2xl uppercase text-[10px] tracking-widest disabled:opacity-50">
                       {isRequestingUpgrade ? <Loader2 className="animate-spin"/> : 'Submit for Verification'}
                    </button>
                 </div>
                )}
             </div>
          )}
          {activeTab === 'payouts' && (
              <div className="animate-fade-in space-y-10">
                  <div className="bg-amber-500 p-12 rounded-[3.5rem] text-white shadow-2xl flex items-center justify-between">
                      <div><h2 className="text-4xl font-serif font-black uppercase tracking-tighter">Stewardship</h2><p className="font-black uppercase tracking-widest text-[10px]">{cms?.isPayoutActive ? 'PROTOCOL ONLINE' : 'PROTOCOL OFFLINE'}</p></div>
                      <div><p className="text-5xl font-black">₱{(user.wallet_balance || 0).toLocaleString()}</p><p className="text-[10px] text-slate-900 uppercase tracking-[0.3em]">Credits</p></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="bg-slate-50 p-10 rounded-[3rem] border space-y-4">
                           <h4 className="text-xs font-black uppercase tracking-widest text-[#003366]">Settlement Details</h4>
                           <input type="text" readOnly value={`${user.first_name} ${user.last_name}`} className="w-full p-4 border rounded-2xl text-xs bg-slate-100 text-[#003366]" />
                           <input type="text" readOnly value={user.membership_status} className="w-full p-4 border rounded-2xl text-xs font-bold uppercase bg-slate-100 text-slate-500" />
                           <select value={payoutChapter} onChange={e => setPayoutChapter(e.target.value)} className="w-full p-4 border rounded-2xl text-xs font-bold bg-white uppercase"><option value="">Chapter</option>{(cms?.chapters || []).map(ch => <option key={ch.name} value={ch.name}>{ch.name}</option>)}</select>
                           <input type="text" value={payoutAccount} onChange={e => setPayoutAccount(e.target.value)} placeholder="GCash/Bank Number" className="w-full p-4 border rounded-2xl text-xs bg-white" />
                           <input type="number" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} placeholder="Amount" className="w-full p-4 border rounded-2xl text-xs bg-white" />
                      </div>
                      <div className="bg-slate-50 p-10 rounded-[3rem] border space-y-4">
                           <h4 className="text-xs font-black uppercase tracking-widest text-[#003366]">Member ID Verification</h4>
                           <div onClick={() => document.getElementById('id-upload-input-payout')?.click()} className="aspect-video bg-white border-2 border-dashed rounded-[2.5rem] flex items-center justify-center cursor-pointer">
                               {isIdUploading ? <Loader2 className="animate-spin"/> : payoutIdUrl ? <img src={payoutIdUrl} className="w-full h-full object-contain" referrerPolicy="no-referrer" /> : <ImageIcon className="text-slate-300"/>}
                               <input id="id-upload-input-payout" type="file" className="hidden" onChange={handleIdUpload} />
                           </div>
                           <button onClick={handlePayoutRequest} disabled={isRequestingPayout || !cms?.isPayoutActive} className="w-full py-5 bg-[#003366] text-white font-black rounded-2xl uppercase text-[11px] disabled:opacity-50">
                                {isRequestingPayout ? <Loader2 className="animate-spin" /> : 'Commit Broadcast'}
                           </button>
                      </div>
                  </div>
                  <div className="space-y-6 pt-10">
                      <h3 className="text-xl font-serif font-black text-[#003366] uppercase">History</h3>
                      {userPayouts.length === 0 ? <p className="text-slate-500 text-sm">No recent transactions.</p> : userPayouts.map(p => (
                          <div key={p.id} className="p-6 bg-slate-50 border rounded-3xl flex justify-between items-center">
                            <div>
                               <p className="text-xs font-black text-[#003366] uppercase">₱{p.amount.toLocaleString()}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase">{p.status} • {new Date(p.timestamp).toLocaleDateString()}</p>
                            </div>
                            {p.adminProofUrl && <a href={p.adminProofUrl} target="_blank" className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-200"><ImageIcon size={14}/></a>}
                          </div>
                        ))}
                  </div>
              </div>
          )}
          {activeTab === 'marketplace' && (
            <div className="animate-fade-in space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-center pb-8 border-b gap-4">
                <h2 className="text-4xl font-serif font-black text-[#003366] uppercase tracking-tighter">Blessed Marketplace</h2>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                   <button onClick={() => setMarketView('shop')} className={`px-4 py-2 text-[10px] font-black rounded-full whitespace-nowrap ${marketView === 'shop' ? 'bg-[#003366] text-white' : 'bg-slate-100'}`}>Shop</button>
                   <button onClick={() => setMarketView('cart')} className={`px-4 py-2 text-[10px] font-black rounded-full relative whitespace-nowrap ${marketView === 'cart' ? 'bg-[#003366] text-white' : 'bg-slate-100'}`}>
                     Cart {cart.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">{cart.length}</span>}
                   </button>
                   <button onClick={() => setMarketView('orders')} className={`px-4 py-2 text-[10px] font-black rounded-full whitespace-nowrap ${marketView === 'orders' ? 'bg-[#003366] text-white' : 'bg-slate-100'}`}>My Orders</button>
                   <button onClick={() => setShowQrScanner(true)} className="px-4 py-2 text-[10px] font-black rounded-full bg-amber-500 text-white flex items-center gap-2 shadow-lg hover:scale-105 transition-all">
                     <QrCode size={14} /> Scan to Pay
                   </button>
                </div>
              </div>

              {marketView === 'shop' && (
                <div className="space-y-8">
                  <div className="flex gap-2 overflow-x-auto pb-4">
                    <button 
                      onClick={() => setSelectedCategory(null)}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!selectedCategory ? 'bg-[#003366] text-white shadow-md' : 'bg-white border text-slate-400'}`}
                    >
                      All
                    </button>
                    {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-[#003366] text-white shadow-md' : 'bg-white border text-slate-400'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {products.filter(p => !selectedCategory || p.category === selectedCategory).map(product => (
                      <div key={product.id} className="bg-white rounded-[2.5rem] border shadow-lg overflow-hidden flex flex-col group">
                        <div 
                          className="aspect-square bg-slate-50 overflow-hidden cursor-zoom-in"
                          onClick={() => {
                            const categoryProducts = products.filter(p => !selectedCategory || p.category === selectedCategory);
                            setLightboxProducts(categoryProducts);
                            const idx = categoryProducts.findIndex(p => p.id === product.id);
                            setCurrentProductImageIndex(idx);
                            setSelectedProductImage(product.image_url);
                          }}
                        >
                          <img src={product.image_url} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                        </div>
                        <div className="p-6 flex-grow flex flex-col">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-black uppercase text-[#003366] text-sm">{product.name}</h4>
                            <span className="text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-400 uppercase">{product.category}</span>
                          </div>
                          <p className="text-xs text-slate-500 flex-grow">{product.description}</p>
                          <div className="flex justify-between items-center mt-6">
                            <div>
                              <p className="text-xl font-black text-amber-600">{(product.price / (cms?.pointPrice || 1)).toLocaleString()} {cms?.pointName || 'Points'}</p>
                              <p className="text-[9px] font-bold text-slate-400">≈ ₱{product.price.toLocaleString()}</p>
                            </div>
                            <button onClick={() => handleAddToCart(product)} className="bg-[#003366] text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">Add to Cart</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {marketView === 'cart' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <div className="lg:col-span-2 space-y-4">
                     {cart.length === 0 ? <p>Your cart is empty.</p> : cart.map(item => (
                       <div key={item.product_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border">
                         <div className="flex items-center gap-4">
                           <img src={item.image_url} className="w-16 h-16 rounded-xl object-contain bg-white p-1" referrerPolicy="no-referrer" />
                           <div>
                             <p className="font-black text-sm uppercase text-[#003366]">{item.name}</p>
                             <p className="text-xs font-bold text-slate-500">₱{item.price.toLocaleString()} x {item.quantity}</p>
                             {item.delivery_fee && item.delivery_fee > 0 && <p className="text-[9px] font-black text-slate-400">Shipping: ₱{(item.delivery_fee * item.quantity).toLocaleString()}</p>}
                           </div>
                         </div>
                         <button onClick={() => handleRemoveFromCart(item.product_id)} className="p-2 text-red-500"><Trash2 size={16}/></button>
                       </div>
                     ))}
                   </div>
                   <div className="bg-slate-50 p-8 rounded-[2rem] border space-y-4">
                      <h4 className="text-xs font-black uppercase text-slate-400">Order Summary</h4>
                      <div className="space-y-2 pb-4 border-b">
                        <div className="flex justify-between items-center text-sm font-bold text-slate-600"><span>Subtotal</span><span>₱{cart.reduce((s,i)=>s+i.price*i.quantity,0).toLocaleString()}</span></div>
                        <div className="flex justify-between items-center text-sm font-bold text-slate-600"><span>Shipping</span><span>₱{totalDeliveryFee.toLocaleString()}</span></div>
                      </div>
                      <div className="flex justify-between items-center text-xl font-black text-[#003366]"><span>Total</span><span>{(cartTotal / (cms?.pointPrice || 1)).toLocaleString()} {cms?.pointName || 'Points'}</span></div>
                      <p className="text-[10px] font-bold text-slate-400 text-right">≈ ₱{cartTotal.toLocaleString()}</p>
                      <div className="space-y-4 pt-4 border-t mt-4">
                         <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payment Method</h5>
                         <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => setPaymentMethod('POINTS')}
                              className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${paymentMethod === 'POINTS' ? 'border-[#003366] bg-blue-50 text-[#003366]' : 'border-slate-100 text-slate-400'}`}
                            >
                              {cms?.pointName || 'Points'}
                            </button>
                            <button 
                              onClick={() => setPaymentMethod('GCASH_BANK')}
                              className={`p-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${paymentMethod === 'GCASH_BANK' ? 'border-[#003366] bg-blue-50 text-[#003366]' : 'border-slate-100 text-slate-400'}`}
                            >
                              GCash / Bank
                            </button>
                          </div>

                          {paymentMethod === 'POINTS' ? (
                            <div className="p-6 bg-[#003366] rounded-2xl text-white text-center space-y-2">
                               <p className="text-[9px] font-black uppercase text-blue-300">Available Balance</p>
                               <p className="text-2xl font-black">{((user.wallet_balance || 0) / (cms?.pointPrice || 1)).toLocaleString()} {(cms?.pointName || 'Points').split(' ')[0]}</p>
                               <p className="text-[9px] font-bold text-blue-200">Points deducted instantly.</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                               <div className="p-4 bg-slate-100 rounded-2xl text-center space-y-2">
                                  <p className="text-[9px] font-black uppercase text-slate-500">Scan Official GCash</p>
                                  <img src={cacheBust(cms?.gcashQrUrl)} className="w-24 h-24 mx-auto rounded-lg border shadow-sm" referrerPolicy="no-referrer" />
                               </div>
                               <div onClick={() => document.getElementById('order-proof-upload')?.click()} className="h-32 bg-white border-2 border-dashed rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden text-center">
                                  <input id="order-proof-upload" type="file" className="hidden" onChange={handleOrderProofUpload} />
                                  {isUploadingOrderProof ? <Loader2 className="animate-spin mx-auto"/> : orderProofUrl ? <img src={orderProofUrl} className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" /> : <div className="text-center"><ImageIcon className="mx-auto text-slate-300 mb-1"/> <p className="text-[8px] font-black uppercase text-slate-400">Upload Proof</p></div>}
                               </div>
                            </div>
                          )}
                       </div>
                      <button onClick={handlePlaceOrder} disabled={isPlacingOrder || cart.length === 0 || (paymentMethod === 'POINTS' && user.wallet_balance < cartTotal) || (paymentMethod === 'GCASH_BANK' && !orderProofUrl)} className="w-full py-4 bg-green-600 text-white font-black rounded-xl uppercase text-[10px] tracking-widest disabled:opacity-50 mt-4">
                        {isPlacingOrder ? <Loader2 className="animate-spin mx-auto"/> : (paymentMethod === 'POINTS' && user.wallet_balance < cartTotal) ? 'Insufficient Points' : 'Place Order'}
                      </button>
                   </div>
                </div>
              )}

              {marketView === 'orders' && (
                <div className="space-y-4">
                  {userOrders.map(order => (
                    <div key={order.id} className="p-6 bg-slate-50 rounded-3xl border">
                       <div className="flex justify-between items-center">
                         <div>
                           <p className="text-[10px] font-black uppercase text-slate-400">Order #{order.id.substring(0, 8)}</p>
                           <p className="text-lg font-black uppercase text-[#003366]">₱{order.total_amount.toLocaleString()}</p>
                         </div>
                         <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${order.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>{order.status}</span>
                       </div>
                       <div className="mt-4 pt-4 border-t space-y-2">
                         {(order.items || []).map(item => (
                           <p key={item.product_id} className="text-xs text-slate-600 font-bold">{item.name} x {item.quantity}</p>
                         ))}
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'wallet' && (
            <div className="animate-fade-in space-y-10">
              <div className="bg-[#003366] p-12 rounded-[3.5rem] text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="relative z-10">
                  <h2 className="text-4xl font-serif font-black uppercase tracking-tighter">Blessed Points</h2>
                  <p className="font-black uppercase tracking-widest text-[10px] text-blue-300 mt-2">Secure Blessed Credits</p>
                  <div className="mt-6 p-4 bg-white/10 rounded-2xl border border-white/20">
                    <p className="text-[9px] font-black uppercase text-blue-200 mb-1">Your Unique Digital Code</p>
                    <p className="text-xl font-mono font-bold tracking-widest">{user.wallet_code || 'DW-GENERATING...'}</p>
                  </div>
                </div>
                <div className="text-center md:text-right relative z-10 flex flex-col items-center md:items-end">
                  {cms?.walletPointLogoUrl && (
                    <img 
                      src={cacheBust(cms.walletPointLogoUrl)} 
                      alt="Blessed Point" 
                      className="w-16 h-16 object-contain mb-4 drop-shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <p className="text-5xl font-black">{((user.wallet_balance || 0) / (cms?.pointPrice || 1)).toLocaleString()} <span className="text-2xl text-blue-300">{(cms?.pointName || 'Points').split(' ')[0]}</span></p>
                  <p className="text-[10px] text-blue-300 uppercase tracking-[0.3em] mt-2">≈ ₱{(user.wallet_balance || 0).toLocaleString()} PHP</p>
                  <div className="mt-4 inline-block px-4 py-1 bg-green-500/20 rounded-full border border-green-500/30">
                    <p className="text-[8px] font-black text-green-400 uppercase tracking-widest">1 {(cms?.pointName || 'Points').split(' ')[0]} = ₱{cms?.pointPrice || 0} PHP</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[3rem] border shadow-sm space-y-6">
                 <div className="flex items-center gap-4 text-[#003366]">
                    <TrendingUp size={24}/>
                    <h4 className="font-black uppercase text-sm tracking-widest">How to Use Blessed Points</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#003366] font-black">1</div>
                        <p className="text-xs font-black uppercase text-[#003366]">Send Points</p>
                        <p className="text-[10px] text-slate-500 font-medium">Send Blessed Points to other users instantly using their unique digital code.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 font-black">2</div>
                        <p className="text-xs font-black uppercase text-green-600">Marketplace</p>
                        <p className="text-[10px] text-slate-500 font-medium">Buy products in the Marketplace using your Blessed Points balance.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 font-black">3</div>
                        <p className="text-xs font-black uppercase text-amber-600">Scan to Pay</p>
                        <p className="text-[10px] text-slate-500 font-medium">Pay using QR Code generated by User ID at authorized merchants.</p>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Cash In */}
                <div className="bg-white p-8 rounded-[2.5rem] border shadow-lg space-y-6">
                  <div className="flex items-center gap-4 text-[#003366]">
                    <div className="p-3 bg-blue-50 rounded-2xl"><UploadCloud size={24}/></div>
                    <h4 className="font-black uppercase text-sm">Cash In</h4>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase text-center">Scan Official GCash QR</p>
                    <img src={cacheBust(cms?.gcashQrUrl)} className="w-32 h-32 mx-auto rounded-xl border-2 border-slate-100 shadow-sm" referrerPolicy="no-referrer" />
                    <input type="number" value={cashInAmount} onChange={e => setCashInAmount(e.target.value)} placeholder="Amount to Cash In" className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold" />
                    <div onClick={() => document.getElementById('cashin-proof')?.click()} className="aspect-video bg-slate-50 border-2 border-dashed rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden">
                      <input id="cashin-proof" type="file" className="hidden" onChange={handleCashInProofUpload} />
                      {isUploadingCashInProof ? <Loader2 className="animate-spin" /> : cashInProofUrl ? <img src={cashInProofUrl} className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" /> : <div className="text-center"><ImageIcon className="mx-auto text-slate-300 mb-1"/> <p className="text-[8px] font-black uppercase text-slate-400">Upload Proof</p></div>}
                    </div>
                    <button onClick={handleCashInRequest} disabled={isRequestingCashIn || !cashInAmount || !cashInProofUrl} className="w-full py-4 bg-[#003366] text-white font-black rounded-xl uppercase text-[10px] tracking-widest disabled:opacity-50">
                      {isRequestingCashIn ? <Loader2 className="animate-spin" /> : 'Request Cash In'}
                    </button>
                  </div>
                </div>

                {/* Send Points */}
                <div className="bg-white p-8 rounded-[2.5rem] border shadow-lg space-y-6">
                  <div className="flex items-center gap-4 text-green-600">
                    <div className="p-3 bg-green-50 rounded-2xl"><ArrowRightLeft size={24}/></div>
                    <h4 className="font-black uppercase text-sm">Send Points</h4>
                  </div>
                  <div className="space-y-4">
                    <input type="text" value={sendTargetCode} onChange={e => setSendTargetCode(e.target.value)} placeholder="Recipient Digital Code" className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold" />
                    <input type="number" value={sendAmount} onChange={e => setSendAmount(e.target.value)} placeholder="Amount to Send" className="w-full p-4 bg-slate-50 border rounded-2xl text-xs font-bold" />
                    <button onClick={handleSendPoints} disabled={isSendingPoints || !sendAmount || !sendTargetCode} className="w-full py-4 bg-green-600 text-white font-black rounded-xl uppercase text-[10px] tracking-widest disabled:opacity-50">
                      {isSendingPoints ? <Loader2 className="animate-spin" /> : 'Transfer Points'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-10 rounded-[3rem] border shadow-xl space-y-8">
                <h3 className="text-2xl font-serif font-black text-[#003366] uppercase tracking-tighter">Transaction Registry</h3>
                <div className="space-y-4">
                  {walletTransactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-bold uppercase text-xs">No transactions recorded.</div>
                  ) : walletTransactions.map(tx => (
                    <div key={tx.id} className="p-6 bg-slate-50 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${
                          tx.type.includes('IN') || tx.type.includes('RECEIVE') || tx.type.includes('GRANT') ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {tx.type.includes('IN') || tx.type.includes('RECEIVE') || tx.type.includes('GRANT') ? <CheckCircle size={20}/> : <XCircle size={20}/>}
                        </div>
                        <div>
                          <p className="text-xs font-black text-[#003366] uppercase tracking-widest">
                            {tx.type === 'EMERGENCY_GRANT' && tx.target_user_name ? 'TRANSFER RECEIVED' : tx.type.replace('_', ' ')}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(tx.timestamp).toLocaleString()}</p>
                          {tx.target_user_name && <p className="text-[9px] font-black text-slate-500 uppercase mt-1">To/From: {tx.target_user_name}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-black ${
                          tx.type.includes('IN') || tx.type.includes('RECEIVE') || tx.type.includes('GRANT') ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {tx.type.includes('IN') || tx.type.includes('RECEIVE') || tx.type.includes('GRANT') ? '+' : '-'} ₱{tx.amount.toLocaleString()}
                        </p>
                        <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full ${
                          tx.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 
                          tx.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Marketplace Image Lightbox */}
      {selectedProductImage && (
        <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
          <button 
            onClick={() => setSelectedProductImage(null)}
            className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors z-[10001]"
          >
            <X size={48} />
          </button>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              const newIdx = (currentProductImageIndex - 1 + lightboxProducts.length) % lightboxProducts.length;
              setCurrentProductImageIndex(newIdx);
              setSelectedProductImage(lightboxProducts[newIdx].image_url);
            }}
            className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-4 bg-white/5 rounded-full hover:bg-white/10"
          >
            <ChevronLeft size={48} />
          </button>

          <div className="w-full h-full flex flex-col items-center justify-center gap-8">
            <div className="relative max-w-5xl w-full aspect-square md:aspect-video bg-white/5 rounded-[3rem] overflow-hidden flex items-center justify-center p-8">
              <img 
                src={selectedProductImage} 
                className="max-w-full max-h-full object-contain drop-shadow-2xl animate-in zoom-in-95 duration-500" 
                alt="Zoomed Product"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-serif font-black text-white uppercase tracking-tighter">
                {lightboxProducts[currentProductImageIndex]?.name}
              </h3>
              <p className="text-blue-400 font-black uppercase tracking-widest text-xs">
                {currentProductImageIndex + 1} / {lightboxProducts.length}
              </p>
            </div>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              const newIdx = (currentProductImageIndex + 1) % lightboxProducts.length;
              setCurrentProductImageIndex(newIdx);
              setSelectedProductImage(lightboxProducts[newIdx].image_url);
            }}
            className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors p-4 bg-white/5 rounded-full hover:bg-white/10"
          >
            <ChevronRight size={48} />
          </button>
        </div>
      )}

      {/* Assistance Program Deduction Popup */}
      {showQrScanner && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden relative">
            <button onClick={() => setShowQrScanner(false)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full z-10"><X size={20}/></button>
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-serif font-black text-[#003366] uppercase">Blessed QR Scanner</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scan product QR to pay instantly</p>
              </div>
              <div id="qr-reader" className="rounded-2xl overflow-hidden border-4 border-slate-100"></div>
              <p className="text-[9px] font-bold text-slate-400 text-center uppercase">Align the QR code within the frame to process payment.</p>
            </div>
          </div>
        </div>
      )}

      {assistancePopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(79,70,229,0.4)] border-[6px] border-indigo-600 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            <div className="bg-indigo-600 p-10 text-white text-center relative overflow-hidden">
              {/* Animated Background Elements */}
              <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,white_1px,transparent_1px)] [background-size:20px_20px] animate-[spin_60s_linear_infinite]"></div>
              </div>
              
              <div className="absolute top-6 right-10 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                <div className="text-[11px] font-black uppercase tracking-widest text-white/80">System Alert: {popupTimer}s</div>
              </div>
              
              <div className="relative z-10">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border-4 border-indigo-400 animate-bounce">
                  <ShieldAlert size={48} className="text-indigo-600" />
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tighter leading-tight mb-2">{assistancePopup.title}</h3>
                <div className="inline-block px-4 py-1 bg-white/20 rounded-full border border-white/30">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">BLESSED ASSISTANCE PROTOCOL</p>
                </div>
              </div>
            </div>
            
            <div className="p-12 text-center space-y-8 bg-slate-50">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-inner border border-slate-100">
                <p className="text-slate-700 text-sm font-bold leading-relaxed whitespace-pre-wrap">
                  {assistancePopup.message}
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-indigo-600">
                  <Heart size={18} className="animate-pulse" />
                  <p className="text-[11px] font-black uppercase tracking-widest">
                    "Sa BLESSED, walang maiiwan."
                  </p>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                  Sama-sama, tulong-tulong, aangat ang bawat isa.
                </p>
              </div>
              
              <button 
                onClick={() => {
                  setAssistancePopup(null);
                  if (buzzerRef.current) {
                    buzzerRef.current.pause();
                    buzzerRef.current.currentTime = 0;
                  }
                }}
                className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 active:scale-95"
              >
                I Acknowledge & Support
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberPortal;
