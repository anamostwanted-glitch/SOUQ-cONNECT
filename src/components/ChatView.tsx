import React, { useState, useEffect, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { useTranslation } from 'react-i18next';
import { usePersistedState } from '../hooks/usePersistedState';
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
import { db, storage } from '../firebase';
import imageCompression from 'browser-image-compression';
import { UserProfile, Message, Chat, ProductRequest, Quote, QuoteItem, Offer, AppFeatures } from '../types';
import { translateText, generateSmartReplies, moderateContent, translateAudio, negotiateOffer, getPriceIntelligence, summarizeChat, analyzeSentiment } from '../services/geminiService';
import { createNotification } from '../services/notificationService';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, Square, ArrowLeft, User as UserIcon, Play, Pause, MessageSquare, Image as ImageIcon, Upload, Tag, Phone, X, ZoomIn, Sparkles as SparklesIcon, Check, CheckCheck, FileText, PlusCircle, Trash2, Download, Printer, Star, Bot, MapPin, Reply, CheckCircle } from 'lucide-react';
import UserProfileModal from './UserProfileModal';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';
import { soundService, SoundType } from '../utils/soundService';
import { Virtuoso } from 'react-virtuoso';
import { HapticButton } from './HapticButton';

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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState<Record<string, boolean>>({});
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [isModerating, setIsModerating] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [negotiationCurrentOffer, setNegotiationCurrentOffer] = useState('');
  const [negotiationMinPrice, setNegotiationMinPrice] = useState('');
  const [negotiationCustomerMessage, setNegotiationCustomerMessage] = useState('');
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([{ id: '1', description: '', quantity: 1, unitPrice: 0 }]);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteTax, setQuoteTax] = useState(0);
  const [quoteCurrency, setQuoteCurrency] = useState(i18n.language === 'ar' ? 'دينار' : 'Dinar');
  const [quoteValidUntil, setQuoteValidUntil] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isAnalyzingPrice, setIsAnalyzingPrice] = useState(false);
  const [priceInsight, setPriceInsight] = useState<{ recommendedPrice: number; minPrice: number; maxPrice: number; analysis: string } | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [chatSummary, setChatSummary] = useState<string | null>(null);
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false);
  const [sentimentResult, setSentimentResult] = useState<{ score: number; sentiment: 'positive' | 'neutral' | 'negative'; summary: string } | null>(null);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageId = useRef<string | null>(null);
  const isInitialLoad = useRef(true);

  const handleNegotiate = async () => {
    if (!negotiationCurrentOffer || !negotiationMinPrice || !negotiationCustomerMessage) return;
    setIsNegotiating(true);
    try {
      const response = await negotiateOffer(
        negotiationCustomerMessage,
        parseFloat(negotiationCurrentOffer),
        parseFloat(negotiationMinPrice),
        i18n.language
      );
      setInputText(response.message || '');
      setShowNegotiationModal(false);
    } catch (error) {
      console.error('Negotiation error:', error);
    } finally {
      setIsNegotiating(false);
    }
  };

  const handleGetPriceInsight = async () => {
    if (!request) return;
    setIsAnalyzingPrice(true);
    try {
      // Fetch historical offers for similar products (by category)
      const offersSnap = await getDocs(query(
        collection(db, 'offers'),
        where('status', '==', 'accepted'),
        limit(20)
      ));
      const historicalOffers = offersSnap.docs.map(d => d.data());
      
      const insight = await getPriceIntelligence(
        request.productName,
        request.description || '',
        historicalOffers,
        i18n.language
      );
      setPriceInsight(insight);
      
      // If we have a single item in the quote, suggest the price
      if (quoteItems.length === 1 && quoteItems[0].unitPrice === 0) {
        const newItems = [...quoteItems];
        newItems[0].unitPrice = insight.recommendedPrice;
        setQuoteItems(newItems);
      }
    } catch (error) {
      console.error('Price intelligence error:', error);
    } finally {
      setIsAnalyzingPrice(false);
    }
  };

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
      if (!messages.length || !profile || profile.role !== 'supplier' || isNegotiating) return;
      
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
    if (!chatId) return;

    const unsubChat = onSnapshot(doc(db, 'chats', chatId), async (snap) => {
      const chatData = snap.data() as any;
      if (!chatData) return;
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
          if (reqSnap.exists()) {
            const reqData = { id: reqSnap.id, ...reqSnap.data() } as ProductRequest;
            setRequest(reqData);
            
            // Also fetch category name for the request
            const catSnap = await getDoc(doc(db, 'categories', reqData.categoryId));
            if (catSnap.exists()) {
              const cat = catSnap.data();
              setCategoryName(i18n.language === 'ar' ? cat.nameAr : cat.nameEn);
            }
          }
        }

        if (chatData.isCategoryChat) {
          const catSnap = await getDoc(doc(db, 'categories', chatData.categoryId));
          if (catSnap.exists()) {
            const cat = catSnap.data();
            setCategoryName(i18n.language === 'ar' ? cat.nameAr : cat.nameEn);
          }
        } else {
          const otherId = profile?.uid === chatData.customerId ? chatData.supplierId : chatData.customerId;
          const userSnap = await getDoc(doc(db, 'users', otherId));
          if (userSnap.exists()) setOtherUser(userSnap.data() as UserProfile);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `chats/${chatId} dependencies`);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${chatId}`);
    });

    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubMsgs = onSnapshot(q, async (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      
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

      setMessages(msgs);

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
          } catch (error) {
            handleFirestoreError(error, OperationType.GET, `users/${id}`);
          }
        }
      }
      if (changed) {
        setSenderNames(newNames);
        setSenderPhotos(newPhotos);
        setSenderProfiles(newProfiles);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
    });

    return () => {
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

  const handleSendQuote = async () => {
    if (!profile) return;

    const subtotal = quoteItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const total = subtotal + (subtotal * (quoteTax / 100));

    const quoteData: Quote = {
      items: quoteItems,
      subtotal,
      tax: quoteTax,
      total,
      notes: quoteNotes,
      validUntil: quoteValidUntil,
      currency: quoteCurrency
    };

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
      setQuoteItems([{ description: '', quantity: 1, unitPrice: 0 }]);
      setQuoteNotes('');
      setQuoteTax(0);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}/messages`);
    }
  };

  const handleSendLocation = async () => {
    if (!profile || isExpired) return;

    if (!navigator.geolocation) {
      alert(i18n.language === 'ar' ? 'المتصفح لا يدعم تحديد الموقع' : 'Geolocation is not supported by your browser');
      return;
    }

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
      }
    }, (error) => {
      console.error('Geolocation error:', error);
      alert(i18n.language === 'ar' ? 'فشل الحصول على الموقع' : 'Failed to get location');
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

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
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
    mediaRecorder.current?.stop();
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !profile) return;

    try {
      setIsUploading(true);
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      };

      for (const file of files) {
        const compressedFile = await imageCompression(file, options);
        const storageRef = ref(storage, `chats/${chatId}/img_${Date.now()}_${compressedFile.name}`);
        await uploadBytes(storageRef, compressedFile);
        const url = await getDownloadURL(storageRef);

        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          chatId,
          senderId: profile.uid,
          imageUrl: url,
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
      // Reset input value to allow re-uploading the same file
      e.target.value = '';
    }
  };

  const handleRateUser = async () => {
    if (!chat || !otherUser || ratingValue === 0) return;
    
    setIsSubmittingRating(true);
    try {
      // Update Chat
      await updateDoc(doc(db, 'chats', chatId), {
        status: 'closed',
        rating: ratingValue,
        review: reviewText,
        updatedAt: new Date().toISOString()
      });

      // Update User Profile
      const userRef = doc(db, 'users', otherUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        const currentRating = userData.rating || 0;
        const currentCount = userData.reviewCount || 0;
        
        const newCount = currentCount + 1;
        const newRating = ((currentRating * currentCount) + ratingValue) / newCount;
        
        await updateDoc(userRef, {
          rating: newRating,
          reviewCount: newCount
        });
      }
      
      setShowRatingModal(false);
      setChat({ ...chat, status: 'closed', rating: ratingValue, review: reviewText });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chatId} or users/${otherUser.uid}`);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-73px)] bg-brand-background">
      {/* Chat Header */}
      {/* Header */}
      <div className="bg-brand-surface/95 backdrop-blur-xl border-b border-brand-border-light px-3 md:px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-brand-surface rounded-full text-brand-text-muted transition-colors">
            <ArrowLeft size={24} className={i18n.language === 'ar' ? 'rotate-180' : ''} />
          </button>
          
          <div 
            onClick={() => {
              if (!chat?.isCategoryChat && otherUser) {
                if (onViewProfile) onViewProfile(otherUser.uid);
                else setShowSupplierModal(true);
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
                className="p-2.5 text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 rounded-full transition-colors disabled:opacity-50"
                title={i18n.language === 'ar' ? 'تلخيص المحادثة' : 'Summarize Chat'}
              >
                {isSummarizing ? <div className="w-4.5 h-4.5 border-2 border-brand-primary border-t-transparent animate-spin rounded-full" /> : <SparklesIcon size={18} />}
              </button>
              <button 
                onClick={handleAnalyzeSentiment}
                disabled={isAnalyzingSentiment || messages.length === 0}
                className="p-2.5 text-brand-teal bg-brand-teal/10 hover:bg-brand-teal/20 rounded-full transition-colors disabled:opacity-50"
                title={i18n.language === 'ar' ? 'تحليل المشاعر' : 'Analyze Sentiment'}
              >
                {isAnalyzingSentiment ? <div className="w-4.5 h-4.5 border-2 border-brand-teal border-t-transparent animate-spin rounded-full" /> : <Star size={18} />}
              </button>
            </>
          )}
          {!chat?.isCategoryChat && otherUser && (
            <>
              {otherUser.phone && (
                <a href={`tel:${otherUser.phone}`} className="p-2.5 text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 rounded-full transition-colors">
                  <Phone size={18} />
                </a>
              )}
              {chat?.status !== 'closed' && (
                <button 
                  onClick={() => setShowRatingModal(true)}
                  className="p-2.5 text-brand-success bg-brand-success/10 hover:bg-brand-success/20 rounded-full transition-colors"
                  title={i18n.language === 'ar' ? 'إنهاء وتقييم' : 'End & Rate'}
                >
                  <Check size={18} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <UserProfileModal 
        user={otherUser}
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
      />

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
                  className="p-1 hover:bg-brand-background rounded-full transition-colors"
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
          data={messages}
          initialTopMostItemIndex={messages.length - 1}
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
            Footer: () => <div className="h-6" />
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
                      <p className="text-base leading-relaxed whitespace-pre-wrap">{msg.text}</p>
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
                    <div className="rounded-lg overflow-hidden border border-white/10 max-w-[160px] relative group/img">
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
                
                {/* Reply Button */}
                <button 
                  onClick={() => setReplyingTo(msg)} 
                  className="opacity-0 group-hover/msg:opacity-100 p-2 text-brand-text-muted hover:text-brand-primary hover:bg-brand-surface rounded-full transition-all shrink-0"
                  title={i18n.language === 'ar' ? 'رد' : 'Reply'}
                >
                  <Reply size={16} className={i18n.language === 'ar' ? 'rotate-180' : ''} />
                </button>
              </div>
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
                className="px-4 py-2 bg-brand-warning/10 text-brand-warning hover:bg-brand-warning/20 rounded-full transition-all flex items-center gap-2 text-xs font-bold shadow-sm"
              >
                <MapPin size={14} />
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
                    className="p-1.5 text-brand-text-muted hover:text-brand-error hover:bg-brand-error/10 rounded-full transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 w-full">
              {/* Attachment Button */}
              <div className="flex items-center gap-1">
              <label className={`p-2.5 rounded-full cursor-pointer transition-all ${isUploading || isExpired ? 'text-brand-text-muted' : 'text-brand-text-muted hover:bg-brand-surface hover:text-brand-primary'}`} title={i18n.language === 'ar' ? 'إرسال صورة' : 'Send Image'}>
                {isUploading ? <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent animate-spin rounded-full" /> : <ImageIcon size={26} />}
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading || isRecording || isExpired} multiple />
              </label>
            </div>

            {/* Input Field */}
            <div className="flex-1 bg-brand-background rounded-3xl flex items-end relative border border-transparent focus-within:border-brand-primary/30 focus-within:bg-brand-surface focus-within:shadow-sm transition-all">
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
                className="w-full bg-transparent border-none focus:ring-0 outline-none py-3.5 px-5 text-base resize-none"
                disabled={isRecording || isExpired}
              />
              
              {/* Send / Mic Button inside the input area */}
              <div className="p-1.5 shrink-0 flex items-center mb-0.5">
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
                  <button 
                    type="button"
                    disabled={isExpired}
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`p-2.5 rounded-full transition-all ${isRecording ? 'bg-brand-error text-white scale-110 animate-pulse shadow-lg shadow-brand-error/30' : 'text-brand-text-muted hover:bg-brand-border hover:text-brand-primary'}`}
                  >
                    {isRecording ? <Square size={18} /> : <Mic size={20} />}
                  </button>
                )}
              </div>
            </div>
          </div>
          </div>
        </form>
        {isRecording && (
          <div className="flex items-center justify-center gap-3 mt-2 bg-brand-error/10 p-2 rounded-xl border border-brand-error/20">
            <div className="w-2 h-2 bg-brand-error rounded-full animate-pulse" />
            <p className="text-xs text-brand-error font-bold">{i18n.language === 'ar' ? 'جاري التسجيل...' : 'Recording...'}</p>
            <span className="text-xs font-mono font-bold text-brand-error">{formatTime(recordingTime)}</span>
          </div>
        )}
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
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                title={i18n.language === 'ar' ? 'تحميل' : 'Download'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              </a>
              <button 
                onClick={() => setZoomedImage(null)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
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

      {/* Quote Generator Modal */}
      <AnimatePresence>
        {showNegotiationModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNegotiationModal(false)}
              className="absolute inset-0 bg-brand-text-main/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass-modal overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-brand-border-light flex items-center justify-between bg-brand-success text-white">
                <div className="flex items-center gap-3">
                  <Bot size={24} />
                  <h3 className="text-xl font-black">{i18n.language === 'ar' ? 'مفاوض الذكاء الاصطناعي' : 'AI Negotiator'}</h3>
                </div>
                <button onClick={() => setShowNegotiationModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-sm font-bold text-brand-text-main mb-1">{i18n.language === 'ar' ? 'رسالة العميل الأخيرة' : 'Last Customer Message'}</label>
                  <textarea
                    value={negotiationCustomerMessage}
                    onChange={e => setNegotiationCustomerMessage(e.target.value)}
                    className="w-full p-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-success transition-all resize-none h-24"
                    placeholder={i18n.language === 'ar' ? 'أدخل رسالة العميل...' : 'Enter customer message...'}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-brand-text-main mb-1">{i18n.language === 'ar' ? 'العرض الحالي' : 'Current Offer'}</label>
                    <input
                      type="number"
                      value={negotiationCurrentOffer}
                      onChange={e => setNegotiationCurrentOffer(e.target.value)}
                      className="w-full p-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-success transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-brand-text-main mb-1">{i18n.language === 'ar' ? 'الحد الأدنى للسعر' : 'Minimum Price'}</label>
                    <input
                      type="number"
                      value={negotiationMinPrice}
                      onChange={e => setNegotiationMinPrice(e.target.value)}
                      className="w-full p-3 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-success transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                      <Bot size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-brand-text-main">{i18n.language === 'ar' ? 'التفاوض التلقائي' : 'Auto-Negotiate'}</p>
                      <p className="text-[10px] text-brand-text-muted">{i18n.language === 'ar' ? 'دع الذكاء الاصطناعي يتفاوض نيابة عنك' : 'Let AI negotiate on your behalf'}</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!chat?.requestId || !profile?.uid) return;
                      try {
                        const offersSnap = await getDocs(query(
                          collection(db, 'offers'),
                          where('requestId', '==', chat.requestId),
                          where('supplierId', '==', profile.uid)
                        ));
                        if (!offersSnap.empty) {
                          const offerId = offersSnap.docs[0].id;
                          const currentAuto = offersSnap.docs[0].data().autoNegotiate || false;
                          await updateDoc(doc(db, 'offers', offerId), {
                            autoNegotiate: !currentAuto,
                            minPrice: Number(negotiationMinPrice) || 0
                          });
                        }
                      } catch (error) {
                        console.error("Error updating auto-negotiate:", error);
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      // We need to fetch the actual state from the offer
                      // For now, let's assume we have it or just trigger the update
                      'bg-brand-primary'
                    }`}
                  >
                    <span className="sr-only">Toggle Auto-Negotiate</span>
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6`}
                    />
                  </button>
                </div>
              </div>
              <div className="p-6 border-t border-brand-border-light flex justify-end gap-3 bg-brand-background">
                <button
                  onClick={() => setShowNegotiationModal(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-brand-text-muted hover:bg-brand-border transition-colors"
                >
                  {i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleNegotiate}
                  disabled={isNegotiating || !negotiationCurrentOffer || !negotiationMinPrice || !negotiationCustomerMessage}
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-success hover:bg-brand-success transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isNegotiating ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <SparklesIcon size={18} />
                  )}
                  {i18n.language === 'ar' ? 'توليد الرد' : 'Generate Reply'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showQuoteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQuoteModal(false)}
              className="absolute inset-0 bg-brand-text-main/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl glass-modal overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-brand-border-light flex items-center justify-between bg-brand-primary text-white">
                <div className="flex items-center gap-3">
                  <FileText size={24} />
                  <h3 className="text-xl font-black">{i18n.language === 'ar' ? 'إنشاء عرض سعر رسمي' : 'Generate Official Quote'}</h3>
                </div>
                <button onClick={() => setShowQuoteModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-brand-text-main">{i18n.language === 'ar' ? 'البنود' : 'Items'}</h4>
                    <div className="flex items-center gap-2">
                      {features.priceIntelligence && (
                        <button
                          onClick={handleGetPriceInsight}
                          disabled={isAnalyzingPrice || !request}
                          className="flex items-center gap-1 text-xs font-bold text-brand-primary hover:text-brand-primary-hover bg-brand-primary/10 hover:bg-brand-primary/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isAnalyzingPrice ? (
                            <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <SparklesIcon size={14} />
                          )}
                          {i18n.language === 'ar' ? 'ذكاء التسعير' : 'Price Intelligence'}
                        </button>
                      )}
                      <button 
                        onClick={() => setQuoteItems([...quoteItems, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0 }])}
                        className="text-brand-primary hover:text-brand-primary-hover font-bold text-sm flex items-center gap-1"
                      >
                        <PlusCircle size={16} />
                        {i18n.language === 'ar' ? 'إضافة بند' : 'Add Item'}
                      </button>
                    </div>
                  </div>

                  {priceInsight && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10 space-y-2"
                    >
                      <div className="flex items-center gap-2 text-brand-primary">
                        <SparklesIcon size={16} />
                        <span className="text-sm font-bold">{i18n.language === 'ar' ? 'توصية الذكاء الاصطناعي' : 'AI Recommendation'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-2 bg-white rounded-xl shadow-sm border border-brand-border-light">
                          <p className="text-[10px] text-brand-text-muted uppercase">{i18n.language === 'ar' ? 'الموصى به' : 'Recommended'}</p>
                          <p className="text-lg font-black text-brand-primary">{priceInsight.recommendedPrice} <span className="text-[10px]">{quoteCurrency}</span></p>
                        </div>
                        <div className="text-center p-2 bg-white rounded-xl shadow-sm border border-brand-border-light">
                          <p className="text-[10px] text-brand-text-muted uppercase">{i18n.language === 'ar' ? 'الأدنى' : 'Min'}</p>
                          <p className="text-lg font-black text-brand-success">{priceInsight.minPrice} <span className="text-[10px]">{quoteCurrency}</span></p>
                        </div>
                        <div className="text-center p-2 bg-white rounded-xl shadow-sm border border-brand-border-light">
                          <p className="text-[10px] text-brand-text-muted uppercase">{i18n.language === 'ar' ? 'الأعلى' : 'Max'}</p>
                          <p className="text-lg font-black text-brand-warning">{priceInsight.maxPrice} <span className="text-[10px]">{quoteCurrency}</span></p>
                        </div>
                      </div>
                      <p className="text-xs text-brand-text-muted italic leading-relaxed">{priceInsight.analysis}</p>
                    </motion.div>
                  )}

                  {quoteItems.map((item, index) => (
                    <div key={item.id || index} className="grid grid-cols-12 gap-3 items-end bg-brand-background p-4 rounded-2xl border border-brand-border-light">
                      <div className="col-span-12 sm:col-span-6 space-y-1">
                        <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'الوصف' : 'Description'}</label>
                        <input 
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...quoteItems];
                            newItems[index].description = e.target.value;
                            setQuoteItems(newItems);
                          }}
                          className="w-full px-4 py-2 bg-white border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                          placeholder={i18n.language === 'ar' ? 'اسم المنتج أو الخدمة' : 'Product or service name'}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'الكمية' : 'Qty'}</label>
                        <input 
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...quoteItems];
                            newItems[index].quantity = Number(e.target.value);
                            setQuoteItems(newItems);
                          }}
                          className="w-full px-4 py-2 bg-white border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                      </div>
                      <div className="col-span-5 sm:col-span-3 space-y-1">
                        <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</label>
                        <input 
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const newItems = [...quoteItems];
                            newItems[index].unitPrice = Number(e.target.value);
                            setQuoteItems(newItems);
                          }}
                          className="w-full px-4 py-2 bg-white border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-1 flex justify-center pb-2">
                        <button 
                          onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== index))}
                          disabled={quoteItems.length === 1}
                          className="text-brand-error hover:text-brand-error disabled:opacity-30"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'الضريبة (%)' : 'Tax (%)'}</label>
                    <input 
                      type="number"
                      value={quoteTax}
                      onChange={(e) => setQuoteTax(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'العملة' : 'Currency'}</label>
                    <select 
                      value={quoteCurrency}
                      onChange={(e) => setQuoteCurrency(e.target.value)}
                      className="w-full px-4 py-2 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      <option value="دينار">دينار</option>
                      <option value="SAR">SAR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="AED">AED</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'}</label>
                  <textarea 
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-brand-background border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary h-24 resize-none"
                    placeholder={i18n.language === 'ar' ? 'شروط الدفع، وقت التوصيل، إلخ...' : 'Payment terms, delivery time, etc...'}
                  />
                </div>
              </div>

              <div className="p-6 bg-brand-background border-t border-brand-border-light flex items-center justify-between">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest leading-none mb-1">
                    {i18n.language === 'ar' ? 'الإجمالي النهائي' : 'Final Total'}
                  </p>
                  <p className="text-2xl font-black text-brand-text-main">
                    {quoteItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0) * (1 + quoteTax / 100)} {quoteCurrency}
                  </p>
                </div>
                <button 
                  onClick={handleSendQuote}
                  className="px-8 py-4 bg-brand-teal text-white rounded-2xl font-bold hover:bg-brand-teal-dark transition-all shadow-lg shadow-brand-teal/20 flex items-center gap-2"
                >
                  <Send size={20} className={i18n.language === 'ar' ? 'rotate-180' : ''} />
                  {i18n.language === 'ar' ? 'إرسال عرض السعر' : 'Send Quote'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rating Modal */}
      <AnimatePresence>
        {showRatingModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-text-main/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-modal w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-brand-border-light flex items-center justify-between bg-brand-background">
                <h3 className="text-xl font-black text-brand-text-main flex items-center gap-2">
                  <Star size={24} className="text-brand-warning fill-brand-warning" />
                  {i18n.language === 'ar' ? 'تقييم المستخدم' : 'Rate User'}
                </h3>
                <button onClick={() => setShowRatingModal(false)} className="p-2 hover:bg-brand-border rounded-full text-brand-text-muted transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <p className="text-sm text-brand-text-muted mb-4">
                    {i18n.language === 'ar' 
                      ? 'كيف كانت تجربتك مع هذا المستخدم من حيث جودة التواصل وسرعة الرد؟' 
                      : 'How was your experience with this user regarding communication quality and response speed?'}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRatingValue(star)}
                        className={`p-2 transition-all ${ratingValue >= star ? 'text-brand-warning scale-110' : 'text-brand-text-muted hover:text-brand-warning'}`}
                      >
                        <Star size={32} className={ratingValue >= star ? 'fill-brand-warning' : ''} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest ml-1">
                    {i18n.language === 'ar' ? 'تعليق إضافي (اختياري)' : 'Additional Comment (Optional)'}
                  </label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder={i18n.language === 'ar' ? 'أضف تعليقاً حول أسلوب الرد والتعامل...' : 'Add a comment about the response style and interaction...'}
                    className="w-full px-4 py-3 bg-brand-background border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary h-24 resize-none text-sm"
                  />
                </div>
              </div>

              <div className="p-6 bg-brand-background border-t border-brand-border-light flex justify-end gap-3">
                <button 
                  onClick={() => setShowRatingModal(false)}
                  className="px-6 py-2 rounded-xl font-bold text-brand-text-muted hover:bg-brand-border transition-all"
                >
                  {i18n.language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button 
                  onClick={handleRateUser}
                  disabled={ratingValue === 0 || isSubmittingRating}
                  className="px-6 py-2 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-hover transition-all shadow-lg shadow-brand-primary/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmittingRating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check size={18} />
                  )}
                  {i18n.language === 'ar' ? 'تأكيد التقييم' : 'Submit Rating'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AudioPlayer: React.FC<{ url?: string; isOwn: boolean; onTranslate?: () => void; translation?: string; isTranslating?: boolean }> = ({ url, isOwn, onTranslate, translation, isTranslating }) => {
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!url) return;
    if (playing) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play().catch(e => console.error("Error playing audio:", e));
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
      setProgress(total > 0 ? (current / total) * 100 : 0);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 min-w-[200px]">
        <button 
          onClick={togglePlay}
          disabled={!url}
          className={`p-2 rounded-full shrink-0 transition-transform active:scale-95 ${!url ? 'opacity-50 cursor-not-allowed' : ''} ${isOwn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20'}`}
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
          setProgress(percentage * 100);
        }}>
          {Array.from({ length: 24 }).map((_, i) => {
            const isActive = (i / 24) * 100 <= progress;
            const height = 20 + Math.random() * 80; // Random height for waveform look
            return (
              <div 
                key={i} 
                className={`flex-1 rounded-full transition-all duration-150 ${isActive ? (isOwn ? 'bg-white' : 'bg-brand-primary') : (isOwn ? 'bg-white/30' : 'bg-brand-primary/20')}`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>

        <button 
          onClick={cyclePlaybackRate}
          disabled={!url}
          className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 transition-colors ${isOwn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20'}`}
        >
          {playbackRate}x
        </button>

        {url && (
          <audio 
            ref={audioRef} 
            src={url} 
            onEnded={() => {
              setPlaying(false);
              setProgress(0);
            }} 
            onTimeUpdate={handleTimeUpdate}
            className="hidden"
          />
        )}
      </div>
      {onTranslate && (
        <button
          onClick={onTranslate}
          disabled={isTranslating}
          className={`text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1 hover:opacity-70 transition-opacity self-start ${
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
        <div className={`text-sm mt-2 p-3 rounded-xl border ${isOwn ? 'bg-white/10 border-white/20 text-white' : 'bg-brand-primary/10 border-brand-primary/20 text-brand-text-main'}`}>
          {translation}
        </div>
      )}
    </div>
  );
};

export default ChatView;
