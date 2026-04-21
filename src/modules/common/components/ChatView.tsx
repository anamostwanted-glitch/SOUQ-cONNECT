import React, { useState, useEffect, useRef, lazy, Suspense, useMemo } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { useTranslation } from 'react-i18next';
import { usePersistedState } from '../../../shared/hooks/usePersistedState';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  doc, 
  getDoc,
  getDocs,
  orderBy,
  updateDoc,
  where,
  limit,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, getBlob } from 'firebase/storage';
import { db, storage } from '../../../core/firebase';
import imageCompression from 'browser-image-compression';
import { UserProfile, Message, Chat, ProductRequest, Quote, QuoteItem, Offer, AppFeatures } from '../../../core/types';
import { translateText, generateSmartReplies, moderateContent, translateAudio, negotiateOffer, getPriceIntelligence, summarizeChat, analyzeSentiment, handleAiError, refineChatMessage } from '../../../core/services/geminiService';
import { createNotification } from '../../../core/services/notificationService';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, Square, ArrowLeft, User as UserIcon, Play, Pause, MessageSquare, Image as ImageIcon, Upload, Tag, Phone, X, ZoomIn, Sparkles as SparklesIcon, Check, CheckCheck, FileText, PlusCircle, Trash2, Download, Printer, Star, Bot, MapPin, Reply, CheckCircle, Settings, Clock, SmilePlus, Search, MoreVertical, Copy, Forward, Pin, ShieldCheck, BrainCircuit, Sparkles, Info, ChevronLeft, ChevronUp, ChevronDown, CheckCircle2, Package, ChevronRight, Loader2, Zap } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';
import { soundService, SoundType } from '../../../core/utils/soundService';
import { Virtuoso } from 'react-virtuoso';
import { HapticButton } from '../../../shared/components/HapticButton';
import { ChatMessage, AudioPlayer } from './chat/ChatMessage';
import { extractUrls, renderTextWithLinks } from '../../../core/utils/linkParser';
import { LinkPreview } from './chat/LinkPreview';

const QuoteModal = lazy(() => import('./chat/QuoteModal').then(m => ({ default: m.QuoteModal })));
const NegotiationModal = lazy(() => import('./chat/NegotiationModal').then(m => ({ default: m.NegotiationModal })));
const RatingModal = lazy(() => import('./chat/RatingModal').then(m => ({ default: m.RatingModal })));
const ForwardModal = lazy(() => import('./chat/ForwardModal').then(m => ({ default: m.ForwardModal })));
const UserProfileModal = lazy(() => import('../../../shared/components/UserProfileModal'));

interface ChatViewProps {
  chatId: string;
  profile: UserProfile | null;
  features: AppFeatures;
  onBack: () => void;
  onViewProfile?: (uid: string) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ chatId, profile, features, onBack, onViewProfile }) => {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = usePersistedState(`chat_draft_${chatId}`, '');
  const [chat, setChat] = useState<any | null>(null);
  const [request, setRequest] = useState<ProductRequest | null>(null);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [senderPhotos, setSenderPhotos] = useState<Record<string, string>>({});
  const [senderProfiles, setSenderProfiles] = useState<Record<string, UserProfile>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingRefinement, setIsProcessingRefinement] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [slideOffset, setSlideOffset] = useState(0);
  const isCancellingRef = useRef(false);
  const startXRef = useRef<number | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);
  const [previewCaption, setPreviewCaption] = useState('');
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState<Record<string, boolean>>({});
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);

  const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!profile) return;
    
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const currentReactions = message.reactions || {};
    const usersWhoReactedWithEmoji = currentReactions[emoji] || [];
    
    let newReactions = { ...currentReactions };
    
    // Toggle reaction
    if (usersWhoReactedWithEmoji.includes(profile.uid)) {
      // Remove reaction
      newReactions[emoji] = usersWhoReactedWithEmoji.filter(id => id !== profile.uid);
      if (newReactions[emoji].length === 0) {
        delete newReactions[emoji];
      }
    } else {
      // Add reaction
      newReactions[emoji] = [...usersWhoReactedWithEmoji, profile.uid];
    }

    try {
      await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
        reactions: newReactions
      });
      setActiveReactionMessageId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}/messages/${messageId}`, false);
    }
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        pinnedMessageId: chat?.pinnedMessageId === messageId ? null : messageId
      });
      setActiveMessageMenuId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`, false);
    }
  };

  const handleDeleteMessage = async (messageId: string, forEveryone: boolean) => {
    if (!profile) return;
    try {
      if (forEveryone) {
        // We can't actually delete the document if we want to keep it simple, 
        // or we can just delete it from Firestore.
        // Let's mark it as deleted for everyone by deleting the document.
        // Wait, the user might not have permission to delete others' messages.
        // We should only allow forEveryone if they are the sender.
        const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
        // Actually, deleting the document is the best way for "Delete for everyone"
        // But we need to import deleteDoc.
        // Let's just update it to be a "deleted message" tombstone.
        await updateDoc(msgRef, {
          text: i18n.language === 'ar' ? 'تم حذف هذه الرسالة' : 'This message was deleted',
          type: 'text',
          imageUrl: null,
          audioUrl: null,
          isDeleted: true // We can add this flag if needed, but text replacement is enough for now
        });
      } else {
        // Delete for me
        const message = messages.find(m => m.id === messageId);
        if (!message) return;
        const deletedFor = message.deletedFor || [];
        if (!deletedFor.includes(profile.uid)) {
          await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
            deletedFor: [...deletedFor, profile.uid]
          });
        }
      }
      setActiveMessageMenuId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}/messages/${messageId}`, false);
    }
  };
  const isRtl = i18n.language === 'ar';
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [chatSummary, setChatSummary] = useState<string | null>(null);
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false);
  const [sentimentResult, setSentimentResult] = useState<{ score: number; sentiment: 'positive' | 'neutral' | 'negative'; summary: string } | null>(null);
  const [isSendingLocation, setIsSendingLocation] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [isModerating, setIsModerating] = useState(false);
  const [showSmartActions, setShowSmartActions] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<{ id: string; label: string; icon: any; action: () => void }[]>([]);
  const [isContextMinimized, setIsContextMinimized] = useState(false);
  const [draggedMessageId, setDraggedMessageId] = useState<string | null>(null);
  const [dragX, setDragX] = useState(0);

  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [pulseVisible, setPulseVisible] = useState(false);

  // Auto-pulse when messages change to simulate AI monitoring
  useEffect(() => {
    if (messages.length > 0) {
      setPulseVisible(true);
      const timer = setTimeout(() => setPulseVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [messages.length]);

  // Chameleon Action Bar Logic
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.senderId === profile?.uid) {
      setSuggestedActions([]);
      return;
    }

    const text = lastMsg.text?.toLowerCase() || '';
    const newActions: { id: string; label: string; icon: any; action: () => void }[] = [];

    if (profile?.role === 'supplier') {
      if (text.includes('سعر') || text.includes('بكم') || text.includes('price') || text.includes('how much')) {
        newActions.push({
          id: 'send-quote',
          label: isRtl ? 'إرسال عرض سعر' : 'Send Quote',
          icon: FileText,
          action: () => setShowQuoteModal(true)
        });
      }
      if (text.includes('اتفقنا') || text.includes('تمام') || text.includes('deal') || text.includes('ok')) {
        newActions.push({
          id: 'confirm-deal',
          label: isRtl ? 'تأكيد الاتفاق' : 'Confirm Deal',
          icon: CheckCircle2,
          action: () => {
            handleSend(undefined, isRtl ? 'تم التأكيد، سأقوم بتجهيز الطلب الآن.' : 'Confirmed, I will prepare the order now.').catch(err => handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}/messages`, false));
          }
        });
      }
    } else if (profile?.role === 'customer') {
      // If customer, check if there's an offer to accept
      const checkAndAddAcceptAction = async () => {
        try {
          const offersSnap = await getDocs(query(
            collection(db, 'offers'),
            where('requestId', '==', chat?.requestId),
            where('supplierId', '==', chat?.supplierId),
            where('status', '==', 'pending')
          ));
          
          if (!offersSnap.empty) {
            const offer = offersSnap.docs[0].data();
            setSuggestedActions(prev => [
              ...prev,
              {
                id: 'accept-offer',
                label: isRtl ? `قبول العرض (${offer.price} ر.س)` : `Accept Offer (${offer.price} SAR)`,
                icon: CheckCircle,
                action: async () => {
                  try {
                    await updateDoc(doc(db, 'offers', offersSnap.docs[0].id), { status: 'accepted' });
                    await handleSend(undefined, isRtl ? 'لقد قبلت عرضك، دعنا نكمل الإجراءات.' : 'I have accepted your offer, let\'s proceed.');
                    
                    // Send Email to Supplier
                    const supplierSnap = await getDoc(doc(db, 'users', chat.supplierId));
                    if (supplierSnap.exists()) {
                      const supplierData = supplierSnap.data();
                      if (supplierData.email) {
                        fetch('/api/send-email', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            email: supplierData.email,
                            name: supplierData.name,
                            template: 'offer_accepted',
                            language: isRtl ? 'ar' : 'en',
                            data: { productName: request?.productName || 'Product' }
                          })
                        }).catch(console.error);
                      }
                    }
                  } catch (err) {
                    handleFirestoreError(err, OperationType.UPDATE, 'offers', false);
                  }
                }
              }
            ]);
          }
        } catch (e) {
          console.error('Failed to check offers for action bar:', e);
        }
      };
      checkAndAddAcceptAction();
    }

    setSuggestedActions(newActions);
  }, [messages, profile, isRtl]);
  const [negotiationCustomerMessage, setNegotiationCustomerMessage] = useState('');
  
  // Watermark Settings
  const [watermarkLogoUrl, setWatermarkLogoUrl] = useState<string | null>(null);
  const [siteLogoUrl, setSiteLogoUrl] = useState<string | null>(null);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.5);
  const [watermarkPosition, setWatermarkPosition] = useState<'top-right' | 'top-left' | 'center' | 'bottom-right' | 'bottom-left'>('bottom-right');

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageId = useRef<string | null>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    // Chameleon Action Bar Logic: Suggest actions based on context
    const analyzeContext = () => {
      if (!messages.length || !profile) return;
      
      const lastMessage = messages[messages.length - 1];
      const newActions: { id: string; label: string; icon: any; action: () => void }[] = [];
      
      // If last message mentions price, money, or budget
      const priceKeywords = ['سعر', 'كم', 'بكم', 'فلوس', 'ميزانية', 'price', 'how much', 'cost', 'budget'];
      if (lastMessage.text && priceKeywords.some(k => lastMessage.text!.toLowerCase().includes(k))) {
        newActions.push({
          id: 'negotiate',
          label: isRtl ? 'تفاوض الآن' : 'Negotiate',
          icon: Sparkles,
          action: () => setShowNegotiationModal(true)
        });
      }
      
      // If last message is an image
      if (lastMessage.type === 'image') {
        newActions.push({
          id: 'analyze-image',
          label: isRtl ? 'تحليل الصورة' : 'Analyze Image',
          icon: BrainCircuit,
          action: () => { /* Logic to analyze image with Gemini */ }
        });
      }
      
      // If conversation is long (more than 10 messages)
      if (messages.length > 10) {
        newActions.push({
          id: 'summarize',
          label: isRtl ? 'لخص لي' : 'Summarize',
          icon: FileText,
          action: () => handleSummarizeChat().catch(err => handleAiError(err, "Summarize chat"))
        });
      }

      setSuggestedActions(newActions.slice(0, 2)); // Limit to 2 actions
      
      // Auto-hide actions after 10 seconds
      const timer = setTimeout(() => setSuggestedActions([]), 10000);
      return () => clearTimeout(timer);
    };

    analyzeContext();
  }, [messages, profile, isRtl]);

  const handleSummarizeChat = async () => {
    if (!messages.length) return;
    setIsSummarizing(true);
    setChatSummary(null);
    try {
      const messageTexts = messages.map(m => {
        const sender = m.senderId === profile?.uid ? (i18n.language === 'ar' ? 'أنا' : 'Me') : (senderNames[m.senderId] || '...');
        return `${sender}: ${m.text || (m.type === 'image' ? '[Image]' : '[Audio]')}`;
      });
      const summary = await summarizeChat(messageTexts.join('\n'), i18n.language);
      setChatSummary(summary);
    } catch (error) {
      handleAiError(error, 'Chat summarization');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleAnalyzeSentiment = async () => {
    if (!messages.length) return;
    setIsAnalyzingSentiment(true);
    setSentimentResult(null);
    try {
      // Analyze the last 10 messages for sentiment
      const recentMessages = messages.slice(-10).map(m => m.text).filter(Boolean).join('\n');
      if (!recentMessages) {
        setIsAnalyzingSentiment(false);
        return;
      }
      const result = await analyzeSentiment(recentMessages);
      setSentimentResult(result);
    } catch (error) {
      handleAiError(error, 'Sentiment analysis');
    } finally {
      setIsAnalyzingSentiment(false);
    }
  };

  useEffect(() => {
    const checkNegotiation = async () => {
      if (!messages.length || !profile || profile.role !== 'supplier') return;
      
      const lastMessage = messages[messages.length - 1];
      // Only negotiate if the last message is from the customer and it's text
      if (lastMessage.senderId === profile.uid || lastMessage.type !== 'text') return;

      try {
        // Find the offer associated with this chat
        const offersSnap = await getDocs(query(
          collection(db, 'offers'),
          where('requestId', '==', chat?.requestId),
          where('supplierId', '==', profile.uid)
        ));

        if (offersSnap.empty) return;
        const offer = { id: offersSnap.docs[0].id, ...offersSnap.docs[0].data() } as Offer;

        // Only auto-negotiate if enabled and we have a minPrice
        if (!offer.autoNegotiate || !offer.minPrice) return;

        setIsNegotiating(true);
        
        const history = messages.slice(-10).map(m => {
          const sender = m.senderId === profile.uid ? 'Supplier' : 'Customer';
          return `${sender}: ${m.text || '[Non-text message]'}`;
        }).join('\n');

        const result = await negotiateOffer(
          history,
          offer.price,
          offer.minPrice,
          i18n.language
        );

        if (result.shouldRespond && result.message) {
          // Send the AI response
          const messageData = {
            chatId,
            senderId: profile.uid,
            text: result.message,
            type: 'text',
            createdAt: new Date().toISOString(),
            read: false
          };
          await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
          await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: result.message,
            updatedAt: new Date().toISOString()
          });

          // If a new price was suggested, update the offer
          if (result.suggestedPrice && result.suggestedPrice !== offer.price) {
            await updateDoc(doc(db, 'offers', offer.id), {
              price: result.suggestedPrice,
              status: 'negotiating'
            });
          }
        }
      } catch (error) {
        handleAiError(error, 'Offer negotiation');
      } finally {
        setIsNegotiating(false);
      }
    };

    checkNegotiation().catch(err => handleAiError(err, "Negotiation check"));
  }, [messages, profile, chat, chatId, i18n.language]);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setWatermarkLogoUrl(data.watermarkLogoUrl || null);
        setSiteLogoUrl(data.logoUrl || null);
        setWatermarkOpacity(data.watermarkOpacity ?? 0.5);
        setWatermarkPosition(data.watermarkPosition || 'bottom-right');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site', false);
    });
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!chatId) return;

    const unsubChat = onSnapshot(doc(db, 'chats', chatId), async (snap) => {
      try {
        const chatData = snap.data() as any;
        if (!chatData) {
          // If chat doesn't exist, try to infer other user from chatId
          if (isMounted && profile) {
            const uids = chatId.split('_');
            const otherId = uids.find(id => id !== profile.uid);
            if (otherId && !otherId.startsWith('category_')) {
              try {
                const userSnap = await getDoc(doc(db, 'users_public', otherId));
                if (userSnap.exists() && isMounted) {
                  setOtherUser({ id: userSnap.id, ...userSnap.data() } as any as UserProfile);
                } else {
                  // Fallback to users
                  const fallbackSnap = await getDoc(doc(db, 'users', otherId));
                  if (fallbackSnap.exists() && isMounted) {
                    setOtherUser({ id: fallbackSnap.id, ...fallbackSnap.data() } as any as UserProfile);
                  }
                }
              } catch (err) {
                handleFirestoreError(err, OperationType.GET, `users/${otherId}`, false);
              }
            }
          }
          return;
        }
        if (!isMounted) return;
        setChat(chatData);

        // Check for other user typing
        const otherId = profile?.uid === chatData.customerId ? chatData.supplierId : chatData.customerId;
        if (chatData.typing && chatData.typing[otherId]) {
          if (!otherUserTyping) {
            soundService.play(SoundType.TYPING);
          }
          setOtherUserTyping(true);
        } else {
          setOtherUserTyping(false);
        }
        
        try {
          if (chatData.requestId && !chatData.isCategoryChat && !chatData.requestId.startsWith('category_')) {
            const reqSnap = await getDoc(doc(db, 'requests', chatData.requestId));
            if (reqSnap.exists() && isMounted) {
              const reqData = { id: reqSnap.id, ...reqSnap.data() } as ProductRequest;
              setRequest(reqData);
              
              // Also fetch category name for the request
              const catSnap = await getDoc(doc(db, 'categories', reqData.categoryId));
              if (catSnap.exists() && isMounted) {
                const cat = catSnap.data();
                setCategoryName(i18n.language === 'ar' ? cat.nameAr : cat.nameEn);
              }
            }
          }

          if (chatData.isCategoryChat) {
            const catSnap = await getDoc(doc(db, 'categories', chatData.categoryId));
            if (catSnap.exists() && isMounted) {
              const cat = catSnap.data();
              setCategoryName(i18n.language === 'ar' ? cat.nameAr : cat.nameEn);
            }
          } else {
            const otherId = profile?.uid === chatData.customerId ? chatData.supplierId : chatData.customerId;
            try {
              // Try users_public first
              const upSnap = await getDoc(doc(db, 'users_public', otherId));
              if (upSnap.exists() && isMounted) {
                setOtherUser({ id: upSnap.id, ...upSnap.data() } as any as UserProfile);
              } else {
                // Fallback to users
                const userSnap = await getDoc(doc(db, 'users', otherId));
                if (userSnap.exists() && isMounted) {
                  setOtherUser(userSnap.data() as any as UserProfile);
                } else if (isMounted) {
                  setOtherUser({ uid: otherId, name: 'Customer', role: 'customer' } as UserProfile);
                }
              }
            } catch (error: any) {
              if (error.message?.includes('Missing or insufficient permissions') || error.code === 'permission-denied') {
                // Fallback for protected customer profiles
                if (isMounted) setOtherUser({ uid: otherId, name: 'Customer', role: 'customer' } as UserProfile);
              } else {
                throw error;
              }
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `chats/${chatId} dependencies`, false);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `chats/${chatId}`, false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${chatId}`, false);
    });

    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubMsgs = onSnapshot(q, { includeMetadataChanges: true }, async (snap) => {
      try {
        const msgs = snap.docs.map(d => ({ 
          id: d.id, 
          ...d.data(),
          pending: d.metadata.hasPendingWrites 
        } as Message));
        
        // Play received sound if new message from other user
        if (!isInitialLoad.current && msgs.length > 0) {
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg.id !== lastMessageId.current && lastMsg.senderId !== profile?.uid) {
            soundService.play(SoundType.RECEIVED);
          }
        }
        
        if (msgs.length > 0) {
          lastMessageId.current = msgs[msgs.length - 1].id;
        }
        isInitialLoad.current = false;

        if (isMounted) setMessages(msgs);

        // Mark messages as read
        if (profile) {
          const unreadMsgs = msgs.filter(m => m.senderId !== profile.uid && !m.read);
          if (unreadMsgs.length > 0) {
            await Promise.all(unreadMsgs.map(m => 
              updateDoc(doc(db, 'chats', chatId, 'messages', m.id), { read: true })
                .catch(error => handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}/messages/${m.id}`, false))
            ));
          }
        }

        // Fetch sender names and photos in parallel
        const uniqueSenderIds = Array.from(new Set(msgs.map(m => m.senderId))).filter(id => id && id !== 'system');
        const missingSenderIds = uniqueSenderIds.filter(id => !senderProfiles[id]);
        
        if (missingSenderIds.length > 0) {
          const profilePromises = missingSenderIds.map(async (id) => {
            try {
              const uSnap = await getDoc(doc(db, 'users', id));
              if (uSnap.exists()) {
                const userData = uSnap.data() as UserProfile;
                return { id, data: userData };
              }
              return { id, data: { uid: id, name: 'Customer', role: 'customer' } as UserProfile };
            } catch (error: any) {
              if (error.message?.includes('Missing or insufficient permissions') || error.code === 'permission-denied') {
                return { id, data: { uid: id, name: 'Customer', role: 'customer' } as UserProfile };
              }
              handleFirestoreError(error, OperationType.GET, `users/${id}`, false);
              return { id, data: { uid: id, name: 'Customer', role: 'customer' } as UserProfile };
            }
          });

          const results = await Promise.all(profilePromises);
          
          if (isMounted) {
            setSenderProfiles(prev => {
              const updated = { ...prev };
              results.forEach(res => {
                updated[res.id] = res.data;
              });
              return updated;
            });
            
            setSenderNames(prev => {
              const updated = { ...prev };
              results.forEach(res => {
                updated[res.id] = res.data.name;
              });
              return updated;
            });

            setSenderPhotos(prev => {
              const updated = { ...prev };
              results.forEach(res => {
                updated[res.id] = res.data.logoUrl || res.data.photoURL || '';
              });
              return updated;
            });
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`, false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`, false);
    });

    return () => {
      isMounted = false;
      unsubChat();
      unsubMsgs();
    };
  }, [chatId, profile]);

  const isExpired = chat?.createdAt ? Date.now() - new Date(chat.createdAt).getTime() > 24 * 60 * 60 * 1000 : false;

  const lastProcessedMessageId = useRef<string | null>(null);
  const generationIdRef = useRef<number>(0);
  
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Generate smart replies if the last message is from the other user
    const generateReplies = async () => {
      if (!messages.length || !profile || isExpired || !features.aiChat) return;
      
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.senderId !== profile.uid && lastMessage.type === 'text' && lastMessage.id !== lastProcessedMessageId.current) {
        lastProcessedMessageId.current = lastMessage.id;
        const currentGenId = ++generationIdRef.current;
        setIsGeneratingReplies(true);
        try {
          // Build a short chat history for context (last 5 messages)
          const history = messages.slice(-5).map(m => {
            const sender = m.senderId === profile.uid ? 'Me' : 'Other';
            return `${sender}: ${m.text || (m.type === 'image' ? '[Image]' : '[Audio]')}`;
          }).join('\n');
          
          const replies = await generateSmartReplies(history, profile.role as 'supplier' | 'customer', i18n.language);
          
          // Only set replies if we haven't processed a newer message in the meantime
          if (currentGenId === generationIdRef.current) {
            setSmartReplies(replies);
          }
        } catch (error) {
          handleAiError(error, 'Smart replies generation');
        } finally {
          if (currentGenId === generationIdRef.current) {
            setIsGeneratingReplies(false);
          }
        }
      } else if (lastMessage.senderId === profile.uid) {
        setSmartReplies([]);
        setIsGeneratingReplies(false);
        lastProcessedMessageId.current = lastMessage.id;
      }
    };

    generateReplies().catch(err => handleAiError(err, "Generate replies"));
  }, [messages, profile, isExpired, i18n.language]);

  const handleTranslateAudio = async (messageId: string, audioUrl: string) => {
    if (translatedMessages[messageId]) {
      const newTranslated = { ...translatedMessages };
      delete newTranslated[messageId];
      setTranslatedMessages(newTranslated);
      return;
    }

    setIsTranslating(prev => ({ ...prev, [messageId]: true }));
    try {
      const audioRef = ref(storage, audioUrl);
      const blob = await getBlob(audioRef);
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          const targetLang = i18n.language === 'ar' ? 'Arabic' : 'English';
          const translation = await translateAudio(base64Audio, blob.type, targetLang);
          setTranslatedMessages(prev => ({ ...prev, [messageId]: translation }));
          setIsTranslating(prev => ({ ...prev, [messageId]: false }));
        } catch (error) {
          handleAiError(error, 'Audio translation (reader)');
          setIsTranslating(prev => ({ ...prev, [messageId]: false }));
        }
      };
    } catch (error) {
      handleAiError(error, 'Audio translation');
      setIsTranslating(prev => ({ ...prev, [messageId]: false }));
    }
  };

  const handleTranslate = async (messageId: string, text: string) => {
    if (translatedMessages[messageId]) {
      // Toggle back if already translated
      const newTranslated = { ...translatedMessages };
      delete newTranslated[messageId];
      setTranslatedMessages(newTranslated);
      return;
    }

    setIsTranslating(prev => ({ ...prev, [messageId]: true }));
    try {
      const targetLang = i18n.language === 'ar' ? 'Arabic' : 'English';
      const translation = await translateText(text, targetLang);
      setTranslatedMessages(prev => ({ ...prev, [messageId]: translation }));
    } catch (error) {
      handleAiError(error, 'Text translation');
    } finally {
      setIsTranslating(prev => ({ ...prev, [messageId]: false }));
    }
  };

  const handleSendQuote = async (quoteData: Quote) => {
    if (!profile) return;

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        chatId,
        senderId: profile.uid,
        quoteData,
        type: 'quote',
        createdAt: new Date().toISOString(),
        read: false
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: i18n.language === 'ar' ? '📄 عرض سعر جديد' : '📄 New Quote',
        updatedAt: new Date().toISOString()
      });

      soundService.play(SoundType.SENT);
      setShowQuoteModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}/messages`, false);
    }
  };

  const handleSendLocation = async () => {
    if (!profile || isExpired || isSendingLocation) return;

    if (!navigator.geolocation) {
      alert(i18n.language === 'ar' ? 'المتصفح لا يدعم تحديد الموقع' : 'Geolocation is not supported by your browser');
      return;
    }

    setIsSendingLocation(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      
      try {
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          chatId,
          senderId: profile.uid,
          location: { latitude, longitude },
          type: 'location',
          createdAt: new Date().toISOString(),
          read: false
        });

        await updateDoc(doc(db, 'chats', chatId), {
          lastMessage: i18n.language === 'ar' ? '📍 موقع جغرافي' : '📍 Location',
          updatedAt: new Date().toISOString()
        });
        soundService.play(SoundType.SENT);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}/messages`, false);
      } finally {
        setIsSendingLocation(false);
      }
    }, (error) => {
      handleAiError(error, 'Geolocation');
      alert(i18n.language === 'ar' ? 'فشل الحصول على الموقع' : 'Failed to get location');
      setIsSendingLocation(false);
    });
  };

  const [chatError, setChatError] = useState<string | null>(null);

  const handleTyping = async () => {
    if (!profile || !chatId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to true in Firestore if not already
    if (!chat?.typing?.[profile.uid]) {
      try {
        await updateDoc(doc(db, 'chats', chatId), {
          [`typing.${profile.uid}`]: true
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`, false);
      }
    }

    // Set timeout to clear typing status
    typingTimeoutRef.current = setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'chats', chatId), {
          [`typing.${profile.uid}`]: false
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`, false);
      }
    }, 3000);
  };

  const handleSend = async (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    const textToSend = overrideText || inputText;
    if (!textToSend.trim() || !profile) return;

    const text = textToSend;
    if (!overrideText) setInputText('');
    setSmartReplies([]);
    setIsGeneratingReplies(false);
    generationIdRef.current++;
    
    // Immediate feedback
    soundService.play(SoundType.SENT);
    
    // Process sending in background to not block UI
    const processSend = async () => {
      setIsModerating(true);
      setChatError(null);

      try {
        // Content Moderation
        const moderation = await moderateContent(text);
        if (!moderation.isSafe) {
          // Log to moderation_alerts for admin
          await addDoc(collection(db, 'moderation_alerts'), {
            chatId,
            senderId: profile.uid,
            text,
            reason: moderation.reason,
            createdAt: new Date().toISOString(),
            resolved: false
          });

          setChatError(i18n.language === 'ar' 
            ? `تم حظر الرسالة: ${moderation.reason}` 
            : `Message blocked: ${moderation.reason}`);
          setTimeout(() => setChatError(null), 5000);
          return;
        }

        const messageData: any = {
          chatId,
          senderId: profile.uid,
          text,
          type: 'text',
          createdAt: new Date().toISOString(),
          read: false
        };

        if (replyingTo) {
          messageData.replyTo = {
            id: replyingTo.id,
            text: replyingTo.text || (replyingTo.type === 'image' ? '📷 Image' : replyingTo.type === 'audio' ? '🎤 Voice Message' : 'Message'),
            type: replyingTo.type,
            senderName: senderNames[replyingTo.senderId] || (replyingTo.senderId === profile.uid ? t('you') : '...')
          };
          setReplyingTo(null);
        }

        // If chat doesn't exist yet, create it
        if (!chat) {
          const uids = chatId.split('_');
          const otherId = uids.find(id => id !== profile.uid);
          
          if (otherId) {
            let customerId, supplierId;
            // Infer roles: if current user is supplier, they are supplierId
            if (profile.role === 'supplier') {
              supplierId = profile.uid;
              customerId = otherId;
            } else {
              customerId = profile.uid;
              supplierId = otherId;
            }

            const newChatData = {
              customerId,
              supplierId,
              updatedAt: new Date().toISOString(),
              lastMessage: text,
              status: 'active',
              createdAt: new Date().toISOString()
            };
            
            // Use setDoc for sorted UID chatId
            await setDoc(doc(db, 'chats', chatId), newChatData);
            // Update local state so subsequent logic works
            setChat(newChatData);
          }
        }

        await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
        
        if (chat || true) { // chat might have been set above
          const currentChat = chat || { customerId: profile.uid === chatId.split('_')[0] ? chatId.split('_')[0] : chatId.split('_')[1], supplierId: profile.uid === chatId.split('_')[0] ? chatId.split('_')[1] : chatId.split('_')[0] };
          // Wait, let's just use the logic from above
          const uids = chatId.split('_');
          const otherId = uids.find(id => id !== profile.uid);
          const recipientId = chat ? (profile.uid === chat.customerId ? chat.supplierId : chat.customerId) : otherId;
          
          if (recipientId) {
            await createNotification({
              userId: recipientId,
              titleAr: 'رسالة جديدة',
              titleEn: 'New Message',
              bodyAr: `لديك رسالة جديدة من ${profile.name}`,
              bodyEn: `You have a new message from ${profile.name}`,
              actionType: 'general',
              targetId: chatId,
            });

            // Send Email if recipient is offline
            const recipientProfile = otherUser?.uid === recipientId ? otherUser : null;
            if (recipientProfile?.email && !recipientProfile.isOnline) {
              fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: recipientProfile.email,
                  name: recipientProfile.name,
                  template: 'new_message',
                  language: i18n.language,
                  data: { senderName: profile.name }
                })
              }).catch(console.error);
            } else if (!recipientProfile) {
              // Fetch recipient profile if not in state
              getDoc(doc(db, 'users', recipientId)).then(snap => {
                if (snap.exists()) {
                  const data = snap.data();
                  if (data.email && !data.isOnline) {
                    fetch('/api/send-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        email: data.email,
                        name: data.name,
                        template: 'new_message',
                        language: i18n.language,
                        data: { senderName: profile.name }
                      })
                    }).catch(console.error);
                  }
                }
              });
            }
          }

          if (chat) {
            await updateDoc(doc(db, 'chats', chatId), {
              lastMessage: text,
              updatedAt: new Date().toISOString()
            });
          }
        }
        
        // Haptic feedback for sending message
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}`, false);
      } finally {
        setIsModerating(false);
      }
    };

    processSend().catch(err => handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}/messages`, false));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      }
      
      mediaRecorder.current = new MediaRecorder(stream, options);
      audioChunks.current = [];
      isCancellingRef.current = false;
      setSlideOffset(0);

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        if (isCancellingRef.current) {
          return;
        }

        try {
          const mimeType = mediaRecorder.current?.mimeType || 'audio/webm';
          const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
          const audioBlob = new Blob(audioChunks.current, { type: mimeType });
          const audioFile = new File([audioBlob], `voice_${Date.now()}.${ext}`, { type: mimeType });
          
          const storageRef = ref(storage, `chats/${chatId}/${Date.now()}.${ext}`);
          await uploadBytes(storageRef, audioFile);
          const url = await getDownloadURL(storageRef);

          await addDoc(collection(db, 'chats', chatId, 'messages'), {
            chatId,
            senderId: profile!.uid,
            audioUrl: url,
            type: 'audio',
            createdAt: new Date().toISOString(),
            read: false
          });

          await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: 'Voice Message',
            updatedAt: new Date().toISOString()
          });
          soundService.play(SoundType.SENT);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}`, false);
        }
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Haptic feedback for starting recording
      if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      handleAiError(err, 'Microphone access');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    setIsRecording(false);
    setSlideOffset(0);
    startXRef.current = null;
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if ('touches' in e) {
      startXRef.current = e.touches[0].clientX;
    } else {
      startXRef.current = e.clientX;
    }
    startRecording();
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isRecording || startXRef.current === null) return;
    
    const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const diff = currentX - startXRef.current;
    
    // If RTL, sliding right means diff is positive.
    // If LTR, sliding left means diff is negative.
    const isRTL = i18n.language === 'ar';
    const slideAmount = isRTL ? Math.max(0, diff) : Math.min(0, diff); 
    
    setSlideOffset(slideAmount);
    
    if (Math.abs(slideAmount) > 100) {
      isCancellingRef.current = true;
      stopRecording();
      // Haptic feedback for cancel
      if (navigator.vibrate) {
        navigator.vibrate([50, 100, 50]);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isCancellingRef.current) {
      stopRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const applyWatermark = async (file: File): Promise<File> => {
    const logoUrl = watermarkLogoUrl || siteLogoUrl;
    if (!logoUrl) return file;

    return new Promise((resolve) => {
      const process = async () => {
        let finalLogoUrl = logoUrl;
      let isObjectUrl = false;

      // Try to fetch the logo as a blob to avoid canvas tainting/CORS issues
      if (!logoUrl.startsWith('data:')) {
        try {
          if (logoUrl.includes('firebasestorage.googleapis.com')) {
            // Use Firebase Storage getBlob to bypass CORS if possible
            const logoRef = ref(storage, logoUrl);
            const blob = await getBlob(logoRef);
            finalLogoUrl = URL.createObjectURL(blob);
            isObjectUrl = true;
          } else {
            const res = await fetch(logoUrl, { mode: 'cors' });
            if (res.ok) {
              const blob = await res.blob();
              finalLogoUrl = URL.createObjectURL(blob);
              isObjectUrl = true;
            } else {
              throw new Error('Fetch failed');
            }
          }
        } catch (e) {
          console.warn("Failed to fetch watermark image securely (CORS/Storage error):", e);
          // We will try to load it directly via Image.src, which might taint the canvas
        }
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (isObjectUrl) URL.revokeObjectURL(finalLogoUrl);
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0);

        const watermark = new Image();
        // Always set crossOrigin to anonymous for external URLs
        if (!finalLogoUrl.startsWith('data:') && !finalLogoUrl.startsWith('blob:')) {
          watermark.crossOrigin = 'anonymous';
        }
        
        watermark.onload = () => {
          ctx.globalAlpha = watermarkOpacity;
          
          const watermarkWidth = img.width * 0.2;
          const watermarkHeight = (watermark.height / watermark.width) * watermarkWidth;
          
          let x = 0;
          let y = 0;
          const padding = 20;

          switch (watermarkPosition) {
            case 'top-left':
              x = padding;
              y = padding;
              break;
            case 'top-right':
              x = img.width - watermarkWidth - padding;
              y = padding;
              break;
            case 'center':
              x = (img.width - watermarkWidth) / 2;
              y = (img.height - watermarkHeight) / 2;
              break;
            case 'bottom-left':
              x = padding;
              y = img.height - watermarkHeight - padding;
              break;
            case 'bottom-right':
              x = img.width - watermarkWidth - padding;
              y = img.height - watermarkHeight - padding;
              break;
          }

          ctx.drawImage(watermark, x, y, watermarkWidth, watermarkHeight);
          ctx.globalAlpha = 1.0;

          try {
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(new File([blob], file.name, { type: file.type }));
              } else {
                resolve(file);
              }
              if (isObjectUrl) URL.revokeObjectURL(finalLogoUrl);
            }, file.type);
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, 'image/watermark/blob', false);
            resolve(file);
            if (isObjectUrl) URL.revokeObjectURL(finalLogoUrl);
          }
        };
        watermark.onerror = (e) => {
          handleFirestoreError(e, OperationType.GET, 'image/watermark/load', false);
          resolve(file);
          if (isObjectUrl) URL.revokeObjectURL(finalLogoUrl);
        };
        
        // Add cache buster for external URLs to avoid CORS cache issues
        if (!finalLogoUrl.startsWith('data:') && !finalLogoUrl.startsWith('blob:')) {
          watermark.src = finalLogoUrl + (finalLogoUrl.includes('?') ? '&' : '?') + 'cb=' + new Date().getTime();
        } else {
          watermark.src = finalLogoUrl;
        }
      };
      img.onerror = (e) => {
        handleFirestoreError(e, OperationType.GET, 'image/original/load', false);
        resolve(file);
        if (isObjectUrl) URL.revokeObjectURL(finalLogoUrl);
      };
      img.src = URL.createObjectURL(file);
    };
    process();
  });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !profile) return;
    
    setPreviewFiles(files);
    setPreviewCaption('');
    setShowFilePreview(true);
    
    // Reset input value to allow re-uploading the same file
    e.target.value = '';
  };

  const confirmImageUpload = async () => {
    if (previewFiles.length === 0 || !profile) return;

    let step = 'starting upload';
    try {
      setIsUploading(true);
      setShowFilePreview(false);
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      };

      for (const file of previewFiles) {
        let fileToUpload = file;
        
        // Apply watermark if available
        if (watermarkLogoUrl || siteLogoUrl) {
          fileToUpload = await applyWatermark(file);
        }

        step = 'compressing';
        const compressedFile = await imageCompression(fileToUpload, options);
        
        step = 'uploading to storage';
        const storageRef = ref(storage, `chats/${chatId}/img_${Date.now()}_${compressedFile.name}`);
        await uploadBytes(storageRef, compressedFile);
        
        step = 'getting download URL';
        const url = await getDownloadURL(storageRef);

        step = 'adding message to firestore';
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          chatId,
          senderId: profile.uid,
          imageUrl: url,
          text: previewCaption.trim() || null,
          type: 'image',
          createdAt: new Date().toISOString(),
          read: false
        });

        step = 'updating chat document';
        await updateDoc(doc(db, 'chats', chatId), {
          lastMessage: '📷 Image',
          updatedAt: new Date().toISOString()
        });
        soundService.play(SoundType.SENT);
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}/images`, false);
      setChatError(i18n.language === 'ar' 
        ? `فشل رفع الصورة (${step}). يرجى التأكد من تفعيل خدمة Firebase Storage في لوحة التحكم وتعيين القواعد المناسبة.` 
        : `Failed to upload image (${step}). Please ensure Firebase Storage is enabled in your console and rules are set.`);
      setTimeout(() => setChatError(null), 5000);
    } finally {
      setIsUploading(false);
      setPreviewFiles([]);
      setPreviewCaption('');
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (profile && msg.deletedFor?.includes(profile.uid)) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    if (msg.text && msg.text.toLowerCase().includes(query)) return true;
    if (msg.type === 'image' && (i18n.language === 'ar' ? 'صورة' : 'image').includes(query)) return true;
    if (msg.type === 'audio' && (i18n.language === 'ar' ? 'صوت' : 'audio').includes(query)) return true;
    return false;
  });

  const firstUnreadIndex = useMemo(() => {
    if (!chat?.unreadCount || chat.unreadCount <= 0 || !profile) return -1;
    // Find the first message not sent by current user that is unread
    // In this simplified logic, we assume the last unreadCount messages are unread
    const index = filteredMessages.length - chat.unreadCount;
    return index >= 0 ? index : -1;
  }, [filteredMessages, chat?.unreadCount, profile]);

  return (
    <div className="flex flex-col fixed inset-0 top-[73px] bg-brand-background z-20">
      {/* Luxury Smart Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-brand-border/30 px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <HapticButton 
            onClick={onBack}
            className="p-2 -ml-2 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-full transition-all"
          >
            <ChevronLeft size={24} className={isRtl ? 'rotate-180' : ''} />
          </HapticButton>
          
          <div 
            onClick={() => {
              if (!chat?.isCategoryChat && otherUser) {
                if (onViewProfile) onViewProfile(otherUser.uid);
                else setShowUserProfileModal(true);
              }
            }}
            className={`flex items-center gap-3 flex-1 min-w-0 ${!chat?.isCategoryChat ? 'cursor-pointer group/header' : ''}`}
          >
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-md transition-all group-hover/header:rotate-3 group-hover/header:scale-105 bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                {chat?.isCategoryChat ? (
                  <MessageSquare size={20} />
                ) : otherUser?.photoURL || otherUser?.logoUrl ? (
                  <img 
                    src={otherUser?.photoURL || otherUser?.logoUrl} 
                    alt={otherUser?.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserIcon size={20} />
                )}
              </div>
              {otherUserTyping && (
                <div className="absolute -bottom-1 -right-1 bg-brand-primary text-white p-1 rounded-full border-2 border-white dark:border-slate-900 animate-bounce">
                  <div className="flex gap-0.5">
                    <span className="w-1 h-1 bg-white rounded-full animate-pulse"></span>
                    <span className="w-1 h-1 bg-white rounded-full animate-pulse delay-75"></span>
                    <span className="w-1 h-1 bg-white rounded-full animate-pulse delay-150"></span>
                  </div>
                </div>
              )}
              {!otherUserTyping && otherUser?.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-brand-success rounded-full border-2 border-white dark:border-slate-900 shadow-sm"></div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-slate-900 dark:text-white truncate text-base tracking-tight group-hover/header:text-brand-primary transition-colors">
                  {chat?.isCategoryChat ? categoryName : (otherUser?.name || (isRtl ? 'بائع' : 'Seller'))}
                </h3>
                {otherUser?.role === 'supplier' && (
                  <div className="bg-brand-primary/10 text-brand-primary p-0.5 rounded-md">
                    <ShieldCheck size={12} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {otherUserTyping ? (
                  <span className="text-[10px] font-black text-brand-primary animate-pulse uppercase tracking-[0.2em]">
                    {isRtl ? 'يكتب الآن...' : 'Typing...'}
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${otherUser?.isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${otherUser?.isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {otherUser?.isOnline ? (isRtl ? 'متصل الآن' : 'Online Now') : (
                        otherUser?.lastActive ? (
                          isRtl ? `نشط ${formatDistanceToNow(new Date(otherUser.lastActive), { addSuffix: true, locale: ar })}` : `Active ${formatDistanceToNow(new Date(otherUser.lastActive), { addSuffix: true, locale: enUS })}`
                        ) : (isRtl ? 'نشط مؤخراً' : 'Recently Active')
                      )}
                    </span>
                    {otherUser?.role === 'supplier' && (
                      <>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className="text-[10px] font-black text-amber-500 flex items-center gap-0.5">
                          <Star size={10} fill="currentColor" />
                          {otherUser?.rating || '5.0'}
                        </span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] whitespace-nowrap">
                          {isRtl ? 'رد فائق السرعة' : 'Ultra-Fast'}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <HapticButton 
            onClick={() => setIsSearching(!isSearching)}
            className={`p-2 rounded-xl transition-all ${isSearching ? 'bg-brand-primary text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <Search size={20} />
          </HapticButton>
          
          <div className="relative">
            <HapticButton 
              onClick={() => setShowSmartActions(!showSmartActions)}
              className={`p-2 rounded-xl transition-all ${showSmartActions ? 'bg-brand-primary text-white' : 'text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20'}`}
            >
              <BrainCircuit size={20} className={showSmartActions ? 'animate-pulse' : ''} />
            </HapticButton>
            
            <AnimatePresence>
              {showSmartActions && (
                <motion.div
                  key="smart-actions-dropdown"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className={`absolute top-full mt-2 ${isRtl ? 'left-0' : 'right-0'} w-64 bg-white dark:bg-slate-800 border border-brand-border/50 shadow-2xl rounded-[2rem] p-4 z-50`}
                >
                  <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-4 px-2 flex items-center gap-2">
                    <Sparkles size={12} />
                    {isRtl ? 'إجراءات ذكية' : 'Smart Actions'}
                  </h4>
                  <div className="space-y-2">
                    <button 
                      onClick={() => { handleSummarizeChat().catch(err => handleAiError(err, 'Summarize chat')); setShowSmartActions(false); }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                        <FileText size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{isRtl ? 'تلخيص المحادثة' : 'Summarize Chat'}</p>
                        <p className="text-[9px] text-slate-500">{isRtl ? 'احصل على ملخص سريع' : 'Get a quick overview'}</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => { handleAnalyzeSentiment().catch(err => handleAiError(err, 'Sentiment analysis')); setShowSmartActions(false); }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                        <SmilePlus size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{isRtl ? 'تحليل المشاعر' : 'Analyze Sentiment'}</p>
                        <p className="text-[9px] text-slate-500">{isRtl ? 'فهم نبرة المحادثة' : 'Understand the tone'}</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => { /* Toggle auto-translate all */ setShowSmartActions(false); }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <SparklesIcon size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{isRtl ? 'ترجمة تلقائية' : 'Auto-Translate'}</p>
                        <p className="text-[9px] text-slate-500">{isRtl ? 'ترجمة جميع الرسائل' : 'Translate all messages'}</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {chat?.status === 'active' && profile?.role === 'customer' && (
            <HapticButton 
              onClick={() => setShowRatingModal(true)}
              className="p-2 text-brand-success bg-brand-success/10 hover:bg-brand-success/20 rounded-xl transition-all"
              title={isRtl ? 'إنهاء وتقييم' : 'End & Rate'}
            >
              <Check size={20} />
            </HapticButton>
          )}
        </div>
      </div>

      {/* Chameleon Action Bar (Floating Contextual Suggestions) */}
      <AnimatePresence>
        {suggestedActions.length > 0 && (
          <motion.div 
            key="chameleon-action-bar"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="absolute top-20 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none"
          >
            <div className="flex gap-2 pointer-events-auto">
              {suggestedActions.map(action => (
                <HapticButton
                  key={action.id}
                  onClick={action.action}
                  className="bg-brand-primary text-white px-4 py-2 rounded-full shadow-lg shadow-brand-primary/30 flex items-center gap-2 text-xs font-bold border border-white/20 backdrop-blur-md"
                >
                  <action.icon size={14} />
                  {action.label}
                </HapticButton>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Context Card (Product Info) */}
      <AnimatePresence>
        {request && (
          <motion.div 
            key="product-context-card"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`absolute top-[4.5rem] ${isRtl ? 'left-4' : 'right-4'} z-30 max-w-[280px]`}
          >
            <motion.div 
              layout
              className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-brand-border/30 shadow-xl rounded-3xl overflow-hidden"
            >
              <div className="p-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                    <Tag size={16} />
                  </div>
                  {!isContextMinimized && (
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-brand-primary uppercase tracking-widest mb-0.5">
                        {isRtl ? 'الطلب الحالي' : 'Current Request'}
                      </p>
                      <h4 className="text-[11px] font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                        {request.titleAr || request.titleEn || request.title}
                      </h4>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isContextMinimized && (
                    <div className="text-right">
                      <p className="text-[11px] font-black text-brand-primary">
                        {request.budget} {request.currency}
                      </p>
                    </div>
                  )}
                  <HapticButton 
                    onClick={() => setIsContextMinimized(!isContextMinimized)}
                    className="p-1.5 text-slate-400 hover:text-brand-primary rounded-lg transition-colors"
                  >
                    {isContextMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </HapticButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Bar */}

      <AnimatePresence>
        {isSearching && (
          <motion.div 
            key="chat-search-bar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-brand-border/30"
          >
            <div className="max-w-4xl mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRtl ? 'بحث في المحادثة...' : 'Search in conversation...'}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-brand-border/50 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none"
                autoFocus
              />
              <button 
                onClick={() => { setIsSearching(false); setSearchQuery(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned Message */}
      <AnimatePresence>
        {chat?.pinnedMessageId && messages.find(m => m.id === chat.pinnedMessageId) && (
          <motion.div
            key="pinned-message-bar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-brand-surface/90 backdrop-blur-md border-b border-brand-border-light px-4 py-2 z-20 flex items-center gap-3 cursor-pointer hover:bg-brand-surface transition-colors"
            onClick={() => {
              // Scroll to message logic could go here
              // For now, it just shows the pinned message
            }}
          >
            <Pin size={16} className="text-brand-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-brand-primary mb-0.5">
                {i18n.language === 'ar' ? 'رسالة مثبتة' : 'Pinned Message'}
              </p>
              <p className="text-sm text-brand-text-main truncate">
                {messages.find(m => m.id === chat.pinnedMessageId)?.text || 
                 (messages.find(m => m.id === chat.pinnedMessageId)?.type === 'image' ? (i18n.language === 'ar' ? 'صورة' : 'Image') : 
                  messages.find(m => m.id === chat.pinnedMessageId)?.type === 'audio' ? (i18n.language === 'ar' ? 'رسالة صوتية' : 'Audio message') : '')}
              </p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handlePinMessage(chat.pinnedMessageId).catch(err => handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}/pin`, false));
              }}
              className="p-2 text-brand-text-muted hover:text-brand-text-main rounded-full hover:bg-brand-background transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        {showUserProfileModal && (
          <UserProfileModal 
            user={otherUser}
            isOpen={showUserProfileModal}
            onClose={() => setShowUserProfileModal(false)}
          />
        )}
      </Suspense>

      {/* Request Info Bar (Visible to both, but especially important for supplier) */}
      <AnimatePresence>
        {request && !chat?.isCategoryChat && (
          <motion.div 
            key="request-info-bar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-brand-primary text-white px-6 py-3 flex items-center justify-between shadow-inner relative overflow-hidden"
          >
            {/* Animated background pulse */}
            <motion.div 
              key="request-info-bg-pulse"
              animate={{ opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 bg-white"
            />

            <div className="flex items-center gap-3 overflow-hidden relative z-10">
              <div className="p-2 bg-white/20 rounded-xl shrink-0 backdrop-blur-md border border-white/30">
                <Package size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 leading-none mb-1.5">
                  {i18n.language === 'ar' ? 'المنتج المطلوب' : 'Requested Product'}
                </p>
                <h4 className="text-sm font-black truncate tracking-tight">
                  {request.productName}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0 relative z-10">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 leading-none mb-1.5">
                  {i18n.language === 'ar' ? 'آخر تفاعل' : 'Last Interaction'}
                </p>
                <div className="flex items-center gap-1.5 justify-end">
                  <Clock size={10} className="opacity-70" />
                  <p className="text-xs font-black uppercase tracking-wider">
                    {chat?.updatedAt ? formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true, locale: isRtl ? ar : enUS }) : '...'}
                  </p>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 leading-none mb-1.5">
                  {i18n.language === 'ar' ? 'حالة الصفقة' : 'Deal Status'}
                </p>
                <div className="flex items-center gap-1.5 justify-end">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    request.status === 'open' ? 'bg-emerald-400' : 
                    request.status === 'closed' ? 'bg-slate-400' : 'bg-amber-400'
                  }`} />
                  <p className="text-xs font-black uppercase tracking-wider">{request.status}</p>
                </div>
              </div>
              
              <HapticButton
                onClick={() => setIsContextMinimized(!isContextMinimized)}
                className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
              >
                <Info size={16} />
              </HapticButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden bg-brand-background relative">
        <AnimatePresence>
          {(chatSummary || sentimentResult) && (
            <motion.div
              key="ai-insights-panel"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-4 right-4 z-40 bg-brand-surface/95 backdrop-blur-md border border-brand-border-light rounded-2xl p-4 shadow-xl max-w-2xl mx-auto"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 text-brand-primary">
                  <SparklesIcon size={18} />
                  <h4 className="font-bold text-sm uppercase tracking-wider">
                    {chatSummary ? (i18n.language === 'ar' ? 'ملخص الذكاء الاصطناعي' : 'AI Summary') : (i18n.language === 'ar' ? 'تحليل المشاعر' : 'Sentiment Analysis')}
                  </h4>
                </div>
                <button 
                  onClick={() => { setChatSummary(null); setSentimentResult(null); }}
                  className="p-3 hover:bg-brand-background rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              {chatSummary && (
                <p className="text-sm text-brand-text-main leading-relaxed italic">
                  "{chatSummary}"
                </p>
              )}
              
              {sentimentResult && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                      sentimentResult.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-700' :
                      sentimentResult.sentiment === 'negative' ? 'bg-rose-100 text-rose-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {sentimentResult.sentiment}
                    </div>
                    <div className="flex-1 h-1.5 bg-brand-border-light rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          sentimentResult.sentiment === 'positive' ? 'bg-emerald-500' :
                          sentimentResult.sentiment === 'negative' ? 'bg-rose-500' :
                          'bg-slate-400'
                        }`}
                        style={{ width: `${((sentimentResult.score + 1) / 2) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold">
                      {(sentimentResult.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-brand-text-muted">
                    {sentimentResult.summary}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <Virtuoso
          className="h-full w-full"
          data={filteredMessages}
          initialTopMostItemIndex={firstUnreadIndex > 0 ? firstUnreadIndex : filteredMessages.length - 1}
          followOutput="smooth"
          components={{
            Header: () => (
              <div className="px-6 pt-6 pb-2 space-y-4">
                <AnimatePresence>
                  {chatError && (
                    <motion.div
                      key="chat-error-message"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-brand-error text-sm font-bold bg-brand-error/10 p-3 rounded-xl border border-brand-error/20 text-center mx-auto max-w-md shadow-sm"
                    >
                      {chatError}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Empty State / Ice Breakers */}
                {messages.length === 0 && !isAiProcessing && (
                  <div className="flex flex-col items-center justify-center space-y-6 pt-10 px-4">
                    <div className="w-20 h-20 rounded-[2rem] bg-brand-primary/5 flex items-center justify-center text-brand-primary animate-pulse">
                      <SparklesIcon size={40} />
                    </div>
                    <div className="text-center space-y-2">
                      <h4 className="text-xl font-black text-slate-900 dark:text-white">
                        {isRtl ? 'ابدأ المحادثة بنقرة واحدة' : 'Start the Chat in One Tap'}
                      </h4>
                      <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto">
                        {isRtl 
                          ? 'اختر أحد الأسئلة المقترحة لتبدأ عملية التفاوض والحصول على العرض المثالي.' 
                          : 'Choose one of the suggested questions to start negotiating and get the perfect offer.'}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-3 w-full max-w-md">
                      {(isRtl ? [
                        'ما هي تكلفتك التقريبية لهذا العمل؟',
                        'هل يمكنك البدء في العمل فوراً؟',
                        'ما هي مدة التسليم المتوقعة؟',
                        'هل السعر يشمل رسوم التوصيل؟'
                      ] : [
                        'What is your estimated cost for this task?',
                        'Can you start working immediately?',
                        'What is the expected delivery time?',
                        'Does the price include delivery fees?'
                      ]).map((q, i) => (
                        <HapticButton
                          key={i}
                          onClick={() => handleSend(undefined, q)}
                          className="px-4 py-3 bg-white dark:bg-slate-800 border border-brand-border/50 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-2xl hover:border-brand-primary hover:text-brand-primary transition-all shadow-sm flex items-center gap-2 group"
                        >
                          <Zap size={14} className="text-amber-500 group-hover:scale-110 transition-transform" />
                          {q}
                        </HapticButton>
                      ))}
                    </div>
                  </div>
                )}
                {isExpired && (
                  <div className="bg-brand-warning/10 border border-brand-warning/20 p-4 rounded-2xl text-center">
                    <p className="text-brand-warning text-sm font-bold">
                      {i18n.language === 'ar' 
                        ? 'انتهت صلاحية هذه المحادثة (24 ساعة). يمكنك فقط عرض الرسائل السابقة.' 
                        : 'This conversation has expired (24 hours). You can only view previous messages.'}
                    </p>
                  </div>
                )}
              </div>
            ),
            Footer: () => (
              <div className="px-6 pb-6">
                <AnimatePresence>
                  {otherUserTyping && (
                    <motion.div 
                      key="typing-indicator-bubble"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-end gap-2 flex-row"
                    >
                      <div className="w-8 h-8 shrink-0 mb-1">
                        <div className="w-full h-full rounded-xl bg-brand-primary/20 border border-brand-border overflow-hidden shadow-sm relative">
                          {otherUser?.logoUrl ? (
                            <img 
                              src={otherUser.logoUrl} 
                              alt={otherUser.name} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-brand-primary">
                              <UserIcon size={16} />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-start">
                        <div className="px-4 py-3 shadow-sm relative bg-brand-surface text-brand-text-main rounded-2xl rounded-tl-sm border border-brand-border-light">
                          <div className="flex items-center gap-1.5 h-6">
                            <span className="w-1.5 h-1.5 bg-brand-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-brand-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-brand-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="h-6" />
              </div>
            )
          }}
          itemContent={(index, msg) => (
            <React.Fragment key={msg.id}>
              {index === firstUnreadIndex && (
                <div className="flex justify-center my-8 relative px-6">
                  <div className="absolute inset-0 flex items-center px-6" aria-hidden="true">
                    <div className="w-full border-t border-brand-primary/30"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 py-1.5 bg-brand-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-brand-primary/20 flex items-center gap-2">
                      <Clock size={12} />
                      {isRtl ? 'رسائل جديدة' : 'New Messages'}
                    </span>
                  </div>
                </div>
              )}
              <ChatMessage 
                msg={msg}
                index={index}
                messages={filteredMessages}
                profile={profile}
                senderPhotos={senderPhotos}
                senderNames={senderNames}
                senderProfiles={senderProfiles}
                translatedMessages={translatedMessages}
                isTranslating={isTranslating}
                handleTranslate={handleTranslate}
                handleTranslateAudio={handleTranslateAudio}
                setReplyingTo={setReplyingTo}
                setZoomedImage={setZoomedImage}
                activeReactionMessageId={activeReactionMessageId}
                setActiveReactionMessageId={setActiveReactionMessageId}
                activeMessageMenuId={activeMessageMenuId}
                setActiveMessageMenuId={setActiveMessageMenuId}
                handleReaction={handleReaction}
                handlePinMessage={handlePinMessage}
                handleDeleteMessage={handleDeleteMessage}
                setMessageToForward={setMessageToForward}
                setShowForwardModal={setShowForwardModal}
                chat={chat}
                onDragStart={(id) => setDraggedMessageId(id)}
                onDragEnd={() => {
                  if (Math.abs(dragX) > 60) {
                    const msg = filteredMessages.find(m => m.id === draggedMessageId);
                    if (msg) {
                      setReplyingTo(msg);
                    }
                  }
                  setDraggedMessageId(null);
                  setDragX(0);
                }}
                onDrag={(x) => setDragX(x)}
              />
            </React.Fragment>
          )}
        />
      </div>

      {/* Input Area */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-t border-brand-border/30 p-3 md:p-4 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {/* Smart Replies */}
        <AnimatePresence>
          {features.aiChat && (smartReplies.length > 0 || isGeneratingReplies) && !isExpired && (
            <motion.div 
              key="smart-replies-bar"
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 10, height: 0 }}
              className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide max-w-4xl mx-auto w-full"
            >
              <div className="flex items-center gap-1.5 text-brand-primary bg-brand-primary/10 px-3 py-1.5 rounded-full shrink-0 border border-brand-primary/20">
                <Sparkles size={12} className="animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">{isRtl ? 'اقتراحات' : 'AI Suggestions'}</span>
              </div>
              
              {isGeneratingReplies ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-brand-border/50 text-slate-400 text-xs rounded-full shadow-sm">
                  <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-medium">{isRtl ? 'جاري التفكير...' : 'Thinking...'}</span>
                </div>
              ) : (
                smartReplies.map((reply, idx) => (
                  <HapticButton
                    key={`${reply}-${idx}`}
                    onClick={() => setInputText(reply)}
                    className="shrink-0 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-brand-primary/5 border border-brand-border/50 hover:border-brand-primary/30 text-slate-700 dark:text-slate-200 hover:text-brand-primary text-xs font-bold rounded-full transition-all whitespace-nowrap shadow-sm"
                  >
                    {reply}
                  </HapticButton>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex flex-col gap-3 w-full">
          {/* Tools Row */}
          {!isExpired && (
            <div className="flex items-center gap-2 px-1">
              {profile?.role === 'supplier' && (
                <div className="flex items-center gap-2">
                  <HapticButton 
                    type="button"
                    onClick={() => setShowQuoteModal(true)}
                    className="px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-full hover:bg-brand-primary/20 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm border border-brand-primary/10"
                  >
                    <FileText size={14} />
                    {isRtl ? 'عرض سعر' : 'Quote'}
                  </HapticButton>
                  {features.aiChat && (
                    <HapticButton
                      type="button"
                      onClick={() => {
                        const lastCustomerMessage = [...messages].reverse().find(m => m.senderId !== profile.uid && m.type === 'text');
                        if (lastCustomerMessage) {
                          setNegotiationCustomerMessage(lastCustomerMessage.text || '');
                        }
                        setShowNegotiationModal(true);
                      }}
                      className="px-4 py-2 bg-brand-success/10 text-brand-success hover:bg-brand-success/20 rounded-full transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm border border-brand-success/10"
                    >
                      <BrainCircuit size={14} />
                      {isRtl ? 'مفاوض ذكي' : 'AI Negotiator'}
                    </HapticButton>
                  )}
                </div>
              )}
              
              <div className="flex items-center gap-1 ml-auto">
                <HapticButton
                  type="button"
                  onClick={() => handleSendLocation().catch(err => handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}/location`, false))}
                  disabled={isSendingLocation}
                  className="p-2 text-slate-400 hover:text-brand-warning hover:bg-brand-warning/10 rounded-xl transition-all"
                >
                  {isSendingLocation ? (
                    <div className="w-5 h-5 border-2 border-brand-warning border-t-transparent animate-spin rounded-full"></div>
                  ) : (
                    <MapPin size={20} />
                  )}
                </HapticButton>
                <label className="p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all cursor-pointer">
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading || isRecording || isExpired} multiple />
                  <ImageIcon size={20} />
                </label>
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="relative flex items-end gap-2">
            <div className={`flex-1 relative bg-slate-50 dark:bg-slate-800 border border-brand-border/50 rounded-[1.5rem] overflow-hidden transition-all focus-within:border-brand-primary/50 focus-within:ring-4 focus-within:ring-brand-primary/5 shadow-inner ${isRecording ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200' : ''}`}>
              <AnimatePresence>
                {replyingTo && (
                  <motion.div 
                    key="reply-context-bar"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 py-2 bg-brand-primary/5 border-b border-brand-primary/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 border-l-2 border-brand-primary pl-2">
                      <Reply size={12} className="text-brand-primary" />
                      <div className="text-[10px] truncate max-w-[200px]">
                        <span className="font-black text-brand-primary uppercase tracking-tighter mr-1">{replyingTo.senderName}:</span>
                        <span className="text-slate-500">{replyingTo.text || (replyingTo.type === 'image' ? '📷 Image' : replyingTo.type === 'audio' ? '🎤 Voice Message' : 'Message')}</span>
                      </div>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

            <div className="flex items-center gap-2 w-full">
              <div className="relative flex items-center w-full">
                <TextareaAutosize
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    handleTyping().catch(err => handleFirestoreError(err, OperationType.UPDATE, `chats/${chatId}/typing`, false));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e as any);
                    }
                  }}
                  placeholder={chat?.status === 'closed' ? (isRtl ? 'المحادثة مغلقة' : 'Chat closed') : isExpired ? (isRtl ? 'المحادثة منتهية' : 'Conversation expired') : (isRtl ? 'اكتب رسالتك...' : 'Type a message...')}
                  className={`w-full bg-transparent border-none focus:ring-0 outline-none py-3.5 px-5 text-sm font-medium resize-none max-h-32 transition-all ${isRecording ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                  disabled={isRecording || isExpired}
                  minRows={1}
                />

                {!isRecording && inputText.length > 5 && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <HapticButton
                      type="button"
                      onClick={async () => {
                        if (!inputText || isProcessingRefinement) return;
                        setIsProcessingRefinement(true);
                        try {
                          soundService.play(SoundType.NEURAL_TAP);
                          const refined = await refineChatMessage(inputText, i18n.language);
                          setInputText(refined);
                          soundService.play(SoundType.SUCCESS);
                        } catch (err) {
                          handleAiError(err, 'Chat message refinement');
                        } finally {
                          setIsProcessingRefinement(false);
                        }
                      }}
                      className={`p-2 rounded-xl transition-all shadow-sm ${isProcessingRefinement ? 'bg-brand-primary text-white animate-pulse' : 'bg-white text-brand-primary hover:bg-brand-primary/10 border border-brand-primary/20'}`}
                      title={isRtl ? 'تحسين النص بالذكاء الاصطناعي' : 'Refine with AI'}
                    >
                      {isProcessingRefinement ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <div className="relative">
                          <Sparkles size={16} />
                          {!isProcessingRefinement && (
                            <motion.span 
                              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute -inset-1 bg-brand-primary/20 rounded-full blur-sm"
                            />
                          )}
                        </div>
                      )}
                    </HapticButton>
                  </motion.div>
                )}

                <AnimatePresence>
                  {isRecording && (
                    <motion.div 
                      key="voice-recording-overlay"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="absolute inset-0 flex items-center px-5 gap-3"
                    >
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                        <span className="text-xs font-black text-rose-500 uppercase tracking-widest">{isRtl ? 'جاري التسجيل...' : 'Recording...'}</span>
                      </div>
                      <div className="flex-1 flex items-center gap-1 h-4 overflow-hidden">
                        {Array.from({ length: 15 }).map((_, i) => (
                          <motion.div 
                            key={i}
                            animate={{ height: [4, Math.random() * 16 + 4, 4] }}
                            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                            className="w-1 bg-rose-500/40 rounded-full shrink-0"
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter opacity-60">
                         {isRtl ? 'اسحب للإلغاء' : 'Slide to cancel'}
                         <motion.div 
                           animate={{ x: isRtl ? [5, 0, 5] : [-5, 0, -5] }}
                           transition={{ repeat: Infinity, duration: 1.5 }}
                         >
                            {isRtl ? <ChevronRight size={10} /> : <ChevronLeft size={10} />}
                         </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center gap-2 pb-1">
              {!inputText.trim() && !isUploading ? (
                <HapticButton
                  type="button"
                  onPointerDown={handleTouchStart}
                  onPointerUp={handleTouchEnd}
                  onPointerLeave={handleTouchEnd}
                  onPointerMove={handleTouchMove}
                  disabled={isExpired || isModerating}
                  className={`p-3.5 rounded-2xl transition-all touch-none select-none relative z-10 ${isRecording ? 'bg-rose-500 text-white scale-125 shadow-2xl shadow-rose-500/40 -translate-y-2' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand-primary hover:bg-brand-primary/10'}`}
                  style={{ 
                    transform: isRecording ? `translate(${slideOffset}px, -8px) scale(1.25)` : 'none'
                  }}
                >
                  {isRecording ? <Mic size={20} className="animate-pulse" /> : <Mic size={20} />}
                  
                  {isRecording && (
                    <motion.div 
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="absolute inset-0 bg-rose-500 rounded-2xl -z-10"
                    />
                  )}
                </HapticButton>
              ) : (
                <HapticButton
                  type="submit"
                  disabled={(!inputText.trim() && !isUploading) || isExpired || isModerating}
                  className="p-3.5 bg-brand-primary text-white rounded-2xl shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-dark transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send size={20} className={isRtl ? 'rotate-180' : ''} />
                  )}
                </HapticButton>
              )}
            </div>
          </div>
          </div>
        </form>
      </div>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            key="image-zoom-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <div className="absolute top-4 right-4 flex items-center gap-4 z-10">
              <a 
                href={zoomedImage} 
                download="image.jpg" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                title={i18n.language === 'ar' ? 'تحميل' : 'Download'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              </a>
              <button 
                onClick={() => setZoomedImage(null)}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative max-w-full max-h-full flex items-center justify-center cursor-zoom-out"
              onClick={() => setZoomedImage(null)}
            >
              <img
                src={zoomedImage}
                alt="Zoomed Chat"
                className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals with Lazy Loading */}
      <Suspense fallback={null}>
        {showNegotiationModal && (
          <NegotiationModal
            isOpen={showNegotiationModal}
            onClose={() => setShowNegotiationModal(false)}
            onGenerateReply={(reply) => setInputText(reply)}
            chat={chat}
            profile={profile}
          />
        )}

        {showQuoteModal && (
          <QuoteModal
            isOpen={showQuoteModal}
            onClose={() => setShowQuoteModal(false)}
            onSendQuote={(data) => handleSendQuote(data).catch(err => handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}/quote`, false))}
            request={request}
            chatId={chatId}
            features={features}
          />
        )}

        {/* Rating Modal */}
        {showRatingModal && (
          <RatingModal
            isOpen={showRatingModal}
            onClose={() => setShowRatingModal(false)}
            chat={chat}
            otherUser={otherUser}
            onRateSuccess={(rating, review) => {
              if (chat) {
                setChat({ ...chat, status: 'closed', rating, review });
              }
            }}
          />
        )}

        {/* Forward Modal */}
        {showForwardModal && messageToForward && (
          <ForwardModal
            isOpen={showForwardModal}
            onClose={() => {
              setShowForwardModal(false);
              setMessageToForward(null);
            }}
            message={messageToForward}
            profile={profile}
          />
        )}

        {/* File Preview Modal */}
        <AnimatePresence>
          {showFilePreview && previewFiles.length > 0 && (
            <motion.div
              key="file-preview-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-brand-surface w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between p-4 border-b border-brand-border-light">
                  <h3 className="font-bold text-brand-text-primary">
                    {i18n.language === 'ar' ? 'معاينة الصورة' : 'Image Preview'}
                  </h3>
                  <button 
                    onClick={() => {
                      setShowFilePreview(false);
                      setPreviewFiles([]);
                      setPreviewCaption('');
                    }}
                    className="p-2 hover:bg-brand-surface-hover rounded-full transition-colors"
                  >
                    <X size={20} className="text-brand-text-muted" />
                  </button>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto bg-brand-background/50 flex flex-col items-center justify-center min-h-[200px] max-h-[50vh]">
                  {previewFiles.map((file, idx) => (
                    <img 
                      key={idx} 
                      src={URL.createObjectURL(file)} 
                      alt="Preview" 
                      className="max-w-full max-h-[40vh] object-contain rounded-lg shadow-sm"
                    />
                  ))}
                </div>
                
                <div className="p-4 border-t border-brand-border-light bg-brand-surface">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 bg-brand-background border border-brand-border-light rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-brand-primary/20 focus-within:border-brand-primary transition-all">
                      <textarea
                        value={previewCaption}
                        onChange={(e) => setPreviewCaption(e.target.value)}
                        placeholder={i18n.language === 'ar' ? 'أضف تعليقاً...' : 'Add a caption...'}
                        className="w-full bg-transparent border-none focus:outline-none resize-none text-brand-text-primary placeholder-brand-text-muted max-h-32 min-h-[40px] py-2"
                        rows={1}
                        dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            confirmImageUpload();
                          }
                        }}
                      />
                    </div>
                    <button
                      onClick={confirmImageUpload}
                      disabled={isUploading}
                      className="h-12 w-12 flex-shrink-0 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                      {isUploading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send size={20} className={i18n.language === 'ar' ? 'rotate-180' : ''} />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Suspense>
    </div>
  );
};



export default ChatView;
