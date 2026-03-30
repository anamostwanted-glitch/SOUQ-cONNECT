import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { useTranslation } from 'react-i18next';
import { usePersistedState } from '../../../shared/hooks/usePersistedState';
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
  limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, getBlob } from 'firebase/storage';
import { db, storage } from '../../../core/firebase';
import imageCompression from 'browser-image-compression';
import { UserProfile, Message, Chat, ProductRequest, Quote, QuoteItem, Offer, AppFeatures } from '../../../core/types';
import { translateText, generateSmartReplies, moderateContent, translateAudio, negotiateOffer, getPriceIntelligence, summarizeChat, analyzeSentiment } from '../../../core/services/geminiService';
import { createNotification } from '../../../core/services/notificationService';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, Square, ArrowLeft, User as UserIcon, Play, Pause, MessageSquare, Image as ImageIcon, Upload, Tag, Phone, X, ZoomIn, Sparkles as SparklesIcon, Check, CheckCheck, FileText, PlusCircle, Trash2, Download, Printer, Star, Bot, MapPin, Reply, CheckCircle, Settings, Clock, SmilePlus, Search, MoreVertical, Copy, Forward, Pin } from 'lucide-react';
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
      console.error('Error updating reaction:', error);
    }
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        pinnedMessageId: chat?.pinnedMessageId === messageId ? null : messageId
      });
      setActiveMessageMenuId(null);
    } catch (error) {
      console.error('Error pinning message:', error);
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
      console.error('Error deleting message:', error);
    }
  };
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [chatSummary, setChatSummary] = useState<string | null>(null);
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false);
  const [sentimentResult, setSentimentResult] = useState<{ score: number; sentiment: 'positive' | 'neutral' | 'negative'; summary: string } | null>(null);
  const [isSendingLocation, setIsSendingLocation] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [isModerating, setIsModerating] = useState(false);
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

  const handleSummarizeChat = async () => {
    if (!messages.length) return;
    setIsSummarizing(true);
    setChatSummary(null);
    try {
      const messageTexts = messages.map(m => {
        const sender = m.senderId === profile?.uid ? (i18n.language === 'ar' ? 'أنا' : 'Me') : (senderNames[m.senderId] || '...');
        return `${sender}: ${m.text || (m.type === 'image' ? '[Image]' : '[Audio]')}`;
      });
      const summary = await summarizeChat(messageTexts, i18n.language);
      setChatSummary(summary);
    } catch (error) {
      console.error('Summarization error:', error);
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
      console.error('Sentiment analysis error:', error);
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
        console.error('Negotiation error:', error);
      } finally {
        setIsNegotiating(false);
      }
    };

    checkNegotiation();
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
      console.error('ChatView Settings Firestore Error:', error);
    });
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!chatId) return;

    const unsubChat = onSnapshot(doc(db, 'chats', chatId), async (snap) => {
      const chatData = snap.data() as any;
      if (!chatData || !isMounted) return;
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
            const userSnap = await getDoc(doc(db, 'users', otherId));
            if (userSnap.exists() && isMounted) {
              setOtherUser(userSnap.data() as UserProfile);
            } else if (isMounted) {
              setOtherUser({ uid: otherId, name: 'Customer', role: 'customer' } as UserProfile);
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
        handleFirestoreError(error, OperationType.GET, `chats/${chatId} dependencies`);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${chatId}`);
    });

    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubMsgs = onSnapshot(q, { includeMetadataChanges: true }, async (snap) => {
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
        for (const m of unreadMsgs) {
          try {
            await updateDoc(doc(db, 'chats', chatId, 'messages', m.id), { read: true });
          } catch (error) {
            console.error("Error marking message as read:", error);
          }
        }
      }

      // Fetch sender names and photos
      const uniqueSenderIds = Array.from(new Set(msgs.map(m => m.senderId)));
      const newNames = { ...senderNames };
      const newPhotos = { ...senderPhotos };
      const newProfiles = { ...senderProfiles };
      let changed = false;

      for (const id of uniqueSenderIds) {
        if (!newNames[id] || !newPhotos[id] || !newProfiles[id]) {
          try {
            const uSnap = await getDoc(doc(db, 'users', id));
            if (uSnap.exists()) {
              const userData = uSnap.data() as UserProfile;
              newNames[id] = userData.name;
              newPhotos[id] = userData.logoUrl || '';
              newProfiles[id] = userData;
              changed = true;
            }
          } catch (error: any) {
            if (error.message?.includes('Missing or insufficient permissions') || error.code === 'permission-denied') {
              newNames[id] = 'Customer';
              newPhotos[id] = '';
              newProfiles[id] = { uid: id, name: 'Customer', role: 'customer' } as UserProfile;
              changed = true;
            } else {
              handleFirestoreError(error, OperationType.GET, `users/${id}`);
            }
          }
        }
      }
      if (changed && isMounted) {
        setSenderNames(newNames);
        setSenderPhotos(newPhotos);
        setSenderProfiles(newProfiles);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
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
          console.error('Error generating smart replies:', error);
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

    generateReplies();
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
        const base64Audio = (reader.result as string).split(',')[1];
        const targetLang = i18n.language === 'ar' ? 'Arabic' : 'English';
        const translation = await translateAudio(base64Audio, blob.type, targetLang);
        setTranslatedMessages(prev => ({ ...prev, [messageId]: translation }));
        setIsTranslating(prev => ({ ...prev, [messageId]: false }));
      };
    } catch (error) {
      console.error('Audio translation error:', error);
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
      console.error('Translation error:', error);
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
      handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}/messages`);
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
        handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}/messages`);
      } finally {
        setIsSendingLocation(false);
      }
    }, (error) => {
      console.error('Geolocation error:', error);
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
        console.error('Error updating typing status:', error);
      }
    }

    // Set timeout to clear typing status
    typingTimeoutRef.current = setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'chats', chatId), {
          [`typing.${profile.uid}`]: false
        });
      } catch (error) {
        console.error('Error clearing typing status:', error);
      }
    }, 3000);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !profile) return;

    const text = inputText;
    setInputText('');
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

        await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
        
        const recipientId = profile.uid === chat.customerId ? chat.supplierId : chat.customerId;
        await createNotification({
          userId: recipientId,
          titleAr: 'رسالة جديدة',
          titleEn: 'New Message',
          bodyAr: `لديك رسالة جديدة من ${profile.name}`,
          bodyEn: `You have a new message from ${profile.name}`,
          actionType: 'general',
          targetId: chatId,
        });

        await updateDoc(doc(db, 'chats', chatId), {
          lastMessage: text,
          updatedAt: new Date().toISOString()
        });
        
        // Haptic feedback for sending message
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}`);
      } finally {
        setIsModerating(false);
      }
    };

    processSend();
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

        const mimeType = mediaRecorder.current?.mimeType || 'audio/webm';
        const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const audioBlob = new Blob(audioChunks.current, { type: mimeType });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.${ext}`, { type: mimeType });
        
        const storageRef = ref(storage, `chats/${chatId}/${Date.now()}.${ext}`);
        await uploadBytes(storageRef, audioFile);
        const url = await getDownloadURL(storageRef);

        try {
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
          handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}`);
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
      console.error('Error accessing microphone:', err);
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

    return new Promise(async (resolve) => {
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
            console.error("Canvas toBlob error (CORS):", e);
            resolve(file);
            if (isObjectUrl) URL.revokeObjectURL(finalLogoUrl);
          }
        };
        watermark.onerror = (e) => {
          console.error("Watermark image failed to load:", e);
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
        console.error("Original image failed to load:", e);
        resolve(file);
        if (isObjectUrl) URL.revokeObjectURL(finalLogoUrl);
      };
      img.src = URL.createObjectURL(file);
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

        const compressedFile = await imageCompression(fileToUpload, options);
        const storageRef = ref(storage, `chats/${chatId}/img_${Date.now()}_${compressedFile.name}`);
        await uploadBytes(storageRef, compressedFile);
        const url = await getDownloadURL(storageRef);

        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          chatId,
          senderId: profile.uid,
          imageUrl: url,
          text: previewCaption.trim() || null,
          type: 'image',
          createdAt: new Date().toISOString(),
          read: false
        });

        await updateDoc(doc(db, 'chats', chatId), {
          lastMessage: '📷 Image',
          updatedAt: new Date().toISOString()
        });
        soundService.play(SoundType.SENT);
      }
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setChatError(i18n.language === 'ar' 
        ? 'فشل رفع الصورة. يرجى التأكد من تفعيل خدمة Firebase Storage في لوحة التحكم وتعيين القواعد المناسبة.' 
        : 'Failed to upload image. Please ensure Firebase Storage is enabled in your console and rules are set.');
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

  return (
    <div className="flex flex-col fixed inset-0 top-[73px] bg-brand-background z-20">
      {/* Chat Header */}
      {/* Header */}
      <div className="bg-brand-surface/95 backdrop-blur-xl border-b border-brand-border-light px-3 md:px-6 py-3 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-3 -ml-2 hover:bg-brand-surface rounded-full text-brand-text-muted transition-colors">
            <ArrowLeft size={24} className={i18n.language === 'ar' ? 'rotate-180' : ''} />
          </button>
          
          <div 
            onClick={() => {
              if (!chat?.isCategoryChat && otherUser) {
                if (onViewProfile) onViewProfile(otherUser.uid);
                else setShowUserProfileModal(true);
              }
            }}
            className={`flex items-center gap-3 ${!chat?.isCategoryChat ? 'cursor-pointer group' : ''}`}
          >
            <div className="relative">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-primary/20 rounded-full flex items-center justify-center text-brand-primary overflow-hidden border-2 border-brand-surface shadow-sm group-hover:border-brand-primary/20 transition-all">
                {chat?.isCategoryChat ? (
                  <MessageSquare size={20} />
                ) : otherUser?.logoUrl ? (
                  <img src={otherUser.logoUrl} alt={otherUser.companyName || otherUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                ) : (
                  <UserIcon size={20} />
                )}
              </div>
              {/* Online indicator */}
              {!chat?.isCategoryChat && otherUser && (
                <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-brand-surface rounded-full ${
                  otherUser.lastActive && new Date().getTime() - new Date(otherUser.lastActive).getTime() < 5 * 60 * 1000
                    ? 'bg-brand-success shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                    : 'bg-brand-border'
                }`}></div>
              )}
            </div>
            
            <div className="flex flex-col">
              <h3 className="font-bold text-base text-brand-text-main group-hover:text-brand-primary transition-colors line-clamp-1">
                {chat?.isCategoryChat ? categoryName : (otherUser?.companyName || otherUser?.name || '...')}
              </h3>
              <div className="flex items-center gap-2">
                {otherUserTyping ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      <span className="w-1 h-1 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1 h-1 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1 h-1 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">
                      {i18n.language === 'ar' ? 'جاري الكتابة...' : 'Typing...'}
                    </span>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-brand-text-muted font-medium">
                      {chat?.isCategoryChat 
                        ? (i18n.language === 'ar' ? 'غرفة دردشة عامة' : 'Public Chat Room')
                        : (otherUser?.role === 'admin' ? (i18n.language === 'ar' ? 'مدير النظام' : 'Admin') : otherUser?.role === 'customer' ? (i18n.language === 'ar' ? 'عميل' : 'Customer') : (i18n.language === 'ar' ? 'مورد' : 'Supplier'))}
                    </p>
                    {!chat?.isCategoryChat && otherUser?.rating && otherUser?.reviewCount ? (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-brand-warning bg-brand-warning/10 px-1.5 py-0.5 rounded-md">
                        <Star size={10} className="fill-brand-warning" />
                        {otherUser.rating.toFixed(1)}
                        <span className="text-brand-text-muted font-normal ml-0.5">
                          ({otherUser.reviewCount})
                        </span>
                      </span>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          {features.aiChat && (
            <>
              <button 
                onClick={handleSummarizeChat}
                disabled={isSummarizing || messages.length === 0}
                className="p-3 text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 rounded-full transition-colors disabled:opacity-50"
                title={i18n.language === 'ar' ? 'تلخيص المحادثة' : 'Summarize Chat'}
              >
                {isSummarizing ? <div className="w-4.5 h-4.5 border-2 border-brand-primary border-t-transparent animate-spin rounded-full" /> : <SparklesIcon size={18} />}
              </button>
              <button 
                onClick={handleAnalyzeSentiment}
                disabled={isAnalyzingSentiment || messages.length === 0}
                className="p-3 text-brand-teal bg-brand-teal/10 hover:bg-brand-teal/20 rounded-full transition-colors disabled:opacity-50"
                title={i18n.language === 'ar' ? 'تحليل المشاعر' : 'Analyze Sentiment'}
              >
                {isAnalyzingSentiment ? <div className="w-4.5 h-4.5 border-2 border-brand-teal border-t-transparent animate-spin rounded-full" /> : <Star size={18} />}
              </button>
            </>
          )}
          {!chat?.isCategoryChat && otherUser && (
            <>
              <button 
                onClick={() => setIsSearching(!isSearching)}
                className={`p-3 rounded-full transition-colors ${isSearching ? 'text-brand-primary bg-brand-primary/10' : 'text-brand-text-muted hover:bg-brand-surface hover:text-brand-primary'}`}
                title={i18n.language === 'ar' ? 'بحث' : 'Search'}
              >
                <Search size={18} />
              </button>
              {otherUser.phone && (
                <a href={`tel:${otherUser.phone}`} className="p-3 text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 rounded-full transition-colors">
                  <Phone size={18} />
                </a>
              )}
              {chat?.status !== 'closed' && (
                <button 
                  onClick={() => setShowRatingModal(true)}
                  className="p-3 text-brand-success bg-brand-success/10 hover:bg-brand-success/20 rounded-full transition-colors"
                  title={i18n.language === 'ar' ? 'إنهاء وتقييم' : 'End & Rate'}
                >
                  <Check size={18} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <AnimatePresence>
        {isSearching && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-brand-surface border-b border-brand-border-light px-4 py-2 overflow-hidden z-20"
          >
            <div className="relative">
              <Search size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-brand-text-muted" />
              <input 
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={i18n.language === 'ar' ? 'ابحث في المحادثة...' : 'Search in chat...'}
                className="w-full bg-brand-background border border-brand-border-light rounded-xl py-2 pl-9 pr-9 text-sm focus:outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/50 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 -translate-y-1/2 right-3 text-brand-text-muted hover:text-brand-text-main"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned Message */}
      <AnimatePresence>
        {chat?.pinnedMessageId && messages.find(m => m.id === chat.pinnedMessageId) && (
          <motion.div
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
                handlePinMessage(chat.pinnedMessageId);
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-brand-primary text-white px-6 py-2 flex items-center justify-between shadow-inner"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-1.5 bg-brand-surface/20 rounded-lg shrink-0">
                <Tag size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 leading-none mb-1">
                  {i18n.language === 'ar' ? 'المنتج المطلوب' : 'Requested Product'}
                </p>
                <h4 className="text-sm font-bold truncate">
                  {request.productName}
                </h4>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 leading-none mb-1">
                  {i18n.language === 'ar' ? 'الفئة' : 'Category'}
                </p>
                <p className="text-xs font-medium">{categoryName}</p>
              </div>
              <div className="px-2 py-1 bg-brand-surface/20 rounded-lg text-[10px] font-black uppercase">
                {request.status}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden bg-brand-background relative">
        <AnimatePresence>
          {(chatSummary || sentimentResult) && (
            <motion.div
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
          initialTopMostItemIndex={filteredMessages.length - 1}
          followOutput="smooth"
          components={{
            Header: () => (
              <div className="px-6 pt-6 pb-2 space-y-4">
                <AnimatePresence>
                  {chatError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-brand-error text-sm font-bold bg-brand-error/10 p-3 rounded-xl border border-brand-error/20 text-center mx-auto max-w-md shadow-sm"
                    >
                      {chatError}
                    </motion.div>
                  )}
                </AnimatePresence>
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
          itemContent={(index, msg) => {
            const isOwn = msg.senderId === profile?.uid;
            const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId;
            
            const msgDate = new Date(msg.createdAt);
            const dateString = msgDate.toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' });
            
            const prevMsgDate = index > 0 ? new Date(messages[index - 1].createdAt) : null;
            const prevDateString = prevMsgDate ? prevMsgDate.toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' }) : null;
            
            const showDateHeader = dateString !== prevDateString;

            return (
              <div className="px-6 pb-6">
                {showDateHeader && (
                  <div className="flex justify-center my-4">
                    <span className="px-3 py-1 bg-brand-surface border border-brand-border-light rounded-full text-[10px] font-bold text-brand-text-muted uppercase tracking-wider shadow-sm">
                      {dateString}
                    </span>
                  </div>
                )}
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 shrink-0 mb-1">
                {showAvatar ? (
                  <div className="w-full h-full rounded-xl bg-brand-primary/20 border border-brand-border overflow-hidden shadow-sm relative">
                    {senderPhotos[msg.senderId] ? (
                      <img 
                        src={senderPhotos[msg.senderId]} 
                        alt={senderNames[msg.senderId]} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-primary">
                        <UserIcon size={16} />
                      </div>
                    )}
                    {senderProfiles[msg.senderId]?.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                ) : (
                  <div className="w-8" />
                )}
              </div>

              <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                {showAvatar && (
                  <div className="flex items-center gap-1 px-1 mb-1">
                    <span className="text-[11px] font-bold text-brand-text-muted">
                      {isOwn ? t('you') : (senderNames[msg.senderId] || '...')}
                    </span>
                    {senderProfiles[msg.senderId]?.isVerified && (
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                    )}
                  </div>
                )}
                
                <div className={`flex items-center gap-2 group/msg ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div 
                    className={`px-4 py-3 shadow-sm relative ${
                      isOwn 
                        ? 'bg-brand-primary text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-brand-surface text-brand-text-main rounded-2xl rounded-tl-sm border border-brand-border-light'
                    }`}
                  >
                    {msg.replyTo && (
                      <div className={`mb-2 p-2 rounded-lg text-xs border-l-2 ${isOwn ? 'bg-white/10 border-white/50' : 'bg-brand-background border-brand-primary'}`}>
                        <p className={`font-bold mb-0.5 ${isOwn ? 'text-white/90' : 'text-brand-primary'}`}>{msg.replyTo.senderName}</p>
                        <p className={`truncate ${isOwn ? 'text-white/70' : 'text-brand-text-muted'}`}>{msg.replyTo.text}</p>
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
                          onClick={() => handleTranslate(msg.id, msg.text!)}
                          disabled={isTranslating[msg.id]}
                          className={`text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1 hover:opacity-70 transition-opacity ${
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
                      onTranslate={msg.audioUrl ? () => handleTranslateAudio(msg.id, msg.audioUrl!) : undefined}
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
                        className={`mt-4 w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
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
                        className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          isOwn ? 'bg-brand-surface text-brand-primary hover:bg-brand-primary/10' : 'bg-brand-primary text-white hover:bg-brand-primary-hover'
                        }`}
                      >
                        <MapPin size={14} />
                        {i18n.language === 'ar' ? 'عرض الموقع' : 'View Location'}
                      </a>
                    </div>
                  ) : msg.type === 'image' ? (
                    <div className="flex flex-col gap-2">
                      <div className="rounded-lg overflow-hidden border border-white/10 max-w-[200px] relative group/img">
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
                        <p className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words ${isOwn ? 'text-white' : 'text-brand-text-primary'}`}>
                          {renderTextWithLinks(msg.text, isOwn)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-brand-error/10 text-brand-error text-xs font-bold rounded-xl border border-brand-error/20">
                      {i18n.language === 'ar' ? 'نوع رسالة غير مدعوم' : 'Unsupported message type'}
                    </div>
                  )}
                  
                  <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-[8px] opacity-50 font-medium ${isOwn ? 'text-white' : 'text-brand-text-muted'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isOwn && (
                      <div className="flex items-center ml-1 overflow-hidden">
                        <AnimatePresence mode="wait">
                          {msg.pending ? (
                            <motion.div 
                              key="pending"
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.5, opacity: 0 }}
                              className="relative flex items-center opacity-50"
                            >
                              <Clock size={10} className="text-white" />
                            </motion.div>
                          ) : msg.read ? (
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
                    onClick={() => setActiveReactionMessageId(activeReactionMessageId === msg.id ? null : msg.id)}
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
                            onClick={() => handleReaction(msg.id, emoji)}
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
                    onClick={() => setActiveMessageMenuId(activeMessageMenuId === msg.id ? null : msg.id)}
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
                            navigator.clipboard.writeText(msg.text || '');
                            setActiveMessageMenuId(null);
                          }}
                          className="px-4 py-2 text-sm text-left hover:bg-brand-surface text-brand-text-main flex items-center gap-2 transition-colors"
                        >
                          <Copy size={14} />
                          {i18n.language === 'ar' ? 'نسخ النص' : 'Copy Text'}
                        </button>
                        <button
                          onClick={() => {
                            setMessageToForward(msg);
                            setShowForwardModal(true);
                            setActiveMessageMenuId(null);
                          }}
                          className="px-4 py-2 text-sm text-left hover:bg-brand-surface text-brand-text-main flex items-center gap-2 transition-colors"
                        >
                          <Forward size={14} />
                          {i18n.language === 'ar' ? 'إعادة توجيه' : 'Forward'}
                        </button>
                        <button
                          onClick={() => handlePinMessage(msg.id)}
                          className="px-4 py-2 text-sm text-left hover:bg-brand-surface text-brand-text-main flex items-center gap-2 transition-colors"
                        >
                          <Pin size={14} />
                          {chat?.pinnedMessageId === msg.id 
                            ? (i18n.language === 'ar' ? 'إلغاء التثبيت' : 'Unpin')
                            : (i18n.language === 'ar' ? 'تثبيت' : 'Pin')}
                        </button>
                        <div className="h-px bg-brand-border-light my-1" />
                        <button
                          onClick={() => handleDeleteMessage(msg.id, false)}
                          className="px-4 py-2 text-sm text-left hover:bg-brand-error/10 text-brand-error flex items-center gap-2 transition-colors"
                        >
                          <Trash2 size={14} />
                          {i18n.language === 'ar' ? 'حذف لدي' : 'Delete for me'}
                        </button>
                        {isOwn && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id, true)}
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
                      onClick={() => handleReaction(msg.id, emoji)}
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
          }}
        />
      </div>

      {/* Input Area */}
      <div className="bg-brand-surface/95 backdrop-blur-xl border-t border-brand-border-light p-3 md:p-4 pb-safe">
        {/* Smart Replies */}
        <AnimatePresence>
          {features.aiChat && (smartReplies.length > 0 || isGeneratingReplies) && !isExpired && (
            <motion.div 
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 10, height: 0 }}
              className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide max-w-4xl mx-auto w-full"
            >
              <div className="flex items-center gap-1 text-brand-primary bg-brand-primary/10 px-3 py-1.5 rounded-full shrink-0">
                <SparklesIcon size={14} />
                <span className="text-xs font-bold">{i18n.language === 'ar' ? 'ردود ذكية' : 'Smart Replies'}</span>
              </div>
              
              {isGeneratingReplies ? (
                <div className="flex items-center gap-2 px-4 py-1.5 bg-brand-background border border-brand-border text-brand-text-muted text-sm rounded-full">
                  <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                  {i18n.language === 'ar' ? 'جاري التوليد...' : 'Generating...'}
                </div>
              ) : (
                smartReplies.map((reply, idx) => (
                  <button
                    key={`${reply}-${idx}`}
                    onClick={() => setInputText(reply)}
                    className="shrink-0 px-4 py-1.5 bg-brand-background hover:bg-brand-primary/10 border border-brand-border hover:border-brand-primary/30 text-brand-text-main hover:text-brand-primary-hover text-sm rounded-full transition-all whitespace-nowrap shadow-sm"
                  >
                    {reply}
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex flex-col gap-2 w-full">
          {/* Tools Row */}
          {!isExpired && (
            <div className="flex items-center gap-2 px-1">
              {profile?.role === 'supplier' && (
                <>
                  <button 
                    type="button"
                    onClick={() => setShowQuoteModal(true)}
                    className="px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-full hover:bg-brand-primary/20 transition-all flex items-center gap-2 text-xs font-bold shadow-sm"
                  >
                    <FileText size={14} />
                    {i18n.language === 'ar' ? 'عرض سعر' : 'Quote'}
                  </button>
                  {features.aiChat && (
                    <button
                      type="button"
                      onClick={() => {
                        const lastCustomerMessage = [...messages].reverse().find(m => m.senderId !== profile.uid && m.type === 'text');
                        if (lastCustomerMessage) {
                          setNegotiationCustomerMessage(lastCustomerMessage.text || '');
                        }
                        setShowNegotiationModal(true);
                      }}
                      className="px-4 py-2 bg-brand-success/10 text-brand-success hover:bg-brand-success/20 rounded-full transition-all flex items-center gap-2 text-xs font-bold shadow-sm"
                    >
                      <Bot size={14} />
                      {i18n.language === 'ar' ? 'مفاوض ذكي' : 'AI Negotiator'}
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={handleSendLocation}
                disabled={isSendingLocation}
                className="px-4 py-2 bg-brand-warning/10 text-brand-warning hover:bg-brand-warning/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-all flex items-center gap-2 text-xs font-bold shadow-sm"
              >
                {isSendingLocation ? (
                  <div className="w-3.5 h-3.5 border-2 border-brand-warning border-t-transparent animate-spin rounded-full"></div>
                ) : (
                  <MapPin size={14} />
                )}
                {i18n.language === 'ar' ? 'إرسال الموقع' : 'Share Location'}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 w-full flex-col">
            {/* Replying To Preview */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: 10, height: 0 }}
                  className="w-full bg-brand-surface/80 border border-brand-border rounded-xl p-3 flex items-start justify-between gap-3 shadow-sm"
                >
                  <div className="flex flex-col flex-1 min-w-0 border-l-2 border-brand-primary pl-3">
                    <span className="text-xs font-bold text-brand-primary">
                      {i18n.language === 'ar' ? 'الرد على ' : 'Replying to '}
                      {senderNames[replyingTo.senderId] || (replyingTo.senderId === profile?.uid ? t('you') : '...')}
                    </span>
                    <p className="text-sm text-brand-text-muted truncate mt-0.5">
                      {replyingTo.text || (replyingTo.type === 'image' ? '📷 Image' : replyingTo.type === 'audio' ? '🎤 Voice Message' : 'Message')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="p-3 text-brand-text-muted hover:text-brand-error hover:bg-brand-error/10 rounded-full transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 w-full">
              {/* Attachment Button */}
              <div className="flex items-center gap-1 relative">
                <label className={`p-3 rounded-full cursor-pointer transition-all ${isUploading || isExpired ? 'text-brand-text-muted' : 'text-brand-text-muted hover:bg-brand-surface hover:text-brand-primary'}`} title={i18n.language === 'ar' ? 'إرسال صورة' : 'Send Image'}>
                  {isUploading ? <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent animate-spin rounded-full" /> : <ImageIcon size={26} />}
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading || isRecording || isExpired} multiple />
                </label>
              </div>

            {/* Input Field */}
            <div className="flex-1 bg-brand-background rounded-3xl flex items-end relative border border-transparent focus-within:border-brand-primary/30 focus-within:bg-brand-surface focus-within:shadow-sm transition-all overflow-hidden">
              <TextareaAutosize 
                value={inputText}
                onChange={e => {
                  setInputText(e.target.value);
                  handleTyping();
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                minRows={1}
                maxRows={5}
                placeholder={chat?.status === 'closed' ? (i18n.language === 'ar' ? 'المحادثة مغلقة' : 'Chat closed') : isExpired ? (i18n.language === 'ar' ? 'المحادثة منتهية' : 'Conversation expired') : t('type_message')}
                className={`w-full bg-transparent border-none focus:ring-0 outline-none py-3.5 px-5 text-base resize-none ${isRecording ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                disabled={isRecording || isExpired}
              />
              
              {/* Recording UI Overlay */}
              <AnimatePresence>
                {isRecording && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 bg-brand-background flex items-center justify-between px-4 z-10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-brand-error rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                      <span className="text-sm font-mono font-bold text-brand-error">{formatTime(recordingTime)}</span>
                      {/* Waveform animation */}
                      <div className="flex items-center gap-1 h-6 ml-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ height: ['20%', '100%', '20%'] }}
                            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                            className="w-1 bg-brand-error rounded-full"
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex-1 flex justify-center pr-12">
                      <motion.span 
                        animate={{ x: [0, i18n.language === 'ar' ? 10 : -10, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="text-xs text-brand-text-muted font-medium flex items-center gap-2"
                      >
                        {i18n.language === 'ar' ? 'اسحب للإلغاء ➔' : 'Slide to cancel ⬅'}
                      </motion.span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Send / Mic Button inside the input area */}
              <div className="p-2 shrink-0 flex items-center mb-0.5 z-20">
                {inputText.trim() ? (
                  <HapticButton 
                    type="submit"
                    className="p-3 bg-brand-teal text-white rounded-xl hover:bg-brand-teal-dark transition-all active:scale-95 shadow-md shadow-brand-teal/20 disabled:opacity-50"
                    disabled={isRecording || isExpired || isModerating}
                    onClick={handleSend}
                  >
                    {isModerating ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                    ) : (
                      <Send size={20} className={i18n.language === 'ar' ? 'rotate-180' : ''} />
                    )}
                  </HapticButton>
                ) : (
                  <motion.button 
                    type="button"
                    disabled={isExpired}
                    onMouseDown={handleTouchStart}
                    onMouseUp={handleTouchEnd}
                    onMouseLeave={handleTouchEnd}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    animate={{ x: slideOffset }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className={`p-3 rounded-full transition-all ${isRecording ? 'bg-brand-error text-white scale-110 shadow-lg shadow-brand-error/30' : 'text-brand-text-muted hover:bg-brand-border hover:text-brand-primary'}`}
                  >
                    {isRecording ? <Mic size={20} className="animate-pulse" /> : <Mic size={20} />}
                  </motion.button>
                )}
              </div>
            </div>
          </div>
          </div>
        </form>
      </div>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
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
            onSendQuote={handleSendQuote}
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
