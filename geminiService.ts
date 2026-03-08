
import React from 'react';
import { CmsContent, TeamMember } from '../types';

interface TeamPageProps {
  cms: CmsContent;
}

const TeamMemberCard: React.FC<{ member: TeamMember, updatedAt?: number }> = ({ member, updatedAt }) => {
  const cacheBust = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return updatedAt ? `${url}${separator}v=${updatedAt}` : url;
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-slate-100 flex flex-col">
      <div className="aspect-[4/5] overflow-hidden relative">
        <div className="absolute inset-0 bg-patriot-navy/10 group-hover:bg-transparent transition-colors z-10"></div>
        <img src={cacheBust(member.photoUrl)} alt={member.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
      </div>
      <div className="p-8 flex flex-col flex-grow text-center">
        <h3 className="text-2xl font-serif font-black text-patriot-navy uppercase tracking-tight leading-none">{member.name}</h3>
        <div className="w-12 h-1 bg-patriot-gold mx-auto my-4 opacity-50"></div>
        <p className="text-[10px] font-black text-patriot-gold uppercase tracking-[0.3em] mb-4">{member.title}</p>
        <p className="text-slate-500 text-sm italic leading-relaxed px-2">"{member.quote}"</p>
      </div>
    </div>
  );
};

const TeamPage: React.FC<TeamPageProps> = ({ cms }) => {
  const leadership = (cms.teamMembers || []).filter(m => m.isLeadership);
  const council = (cms.teamMembers || []).filter(m => !m.isLeadership);

  return (
    <div className="animate-fade-in bg-slate-50 min-h-screen">
      {/* Hero Section with Video Background */}
      <div className="relative py-48 px-4 text-center overflow-hidden min-h-[60vh] flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <iframe
            className="w-full h-full object-cover scale-[1.35]"
            src={`https://www.youtube.com/embed/${cms.heroVideoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${cms.heroVideoId}`}
            title="Team Hero Video"
            allow="autoplay; encrypted-media"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/80 via-slate-900/80 to-slate-900/90 backdrop-blur-[2px]"></div>
        </div>
        
        <div className="relative z-10 max-w-5xl mx-auto space-y-6">
          <span className="text-[10px] md:text-xs font-black text-patriot-gold uppercase tracking-[0.5em] animate-slide-up block opacity-90">
            OUR LEADERSHIP & TEAM
          </span>
          <h1 className="text-5xl md:text-8xl font-serif font-black text-white uppercase tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-slide-up" style={{ animationDelay: '100ms' }}>
            BLESSED Team
          </h1>
          <div className="w-32 h-1 bg-white/20 mx-auto mt-8 animate-slide-up" style={{ animationDelay: '200ms' }}></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-32 px-4 relative">
        <div className="text-center mb-20">
           <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.5em] mb-4">The Vanguard</h2>
           <h3 className="text-4xl font-serif font-black text-patriot-navy uppercase tracking-tighter">Founding Leadership</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-w-5xl mx-auto">
          {leadership.map(member => (
            <TeamMemberCard key={member.id} member={member} updatedAt={cms.updatedAt} />
          ))}
        </div>
      </div>

      {council.length > 0 && (
        <div className="bg-white py-32 border-t">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-20">
              <h3 className="text-4xl font-serif font-black text-patriot-navy uppercase tracking-tighter">National Vice Presidents</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
              {council.map(member => (
                <TeamMemberCard key={member.id} member={member} updatedAt={cms.updatedAt} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="py-24 bg-slate-900 text-center px-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
              <iframe
                className="w-full h-full object-cover"
                src={`https://www.youtube.com/embed/${cms.heroVideoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${cms.heroVideoId}`}
                title="Footer Video"
              />
          </div>
          <div className="relative z-10">
            <h4 className="text-white text-2xl font-serif font-black uppercase tracking-tighter mb-6">Want to Join the Command?</h4>
            <p className="text-slate-400 max-w-xl mx-auto mb-10 text-sm font-medium">We are always looking for dedicated leaders to help build the Bagong Pilipinas through the BLESSED Movement.</p>
            <button className="px-12 py-4 bg-patriot-gold text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-white transition-all shadow-xl">
                Submit Application
            </button>
          </div>
      </div>
    </div>
  );
};

export default TeamPage;
