
import React, { useState, useEffect } from 'react';
import { Camera, ArrowRight, Check, Loader2, Shield, Mail, UploadCloud, ImageIcon } from 'lucide-react';
import { authService, storageService } from '../services/supabaseService';
import { Group, User, CmsContent } from '../types';

interface AuthWizardProps {
  onComplete: (user?: User | null, options?: { fromRegistration?: boolean }) => void;
  cms: CmsContent;
}

const AuthWizard: React.FC<AuthWizardProps> = ({ onComplete, cms }) => {
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isMemberLogoUploading, setIsMemberLogoUploading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    position: '',
    region: 'NCR',
    groupId: '',
    avatarUrl: '',
    memberLogoUrl: '', // For back of ID
    address: '',
    phone: ''
  });

  const [resetEmail, setResetEmail] = useState('');

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsAvatarUploading(true);
      try {
          const url = await storageService.uploadImage(file, cms.storageBucketName);
          setFormData(prev => ({ ...prev, avatarUrl: url }));
      } catch (err) {
          console.error("Avatar upload failed:", err);
      } finally {
          setIsAvatarUploading(false);
      }
    }
  };

  const handleMemberLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsMemberLogoUploading(true);
      try {
          const url = await storageService.uploadImage(file, cms.storageBucketName);
          setFormData(prev => ({ ...prev, memberLogoUrl: url }));
      } catch (err) {
          console.error("Member Logo upload failed:", err);
      } finally {
          setIsMemberLogoUploading(false);
      }
    }
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      alert("Please enter both email and access key.");
      return;
    }
    setLoading(true);
    try {
      const user = await authService.login(formData.email, formData.password);
      if (user) {
        onComplete(user);
      } else {
        alert("Login failed.");
      }
    } catch (error: any) {
      alert(`Access Denied: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!formData.firstName || !formData.lastName || !formData.password || !formData.address || !formData.region) {
      alert("All fields are mandatory.");
      return;
    }
    setLoading(true);
    try {
        let location = { lat: null, lng: null };
        if ("geolocation" in navigator) {
            try {
                const position: any = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
                });
                location = { lat: position.coords.latitude, lng: position.coords.longitude };
            } catch (e) {
                console.warn("Geolocation permission denied or unavailable", e);
            }
        }
        
        const registrationData = { ...formData, ...location };
        const newUser = await authService.register(registrationData);
        if (newUser) {
            onComplete(newUser, { fromRegistration: true });
        }
    } catch (error: any) {
        alert(`Registration Error: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
      if (!resetEmail) {
          alert("Please enter email.");
          return;
      }
      setLoading(true);
      try {
          await authService.forgotPassword(resetEmail);
          alert("Recovery link transmitted.");
          setStep(1);
      } catch (error: any) {
          alert(`Transmission Failure: ${error.message}`);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Video Layer */}
      <div className="absolute inset-0 z-0">
          <iframe
            className="w-full h-full object-cover scale-[1.35] pointer-events-none"
            src={`https://www.youtube.com/embed/${cms.heroVideoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${cms.heroVideoId}&modestbranding=1&showinfo=0&rel=0&iv_load_policy=3`}
            title="Auth Background Video"
            allow="autoplay; encrypted-media"
          />
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"></div>
      </div>

      <div className="bg-white p-12 rounded-[3.5rem] w-full max-w-xl shadow-2xl relative animate-fade-in border border-white/20 z-10">
        <div className="mb-10 text-center">
          <img src={cms.logoUrl} className="w-20 h-20 mx-auto mb-4 object-contain" alt="Logo" referrerPolicy="no-referrer" />
          <h2 className="text-3xl font-serif font-black text-patriot-navy uppercase tracking-tighter">
            {step === 1 ? 'Blessed Access' : step === 4 ? 'Restore Access' : step === 2 ? 'Identify Yourself' : 'Final Verification'}
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Blessed Movement Member Registry</p>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Secure Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-patriot-navy outline-none" placeholder="name@example.com" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Access Password</label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-patriot-navy outline-none" placeholder="••••••••" />
              </div>
            </div>
            <button onClick={handleLogin} disabled={loading} className="w-full bg-patriot-navy text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-xl uppercase tracking-widest text-xs">
              {loading ? <Loader2 className="animate-spin"/> : 'Enter Command Center'} <ArrowRight className="w-4 h-4"/>
            </button>
            <div className="flex justify-between items-center px-2">
              <button onClick={() => setStep(4)} className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hover:text-blue-600">Forgot Access Key?</button>
              <button onClick={() => setStep(2)} className="text-[10px] text-blue-600 font-bold uppercase tracking-widest hover:underline">Apply as New Member</button>
            </div>
          </div>
        )}

        {step === 4 && (
             <div className="space-y-6 animate-fade-in">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Registered Email</label>
                    <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-patriot-navy outline-none" placeholder="Enter your email to receive a reset link" />
                </div>
                <button onClick={handleForgotPassword} disabled={loading} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-xl uppercase tracking-widest text-xs">
                  {loading ? <Loader2 className="animate-spin"/> : <><Mail className="w-4 h-4"/> Send Recovery Link</>}
                </button>
                <div className="text-center">
                    <button onClick={() => setStep(1)} className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hover:text-patriot-navy">Return to Login</button>
                </div>
             </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <input className="w-full p-4 bg-slate-50 border rounded-2xl text-sm" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} placeholder="FIRST NAME" />
               <input className="w-full p-4 bg-slate-50 border rounded-2xl text-sm" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} placeholder="LAST NAME" />
             </div>
             <input className="w-full p-4 bg-slate-50 border rounded-2xl text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="SECURE EMAIL" />
             <input type="password" title="Set your password" className="w-full p-4 bg-slate-50 border rounded-2xl text-sm" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="CREATE LOGIN PASSWORD" />
             <div className="flex gap-4 pt-4">
               <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 text-slate-600 font-black py-5 rounded-2xl uppercase tracking-widest text-xs">Back</button>
               <button onClick={() => setStep(3)} className="flex-[2] bg-patriot-navy text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs">Continue</button>
             </div>
          </div>
        )}
        
        {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-600 outline-none" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} placeholder="OFFICIAL POSITION" />
                <input className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-600 outline-none" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} placeholder="CHAPTER (E.G. MANILA)" />
              </div>
              <input className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-600 outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="FULL RESIDENCE ADDRESS" />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Avatar Upload */}
                <div className="p-4 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50 flex flex-col items-center justify-center gap-2">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-inner relative group">
                    {isAvatarUploading ? (
                        <Loader2 className="animate-spin text-patriot-navy" />
                    ) : formData.avatarUrl ? (
                        <img src={formData.avatarUrl} className="w-full h-full object-cover" alt="Avatar Preview" />
                    ) : (
                        <Camera className="text-slate-300" />
                    )}
                    {!isAvatarUploading && <input type="file" accept="image/*" onChange={handleAvatarChange} className="absolute inset-0 opacity-0 cursor-pointer" />}
                  </div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">ID Photo (Front)</p>
                </div>

                {/* Member Logo Upload (Back of ID) */}
                <div className="p-4 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50 flex flex-col items-center justify-center gap-2">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-inner relative group">
                    {isMemberLogoUploading ? (
                        <Loader2 className="animate-spin text-patriot-navy" />
                    ) : formData.memberLogoUrl ? (
                        <img src={formData.memberLogoUrl} className="w-full h-full object-contain p-1" alt="Member Logo Preview" />
                    ) : (
                        <ImageIcon className="text-slate-300" />
                    )}
                    {!isMemberLogoUploading && <input type="file" accept="image/*" onChange={handleMemberLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />}
                  </div>
                  <p className="text-[8px] font-black text-slate-400 uppercase">Member Logo (Back)</p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setStep(2)} className="flex-1 bg-slate-100 text-slate-600 font-black py-5 rounded-2xl uppercase tracking-widest text-xs">Back</button>
                <button onClick={handleRegister} disabled={loading || isAvatarUploading || isMemberLogoUploading} className="flex-[2] bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-xs flex items-center justify-center gap-3">
                  {loading ? <><Loader2 className="animate-spin w-4 h-4"/> Syncing...</> : <><Check className="w-4 h-4"/> Confirm Registration</>}
                </button>
              </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AuthWizard;