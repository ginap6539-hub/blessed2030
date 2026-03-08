
import React from 'react';
import { ChevronDown, Shield } from 'lucide-react';
import { CmsContent } from '../types';

interface HeroProps {
  cms: CmsContent;
  onEnter: () => void;
}

const Hero: React.FC<HeroProps> = ({ cms, onEnter }) => {
  const cacheBust = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    const separator = url.includes('?') ? '&' : '?';
    return cms.updatedAt ? `${url}${separator}v=${cms.updatedAt}` : url;
  };

  // Robust helper to extract YouTube ID from various URL formats or raw IDs
  const getVideoId = (input: string) => {
    if (!input) return '';
    try {
        if (input.includes('v=')) return input.split('v=')[1].split('&')[0];
        if (input.includes('youtu.be/')) return input.split('youtu.be/')[1].split('?')[0];
        if (input.includes('embed/')) return input.split('embed/')[1].split('?')[0];
        return input; // Assume it's already an ID
    } catch (e) {
        return input;
    }
  };

  const videoId = getVideoId(cms.heroVideoId);

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center pt-20">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-slate-900/40 z-10 backdrop-blur-[1px]"></div>
        <div className="w-full h-full">
             <iframe
                className="w-full h-full object-cover scale-[1.35]"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&showinfo=0&rel=0&modestbranding=1`}
                title="Hero Video"
                allow="autoplay; encrypted-media"
              />
        </div>
      </div>

      <div className="relative z-20 text-center px-4 max-w-6xl mx-auto animate-fade-in flex flex-col items-center">
        <div className="flex items-center justify-center gap-8 md:gap-12 mb-8">
            <img src={cacheBust(cms.orgLogo)} className="w-16 h-16 md:w-24 md:h-24 object-contain drop-shadow-2xl" alt="PH Logo" referrerPolicy="no-referrer" />
            <div className="h-16 w-[1px] bg-white/30 hidden md:block"></div>
            <img src={cacheBust(cms.logoUrl)} className="w-24 h-24 md:w-44 md:h-44 object-contain drop-shadow-[0_0_40px_rgba(255,193,7,0.5)] animate-pulse-slow" alt="Blessed Logo" referrerPolicy="no-referrer" />
            <div className="h-16 w-[1px] bg-white/30 hidden md:block"></div>
            <img src={cacheBust(cms.coopLogo)} className="w-16 h-16 md:w-24 md:h-24 object-contain drop-shadow-2xl" alt="Coop Logo" referrerPolicy="no-referrer" />
        </div>

        <div className="space-y-1 mb-8">
            <h1 className="text-[10px] md:text-xs font-black text-patriot-gold tracking-[0.8em] uppercase opacity-90 mb-6 animate-slide-up">Blessed Movement Global Network</h1>
            <div className="flex flex-col items-center space-y-0.5 font-serif font-black text-white drop-shadow-2xl tracking-tighter uppercase">
                <h2 className="text-4xl md:text-6xl leading-none"><span className="text-red-600">B</span>agong</h2>
                <h2 className="text-4xl md:text-6xl leading-none"><span className="text-red-600">L</span>ipunan</h2>
                <h2 className="text-4xl md:text-6xl leading-none"><span className="text-red-600">E</span>nhanced</h2>
                <h2 className="text-4xl md:text-6xl leading-none"><span className="text-red-600">S</span>ynergy</h2>
                <h2 className="text-4xl md:text-6xl leading-none"><span className="text-red-600">S</span>tewardship</h2>
                <h2 className="text-4xl md:text-6xl leading-none"><span className="text-red-600">E</span>conomic</h2>
                <h2 className="text-4xl md:text-6xl leading-none"><span className="text-red-600">D</span>evelopment</h2>
            </div>
        </div>

        <p className="text-sm md:text-xl text-slate-100 mb-10 font-bold tracking-widest italic opacity-95 max-w-4xl">"{cms.heroSubtitle}"</p>

        <div className="flex flex-col sm:flex-row gap-5 items-center">
            <button onClick={onEnter} className="px-14 py-5 bg-white text-slate-900 font-black text-[10px] rounded-full shadow-2xl tracking-[0.3em] flex items-center gap-3">SECURE ENTRANCE <Shield className="w-4 h-4" /></button>
            <button onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })} className="px-14 py-5 bg-white/10 border-2 border-white/20 text-white font-black text-[10px] rounded-full tracking-[0.3em] backdrop-blur-md">DIVE DEEP</button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
