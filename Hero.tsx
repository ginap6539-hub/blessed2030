
import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquare, Shield, Globe, Zap, Loader2, X, Users, AlignLeft, Heart } from 'lucide-react';
import { CmsContent } from '../types';

interface ContactPageProps {
  cms: CmsContent;
}

const ContactPage: React.FC<ContactPageProps> = ({ cms }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assistancePopup, setAssistancePopup] = useState<{ id: string, title: string, description: string, coverage: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate transmission
    setTimeout(() => {
      alert("COMMAND BROADCAST TRANSMITTED: Your message has been sent to the HQ Support Member.");
      setFormData({ name: '', email: '', subject: '', message: '' });
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <div className="animate-fade-in bg-white min-h-screen pb-24">
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
            </div>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative py-32 px-4 text-center bg-[#003366] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:24px_24px]"></div>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto space-y-4">
          <span className="text-[10px] font-black text-[#FFC107] uppercase tracking-[0.8em] mb-4 block animate-slide-up">Support Member</span>
          <h1 className="text-5xl md:text-7xl font-serif font-black uppercase tracking-tighter animate-slide-up">Contact Command</h1>
          <p className="text-blue-200 font-medium max-w-2xl mx-auto animate-slide-up">Establish a secure link with the Blessed Movement HQ.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Contact Methods */}
          <div className="lg:col-span-4 space-y-6">
            <ContactInfoCard 
              icon={<Mail className="text-[#FFC107]" />} 
              label="Secure Email" 
              value={cms.contactEmail} 
              desc="Official registry and support inquiries"
            />
            <ContactInfoCard 
              icon={<Phone className="text-[#FFC107]" />} 
              label="Direct Link" 
              value={cms.contactPhone} 
              desc="Available during HQ operation hours"
            />
            <ContactInfoCard 
              icon={<MapPin className="text-[#FFC107]" />} 
              label="HQ Coordinates" 
              value={cms.contactAddress} 
              desc="Blessed Movement Command Center"
            />

            {/* eGovPH Link */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center text-center space-y-4 hover:scale-105 transition-transform cursor-pointer" onClick={() => window.open('https://e.gov.ph/', '_blank')}>
              <div className="w-16 h-16 bg-blue-50 text-[#003366] rounded-2xl flex items-center justify-center shadow-inner">
                <Globe size={32} />
              </div>
              <div>
                <h3 className="font-black text-[#003366] uppercase text-lg tracking-tight">eGovPH Portal</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Official Government Services</p>
              </div>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                Access all Philippine government services in one unified platform. Secure, fast, and reliable. Click here to connect to the official eGovPH system.
              </p>
              <div className="w-full pt-4 border-t border-slate-50">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center justify-center gap-2">
                  Access Portal <Send size={10} />
                </span>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-8">
            <div className="bg-white p-10 md:p-16 rounded-[3rem] shadow-2xl border border-slate-100 h-full">
              <div className="flex items-center gap-4 mb-10">
                <div className="bg-blue-50 p-4 rounded-2xl text-[#003366]">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-black text-[#003366] uppercase tracking-tight">Transmission of Feedback</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Encrypted Communication Portal</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#003366] outline-none" 
                      placeholder="IDENTIFY YOURSELF"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email Member</label>
                    <input 
                      required
                      type="email" 
                      className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#003366] outline-none" 
                      placeholder="MEMBER@EXAMPLE.COM"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Transmission Subject</label>
                  <input 
                    required
                    type="text" 
                    className="w-full p-4 bg-slate-50 border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#003366] outline-none" 
                    placeholder="NATURE OF BROADCAST"
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Broadcast Message</label>
                  <textarea 
                    required
                    className="w-full p-6 bg-slate-50 border rounded-3xl text-sm font-bold focus:ring-2 focus:ring-[#003366] outline-none min-h-[150px]" 
                    placeholder="ENTER YOUR COMMUNICATION HERE..."
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                  />
                </div>
                <button 
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-12 py-5 bg-[#003366] text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><Send size={18} /> Transmit Message</>}
                </button>
              </form>
            </div>
          </div>

        </div>

        {/* Assistance Program Section */}
        <div className="mt-16 bg-slate-900 p-12 rounded-[3.5rem] text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="relative z-10 space-y-6">
                <h3 className="text-3xl font-serif font-black uppercase tracking-tighter">BLESSED MOVEMENT ASSISTANCE PROGRAM</h3>
                 <p className="text-[11px] font-bold text-blue-300 uppercase tracking-tight">
                   ANO ITO? ito ay programa ng pagtulongan ng bawat miyembro ng blessed movement upang may nakahandang pondo para sa oras ng pangangailangan
                 </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        className={`${prog.color} p-6 rounded-[2rem] border border-white/10 text-left hover:scale-[1.02] transition-all shadow-lg flex flex-col gap-3 h-full`}
                      >
                          <p className="text-sm font-black uppercase tracking-tight text-white">{prog.title}</p>
                          <p className="text-[9px] font-medium text-white/90 leading-tight">{prog.desc}</p>
                      </button>
                    ))}
                </div>

                {/* Detailed Program Information - Always Visible */}
                <div className="mt-12 pt-12 border-t border-white/10 space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                         <div className="flex items-center gap-3 text-emerald-400">
                            <Heart size={20} />
                            <h4 className="font-black uppercase text-xs tracking-widest">Sagip Kapwa Continuous Assistance</h4>
                         </div>
                         <p className="text-xs font-medium text-blue-100 leading-relaxed">
                            🚑 SAGIP KAPWA: Tulong para sa mga hindi miyembro lalo na sa panahon ng emergency. Relief operations, Disaster response, Food assistance, Community emergency support. 
                            This program ensures that the Blessed Movement remains a beacon of hope for the entire community, providing continuous support beyond our immediate membership.
                         </p>
                      </div>
                      <div className="space-y-6">
                         <div className="flex items-center gap-3 text-blue-400">
                            <Shield size={20} />
                            <h4 className="font-black uppercase text-xs tracking-widest">Program Coverage Details</h4>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                               <p className="text-[8px] font-black text-blue-300 uppercase mb-1">Kapatiran</p>
                               <p className="text-[10px] font-bold text-white uppercase">All BLESSED Officers and Members</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                               <p className="text-[8px] font-black text-red-300 uppercase mb-1">Damayan</p>
                               <p className="text-[10px] font-bold text-white uppercase">Immediate Family of Members</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                               <p className="text-[8px] font-black text-indigo-300 uppercase mb-1">Kakampi</p>
                               <p className="text-[10px] font-bold text-white uppercase">Friends and Associates</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                               <p className="text-[8px] font-black text-emerald-300 uppercase mb-1">Sagip Kapwa</p>
                               <p className="text-[10px] font-bold text-white uppercase">All Non-BLESSED Members</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const ContactInfoCard = ({ icon, label, value, desc }: any) => (
  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-start gap-6 hover:shadow-2xl transition-all group">
    <div className="bg-slate-50 p-4 rounded-2xl group-hover:bg-[#003366] transition-colors">
      {React.cloneElement(icon, { size: 24, className: "group-hover:text-white transition-colors" })}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-black text-[#003366] uppercase mt-1 leading-tight">{value}</p>
      <p className="text-[9px] font-bold text-slate-300 uppercase mt-2">{desc}</p>
    </div>
  </div>
);

export default ContactPage;
