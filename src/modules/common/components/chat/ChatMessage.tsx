import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, CheckCircle, Sparkles as SparklesIcon, FileText, Printer, MapPin, ZoomIn, CheckCheck, Check, Reply, Play, Pause, SmilePlus, MoreVertical, Copy, Forward, Pin, Trash2, Clock, BrainCircuit, ShieldCheck, Sparkles, Info, Languages, MessageSquare, Quote } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../../../../core/utils/errorHandling';
import { handleAiError } from '../../../../core/services/geminiService';
import { Message, UserProfile } from '../../../../core/types';
import { extractUrls, renderTextWithLinks } from '../../../../core/utils/linkParser';
import { LinkPreview } from './LinkPreview';

interface AudioPlayerProps {
  url?: string;
  isOwn: boolean;
  onTranslate?: () => void;
  translation?: string;
  isTranslating?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = React.memo(({ url, isOwn, onTranslate, translation, isTranslating }) => {
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!url) return;
    if (playing) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play().catch(e => {
        // Silent fail for audio play as it's often blocked by browser
      });
    }
    setPlaying(!playing);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setCurrentTime(current);
      setProgress(total > 0 ? (current / total) * 100 : 0);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 min-w-[200px]">
        <button 
          onClick={togglePlay}
          disabled={!url}
          className={`p-3 rounded-full shrink-0 transition-transform active:scale-95 ${!url ? 'opacity-50 cursor-not-allowed' : ''} ${isOwn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20'}`}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        
        {/* Waveform Visualization */}
        <div className="flex-1 flex items-center gap-[2px] h-6 cursor-pointer" onClick={(e) => {
          if (!audioRef.current || !url) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const percentage = x / rect.width;
          audioRef.current.currentTime = percentage * audioRef.current.duration;
        }}>
          {Array.from({ length: 30 }).map((_, i) => {
            const isActive = (i / 30) * 100 <= progress;
            return (
              <div 
                key={i}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isActive 
                    ? (isOwn ? 'bg-white' : 'bg-brand-primary') 
                    : (isOwn ? 'bg-white/30' : 'bg-brand-primary/20')
                }`}
                style={{ 
                  height: `${Math.max(20, Math.random() * 100)}%`,
                  opacity: isActive ? 1 : 0.5
                }}
              />
            );
          })}
        </div>

        <button 
          onClick={cyclePlaybackRate}
          className={`text-[10px] font-bold px-3 py-2 rounded-md shrink-0 ${isOwn ? 'bg-white/20 text-white' : 'bg-brand-primary/10 text-brand-primary'}`}
        >
          {playbackRate}x
        </button>
      </div>
      
      <div className={`text-[10px] font-medium px-1 ${isOwn ? 'text-white/70' : 'text-brand-text-muted'}`}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
      
      {onTranslate && (
        <button 
          onClick={onTranslate}
          disabled={isTranslating}
          className={`text-[10px] font-bold uppercase tracking-widest mt-1 py-2 px-3 -mx-2 rounded-lg flex items-center gap-1 hover:opacity-70 transition-opacity ${
            isOwn ? 'text-white/60' : 'text-brand-primary'
          }`}
        >
          {isTranslating ? (
            <span className="animate-pulse">...</span>
          ) : (
            <>
              <SparklesIcon size={10} />
              {translation ? 'Show Original' : 'Translate Audio'}
            </>
          )}
        </button>
      )}
      
      {translation && (
        <div className={`pt-2 border-t ${isOwn ? 'border-white/20' : 'border-brand-border-light'} mt-2`}>
          <p className="text-xs italic opacity-90">{translation}</p>
        </div>
      )}

      {url && (
        <audio 
          ref={audioRef} 
          src={url} 
          onEnded={() => setPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          className="hidden" 
        />
      )}
    </div>
  );
});

interface ChatMessageProps {
  msg: Message;
  index: number;
  messages: Message[];
  profile: UserProfile | null;
  senderPhotos: Record<string, string>;
  senderNames: Record<string, string>;
  senderProfiles: Record<string, UserProfile>;
  translatedMessages: Record<string, string>;
  isTranslating: Record<string, boolean>;
  handleTranslate: (messageId: string, text: string) => Promise<void>;
  handleTranslateAudio: (messageId: string, audioUrl: string) => Promise<void>;
  setReplyingTo: (msg: Message) => void;
  setZoomedImage: (url: string) => void;
  activeReactionMessageId?: string | null;
  setActiveReactionMessageId?: (id: string | null) => void;
  activeMessageMenuId?: string | null;
  setActiveMessageMenuId?: (id: string | null) => void;
  handleReaction?: (messageId: string, emoji: string) => Promise<void>;
  handlePinMessage?: (messageId: string) => Promise<void>;
  handleDeleteMessage?: (messageId: string, forEveryone: boolean) => Promise<void>;
  setMessageToForward?: (msg: Message) => void;
  setShowForwardModal?: (show: boolean) => void;
  chat?: any;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  onDrag?: (x: number) => void;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const ChatMessage: React.FC<ChatMessageProps> = React.memo(({
  msg,
  index,
  messages,
  profile,
  senderPhotos,
  senderNames,
  senderProfiles,
  translatedMessages,
  isTranslating,
  handleTranslate,
  handleTranslateAudio,
  setReplyingTo,
  setZoomedImage,
  activeReactionMessageId,
  setActiveReactionMessageId,
  activeMessageMenuId,
  setActiveMessageMenuId,
  handleReaction,
  handlePinMessage,
  handleDeleteMessage,
  setMessageToForward,
  setShowForwardModal,
  chat,
  onDragStart,
  onDragEnd,
  onDrag
}) => {
  const { t, i18n } = useTranslation();

  const isOwn = msg.senderId === profile?.uid;
  const isRtl = i18n.language === 'ar';
  const isNextFromSameSender = index < messages.length - 1 && messages[index + 1].senderId === msg.senderId;
  const isPrevFromSameSender = index > 0 && messages[index - 1].senderId === msg.senderId;
  const showAvatar = !isNextFromSameSender || index === messages.length - 1;
  const showName = !isPrevFromSameSender;

  const getBubbleStyle = () => {
    if (isOwn) {
      return "bg-gradient-to-br from-brand-primary via-brand-primary to-brand-primary-dark text-white rounded-2xl rounded-tr-none shadow-lg shadow-brand-primary/20 border border-white/10";
    }
    return "bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl rounded-tl-none shadow-md border border-brand-border/30";
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return <SmilePlus size={12} className="text-emerald-500" />;
      case 'negative': return <SmilePlus size={12} className="text-rose-500 rotate-180" />;
      default: return null;
    }
  };
  
  const msgDate = new Date(msg.createdAt);
  const dateString = msgDate.toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' });
  
  const prevMsgDate = index > 0 ? new Date(messages[index - 1].createdAt) : null;
  const prevDateString = prevMsgDate ? prevMsgDate.toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' }) : null;
  
  const showDateHeader = dateString !== prevDateString;

  return (
    <div className={`px-4 ${isNextFromSameSender ? 'pb-1' : 'pb-4'} relative overflow-hidden`}>
      {showDateHeader && (
        <div className="flex justify-center my-6 sticky top-2 z-10">
          <span className="px-4 py-1.5 bg-brand-surface/80 backdrop-blur-md border border-brand-border/30 rounded-full text-[10px] font-black text-brand-text-muted uppercase tracking-widest shadow-sm">
            {dateString}
          </span>
        </div>
      )}
      
      {/* Swipe Reply Indicator */}
      <div className={`absolute top-1/2 -translate-y-1/2 transition-opacity duration-200 ${isOwn ? 'left-4' : 'right-4'} opacity-0 group-hover:opacity-100 pointer-events-none`}>
        <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
          <Reply size={16} className={isRtl ? 'rotate-180' : ''} />
        </div>
      </div>

      <motion.div 
        drag="x"
        dragConstraints={{ left: isOwn ? -100 : 0, right: isOwn ? 0 : 100 }}
        dragElastic={0.2}
        onDragStart={() => onDragStart?.(msg.id)}
        onDragEnd={onDragEnd}
        onDrag={(_, info) => onDrag?.(info.offset.x)}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} relative z-10`}
      >
        {/* Avatar */}
        <div className="w-8 h-8 shrink-0 mb-1">
          {showAvatar && !isOwn ? (
            <div className="w-full h-full rounded-xl bg-brand-primary/10 border border-brand-border/50 overflow-hidden shadow-sm relative group">
              {senderPhotos[msg.senderId] ? (
                <img 
                  src={senderPhotos[msg.senderId]} 
                  alt={senderNames[msg.senderId]} 
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-brand-primary">
                  <UserIcon size={16} />
                </div>
              )}
              {senderProfiles[msg.senderId]?.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-brand-surface" />
              )}
            </div>
          ) : (
            <div className="w-8" />
          )}
        </div>

        <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
          {showName && !isOwn && (
            <div className="flex items-center gap-1 px-2 mb-1">
              <span className="text-[10px] font-black text-brand-text-muted uppercase tracking-tight">
                {senderNames[msg.senderId] || '...'}
              </span>
              {senderProfiles[msg.senderId]?.isVerified && (
                <CheckCircle className="w-2.5 h-2.5 text-brand-primary" />
              )}
            </div>
          )}
          
          <div className={`flex items-center gap-2 group/msg ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
            <div 
              className={`px-4 py-3 relative transition-all duration-300 ${getBubbleStyle()} ${
                isOwn 
                  ? (isPrevFromSameSender ? 'rounded-2xl' : 'rounded-2xl rounded-tr-sm') 
                  : (isPrevFromSameSender ? 'rounded-2xl' : 'rounded-2xl rounded-tl-sm')
              }`}
            >
              {/* Message Tail */}
              {!isPrevFromSameSender && (
                <div className={`absolute top-0 w-4 h-4 ${isOwn ? '-right-1.5' : '-left-1.5'} overflow-hidden`}>
                  <div className={`w-4 h-4 transform rotate-45 ${isOwn ? 'bg-brand-primary -translate-x-2' : 'bg-white dark:bg-brand-surface border-l border-t border-brand-border/30 translate-x-2'}`} />
                </div>
              )}

              {msg.replyTo && (
                <div className={`mb-2 p-2 rounded-xl text-xs border-l-4 ${isOwn ? 'bg-white/10 border-white/40' : 'bg-brand-background border-brand-primary'}`}>
                  <p className={`font-black mb-0.5 uppercase tracking-tighter text-[9px] ${isOwn ? 'text-white/90' : 'text-brand-primary'}`}>{msg.replyTo.senderName}</p>
                  <p className={`truncate font-medium ${isOwn ? 'text-white/70' : 'text-brand-text-muted'}`}>{msg.replyTo.text}</p>
                </div>
              )}
              {msg.type === 'text' ? (
              <div className="space-y-1">
                <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                  {msg.text ? renderTextWithLinks(msg.text, isOwn) : ''}
                </p>
                
                {/* Link Previews */}
                {msg.text && extractUrls(msg.text).map((url, i) => (
                  <LinkPreview key={`${url}-${i}`} url={url} />
                ))}

                {translatedMessages[msg.id] && (
                  <div className={`pt-2 border-t ${isOwn ? 'border-white/20' : 'border-brand-border-light'} mt-2`}>
                    <p className="text-xs italic opacity-90">{translatedMessages[msg.id]}</p>
                  </div>
                )}
                {!isOwn && (
                  <button 
                    onClick={() => handleTranslate(msg.id, msg.text!).catch(err => handleAiError(err, 'Text translation'))}
                    disabled={isTranslating[msg.id]}
                    className={`text-[10px] font-bold uppercase tracking-widest mt-1 py-2 px-3 -mx-2 rounded-lg flex items-center gap-1 hover:opacity-70 transition-opacity ${
                      isOwn ? 'text-white/60' : 'text-brand-primary'
                    }`}
                  >
                    {isTranslating[msg.id] ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      <>
                        <SparklesIcon size={10} />
                        {translatedMessages[msg.id] ? t('show_original', 'Show Original') : t('translate', 'Translate')}
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : msg.type === 'audio' ? (
              <AudioPlayer 
                url={msg.audioUrl} 
                isOwn={isOwn} 
                onTranslate={msg.audioUrl ? () => handleTranslateAudio(msg.id, msg.audioUrl!).catch(err => handleAiError(err, 'Audio translation')) : undefined}
                translation={translatedMessages[msg.id]}
                isTranslating={isTranslating[msg.id]}
              />
            ) : msg.type === 'quote' && msg.quoteData ? (
              <div className={`p-4 rounded-xl border ${isOwn ? 'bg-white/10 border-white/20' : 'bg-brand-background border-brand-border'} min-w-[240px]`}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-current opacity-20">
                  <FileText size={16} />
                  <span className="font-bold text-sm">{i18n.language === 'ar' ? 'عرض سعر رسمي' : 'Official Quote'}</span>
                </div>
                
                <div className="space-y-2 mb-4">
                  {msg.quoteData.items.map((item, i) => (
                    <div key={`${item.description}-${item.quantity}-${item.unitPrice}-${i}`} className="flex justify-between text-xs">
                      <span className="opacity-70">{item.quantity}x {item.description}</span>
                      <span className="font-bold">{item.unitPrice * item.quantity} {msg.quoteData?.currency}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-current opacity-20 font-bold">
                  <span>{i18n.language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                  <span className="text-lg">{msg.quoteData.total} {msg.quoteData.currency}</span>
                </div>

                {msg.quoteData.notes && (
                  <p className="mt-3 text-[10px] opacity-70 italic">
                    {i18n.language === 'ar' ? 'ملاحظات: ' : 'Notes: '}{msg.quoteData.notes}
                  </p>
                )}

                <button 
                  onClick={() => window.print()}
                  className={`mt-4 w-full py-3 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    isOwn ? 'bg-brand-surface text-brand-primary hover:bg-brand-primary/10' : 'bg-brand-primary text-white hover:bg-brand-primary-hover'
                  }`}
                >
                  <Printer size={12} />
                  {i18n.language === 'ar' ? 'طباعة / حفظ PDF' : 'Print / Save PDF'}
                </button>
              </div>
            ) : msg.type === 'location' && msg.location ? (
              <div className="space-y-3 min-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={16} className={isOwn ? 'text-white' : 'text-brand-primary'} />
                  <span className="font-bold text-sm">{i18n.language === 'ar' ? 'الموقع الجغرافي' : 'Shared Location'}</span>
                </div>
                <div className={`aspect-video w-full rounded-xl overflow-hidden border ${isOwn ? 'border-white/20' : 'border-brand-border'} bg-brand-surface relative group/map`}>
                  <img 
                    src={`https://maps.googleapis.com/maps/api/staticmap?center=${msg.location.latitude},${msg.location.longitude}&zoom=15&size=400x250&markers=color:red%7C${msg.location.latitude},${msg.location.longitude}&key=${process.env.VITE_GOOGLE_MAPS_API_KEY || ''}`}
                    alt="Location Map"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${msg.location.latitude},${msg.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/20 opacity-0 group-hover/map:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold"
                  >
                    {i18n.language === 'ar' ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}
                  </a>
                </div>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${msg.location.latitude},${msg.location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    isOwn ? 'bg-brand-surface text-brand-primary hover:bg-brand-primary/10' : 'bg-brand-primary text-white hover:bg-brand-primary-hover'
                  }`}
                >
                  <MapPin size={14} />
                  {i18n.language === 'ar' ? 'عرض الموقع' : 'View Location'}
                </a>
              </div>
            ) : msg.type === 'image' ? (
              <div className={`rounded-xl overflow-hidden border ${isOwn ? 'border-white/20 bg-white/10' : 'border-brand-border bg-brand-surface'} max-w-[240px] md:max-w-[320px] relative group/img`}>
                <div className="relative">
                  <img 
                    src={msg.imageUrl} 
                    alt="Chat" 
                    className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onClick={() => setZoomedImage(msg.imageUrl!)}
                  />
                  <div 
                    className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
                  >
                    <ZoomIn className="text-white drop-shadow-md" size={24} />
                  </div>
                </div>
                {msg.text && (
                  <div className="p-3">
                    <p className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words ${isOwn ? 'text-white' : 'text-brand-text-primary'}`}>
                      {renderTextWithLinks(msg.text, isOwn)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-brand-error/10 text-brand-error text-xs font-bold rounded-xl border border-brand-error/20">
                {i18n.language === 'ar' ? 'نوع رسالة غير مدعوم' : 'Unsupported message type'}
              </div>
            )}
            
            <div className={`flex items-center gap-1.5 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {msg.sentiment && (
                <div className="flex items-center" title={`AI Sentiment: ${msg.sentiment}`}>
                  {getSentimentIcon(msg.sentiment)}
                </div>
              )}
              <span className={`text-[8px] opacity-50 font-medium ${isOwn ? 'text-white' : 'text-brand-text-muted'}`}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {isOwn && (
                <div className="flex items-center ml-1 overflow-hidden">
                  <AnimatePresence mode="wait">
                    {msg.read ? (
                      <motion.div 
                        key="read"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="relative flex items-center"
                      >
                        <CheckCheck size={12} className="text-brand-success" />
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="unread"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        className="relative flex items-center"
                      >
                        <Check size={12} className="text-white/60" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
          
          {/* Reaction Button */}
          <div className="relative">
            <button 
              onClick={() => setActiveReactionMessageId?.(activeReactionMessageId === msg.id ? null : msg.id)}
              className="opacity-0 group-hover/msg:opacity-100 p-3 text-brand-text-muted hover:text-brand-primary hover:bg-brand-surface rounded-full transition-all shrink-0"
              title={i18n.language === 'ar' ? 'تفاعل' : 'React'}
            >
              <SmilePlus size={16} />
            </button>
            
            <AnimatePresence>
              {activeReactionMessageId === msg.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  className={`absolute bottom-full mb-2 ${isOwn ? 'right-0' : 'left-0'} bg-white border border-brand-border-light shadow-xl rounded-full px-3 py-2 flex items-center gap-2 z-50`}
                >
                  {EMOJI_REACTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction?.(msg.id, emoji).catch(err => handleFirestoreError(err, OperationType.UPDATE, `messages/${msg.id}/reactions`, false))}
                      className={`text-xl hover:scale-125 transition-transform ${msg.reactions?.[emoji]?.includes(profile?.uid || '') ? 'bg-brand-primary/10 rounded-full' : ''}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Reply Button */}
          <button 
            onClick={() => setReplyingTo(msg)} 
            className="opacity-0 group-hover/msg:opacity-100 p-3 text-brand-text-muted hover:text-brand-primary hover:bg-brand-surface rounded-full transition-all shrink-0"
            title={i18n.language === 'ar' ? 'رد' : 'Reply'}
          >
            <Reply size={16} className={i18n.language === 'ar' ? 'rotate-180' : ''} />
          </button>

          {/* More Options Button */}
          <div className="relative">
            <button 
              onClick={() => setActiveMessageMenuId?.(activeMessageMenuId === msg.id ? null : msg.id)}
              className="opacity-0 group-hover/msg:opacity-100 p-3 text-brand-text-muted hover:text-brand-primary hover:bg-brand-surface rounded-full transition-all shrink-0"
              title={i18n.language === 'ar' ? 'خيارات إضافية' : 'More options'}
            >
              <MoreVertical size={16} />
            </button>
            
            <AnimatePresence>
              {activeMessageMenuId === msg.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  className={`absolute bottom-full mb-2 ${isOwn ? 'right-0' : 'left-0'} bg-white border border-brand-border-light shadow-xl rounded-xl py-1 flex flex-col min-w-[150px] z-50`}
                >
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(msg.text || '').then(() => {
                        toast.success(i18n.language === 'ar' ? 'تم النسخ' : 'Copied to clipboard');
                      }).catch(err => {
                        toast.error(i18n.language === 'ar' ? 'فشل النسخ' : 'Failed to copy');
                      });
                      setActiveMessageMenuId?.(null);
                    }}
                    className="px-4 py-2 text-sm text-left hover:bg-brand-surface text-brand-text-main flex items-center gap-2 transition-colors"
                  >
                    <Copy size={14} />
                    {i18n.language === 'ar' ? 'نسخ النص' : 'Copy Text'}
                  </button>
                  <button
                    onClick={() => {
                      setMessageToForward?.(msg);
                      setShowForwardModal?.(true);
                      setActiveMessageMenuId?.(null);
                    }}
                    className="px-4 py-2 text-sm text-left hover:bg-brand-surface text-brand-text-main flex items-center gap-2 transition-colors"
                  >
                    <Forward size={14} />
                    {i18n.language === 'ar' ? 'إعادة توجيه' : 'Forward'}
                  </button>
                  <button
                    onClick={() => handlePinMessage?.(msg.id).catch(err => handleFirestoreError(err, OperationType.UPDATE, `messages/${msg.id}/pin`, false))}
                    className="px-4 py-2 text-sm text-left hover:bg-brand-surface text-brand-text-main flex items-center gap-2 transition-colors"
                  >
                    <Pin size={14} />
                    {chat?.pinnedMessageId === msg.id 
                      ? (i18n.language === 'ar' ? 'إلغاء التثبيت' : 'Unpin')
                      : (i18n.language === 'ar' ? 'تثبيت' : 'Pin')}
                  </button>
                  <div className="h-px bg-brand-border-light my-1" />
                  <button
                    onClick={() => handleDeleteMessage?.(msg.id, false).catch(err => handleFirestoreError(err, OperationType.DELETE, `messages/${msg.id}`, false))}
                    className="px-4 py-2 text-sm text-left hover:bg-brand-error/10 text-brand-error flex items-center gap-2 transition-colors"
                  >
                    <Trash2 size={14} />
                    {i18n.language === 'ar' ? 'حذف لدي' : 'Delete for me'}
                  </button>
                  {isOwn && (
                    <button
                      onClick={() => handleDeleteMessage?.(msg.id, true).catch(err => handleFirestoreError(err, OperationType.DELETE, `messages/${msg.id}/everyone`, false))}
                      className="px-4 py-2 text-sm text-left hover:bg-brand-error/10 text-brand-error flex items-center gap-2 transition-colors"
                    >
                      <Trash2 size={14} />
                      {i18n.language === 'ar' ? 'حذف لدى الجميع' : 'Delete for everyone'}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Reactions Display */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(msg.reactions).map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => handleReaction?.(msg.id, emoji).catch(err => handleFirestoreError(err, OperationType.UPDATE, `messages/${msg.id}/reactions`, false))}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                  users.includes(profile?.uid || '') 
                    ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' 
                    : 'bg-brand-surface border-brand-border-light text-brand-text-muted'
                }`}
              >
                <span>{emoji}</span>
                <span>{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  </div>
  );
});
