
import React from 'react';
import { CmsContent } from '../types';
import { Play } from 'lucide-react';

interface AboutPageProps {
  cms: CmsContent;
}

const AboutPage: React.FC<AboutPageProps> = ({ cms }) => {
  const cacheBust = (url?: string) => url ? `${url}?v=${cms.updatedAt || Date.now()}` : '';

  const getEmbedUrl = (url: string, autoplay: boolean = true) => {
    if (!url) return '';
    if (url.includes('facebook.com')) {
      let videoId = '';
      if (url.includes('v=')) { videoId = url.split('v=')[1]?.split('&')[0]; } 
      else if (url.includes('/videos/')) { videoId = url.split('/videos/')[1]?.split('/')[0]?.split('?')[0]; } 
      else if (url.includes('watch/')) { videoId = url.split('watch/')[1]?.split('/')[0]?.split('?')[0]; }
      const cleanUrl = `https://www.facebook.com/watch/?v=${videoId || '1733727457219412'}`;
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(cleanUrl)}&show_text=0&autoplay=${autoplay ? '1' : '0'}&mute=1&container_width=100%`;
    }
    const id = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url;
    const cleanId = id.split('/')[id.split('/').length - 1].split('?')[0];
    return `https://www.youtube.com/embed/${cleanId}?autoplay=${autoplay ? '1' : '0'}&mute=1&controls=0&loop=1&playlist=${cleanId}&modestbranding=1&rel=0`;
  };

  const bgVideoUrl = getEmbedUrl(cms.aboutVideoUrl || "https://web.facebook.com/watch/?v=1733727457219412", true);

  return (
    <div className="animate-fade-in bg-white text-slate-800">
      <div className="relative py-48 px-4 text-center bg-slate-900 text-white overflow-hidden min-h-[85vh] flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-slate-900/60 z-10 backdrop-blur-[2px]"></div>
          <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
            <iframe
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[115%] h-[115%] scale-[1.6] object-cover"
              src={bgVideoUrl}
              title="About Background Video"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              style={{ border: 'none' }}
            />
          </div>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto space-y-4">
          <span className="text-[10px] font-black text-patriot-gold uppercase tracking-[0.8em] mb-4 block animate-slide-up">Our Foundation</span>
          <h1 className="text-6xl md:text-8xl font-serif font-black uppercase tracking-tighter animate-slide-up">About Us</h1>
          <p className="text-slate-300 font-medium max-w-2xl mx-auto animate-slide-up">Building the Bagong Pilipinas through Synergy and Stewardship.</p>
        </div>
      </div>

      <section className="bg-slate-950 py-24 px-4 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-black text-white uppercase tracking-tighter mb-4">ANG LAKAS NG BLESSED</h2>
            <div className="w-24 h-1 bg-patriot-gold mx-auto opacity-50"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 items-start">
            <div className="flex flex-col items-center text-center space-y-6">
              <h3 className="text-lg font-black text-white uppercase tracking-widest">ORGANIZATION</h3>
              <div className="w-full aspect-square flex items-center justify-center p-6 bg-white/5 rounded-[3rem] border border-white/10 group shadow-2xl overflow-hidden">
                <img src={cacheBust(cms.orgLogo)} alt="Organization" className="max-w-full max-h-full object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500" />
              </div>
            </div>
            <div className="flex flex-col items-center text-center space-y-6">
              <h3 className="text-lg font-black text-white uppercase tracking-widest">MOVEMENT</h3>
              <div className="w-full aspect-square flex items-center justify-center p-6 bg-white/5 rounded-[3rem] border border-white/10 group shadow-2xl overflow-hidden">
                <img src={cacheBust(cms.movementLogo)} alt="Movement" className="max-w-full max-h-full object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500" />
              </div>
            </div>
            <div className="flex flex-col items-center text-center space-y-6">
              <h3 className="text-lg font-black text-white uppercase tracking-widest">COOPERATIVE</h3>
              <div className="w-full aspect-square flex items-center justify-center p-6 bg-white/5 rounded-[3rem] border border-white/10 group shadow-2xl overflow-hidden">
                <img src={cacheBust(cms.coopLogo)} alt="Cooperative" className="max-w-full max-h-full object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500" />
              </div>
            </div>
            <div className="flex flex-col items-center text-center space-y-6">
              <h3 className="text-lg font-black text-white uppercase tracking-widest">PMO</h3>
              <div className="w-full aspect-square flex items-center justify-center p-6 bg-white/5 rounded-[3rem] border border-white/10 group shadow-2xl overflow-hidden">
                <img src={cacheBust(cms.pmoLogo)} alt="PMO" className="max-w-full max-h-full object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto py-24 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <img 
              src={cacheBust(cms.aboutPageImageUrl)} 
              alt="Foundation" 
              className="rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] w-full h-[600px] object-cover border-8 border-slate-50 animate-fade-in" 
            />
          </div>
          <div className="space-y-6">
            <h2 className="text-4xl font-serif font-black text-[#003366] uppercase tracking-tighter">What is BLESSED?</h2>
            <div className="space-y-4 text-slate-600 leading-relaxed font-medium">
                <p>The BLESSED Movement stands for <span className="font-black text-[#003366]">Bagong Lipunan Enhanced Synergy Stewardship Economic Development</span>.</p>
                <p>Its motto is <span className="italic font-bold">"Love of Country and Love of God, Above All."</span></p>
                <p>Lead by Founding Chairman <span className="font-bold">Herbert Antonio S. Martinez</span>, the movement aims to promote patriotism, spirituality, and good governance.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
