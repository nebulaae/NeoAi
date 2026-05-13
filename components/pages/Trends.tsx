'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePosts, Post } from '@/hooks/usePosts';
import { useUser } from '@/hooks/useUser';
import { useAIModels } from '@/hooks/useModels';
import { useGenerateAI, convertMediaToInputs } from '@/hooks/useGenerations';
import { useUpload } from '@/hooks/useApiExtras';
import { useHaptic } from '@/hooks/useHaptic';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Sparkles,
  X,
  ChevronLeft,
  Lock,
  Camera,
  AlertCircle,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, localize, timeAgo } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/* ── Redesign Constants ── */
const ACCENT_BLUE = '#007AFF';

export const Trends = () => {
  const t = useTranslations('Trends');
  const router = useRouter();
  const searchParams = useSearchParams();
  const postParam = searchParams?.get('post');
  const haptic = useHaptic();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const { data: postsData, isLoading: postsLoading, isError } = usePosts({ limit: 50 });
  const posts = postsData?.items || [];

  useEffect(() => {
    if (postParam && posts.length > 0) {
      const p = posts.find((x: Post) => x.id === parseInt(postParam));
      if (p) setSelectedPost(p);
    }
  }, [postParam, posts]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center bg-black">
        <div className="w-20 h-20 rounded-[32px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
           <AlertCircle className="size-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">{t('error')}</h2>
        <p className="text-white/40 font-medium max-w-[240px]">{t('errorDesc')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-32 max-w-2xl mx-auto w-full bg-black">
      <AnimatePresence mode="wait">
        {!selectedPost ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-6 pt-12"
          >
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-2">
                 <h1 className="text-[34px] font-black tracking-tight text-white leading-none">
                   {t('title')}
                 </h1>
                 <div className="w-8 h-8 rounded-xl bg-[#007AFF]/20 flex items-center justify-center">
                    <Sparkles size={18} className="text-[#007AFF]" />
                 </div>
              </div>
              <p className="text-white/40 text-[16px] font-medium leading-relaxed max-w-[320px]">
                {t('subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {postsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-3/4 rounded-[32px] bg-zinc-900 border border-white/5 animate-pulse" />
                ))
              ) : (
                posts.map((post: Post) => (
                  <TrendCard
                    key={post.id}
                    post={post}
                    onClick={() => {
                      haptic.light();
                      setSelectedPost(post);
                    }}
                  />
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <TrendDetail
            post={selectedPost}
            onBack={() => {
              haptic.light();
              setSelectedPost(null);
              router.replace('/trends');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const TrendCard = ({ post, onClick }: { post: Post; onClick: () => void }) => {
  const t = useTranslations('Trends');
  const mediaUrl = post.result?.url || post.result?.media?.[0]?.input;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="relative aspect-3/4 rounded-[32px] overflow-hidden cursor-pointer group border border-white/5 bg-zinc-900 shadow-2xl"
    >
      {mediaUrl ? (
        <img
          src={mediaUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800/50">
          <Sparkles className="size-10 text-white/5" />
        </div>
      )}

      {/* Badges */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
         <div className="flex gap-2">
            {post.priority > 5 && (
              <div className="bg-[#007AFF] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-[0.1em] shadow-xl">
                {t('new')}
              </div>
            )}
         </div>
         <div className="bg-black/40 backdrop-blur-xl border border-white/10 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xl">
            <span className="text-[12px] font-black text-white">{post.cost ?? 15}</span>
            <span className="text-[10px] text-[#007AFF]">◈</span>
         </div>
      </div>

      {/* Footer */}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-linear-to-t from-black/90 via-black/40 to-transparent">
        <p className="text-white text-[14px] font-bold line-clamp-2 leading-tight tracking-tight">
          {post.inputs?.text || t('untitled')}
        </p>
      </div>
    </motion.div>
  );
};

const TrendDetail = ({ post, onBack }: { post: Post; onBack: () => void }) => {
  const t = useTranslations('Trends');
  const haptic = useHaptic();
  const generate = useGenerateAI();
  const upload = useUpload();
  const { data: userData } = useUser();
  const { data: allModels } = useAIModels();
  const router = useRouter();

  const [userMedia, setUserMedia] = useState<Record<number, { url: string; file?: File }>>({});
  const [userText] = useState<string>(post.inputs?.text || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);

  const tokens = userData?.user?.tokens ?? 0;
  const model = allModels?.find((m: any) => m.tech_name === post.model_tech_name);
  const version = model?.versions?.find((v: any) => v.label === post.version_label);
  const cost = post.cost ?? version?.cost ?? 15;
  const canAfford = tokens >= cost;

  const mediaSlots = post.inputs?.media || [];

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeMediaIndex === null) return;
    try {
      const uploaded = await upload.mutateAsync(file);
      setUserMedia(prev => ({ ...prev, [activeMediaIndex]: { url: uploaded.url, file } }));
      toast.success(t('done'));
    } catch {
      toast.error(t('error'));
    }
    setActiveMediaIndex(null);
  };

  const handleGenerate = () => {
    if (!canAfford) {
      toast.error(t('insufficientCredits'));
      return;
    }
    haptic.medium();
    const finalMedia = mediaSlots.map((slot, index) => {
      const override = userMedia[index];
      const type = slot.type === 'media' ? 'image' : (slot.type || 'image');
      return { type, format: 'url', input: override ? override.url : (slot.input as any)?.input || slot.input };
    });
    const inputs = convertMediaToInputs(userText, finalMedia as any);
    generate.mutate({
      tech_name: post.model_tech_name,
      version: post.version_label,
      inputs,
      params: post.params,
      post_id: post.id
    }, {
      onSuccess: (data) => {
        if (data.dialogue_id) router.push(`/chats/${data.dialogue_id}`);
      }
    });
  };

  const mediaUrl = post.result?.url || post.result?.media?.[0]?.input;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="flex flex-col min-h-screen bg-black"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 px-6 py-5 bg-black/60 backdrop-blur-3xl border-b border-white/5 flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-all active:scale-90">
          <ChevronLeft size={20} className="text-[#007AFF]" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-[17px] font-black tracking-tight text-white truncate leading-tight">
            {post.inputs?.text || t('title')}
          </h2>
          <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mt-0.5">
             {post.model_name || 'AI GENERATION'}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-10">
        {/* Hero Preview */}
        <div className="relative aspect-3/4 rounded-[40px] overflow-hidden border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
          {mediaUrl ? (
            <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
               <Sparkles className="size-16 text-white/5" />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
             <div className="flex items-center gap-4">
                <div className="p-4 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[24px] flex-1">
                   <p className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-1">{t('model')}</p>
                   <p className="text-[15px] font-black text-white truncate">
                     {post.model_name || post.model_tech_name.replace(/^sosana\//, '')}
                   </p>
                </div>
                <div className="p-4 bg-[#007AFF]/20 backdrop-blur-2xl border border-[#007AFF]/30 rounded-[24px] text-center min-w-[80px]">
                   <p className="text-[11px] font-black text-[#007AFF] uppercase tracking-widest mb-1">COST</p>
                   <p className="text-[15px] font-black text-white">{cost} ◈</p>
                </div>
             </div>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="flex flex-col gap-8">
          {/* Media Replacement */}
          {mediaSlots.some(s => s.input?.reference?.replace) && (
            <div className="flex flex-col gap-4">
              <h3 className="text-[13px] font-black uppercase tracking-[0.15em] text-white/30 px-2">
                {t('uploadMedia')}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                {mediaSlots.map((slot, index) => {
                  const { hide, replace } = slot.input?.reference || {};
                  if (hide && !replace) return null;
                  const current = userMedia[index];
                  const originalUrl = (slot.input as any)?.input;
                  
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        if (replace || hide) {
                          setActiveMediaIndex(index);
                          fileInputRef.current?.click();
                        }
                      }}
                      className={cn(
                        "relative aspect-square rounded-[32px] overflow-hidden border transition-all flex flex-col items-center justify-center gap-3",
                        (replace || hide) ? "cursor-pointer active:scale-95 bg-zinc-900/50 border-white/10 hover:border-white/20" : "bg-zinc-900 border-transparent",
                        current && "border-[#007AFF]/50 bg-[#007AFF]/5 shadow-[0_0_20px_rgba(0,122,255,0.1)]"
                      )}
                    >
                      {current ? (
                        <>
                          <img src={current.file ? URL.createObjectURL(current.file) : current.url} className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                          <CheckCircle2 size={32} className="text-[#007AFF] relative z-10" />
                        </>
                      ) : (!hide && originalUrl && originalUrl !== 'null') ? (
                        <>
                          <img src={originalUrl} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                          <Camera size={24} className="text-white/40 relative z-10" />
                          <p className="text-[11px] font-black text-white/40 uppercase tracking-widest relative z-10">{t('uploadMediaDesc')}</p>
                        </>
                      ) : (
                        <>
                          <Camera size={28} className="text-white/20" />
                          <p className="text-[11px] font-black text-white/20 uppercase tracking-widest">{t('uploadMediaDesc')}</p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prompt Section */}
          <div className="flex flex-col gap-4">
             <h3 className="text-[13px] font-black uppercase tracking-[0.15em] text-white/30 px-2">
               {t('prompt')}
             </h3>
             {post.inputs?.hide_text ? (
               <div className="p-6 rounded-[32px] bg-[#007AFF]/5 border border-[#007AFF]/20 flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-[#007AFF]/20 flex items-center justify-center">
                    <Lock size={20} className="text-[#007AFF]" />
                 </div>
                 <p className="text-[15px] font-bold text-[#007AFF]/70 leading-tight">
                   {t('promptHidden')}
                 </p>
               </div>
             ) : (
               <div className="p-6 rounded-[32px] bg-zinc-900/40 border border-white/5">
                  <p className="text-[16px] font-medium text-white/90 leading-relaxed italic">
                    "{post.inputs?.text || t('noPrompt')}"
                  </p>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action */}
      <div className="sticky bottom-0 px-6 pt-6 pb-[calc(24px+max(12px,env(safe-area-inset-bottom)))] bg-black/80 backdrop-blur-3xl border-t border-white/5">
        <button
          disabled={generate.isPending}
          onClick={handleGenerate}
          className={cn(
            "w-full h-16 rounded-[24px] flex items-center justify-center gap-3 font-black text-[17px] transition-all active:scale-[0.98] shadow-2xl",
            canAfford 
              ? "bg-[#007AFF] text-white shadow-[0_0_30px_rgba(0,122,255,0.4)]"
              : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
          )}
        >
          {generate.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              {canAfford ? (
                <>
                  <Zap size={20} fill="currentColor" />
                  {t('generate')}
                </>
              ) : (
                <>
                  <Lock size={18} />
                  {t('insufficientCredits')}
                </>
              )}
            </>
          )}
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </motion.div>
  );
};
