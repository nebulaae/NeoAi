'use client';

import api from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { LoginButton } from '@telegram-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { useBot } from '@/app/providers/BotProvider';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Loader2,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import { getAppSource } from '@/lib/source';
import { getPlatformInitData, waitForPlatformInitData } from '@/lib/platform';
import Link from 'next/link';
import Image from 'next/image';

type AppEnv = 'telegram' | 'max' | 'browser';
type LoginView = 'main' | 'email-login' | 'email-register';

const ACCENT_BLUE = '#007AFF';

export const Login = () => {
  const router = useRouter();
  const { user, login, isLoading: authLoading } = useAuth();
  const { bot, isLoading: botLoading } = useBot();
  const haptic = useHaptic();
  const t = useTranslations('Login');
  const tLegal = useTranslations('Legal');
  const locale = useLocale();

  const [source, setSource] = useState<string | null>(null);
  const [autoLogging, setAutoLogging] = useState(false);
  const [view, setView] = useState<LoginView>('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [name, setName] = useState('');
  const attempted = useRef(false);

  const botInfo = JSON.parse(
    typeof window !== 'undefined'
      ? localStorage.getItem('bot_info') || '{}'
      : '{}'
  );
  const maxBotUsername = botInfo?.max_username;
  const telegramBotUsername = botInfo?.bot_username;

  useEffect(() => {
    if (!authLoading && user) router.replace('/');
  }, [user, authLoading, router]);

  useEffect(() => {
    const syncSource = getAppSource();
    if (syncSource) {
      setSource(syncSource);
      return;
    }
    const timer = setInterval(() => {
      const s = getAppSource();
      if (s) {
        clearInterval(timer);
        setSource(s);
      }
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const attemptTMALogin = useCallback(async () => {
    if (
      !source ||
      source === 'browser' ||
      authLoading ||
      user ||
      !bot?.bot_id ||
      attempted.current
    )
      return;
    attempted.current = true;
    setAutoLogging(true);
    const env = source === 'tg' ? 'telegram' : (source as AppEnv);
    const initData = await waitForPlatformInitData(8000);
    if (!initData) {
      setAutoLogging(false);
      attempted.current = false;
      return;
    }
    try {
      const { data } = await api.post('/api/auth/tma', {
        initData,
        platform: env,
        bot_id: bot.bot_id,
      });
      localStorage.setItem('auth_token', data.token);
      if (data.user?.id)
        localStorage.setItem('auth_user_id', String(data.user.id));
      login(data.user);
      router.replace('/');
    } catch {
      setAutoLogging(false);
      attempted.current = false;
    }
  }, [source, authLoading, user, bot, login, router]);

  useEffect(() => {
    attemptTMALogin();
  }, [attemptTMALogin]);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim())
      return toast.error(t('emailRequired'));
    setEmailLoading(true);
    try {
      const { data } = await api.post(
        `/api/auth/login/email?bot_id=${bot?.bot_id}`,
        { email: email.trim(), password }
      );
      localStorage.setItem('auth_token', data.token);
      login(data.user);
      haptic.success();
      router.replace('/');
    } catch (e: any) {
      haptic.error();
      toast.error(e?.response?.data?.error || t('invalidCredentials'));
    } finally {
      setEmailLoading(false);
    }
  };

  if (autoLogging) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-[32px] bg-zinc-900 border border-white/10 flex items-center justify-center mb-8 animate-pulse shadow-2xl">
          <Loader2 size={32} className="animate-spin text-[#007AFF]" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">
          {t('autoLoginLoading')}
        </h2>
        <p className="text-white/30 font-medium">{t('tagline')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-black text-white font-sans selection:bg-[#007AFF]/30 flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-[380px] flex flex-col flex-1">
        {view === 'main' ? (
          <div className="flex flex-col flex-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero Section */}
            <div className="flex flex-col items-center text-center mb-16 mt-8">
              <div className="w-24 h-24 rounded-[40px] bg-linear-to-br from-[#007AFF] to-[#0051FF] flex items-center justify-center mb-8 shadow-[0_20px_50px_rgba(0,122,255,0.3)] group overflow-hidden relative">
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-[44px] relative z-10 drop-shadow-lg">
                  ✦
                </span>
              </div>
              <h1 className="text-[42px] font-black tracking-tighter leading-none mb-4 bg-linear-to-b from-white to-white/60 bg-clip-text text-transparent">
                NeoAI
              </h1>
              <p className="text-[17px] font-medium text-white/30 leading-relaxed max-w-[280px]">
                {t('tagline')}
              </p>
            </div>

            {/* Login Options */}
            <div className="flex flex-col gap-4">
              {/* Telegram Button Integration */}
              <div className="p-6 rounded-[32px] bg-zinc-900/60 border border-white/5 flex flex-col gap-5 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#229ED9]/10 flex items-center justify-center">
                    <Image
                      src="/telegram.png"
                      width={18}
                      height={18}
                      alt="TG"
                    />
                  </div>
                  <span className="text-[15px] font-black uppercase tracking-widest text-white/40">
                    {t('telegramSection')}
                  </span>
                </div>
                {bot?.bot_username ? (
                  <div className="flex justify-center scale-110">
                    <LoginButton
                      botUsername={bot.bot_username}
                      onAuthCallback={(u) =>
                        api
                          .post('/api/auth/telegram', {
                            ...u,
                            bot_id: bot.bot_id,
                          })
                          .then((res) => {
                            localStorage.setItem('auth_token', res.data.token);
                            login(res.data.user);
                            router.replace('/');
                          })
                      }
                      buttonSize="large"
                      cornerRadius={16}
                    />
                  </div>
                ) : (
                  <Loader2 className="animate-spin mx-auto text-white/10" />
                )}
              </div>

              {/* Email Option */}
              <button
                onClick={() => {
                  haptic.light();
                  setView('email-login');
                }}
                className="p-5 rounded-[32px] bg-white/5 border border-white/10 flex items-center gap-4 transition-all hover:bg-white/10 active:scale-95 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 group-hover:text-[#007AFF] transition-colors">
                  <Mail size={22} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[16px] font-black tracking-tight">
                    {t('emailLogin')}
                  </p>
                  <p className="text-[12px] text-white/20 font-bold uppercase tracking-wider">
                    {t('emailLoginSubtitle')}
                  </p>
                </div>
                <ChevronRight size={18} className="text-white/10" />
              </button>

              {/* Legal Footer */}
              <div className="mt-8 flex flex-col items-center gap-4">
                <div className="flex items-center gap-6">
                  <Link
                    href="/legal/offer"
                    className="text-[13px] font-bold text-white/20 hover:text-[#007AFF] transition-colors"
                  >
                    {tLegal('offer')}
                  </Link>
                  <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
                  <Link
                    href="/legal/privacy"
                    className="text-[13px] font-bold text-white/20 hover:text-[#007AFF] transition-colors"
                  >
                    {tLegal('privacy')}
                  </Link>
                </div>
                <p className="text-[11px] text-center text-white/15 font-medium leading-relaxed max-w-[240px]">
                  {t('terms')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            <button
              onClick={() => setView('main')}
              className="flex items-center gap-2 text-white/40 font-bold mb-10 active:scale-90 transition-all"
            >
              <ArrowLeft size={18} /> {t('back')}
            </button>

            <h2 className="text-[34px] font-black tracking-tighter mb-8 leading-tight">
              {view === 'email-login'
                ? t('emailLoginTitle')
                : t('registerTitle')}
            </h2>

            <div className="flex flex-col gap-4">
              {view === 'email-register' && (
                <input
                  type="text"
                  placeholder={t('namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-6 py-5 rounded-[24px] bg-zinc-900 border border-white/5 focus:border-[#007AFF]/30 outline-none text-[16px] font-bold transition-all"
                />
              )}
              <input
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-5 rounded-[24px] bg-zinc-900 border border-white/5 focus:border-[#007AFF]/30 outline-none text-[16px] font-bold transition-all"
              />
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder={t('passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-6 py-5 rounded-[24px] bg-zinc-900 border border-white/5 focus:border-[#007AFF]/30 outline-none text-[16px] font-bold transition-all"
                />
                <button
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20"
                >
                  {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <button
                onClick={view === 'email-login' ? handleEmailLogin : () => {}}
                disabled={emailLoading}
                className="w-full py-5 rounded-[24px] bg-[#007AFF] text-white font-black text-[17px] shadow-[0_20px_40px_rgba(0,122,255,0.3)] mt-4 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {emailLoading ? (
                  <Loader2 className="animate-spin" />
                ) : view === 'email-login' ? (
                  t('signIn')
                ) : (
                  t('createAccount')
                )}
              </button>

              <button
                onClick={() =>
                  setView(
                    view === 'email-login' ? 'email-register' : 'email-login'
                  )
                }
                className="mt-4 text-center text-white/30 font-bold text-[14px] hover:text-white transition-colors"
              >
                {view === 'email-login'
                  ? t('noAccount')
                  : t('alreadyHaveAccount')}{' '}
                <span className="text-[#007AFF]">
                  {view === 'email-login' ? t('register') : t('signIn')}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
