
import React from 'react';
import Hero from './Hero';
import { CmsContent } from '../types';
import { Target, Eye, Shield, Award, Users, Handshake, Zap, CheckCircle, Play } from 'lucide-react';

interface HomePageProps {
  cms: CmsContent;
  onEnter: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ cms, onEnter }) => {
  const cacheBust = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return cms.updatedAt ? `${url}${separator}v=${cms.updatedAt}` : url;
  };

  // Helper to extract YouTube ID from potentially full URLs in CMS
  const getVideoId = (input: string) => {
    if (!input) return '';
    try {
        if (input.includes('v=')) return input.split('v=')[1].split('&')[0];
        if (input.includes('youtu.be/')) return input.split('youtu.be/')[1].split('?')[0];
        if (input.includes('embed/')) return input.split('embed/')[1].split('?')[0];
        return input; 
    } catch (e) {
        return input;
    }
  };

  const avpId = getVideoId(cms.avpVideoId);

  return (
    <div className="animate-fade-in overflow-x-hidden">
      {/* 1. HERO SECTION (Splash) */}
      <Hero cms={cms} onEnter={onEnter} />

      {/* 2. IDENTITY & ORIGIN SECTION */}
      <section className="py-24 bg-white px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.5em]">Identity & Origin</span>
            <h2 className="text-4xl md:text-5xl font-serif font-black text-[#003366] uppercase tracking-tighter leading-none">
              A Socio-Civic <br/><span className="text-blue-600">Transformation</span>
            </h2>
            <p className="text-slate-600 leading-relaxed text-lg">
              Originated from various BBM (Bongbong Marcos) supporter groups and coalitions, the BLESSED Movement positions itself as a civil society organization dedicated to patriotism, national unity, and spiritual values.
            </p>
            <div className="p-8 bg-slate-50 rounded-[2rem] border-l-4 border-[#FFC107]">
               <p className="italic text-slate-700 font-medium">
                 "Our leadership is driven by the vision of Founding Chairman Herbert Antonio S. Martinez, organizing over 2 million supporters nationwide."
               </p>
            </div>
          </div>
          <div className="relative group">
             <div className="absolute -inset-4 bg-[#FFC107]/10 rounded-[3rem] blur-2xl group-hover:bg-[#FFC107]/20 transition-all"></div>
             <img 
               src={cacheBust(cms.homeAboutImageUrl)} 
               alt="Movement Foundation" 
               className="relative rounded-[3rem] shadow-2xl w-full h-[500px] object-cover border-8 border-white transition-all duration-500 group-hover:scale-[1.02]"
             />
          </div>
        </div>
      </section>

      {/* 3. MISSION & VISION SECTION */}
      <section className="py-24 bg-slate-900 text-white px-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <div className="p-12 bg-white/5 backdrop-blur-xl rounded-[3rem] border border-white/10 space-y-6 hover:bg-white/10 transition-all">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-3xl font-serif font-black uppercase tracking-tighter">Our Mission</h3>
            <p className="text-slate-300 leading-relaxed">
              To engage communities in nation-building and combat corruption through advocacy, community engagement, and strategic partnerships, upholding the values of God and Country above all.
            </p>
          </div>
          <div className="p-12 bg-[#FFC107]/5 backdrop-blur-xl rounded-[3rem] border border-[#FFC107]/20 space-y-6 hover:bg-[#FFC107]/10 transition-all">
            <div className="w-16 h-16 bg-[#FFC107] rounded-2xl flex items-center justify-center shadow-xl">
              <Eye className="w-8 h-8 text-slate-900" />
            </div>
            <h3 className="text-3xl font-serif font-black uppercase tracking-tighter">Our Vision</h3>
            <p className="text-slate-300 leading-relaxed">
              Envisions a just and prosperous Philippines with integrity, unity, and eliminated corruption, driven by empowered citizens who love God and their country.
            </p>
          </div>
        </div>
      </section>

      {/* 4. GOALS & OBJECTIVES */}
      <section className="py-24 bg-white px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-black text-[#003366] uppercase tracking-tighter">Goals & Objectives</h2>
            <div className="w-24 h-1 bg-[#FFC107] mx-auto mt-4"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GoalCard icon={<Award/>} title="Patriotism" desc="Promote deep-seated nationalism among all Filipinos." />
            <GoalCard icon={<Zap/>} title="Transformation" desc="Foster social change through spiritual and ethical values." />
            <GoalCard icon={<Shield/>} title="Governance" desc="Uphold upright governance and fight graft and corruption." />
            <GoalCard icon={<Users/>} title="Engagement" desc="Actively involve civil society in strategic nation-building." />
            <GoalCard icon={<Handshake/>} title="Solidarity" desc="Build community resilience through collective synergy." />
            <GoalCard icon={<CheckCircle/>} title="Empowerment" desc="Empower citizens to lead with integrity and honesty." />
          </div>
        </div>
      </section>

      {/* 5. MEMBERSHIP BENEFITS (THE CORE VALUE) */}
      <section className="py-24 bg-slate-50 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-4 space-y-6">
               <h2 className="text-4xl font-serif font-black text-[#003366] uppercase tracking-tighter">Membership <br/>Advantages</h2>
               <p className="text-slate-500">Joining the BLESSED Movement provides access to a socio-economic ecosystem designed for prosperity.</p>
               <ul className="space-y-4">
                  <BenefitItem text="Collaboration with NGOs & Community Sectors" />
                  <BenefitItem text="Engagement with National Government Programs" />
                  <BenefitItem text="Access to Grants, Loans & Livelihood" />
                  <BenefitItem text="Business Support & Group Discounts" />
                  <BenefitItem text="Group Accident Insurance Coverage" />
               </ul>
            </div>
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
               <ProgramCard title="Kapatiran" desc="Fostering brotherhood and unity among members." color="bg-blue-600" />
               <ProgramCard title="Damayan" desc="Mutual aid and support system for families." color="bg-red-600" />
               <ProgramCard title="Kakampi" desc="Legal and social protection for all kasamahan." color="bg-[#003366]" />
               <ProgramCard title="Sagip Kapwa" desc="Emergency response and relief initiatives." color="bg-emerald-600" />
            </div>
          </div>
        </div>
      </section>

      {/* 6. AVP SECTION */}
      <section className="py-24 bg-white px-4 border-t">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-800 rounded-full text-[10px] font-black uppercase tracking-widest mb-8">
             <Play size={12} fill="currentColor" /> Official Broadcast
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-black text-[#003366] uppercase tracking-tighter mb-12 leading-tight">
            {cms.avpTitle}
          </h2>
          <div className="aspect-video bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border-8 border-white group relative">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${avpId}?autoplay=0&controls=1&modestbranding=1`}
              title="Official AVP"
              allowFullScreen
            />
          </div>
        </div>
      </section>
    </div>
  );
};

const GoalCard = ({ icon, title, desc }: any) => (
  <div className="p-8 bg-white border rounded-[2rem] hover:shadow-xl transition-all group">
    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#003366] group-hover:text-white transition-colors">
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <h4 className="text-xl font-serif font-black text-[#003366] uppercase mb-2 tracking-tight">{title}</h4>
    <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
  </div>
);

const BenefitItem = ({ text }: { text: string }) => (
  <li className="flex items-center gap-3 text-sm font-bold text-slate-700">
    <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
      <CheckCircle size={14} />
    </div>
    {text}
  </li>
);

const ProgramCard = ({ title, desc, color }: any) => (
  <div className={`${color} p-10 rounded-[2.5rem] text-white shadow-xl hover:scale-[1.02] transition-all`}>
    <h4 className="text-3xl font-serif font-black uppercase tracking-tighter mb-2">{title}</h4>
    <p className="text-white/80 text-sm">{desc}</p>
  </div>
);

export default HomePage;
