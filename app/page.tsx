'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Download, 
  ShoppingBag, Coffee, Film, 
  Trash2, X, RefreshCw, ChevronDown, PlusCircle,
  Building, CreditCard, User, Upload, CheckSquare, Check,
  BellRing, Calendar, AlertCircle, Lock, Unlock, Fingerprint, Delete,
  Home, PieChart, TrendingUp, TrendingDown, ChevronLeft, ArrowUpRight, ArrowDownRight, Settings,
  Mail, Eye, EyeOff, Coins, LogOut, Car, Heart, Zap, Briefcase, Tag, Palette, SlidersHorizontal
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  'https://bogwtbvmvzgbodlybgow.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  source: string;
  type: 'expense' | 'income';
  category?: string; 
  created_at?: string;
  user_id?: string;
}

interface CardMetadata {
  limit?: number;
  dueDate?: number;
  reminder?: boolean;
  linkedBank?: string;
}

interface CustomCategory {
  name: string;
  icon: string;
  color: string;
}

const generateUUID = () => {
  try { return crypto.randomUUID(); } catch(e) {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
      });
  }
};

const ICON_MAP: Record<string, React.FC<any>> = {
  Home, Coffee, Film, Car, ShoppingBag, Heart, Zap, Briefcase, Tag
};

export default function App() {
  // --- AUTH STATES ---
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSubmitLoading, setAuthSubmitLoading] = useState(false);

  // --- APP STATES ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [activeWalletIdx, setActiveWalletIdx] = useState(0);
  
  const [isAddBankOpen, setIsAddBankOpen] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  
  // --- EDIT ACCOUNT STATES ---
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<string | null>(null);
  const [editAccountNameInput, setEditAccountNameInput] = useState('');
  const [editAccountDigitsInput, setEditAccountDigitsInput] = useState('');

  // Edit Card State
  const [isEditCardModalOpen, setIsEditCardModalOpen] = useState(false);
  const [editCardName, setEditCardName] = useState('');
  const [editCardLimitInput, setEditCardLimitInput] = useState('');
  const [editCardDueDateInput, setEditCardDueDateInput] = useState('');
  const [editCardReminderInput, setEditCardReminderInput] = useState(true);

  const [newBankName, setNewBankName] = useState('');
  const [newBankDigits, setNewBankDigits] = useState('');
  
  const [cardType, setCardType] = useState<'credit' | 'debit'>('credit');
  const [selectedLinkedBank, setSelectedLinkedBank] = useState('');
  const [newCardBank, setNewCardBank] = useState('');
  const [newCardDigits, setNewCardDigits] = useState('');
  const [newCardLimit, setNewCardLimit] = useState('');
  const [newCardDueDate, setNewCardDueDate] = useState('');
  const [newCardReminder, setNewCardReminder] = useState(true);

  const [banks, setBanks] = useState<string[]>(['Cash']);
  const [cards, setCards] = useState<string[]>([]);
  const [cardMeta, setCardMeta] = useState<Record<string, CardMetadata>>({});
  
  const [touchStart, setTouchStart] = useState(0);
  const [swipedCard, setSwipedCard] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipedTxId, setSwipedTxId] = useState<string | null>(null);
  
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedTxs, setSelectedTxs] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- DATE FILTER STATES ---
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  
  // --- OFFLINE STATES ---
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // --- WIDGET STATES ---
  const [cashFlowView, setCashFlowView] = useState<'Week' | 'Month' | 'Year'>('Month');
  const [activeChartTooltip, setActiveChartTooltip] = useState<number | null>(null);
  const [isCashFlowDropdownOpen, setIsCashFlowDropdownOpen] = useState(false);

  // --- SECURITY & SETTINGS STATES ---
  const [isLocked, setIsLocked] = useState(false);
  const [appPin, setAppPin] = useState<string | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<0 | 1 | 2 | 3>(0); 
  const [tempPin, setTempPin] = useState('');
  const [newPinToConfirm, setNewPinToConfirm] = useState('');

  // --- CATEGORY STATES ---
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#34C759');
  const [newCatIcon, setNewCatIcon] = useState('Tag');

  // --- REFS ---
  const statementInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const sheetDragStartY = useRef(0);

  // --- TRANSACTION FORM STATES ---
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('Cash');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txCategory, setTxCategory] = useState('Auto');
  const [isCategoryManuallyEdited, setIsCategoryManuallyEdited] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editSource, setEditSource] = useState('Cash'); 
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<'expense' | 'income'>('expense');
  const [editCategory, setEditCategory] = useState('Auto');

  // --- CATEGORY LOGIC ---
  const DEFAULT_CATEGORIES: CustomCategory[] = [
    { name: 'Home', icon: 'Home', color: '#FF3B30' },
    { name: 'Food', icon: 'Coffee', color: '#007AFF' },
    { name: 'Subscriptions', icon: 'Film', color: '#AF52DE' },
    { name: 'Transport', icon: 'Car', color: '#FF9500' },
    { name: 'Others', icon: 'ShoppingBag', color: '#8E8E93' }
  ];

  const getAllCategories = (): CustomCategory[] => [...DEFAULT_CATEGORIES, ...customCategories];

  const getSmartCategory = (tTitle: string) => {
    const t = tTitle.toLowerCase();
    if (t.match(/rent|housing|electricity|water|bill|home|furniture|appliance|maid|clean/)) return 'Home';
    if (t.match(/zomato|blinkit|zepto|grocery|swiggy|food|coffee|tea|cafe|restaurant|lunch|dinner|snack/)) return 'Food';
    if (t.match(/netflix|spotify|prime|subscription|internet|wifi|broadband|apple/)) return 'Subscriptions';
    if (t.match(/uber|ola|petrol|fuel|transport|flight|train|bmw|car|bike|maintenance|service|tyre|toll|parking|metro/)) return 'Transport';
    return 'Others';
  };

  const getCatColor = (catName: string) => {
    const found = getAllCategories().find((c: CustomCategory) => c.name === catName);
    return found ? found.color : '#8E8E93';
  };

  const getIconComponent = (catName: string) => {
    const found = getAllCategories().find((c: CustomCategory) => c.name === catName);
    const Icon = found && ICON_MAP[found.icon] ? ICON_MAP[found.icon] : ShoppingBag;
    return <Icon className="w-5 h-5 text-[#EBEBF5]/60" />;
  };

  useEffect(() => {
    if (!isCategoryManuallyEdited && title) {
      setTxCategory('Auto');
    }
  }, [title, isCategoryManuallyEdited]);

  // --- BOTTOM SHEET SWIPE LOGIC ---
  const handleSheetTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    sheetDragStartY.current = e.targetTouches[0].clientY;
    const sheet = e.currentTarget.parentElement as HTMLDivElement;
    if (sheet) sheet.style.transition = 'none'; 
  };

  const handleSheetTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const currentY = e.targetTouches[0].clientY;
    const dragDistance = currentY - sheetDragStartY.current;
    if (dragDistance > 0) {
      const sheet = e.currentTarget.parentElement as HTMLDivElement;
      if (sheet) sheet.style.transform = `translateY(${dragDistance}px)`;
    }
  };

  const handleSheetTouchEnd = (e: React.TouchEvent<HTMLDivElement>, closeAction: () => void) => {
    const dragDistance = e.changedTouches[0].clientY - sheetDragStartY.current;
    const sheet = e.currentTarget.parentElement as HTMLDivElement;
    if (dragDistance > 60) { 
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(20);
      if (sheet) {
        sheet.style.transition = 'transform 0.25s cubic-bezier(0.32,0.72,0,1)';
        sheet.style.transform = 'translateY(100%)';
        setTimeout(() => {
          closeAction();
          setTimeout(() => {
            if (sheet) { sheet.style.transition = ''; sheet.style.transform = ''; }
          }, 50);
        }, 200); 
      } else {
        closeAction();
      }
    } else { 
      if (sheet) {
        sheet.style.transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1)';
        sheet.style.transform = 'translateY(0)';
      }
    }
  };

  // --- AUTHENTICATION LOGIC ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
      if (session) fetchData();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchData();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitLoading(true);

    try {
      if (authMode === 'signup') {
        if (!name.trim()) throw new Error("Please enter your name");
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { data: { full_name: name.trim() } }
        });
        if (error) throw error;
        alert('Check your email for the confirmation link! (Or sign in if confirmation is disabled)');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      setAuthError(error.message || 'An error occurred during authentication.');
    } finally {
      setAuthSubmitLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) return setAuthError('Please type your email into the box first.');
    setAuthSubmitLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : 'https://money-tracker-rho-ebon.vercel.app',
    });
    setAuthSubmitLoading(false);
    if (error) setAuthError(error.message);
    else alert('Password reset link sent! Check your email inbox (and spam folder).');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('mt_txs');
    localStorage.removeItem('mt_accs');
    localStorage.removeItem('mt_sync_queue');
    setTransactions([]);
    setBanks(['Cash']);
    setCards([]);
    setCardMeta({});
    setIsSecurityModalOpen(false);
  };

  const allSources = Array.from(new Set([...banks, ...cards]));

  const cleanSource = (rawSource: string) => {
    if (!rawSource) return 'Cash';
    const main = rawSource.includes('->') ? rawSource.split('->')[0] : rawSource;
    return main.split('|')[0].trim();
  };

  const getAccountBalance = (accName: string) => {
    const accTxs = transactions.filter((t: Transaction) => t.source === accName);
    const inc = accTxs.filter((t: Transaction) => t.type === 'income').reduce((a: number, b: Transaction) => a + b.amount, 0);
    const exp = accTxs.filter((t: Transaction) => t.type === 'expense').reduce((a: number, b: Transaction) => a + b.amount, 0);
    return inc - exp;
  };

  const checkBillDueReminders = (metaMap: Record<string, CardMetadata>) => {
    const today = new Date().getDate();
    Object.entries(metaMap).forEach(([cardName, meta]) => {
      if (meta.reminder && meta.dueDate) {
        const diff = meta.dueDate - today;
        if (diff >= 0 && diff <= 3) {
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`Bill Reminder: ${cardName}`, {
              body: `Your credit card bill is due in ${diff === 0 ? 'today' : diff + ' day(s)'}!`,
              icon: '/favicon.ico'
            });
          }
        }
      }
    });
  };

  const processAccountsData = (data: any[]) => {
    let fetchedBanks: string[] = ['Cash'];
    let fetchedCards: string[] = [];
    const metadataMap: Record<string, CardMetadata> = {};

    const dbBanks = data.filter((a: any) => a.type === 'bank').map((a: any) => a.name);
  
    data.filter((a: any) => a.type === 'card').forEach((a: any) => {
      const rawName: string = a.name;
      let linkedBankStr = '';
      if (rawName.includes('->')) linkedBankStr = rawName.split('->')[1].trim();
      const mainPart = rawName.includes('->') ? rawName.split('->')[0] : rawName;
      const metaParts = mainPart.split('|');
      const cleanDisplayName = metaParts[0].trim();

      fetchedCards.push(cleanDisplayName);

      if (metaParts.length >= 3) {
        metadataMap[cleanDisplayName] = {
          limit: parseFloat(metaParts[1]) || 0,
          dueDate: parseInt(metaParts[2]) || 0,
          reminder: metaParts[3] === 'true',
          linkedBank: linkedBankStr || undefined
        };
      }
    });
  
    fetchedBanks = Array.from(new Set([...fetchedBanks, ...dbBanks]));
    setBanks(fetchedBanks);
    setCards(fetchedCards);
    setCardMeta(metadataMap);
    checkBillDueReminders(metadataMap);
  };

  const syncPendingQueue = async () => {
    if (!navigator.onLine || !session) return;
    const queue = JSON.parse(localStorage.getItem('mt_sync_queue') || '[]');
    if (queue.length === 0) return fetchData();

    setIsRefreshing(true);
    const remainingQueue = [];

    for (const op of queue) {
      try {
        if (op.action === 'INSERT') await supabase.from(op.table).insert(op.payload);
        else if (op.action === 'DELETE_ID') await supabase.from(op.table).delete().eq('id', op.id);
        else if (op.action === 'DELETE_IN') await supabase.from(op.table).delete().in('id', op.ids);
        else if (op.action === 'DELETE_MATCH') await supabase.from(op.table).delete().match(op.match);
        else if (op.action === 'DELETE_ILIKE') await supabase.from(op.table).delete().ilike('name', op.ilike).eq('type', op.type);
        else if (op.action === 'UPDATE') await supabase.from(op.table).update(op.payload).eq('id', op.id);
      } catch (e) {
        console.error("Failed to sync operation", op, e);
        remainingQueue.push(op);
      }
    }

    localStorage.setItem('mt_sync_queue', JSON.stringify(remainingQueue));
    setPendingSyncCount(remainingQueue.length);
    fetchData();
  };

  const addToQueue = (op: any) => {
    const q = JSON.parse(localStorage.getItem('mt_sync_queue') || '[]');
    q.push(op);
    localStorage.setItem('mt_sync_queue', JSON.stringify(q));
    setPendingSyncCount(q.length);
  };

  const fetchData = async () => {
    if (!navigator.onLine || !session?.user?.id) return;
  
    setIsRefreshing(true);
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));
  
      const fetchTask = Promise.all([
        supabase.from('transactions').select('*').eq('user_id', session.user.id),
        supabase.from('accounts').select('*').eq('user_id', session.user.id)
      ]);

      const [txRes, accRes] = await Promise.race([fetchTask, timeout]) as any;

      if (txRes && !txRes.error && txRes.data) {
        const dirtyTransactions = txRes.data.filter((t: any) => t.source && (t.source.includes('|') || t.source.includes('->')));
        if (dirtyTransactions.length > 0) {
          dirtyTransactions.forEach(async (t: any) => {
            await supabase.from('transactions').update({ source: cleanSource(t.source) }).eq('id', t.id);
          });
        }

        const cleanedData = txRes.data.map((tx: any) => ({ ...tx, source: cleanSource(tx.source) }));
        const sortedData = cleanedData.sort((a: any, b: any) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateB !== dateA) return dateB - dateA;
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });
        setTransactions(sortedData);
        localStorage.setItem('mt_txs', JSON.stringify(sortedData));
      }

      if (accRes && !accRes.error && accRes.data) {
        processAccountsData(accRes.data);
        localStorage.setItem('mt_accs', JSON.stringify(accRes.data));
      }
    } catch (error) {
      console.warn("Network offline or fetch timeout", error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  // --- SECURITY LOGIC ---
  useEffect(() => {
    const savedPin = localStorage.getItem('mt_pin');
    const savedBio = localStorage.getItem('mt_bio') === 'true';
    if (savedPin) {
      setAppPin(savedPin);
      setBiometricEnabled(savedBio);
      setIsLocked(true);
    }
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && localStorage.getItem('mt_pin')) {
        setIsLocked(true);
        setEnteredPin('');
      } 
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isLocked, biometricEnabled]);

  const triggerBiometricUnlock = async () => {
    if (!window.PublicKeyCredential) return;
    try {
      const credIdBase64 = localStorage.getItem('mt_cred_id');
      if (!credIdBase64) return;
        
      const binaryString = atob(credIdBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

      const publicKey: PublicKeyCredentialRequestOptions = {
        challenge: new Uint8Array(32),
        allowCredentials: [{ type: "public-key", id: bytes }],
        userVerification: "required",
        timeout: 60000
      };
        
      const assertion = await navigator.credentials.get({ publicKey });
      if (assertion) {
        setIsLocked(false);
        setEnteredPin('');
      }
    } catch (e) {
      console.log("Biometric unlock failed or canceled.");
    }
  };

  const setupBiometrics = async () => {
    if (!window.PublicKeyCredential) return alert("Biometrics not supported on this device/browser.");
    try {
      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge: new Uint8Array(32),
        rp: { name: "Spendly", id: window.location.hostname },
        user: { id: new Uint8Array(16), name: "user", displayName: "Owner" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000,
        attestation: "none"
      };
        
      const cred = await navigator.credentials.create({ publicKey });
      if (cred) {
        localStorage.setItem('mt_bio', 'true');
        localStorage.setItem('mt_cred_id', btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array((cred as any).rawId)))));
        setBiometricEnabled(true);
        alert("Face ID / Touch ID Enabled!");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to setup biometrics.");
    }
  };

  const handleUnlockPinPress = (digit: string) => {
    if (enteredPin.length < 4) {
      const newPin = enteredPin + digit;
      setEnteredPin(newPin);
      if (newPin.length === 4) {
        if (newPin === appPin) {
          setTimeout(() => { setIsLocked(false); setEnteredPin(''); }, 150);
        } else {
          setTimeout(() => setEnteredPin(''), 400); 
        }
      }
    }
  };

  const handleSetupPinPress = (digit: string) => {
    if (tempPin.length < 4) {
      const newVal = tempPin + digit;
      setTempPin(newVal);
      if (newVal.length === 4) {
        setTimeout(() => {
          if (setupStep === 1) {
            setNewPinToConfirm(newVal);
            setTempPin('');
            setSetupStep(2);
          } else if (setupStep === 2) {
            if (newVal === newPinToConfirm) {
              localStorage.setItem('mt_pin', newVal);
              setAppPin(newVal);
              setSetupStep(0);
              setTempPin('');
              setIsSecurityModalOpen(false);
              alert('PIN saved successfully!');
            } else {
              alert('PINs did not match. Try again.');
              setTempPin('');
              setSetupStep(1);
            }
          }
        }, 150);
      }
    }
  };

  // INITIAL BOOT
  useEffect(() => { 
    const localTxs = localStorage.getItem('mt_txs');
    const localAccs = localStorage.getItem('mt_accs');
    const localQueue = JSON.parse(localStorage.getItem('mt_sync_queue') || '[]');
    const localCats = localStorage.getItem('mt_custom_cats');

    if (localTxs) {
      const cleanedLocal = JSON.parse(localTxs).map((tx: any) => ({ ...tx, source: cleanSource(tx.source) }));
      setTransactions(cleanedLocal);
    }
    if (localAccs) processAccountsData(JSON.parse(localAccs));
    if (localCats) setCustomCategories(JSON.parse(localCats));
    
    setPendingSyncCount(localQueue.length);

    const handleOnline = () => { setIsOnline(true); syncPendingQueue(); };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    syncPendingQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  }, [session]);

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    
    if (getAllCategories().some(c => c.name.toLowerCase() === newCatName.trim().toLowerCase())) {
      return alert("Category already exists!");
    }

    const newCat = { name: newCatName.trim(), icon: newCatIcon, color: newCatColor };
    const updated = [...customCategories, newCat];
    setCustomCategories(updated);
    localStorage.setItem('mt_custom_cats', JSON.stringify(updated));
    setNewCatName('');
  };

  const handleDeleteCustomCategory = (catName: string) => {
    if (!confirm(`Delete category "${catName}"?`)) return;
    const updated = customCategories.filter(c => c.name !== catName);
    setCustomCategories(updated);
    localStorage.setItem('mt_custom_cats', JSON.stringify(updated));
  };

  // AUTO REFRESH EVERY 10 SECONDS
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine && session) {
        fetchData();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [session]);

  const parseCSVLine = (textLine: string) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < textLine.length; i++) {
      const char = textLine[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(c => c.replace(/^["']|["']$/g, '').trim());
  };

  const handleStatementUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRefreshing(true);
    const text = await file.text();
    const lines: string[] = text.split('\n');

    let detectedBank = 'Kotak Bank'; 
    const lowerText = text.toLowerCase();
    if (lowerText.includes('kotak')) detectedBank = 'Kotak Bank';
    else if (lowerText.includes('hdfc')) detectedBank = 'HDFC Account';
    else if (lowerText.includes('sbi')) detectedBank = 'SBI Account';
    else if (lowerText.includes('icici') || lowerText.includes('axis')) detectedBank = 'ICICI / Axis';

    if (!banks.includes(detectedBank) && !cards.includes(detectedBank)) {
      setBanks(prev => [...prev, detectedBank]);
      const newAcc = { id: generateUUID(), name: detectedBank, type: 'bank', created_at: new Date().toISOString(), user_id: session?.user?.id };
        
      const localAccs = JSON.parse(localStorage.getItem('mt_accs') || '[]');
      localStorage.setItem('mt_accs', JSON.stringify([...localAccs, newAcc]));

      if (isOnline) await supabase.from('accounts').insert([newAcc]);
      else addToQueue({ action: 'INSERT', table: 'accounts', payload: [newAcc] });
    }

    const newTxs: any[] = [];
    let firstTxProcessed = false;

    let descIdx = -1;
    let dateIdx = -1;
    let amountIdx = -1;
    let drCrIdx = -1;
    let balanceIdx = -1;

    lines.forEach((line: string) => {
      if (!line.trim()) return;

      const cols = parseCSVLine(line);
      const cleanCols = cols.map(c => c.toLowerCase().replace(/\s+/g, '')); 

      if (cleanCols.includes('description') || cleanCols.includes('particulars')) {
        descIdx = cleanCols.findIndex(c => c.includes('description') || c.includes('particulars'));
        dateIdx = cleanCols.findIndex(c => c.includes('date'));
        amountIdx = cleanCols.findIndex(c => c === 'amount' || c.includes('withdrawal') || c.includes('debit'));
        drCrIdx = cleanCols.findIndex(c => c.includes('dr/cr') || c.includes('drcr'));
        balanceIdx = cleanCols.findIndex(c => c.includes('balance'));
        return; 
      }

      if (dateIdx === -1 || descIdx === -1) return;

      const dateRegex = /\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/;
        
      if (cols[dateIdx] && dateRegex.test(cols[dateIdx])) {
         const rawDateStr = cols[dateIdx].match(dateRegex)?.[0];
         if (!rawDateStr) return;

         const parts = rawDateStr.split(/[\/\-]/);
         let year = parts[2];
         if (year.length === 2) year = '20' + year; 
         const jsDate = new Date(`${year}-${parts[1]}-${parts[0]}`);
         if (isNaN(jsDate.getTime())) return;
         const formattedDate = jsDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

         let rowTitle = cols[descIdx] ? cols[descIdx].substring(0, 40).trim() : 'Bank Transaction';
         let rowAmount = 0;
         let rowType: 'expense' | 'income' = 'expense';

         if (amountIdx !== -1 && cols[amountIdx]) rowAmount = parseFloat(cols[amountIdx].replace(/,/g, '')); 
         if (drCrIdx !== -1 && cols[drCrIdx]) rowType = cols[drCrIdx].toUpperCase().includes('CR') ? 'income' : 'expense';

         if (rowAmount > 0 && !isNaN(rowAmount)) {
           if (!firstTxProcessed) {
             firstTxProcessed = true;
             let runningBalance = 0;
             if (balanceIdx !== -1 && cols[balanceIdx]) runningBalance = parseFloat(cols[balanceIdx].replace(/,/g, ''));
             
             if (runningBalance > 0) {
               let openingBalance = rowType === 'expense' ? runningBalance + rowAmount : runningBalance - rowAmount;
               const isOpDuplicate = transactions.some((t: Transaction) => t.title === 'Opening Balance' && t.source === detectedBank);
               if (!isOpDuplicate && openingBalance > 0) {
                 newTxs.push({ title: 'Opening Balance', amount: openingBalance, date: formattedDate, source: detectedBank, type: 'income', id: generateUUID(), created_at: new Date().toISOString(), user_id: session?.user?.id });
               }
             }
           }

           const isDuplicate = transactions.some((t: Transaction) => t.date === formattedDate && t.amount === rowAmount && t.type === rowType && t.source === detectedBank);
           const isDuplicateInNew = newTxs.some((t: any) => t.date === formattedDate && t.amount === rowAmount && t.type === rowType);

           if (!isDuplicate && !isDuplicateInNew) {
             newTxs.push({ title: rowTitle, amount: rowAmount, date: formattedDate, source: detectedBank, type: rowType, id: generateUUID(), created_at: new Date().toISOString(), user_id: session?.user?.id });
           }
         }
      }
    });

    if (newTxs.length > 0) {
      const updatedTxs = [...newTxs, ...transactions].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(updatedTxs);
      localStorage.setItem('mt_txs', JSON.stringify(updatedTxs));

      if (isOnline) {
        await supabase.from('transactions').insert(newTxs);
        alert(`Smart Sync Complete! Added ${newTxs.length} transactions to ${detectedBank}.`);
      } else {
        addToQueue({ action: 'INSERT', table: 'transactions', payload: newTxs });
        alert(`Offline Mode: Added ${newTxs.length} transactions. Will sync when online!`);
      }
    } else {
      alert(`Statement processed for ${detectedBank}. No new transactions found.`);
    }
  
    setIsRefreshing(false);
    if (e.target) e.target.value = ''; 
  };

  const handlePayBill = async (accName: string) => {
    const accBalance = getAccountBalance(accName);
    if (accBalance >= 0) return alert('No outstanding balance on this card!');
  
    if (!confirm(`Pay off the outstanding balance of ₹${Math.abs(accBalance).toFixed(2)}?`)) return;

    const newTx = { 
      id: generateUUID(), 
      title: 'Bill Payment', 
      amount: Math.abs(accBalance), 
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), 
      source: cleanSource(accName), 
      type: 'income' as const, 
      created_at: new Date().toISOString(),
      user_id: session?.user?.id
    };
  
    const updatedTxs = [newTx, ...transactions].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(updatedTxs);
    localStorage.setItem('mt_txs', JSON.stringify(updatedTxs));

    if (isOnline) {
      await supabase.from('transactions').insert([newTx]);
      fetchData();
    } else {
      addToQueue({ action: 'INSERT', table: 'transactions', payload: [newTx] });
    }
    alert(`Success! ${accName} balance is now 0.`);
  };

  const handleAddFunds = async (accName: string) => {
    const amountStr = window.prompt(`Enter amount to add to ${accName}:`);
    if (!amountStr) return;
    const addAmount = parseFloat(amountStr);
    if (isNaN(addAmount) || addAmount <= 0) return alert("Invalid amount. Please enter a valid number.");

    const newTx = { 
      id: generateUUID(), 
      title: 'Deposit / Added Funds', 
      amount: addAmount, 
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), 
      source: cleanSource(accName), 
      type: 'income' as const, 
      created_at: new Date().toISOString(),
      user_id: session?.user?.id
    };
  
    const updatedTxs = [newTx, ...transactions].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(updatedTxs);
    localStorage.setItem('mt_txs', JSON.stringify(updatedTxs));

    if (isOnline) {
      await supabase.from('transactions').insert([newTx]);
      fetchData();
    } else {
      addToQueue({ action: 'INSERT', table: 'transactions', payload: [newTx] });
    }
  };

  const openEditAccountModal = (accName: string) => {
    setAccountToEdit(accName);
    let cleanName = accName;
    let digits = '';
    if (accName.includes(' x')) {
      const parts = accName.split(' x');
      cleanName = parts[0].trim();
      digits = parts[1].trim();
    }
    setEditAccountNameInput(cleanName);
    setEditAccountDigitsInput(digits);
    setIsEditAccountModalOpen(true);
  };

  const handleDeleteBankHelper = async (accToDelete: string) => {
    if (accToDelete === 'Cash') return alert('Cash account cannot be deleted.');
    if (!confirm(`Are you sure you want to delete "${accToDelete}"?`)) return;
  
    setBanks(prev => prev.filter((acc: string) => acc !== accToDelete));
    if (filter === accToDelete) setFilter('All');

    const localAccs = JSON.parse(localStorage.getItem('mt_accs') || '[]');
    const filteredAccs = localAccs.filter((a: any) => !(a.name === accToDelete && a.type === 'bank'));
    localStorage.setItem('mt_accs', JSON.stringify(filteredAccs));

    if (isOnline) {
      await supabase.from('accounts').delete().match({ name: accToDelete, type: 'bank' });
      fetchData();
    } else {
      addToQueue({ action: 'DELETE_MATCH', table: 'accounts', match: { name: accToDelete, type: 'bank' } });
    }
  };

  const handleUpdateAccountSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!accountToEdit || !editAccountNameInput.trim()) return alert('Please enter an account name');

    let finalNewName = editAccountNameInput.trim();
    if (editAccountDigitsInput.trim()) {
      if (editAccountDigitsInput.trim().length !== 4) return alert('Account number must be exactly 4 digits');
      finalNewName = `${finalNewName} x${editAccountDigitsInput.trim()}`;
    }

    if (allSources.includes(finalNewName) && finalNewName !== accountToEdit) {
      return alert('An account with this name already exists!');
    }

    setBanks(prev => prev.map(b => b === accountToEdit ? finalNewName : b));
    if (filter === accountToEdit) setFilter(finalNewName);

    const updatedTxs = transactions.map(t => t.source === accountToEdit ? { ...t, source: finalNewName } : t);
    setTransactions(updatedTxs);
    localStorage.setItem('mt_txs', JSON.stringify(updatedTxs));

    const localAccs = JSON.parse(localStorage.getItem('mt_accs') || '[]');
    const accIndex = localAccs.findIndex((a: any) => a.name === accountToEdit && a.type === 'bank');
    let accId = null;

    if (accIndex !== -1) {
      accId = localAccs[accIndex].id;
      localAccs[accIndex].name = finalNewName;
      localStorage.setItem('mt_accs', JSON.stringify(localAccs));
    }

    if (isOnline) {
      if (accId) {
        await supabase.from('accounts').update({ name: finalNewName }).eq('id', accId);
      }
      await supabase.from('transactions').update({ source: finalNewName }).eq('source', accountToEdit).eq('user_id', session?.user?.id);
      fetchData();
    } else {
      if (accId) {
        addToQueue({ action: 'UPDATE', table: 'accounts', payload: { name: finalNewName }, id: accId });
      }
    }

    setIsEditAccountModalOpen(false);
  };

  const openEditCardSettings = (cardName: string) => {
    const meta = cardMeta[cardName] || {};
    setEditCardName(cardName);
    setEditCardLimitInput(meta.limit ? meta.limit.toString() : '');
    setEditCardDueDateInput(meta.dueDate ? meta.dueDate.toString() : '');
    setEditCardReminderInput(!!meta.reminder);
    setIsEditCardModalOpen(true);
    setIsWalletOpen(false);
  };

  const handleUpdateCardSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanLimit = parseFloat(editCardLimitInput) || 0;
    const cleanDue = parseInt(editCardDueDateInput) || 0;

    const newDbName = `${editCardName}|${cleanLimit}|${cleanDue}|${editCardReminderInput}`;

    setCardMeta(prev => ({
      ...prev,
      [editCardName]: { ...prev[editCardName], limit: cleanLimit, dueDate: cleanDue, reminder: editCardReminderInput }
    }));

    const localAccs = JSON.parse(localStorage.getItem('mt_accs') || '[]');
    const accIndex = localAccs.findIndex((a: any) => a.type === 'card' && a.name.startsWith(editCardName + '|'));

    let accId = null;
    if (accIndex !== -1) {
      accId = localAccs[accIndex].id;
      localAccs[accIndex].name = newDbName;
      localStorage.setItem('mt_accs', JSON.stringify(localAccs));
    }

    if (isOnline && accId) {
      await supabase.from('accounts').update({ name: newDbName }).eq('id', accId);
      fetchData();
    } else if (accId) {
       addToQueue({ action: 'UPDATE', table: 'accounts', payload: { name: newDbName }, id: accId });
    }

    setIsEditCardModalOpen(false);
  };

  const addTransaction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!amount || !title) return;
  
    const jsDate = new Date(txDate);
    const formattedDate = !isNaN(jsDate.getTime()) ? jsDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : txDate;
    
    // Resolve Category
    const finalCategory = txCategory === 'Auto' ? getSmartCategory(title) : txCategory;

    const newTx = { 
      id: generateUUID(), 
      title: title.trim(), 
      amount: parseFloat(amount), 
      date: formattedDate, 
      source: cleanSource(source), 
      type: txType, 
      category: finalCategory,
      created_at: new Date().toISOString(),
      user_id: session?.user?.id
    };
  
    const updatedTxs = [newTx, ...transactions].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTransactions(updatedTxs);
    localStorage.setItem('mt_txs', JSON.stringify(updatedTxs));

    if (isOnline) {
      const { error } = await supabase.from('transactions').insert([newTx]);
      if (error) alert(`Supabase Save Error: ${error.message}`); 
      else fetchData();
    } else {
      addToQueue({ action: 'INSERT', table: 'transactions', payload: [newTx] });
    }
  
    setTitle(''); setAmount(''); setTxType('expense'); setTxDate(new Date().toISOString().split('T')[0]);
    setTxCategory('Auto'); setIsCategoryManuallyEdited(false);
    setIsModalOpen(false);
  };

  const deleteTransaction = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    
    if (!confirm('Are you sure you want to delete this record?')) {
      setSwipedTxId(null);
      return;
    }
  
    const updatedTxs = transactions.filter(t => t.id !== id);
    setTransactions(updatedTxs);
    localStorage.setItem('mt_txs', JSON.stringify(updatedTxs));
    setSwipedTxId(null);

    if (isOnline) {
      await supabase.from('transactions').delete().eq('id', id);
      fetchData();
    } else {
      addToQueue({ action: 'DELETE_ID', table: 'transactions', id });
    }
  };

  const deleteSelectedTransactions = async () => {
    if (selectedTxs.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTxs.length} records?`)) return;
  
    const updatedTxs = transactions.filter(t => !selectedTxs.includes(t.id));
    setTransactions(updatedTxs);
    localStorage.setItem('mt_txs', JSON.stringify(updatedTxs));

    if (isOnline) {
      await supabase.from('transactions').delete().in('id', selectedTxs);
      fetchData();
    } else {
      addToQueue({ action: 'DELETE_IN', table: 'transactions', ids: selectedTxs });
    }
  
    setIsSelectMode(false);
    setSelectedTxs([]);
  };

  const toggleSelectTx = (id: string) => {
    if (selectedTxs.includes(id)) setSelectedTxs(selectedTxs.filter(txId => txId !== id));
    else setSelectedTxs([...selectedTxs, id]);
  };

  const startEdit = (tx: Transaction) => {
    if (isSelectMode) { toggleSelectTx(tx.id); return; }
    setEditingId(tx.id); 
    setEditTitle(tx.title); 
    setEditAmount(tx.amount.toString()); 
    setEditSource(cleanSource(tx.source)); 
    setEditType(tx.type as 'expense' | 'income'); 
    setEditCategory(tx.category || getSmartCategory(tx.title));
      
    try {
      const parsedDate = new Date(tx.date);
      if (!isNaN(parsedDate.getTime())) {
        parsedDate.setMinutes(parsedDate.getMinutes() - parsedDate.getTimezoneOffset());
        setEditDate(parsedDate.toISOString().split('T')[0]);
      } else {
        setEditDate(new Date().toISOString().split('T')[0]);
      }
    } catch {
      setEditDate(new Date().toISOString().split('T')[0]);
    }
      
    setIsEditModalOpen(true);
  };

  const updateTransaction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingId || !editAmount || !editTitle || !editDate) return;
  
    const formattedDate = new Date(editDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const finalCategory = editCategory === 'Auto' ? getSmartCategory(editTitle) : editCategory;

    const updatePayload = { 
      title: editTitle.trim(), 
      amount: parseFloat(editAmount), 
      source: cleanSource(editSource), 
      type: editType, 
      category: finalCategory,
      date: formattedDate 
    };

    const updatedTxs = transactions.map(t => t.id === editingId ? { ...t, ...updatePayload } : t);
    setTransactions(updatedTxs);
    localStorage.setItem('mt_txs', JSON.stringify(updatedTxs));

    if (isOnline) {
      const { error } = await supabase.from('transactions').update(updatePayload).eq('id', editingId);
      if (error) alert(`Supabase Update Error: ${error.message}`); 
      else fetchData();
    } else {
      addToQueue({ action: 'UPDATE', table: 'transactions', payload: updatePayload, id: editingId });
    }
  
    setIsEditModalOpen(false); setEditingId(null);
  };

  const handleAddBank = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newBankName.trim()) return alert('Please enter a Bank Name');
  
    let finalName = newBankName.trim();
    if (newBankDigits.trim()) {
      if (newBankDigits.trim().length !== 4) return alert('Account number must be exactly 4 digits');
      finalName = `${finalName} x${newBankDigits.trim()}`;
    }
    if (allSources.includes(finalName)) return alert('Account already exists!');
  
    const newAcc = { id: generateUUID(), name: finalName, type: 'bank', created_at: new Date().toISOString(), user_id: session?.user?.id };

    setBanks(prev => [...prev, finalName]);
    const localAccs = JSON.parse(localStorage.getItem('mt_accs') || '[]');
    localStorage.setItem('mt_accs', JSON.stringify([...localAccs, newAcc]));

    if (isOnline) {
      await supabase.from('accounts').insert([newAcc]);
      fetchData();
    } else {
      addToQueue({ action: 'INSERT', table: 'accounts', payload: [newAcc] });
    }

    setIsAddBankOpen(false); setNewBankName(''); setNewBankDigits('');
  };

  const handleAddCard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCardDigits.trim() || newCardDigits.trim().length !== 4) return alert('Please enter exactly 4 digits');
  
    if (newCardReminder && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') await Notification.requestPermission();
    }

    let fullDbName = "";
    let cleanDisplayName = "";

    if (cardType === 'credit') {
      if (!newCardBank.trim()) return alert('Please enter Bank Name');
      const cleanLimit = parseFloat(newCardLimit) || 0;
      const cleanDue = parseInt(newCardDueDate) || 0;
        
      cleanDisplayName = `${newCardBank.trim()} •••• ${newCardDigits.trim()}`;
      if (allSources.includes(cleanDisplayName)) return alert('Card already exists!');
      fullDbName = `${cleanDisplayName}|${cleanLimit}|${cleanDue}|${newCardReminder}`;

      setCardMeta(prev => ({ ...prev, [cleanDisplayName]: { limit: cleanLimit, dueDate: cleanDue, reminder: newCardReminder } }));
    } else {
      if (!selectedLinkedBank) return alert('Please select a Bank Account to link this card to');
      cleanDisplayName = `${selectedLinkedBank} Debit •••• ${newCardDigits.trim()}`;
      fullDbName = `${cleanDisplayName}|0|0|false->${selectedLinkedBank}`;
      setCardMeta(prev => ({ ...prev, [cleanDisplayName]: { limit: 0, dueDate: 0, reminder: false, linkedBank: selectedLinkedBank } }));
    }

    const newAcc = { id: generateUUID(), name: fullDbName, type: 'card', created_at: new Date().toISOString(), user_id: session?.user?.id };

    setCards(prev => [...prev, cleanDisplayName]);
    const localAccs = JSON.parse(localStorage.getItem('mt_accs') || '[]');
    localStorage.setItem('mt_accs', JSON.stringify([...localAccs, newAcc]));

    if (isOnline) {
      await supabase.from('accounts').insert([newAcc]);
      fetchData();
    } else {
      addToQueue({ action: 'INSERT', table: 'accounts', payload: [newAcc] });
    }

    setIsAddCardOpen(false);
    setNewCardBank(''); setNewCardDigits(''); setNewCardLimit(''); setNewCardDueDate(''); setCardType('credit'); setSelectedLinkedBank('');
  };

  const handleDeleteCard = async (e: React.MouseEvent, cardToDelete: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${cardToDelete}"?`)) return;
  
    setCards(prev => prev.filter((c: string) => c !== cardToDelete));
    setSwipedCard(null); 
    if (filter === cardToDelete) setFilter('All');
  
    if (activeWalletIdx >= cards.length - 1 && activeWalletIdx > 0) {
      setActiveWalletIdx(prev => prev - 1);
    }
  
    const localAccs = JSON.parse(localStorage.getItem('mt_accs') || '[]');
    const filteredAccs = localAccs.filter((a: any) => !(a.type === 'card' && a.name.includes(cardToDelete)));
    localStorage.setItem('mt_accs', JSON.stringify(filteredAccs));
  
    if (isOnline) {
      await supabase.from('accounts').delete().ilike('name', `%${cardToDelete}%`).eq('type', 'card');
      fetchData();
    } else {
      addToQueue({ action: 'DELETE_ILIKE', table: 'accounts', ilike: `%${cardToDelete}%`, type: 'card' });
    }
  };

  const handleDragStart = (clientX: number) => {
    setDragStartX(clientX);
    setIsSwiping(false);
  };

  const handleDragMove = (clientX: number) => {
    if (Math.abs(dragStartX - clientX) > 10) {
      setIsSwiping(true);
    }
  };

  const handleDragEnd = (clientX: number, txId: string) => {
    if (isSelectMode) return;
    const swipeDistance = dragStartX - clientX;
  
    if (swipeDistance > 45) {
      setSwipedTxId(txId); 
    } else if (swipeDistance < -45) {
      setSwipedTxId(null);
    } else if (swipedTxId !== txId) {
      setSwipedTxId(null);
    }
    setTimeout(() => setIsSwiping(false), 50);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    e.currentTarget.scrollLeft;
  };

  const downloadReport = () => {
    if (transactions.length === 0) return alert("No data!");
    const csvContent = [['Date', 'Description', 'Amount', 'Type', 'Category', 'Account'].join(','), ...transactions.map((t: Transaction) => `"${t.date}","${t.title}",${t.amount},${t.type},"${t.category || getSmartCategory(t.title)}","${t.source}"`)].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.setAttribute('download', 'Money_Tracker.csv');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // --- DYNAMIC DATA CALCULATIONS ---
  const filtered = transactions.filter((t: Transaction) => {
    // 1. Source Filter
    const matchSource = filter === 'All' || t.source === filter;
    
    // 2. Search Filter
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 3. Date Range Filter
    let matchDate = true;
    if (fromDate || toDate) {
      const txDateObj = new Date(t.date);
      if (!isNaN(txDateObj.getTime())) {
        if (fromDate) {
          const fDate = new Date(fromDate);
          fDate.setHours(0, 0, 0, 0);
          if (txDateObj < fDate) matchDate = false;
        }
        if (toDate) {
          const tDate = new Date(toDate);
          tDate.setHours(23, 59, 59, 999);
          if (txDateObj > tDate) matchDate = false;
        }
      }
    }
    
    return matchSource && matchSearch && matchDate;
  });
  
  const isCreditCardFilter = filter !== 'All' && cardMeta[filter] && (cardMeta[filter].limit || 0) > 0;
  const isDebitCardFilter = filter !== 'All' && cardMeta[filter] && !!cardMeta[filter].linkedBank;
  
  const activeLimit = isCreditCardFilter ? (cardMeta[filter].limit || 0) : 0;

  const totalSpend = filtered.filter((t: Transaction) => t.type === 'expense').reduce((acc: number, curr: Transaction) => acc + curr.amount, 0);
  const totalIncomeRaw = filtered.filter((t: Transaction) => t.type === 'income').reduce((acc: number, curr: Transaction) => acc + curr.amount, 0);
  
  let displayTotalIncome = totalIncomeRaw;
  let displayTotalSpend = totalSpend;
  let displayNetBalance = totalIncomeRaw - totalSpend;
  
  let leftStatLabel = 'Income';
  let rightStatLabel = 'Expenses';

  if (isCreditCardFilter) {
      displayTotalIncome = activeLimit;
      displayTotalSpend = Math.max(0, totalSpend - totalIncomeRaw);
      displayNetBalance = activeLimit - displayTotalSpend;
      leftStatLabel = 'Total Limit';
      rightStatLabel = 'Outstanding';
  } else if (isDebitCardFilter) {
      const linkedBank = cardMeta[filter].linkedBank!;
      const bankTxs = transactions.filter((t: Transaction) => t.source === linkedBank);
      displayTotalIncome = bankTxs.filter((t: Transaction) => t.type === 'income').reduce((acc: number, curr: Transaction) => acc + curr.amount, 0);
      displayTotalSpend = bankTxs.filter((t: Transaction) => t.type === 'expense').reduce((acc: number, curr: Transaction) => acc + curr.amount, 0);
      displayNetBalance = displayTotalIncome - displayTotalSpend;
  }
  
  const currentMonthYear = new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  const thisMonthTx = filtered.filter((t: Transaction) => t.date.includes(currentMonthYear));
  const thisMonthIncomeRaw = thisMonthTx.filter((t: Transaction) => t.type === 'income').reduce((acc: number, curr: Transaction) => acc + curr.amount, 0);
  const thisMonthExpense = thisMonthTx.filter((t: Transaction) => t.type === 'expense').reduce((acc: number, curr: Transaction) => acc + curr.amount, 0);

  let w4LeftVal = thisMonthIncomeRaw;
  let w4RightVal = thisMonthExpense;
  let w4NetVal = thisMonthIncomeRaw - thisMonthExpense;

  if (isCreditCardFilter || isDebitCardFilter) {
      w4LeftVal = displayTotalIncome;
      w4RightVal = displayTotalSpend;
      w4NetVal = displayNetBalance;
  }

  // WIDGET 4: SPENDING CATEGORY CALCULATIONS
  const expenseTxs = filtered.filter((t: Transaction) => t.type === 'expense');
  const catTotals = expenseTxs.reduce((acc: any, curr: Transaction) => {
    const c = curr.category || getSmartCategory(curr.title);
    acc[c] = (acc[c] || 0) + curr.amount;
    return acc;
  }, {});

  const catArray = Object.keys(catTotals).map(k => ({ name: k, amount: catTotals[k] })).sort((a, b) => b.amount - a.amount);
  
  const renderDonutChart = () => {
    if (totalSpend === 0) return <div className="w-28 h-28 rounded-full border-[10px] border-[#2C2C2E] flex items-center justify-center"><p className="text-[11px] text-[#EBEBF5]/60 font-medium">No Data</p></div>;
  
    let cumulativeOffset = 0;
    const radius = 42;
    const circum = 2 * Math.PI * radius;

    return (
      <div className="relative w-28 h-28 shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {catArray.map((cat) => {
            const ratio = cat.amount / totalSpend;
            const dashLength = ratio * circum;
            const gap = dashLength > 3 ? 4 : 0; 
            const offset = cumulativeOffset;
            cumulativeOffset += dashLength;

            return (
              <circle
                key={cat.name} cx="50" cy="50" r={radius} fill="transparent"
                stroke={getCatColor(cat.name)} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${Math.max(0, dashLength - gap)} ${circum}`} strokeDashoffset={-offset}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[11px] text-[#EBEBF5]/60 font-medium">Spent</p>
          <p className="text-[15px] font-semibold text-white leading-tight tracking-tight">₹{totalSpend > 9999 ? (totalSpend/1000).toFixed(1)+'k' : totalSpend.toFixed(0)}</p>
        </div>
      </div>
    );
  };

  // WIDGET 5: CASH FLOW CALCULATIONS
  const renderBarChart = () => {
    const buckets: { label: string; inc: number; exp: number }[] = [];
    const now = new Date();
  
    if (cashFlowView === 'Week') {
      for(let i=6; i>=0; i--) {
        const d = new Date(now.getTime() - i*24*60*60*1000);
        const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const dayTxs = filtered.filter(t => t.date === dateStr);
        buckets.push({
          label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          inc: dayTxs.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0),
          exp: dayTxs.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0)
        });
      }
    } else if (cashFlowView === 'Month') {
      const curMonthStr = now.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      const monthTxs = filtered.filter(t => t.date.includes(curMonthStr));
      for(let w=1; w<=4; w++) {
        const wTxs = monthTxs.filter(t => {
          const day = parseInt(t.date.split(' ')[0]);
          if(w===1) return day<=7;
          if(w===2) return day>7 && day<=14;
          if(w===3) return day>14 && day<=21;
          return day>21;
        });
        buckets.push({
          label: `Week ${w}`,
          inc: wTxs.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0),
          exp: wTxs.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0)
        });
      }
    } else {
      const curYear = now.getFullYear().toString();
      const months = ['Jan','Feb','Mar','Apr','May','Jun']; 
      months.forEach(m => {
        const mTxs = filtered.filter(t => t.date.includes(`${m} ${curYear}`));
        buckets.push({
          label: m,
          inc: mTxs.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0),
          exp: mTxs.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0)
        });
      });
    }

    const maxVal = Math.max(1, ...buckets.map(b => Math.max(b.inc, b.exp)));
    const chartHeight = 120;
  
    return (
      <div className={`relative h-[160px] mt-4 flex items-end justify-between px-2 ${activeChartTooltip !== null ? 'z-50' : 'z-10'}`}>
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 z-0">
          {[1, 0.66, 0.33, 0].map(v => (
            <div key={v} className="w-full border-t border-white/[0.05] h-0 flex items-center">
              <span className="text-[11px] text-[#EBEBF5]/40 -translate-y-2.5 absolute right-0 bg-[#1C1C1E] pl-1 font-medium">
                {(maxVal * v > 1000) ? (maxVal * v / 1000).toFixed(1) + 'k' : (maxVal * v).toFixed(0)}
              </span>
            </div>
          ))}
        </div>

        {buckets.map((b, i) => {
          const incH = Math.max(4, (b.inc / maxVal) * chartHeight);
          const expH = Math.max(4, (b.exp / maxVal) * chartHeight);
          const isActive = activeChartTooltip === i;

          let tooltipPos = "left-1/2 -translate-x-1/2";
          if (i === 0) tooltipPos = "left-[-10px]";
          else if (i === buckets.length - 1) tooltipPos = "right-[-10px]";

          return (
            <div key={i} className="flex flex-col items-center gap-2 relative cursor-pointer z-50" onClick={() => setActiveChartTooltip(isActive ? null : i)}>
                
              {isActive && (
                <div className={`absolute -top-24 ${tooltipPos} bg-[#2C2C2E]/90 backdrop-blur-xl border border-white/10 rounded-[14px] p-3 shadow-2xl w-36 animate-in fade-in zoom-in-95 duration-200 ease-out`}>
                  <p className="text-[11px] text-[#EBEBF5]/60 font-semibold mb-2">{b.label} • {cashFlowView}</p>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-[#34C759] flex items-center gap-1 font-medium">Income</span>
                    <span className="text-[13px] font-medium tracking-tight">₹{b.inc.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] text-[#FF3B30] flex items-center gap-1 font-medium">Expense</span>
                    <span className="text-[13px] font-medium tracking-tight">₹{b.exp.toFixed(0)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-1.5 flex justify-between items-center">
                    <span className="text-[11px] text-[#EBEBF5]/80 font-medium">Net</span>
                    <span className={`text-[13px] font-semibold tracking-tight ${b.inc - b.exp >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>{b.inc - b.exp >= 0 ? '+' : ''}₹{(b.inc - b.exp).toFixed(0)}</span>
                  </div>
                </div>
              )}

              <div className="flex items-end gap-1.5 h-[120px]">
                <div className={`w-3.5 rounded-[4px] transition-all duration-500 ease-out ${isActive ? 'bg-[#34C759] shadow-[0_0_10px_rgba(52,199,89,0.5)] opacity-100' : 'bg-[#34C759] opacity-50'}`} style={{ height: `${incH}px` }}></div>
                <div className={`w-3.5 rounded-[4px] transition-all duration-500 ease-out ${isActive ? 'bg-[#FF3B30] shadow-[0_0_10px_rgba(255,59,48,0.5)] opacity-100' : 'bg-[#FF3B30] opacity-50'}`} style={{ height: `${expH}px` }}></div>
              </div>
              <span className="text-[11px] text-[#EBEBF5]/60 font-medium">{b.label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const cardGradients = [
    'bg-gradient-to-br from-purple-500 to-indigo-800',
    'bg-gradient-to-br from-blue-500 to-cyan-700',
    'bg-gradient-to-br from-orange-500 to-red-600',
    'bg-gradient-to-br from-gray-500 to-gray-800',
    'bg-gradient-to-br from-[#34C759] to-emerald-700',
    'bg-gradient-to-br from-pink-500 to-rose-700',
  ];

  const NumPad = ({ onKeyPress, onDel, showBio, onBio }: any) => (
    <div className="grid grid-cols-3 gap-4 w-full max-w-[280px] mx-auto mt-6">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
        <button key={n} onClick={() => onKeyPress(n.toString())} className="h-16 rounded-full bg-[#2C2C2E] text-[28px] font-normal text-white hover:bg-[#3A3A3C] active:scale-95 transition-all">{n}</button>
      ))}
      <button onClick={onBio} className="h-16 rounded-full flex items-center justify-center text-[#EBEBF5]/60 hover:text-[#82F87A] active:scale-95 transition-all">
        {showBio ? <Fingerprint className="w-8 h-8" /> : null}
      </button>
      <button onClick={() => onKeyPress('0')} className="h-16 rounded-full bg-[#2C2C2E] text-[28px] font-normal text-white hover:bg-[#3A3A3C] active:scale-95 transition-all">0</button>
      <button onClick={onDel} className="h-16 rounded-full flex items-center justify-center text-[#EBEBF5]/60 hover:text-[#FF3B30] active:scale-95 transition-all">
        <Delete className="w-8 h-8" />
      </button>
    </div>
  );

  // --- RENDER SCREENS ---

  if (isAuthLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-[3px] border-[#82F87A] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  // 1. AUTH SCREEN
  if (!session) {
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-white">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#82F87A] opacity-[0.12] blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative w-full max-w-sm flex items-center justify-center h-40 mb-6 z-10">
          <div className="absolute z-20 w-28 h-28 bg-gradient-to-b from-[#2C2C2E] to-[#1C1C1E] rounded-[28px] flex items-center justify-center border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <CreditCard className="w-12 h-12 text-[#82F87A]" />
          </div>
        </div>

        <div className="text-center z-10 mb-8">
          <h1 className="text-[34px] font-bold tracking-tight mb-1">Spendly</h1>
          <p className="text-[#EBEBF5]/60 text-[17px] tracking-tight">Smart money, smarter life</p>
        </div>

        <div className="w-full max-w-sm bg-[#1C1C1E]/80 backdrop-blur-3xl border border-white/10 p-6 rounded-[32px] z-10 shadow-2xl">
          <form onSubmit={handleEmailAuth} className="space-y-4">
 
            {authMode === 'signup' && (
              <div className="relative bg-[#2C2C2E] rounded-2xl">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-[#EBEBF5]/60" />
                </div>
                <input 
                  type="text" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} required={authMode === 'signup'}
                  className="w-full bg-transparent text-white rounded-2xl py-4 pl-12 pr-4 outline-none placeholder-[#EBEBF5]/40 text-[17px]"
                />
              </div>
            )}

            <div className="relative bg-[#2C2C2E] rounded-2xl">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="w-5 h-5 text-[#EBEBF5]/60" />
              </div>
              <input 
                type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-transparent text-white rounded-2xl py-4 pl-12 pr-4 outline-none placeholder-[#EBEBF5]/40 text-[17px]"
              />
            </div>

            <div className="relative bg-[#2C2C2E] rounded-2xl">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="w-5 h-5 text-[#EBEBF5]/60" />
              </div>
              <input 
                type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full bg-transparent text-white rounded-2xl py-4 pl-12 pr-12 outline-none placeholder-[#EBEBF5]/40 text-[17px]"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#EBEBF5]/60 hover:text-white transition-colors">
                {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>

            {authError && <p className="text-[#FF3B30] text-[13px] text-center font-medium">{authError}</p>}

            {authMode === 'signin' && (
              <div className="text-right">
                <button type="button" onClick={handleResetPassword} className="text-[#82F87A] text-[15px] font-semibold hover:opacity-80">
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" disabled={authSubmitLoading} className="w-full bg-[#82F87A] text-black py-4 rounded-2xl font-semibold text-[17px] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50">
              {authSubmitLoading ? 'Loading...' : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-white/10"></div>
            <span className="text-[13px] text-[#EBEBF5]/60 font-medium">or</span>
            <div className="h-px flex-1 bg-white/10"></div>
          </div>

          <button 
            type="button"
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : 'https://money-tracker-rho-ebon.vercel.app' }
              });
              if (error) setAuthError(error.message);
            }}
            className="w-full bg-white text-black py-4 rounded-2xl font-semibold text-[17px] hover:bg-gray-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="mt-8 z-10 text-[15px] font-medium text-[#EBEBF5]/60">
          {authMode === 'signin' ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(''); }} className="text-[#82F87A] font-semibold hover:opacity-80">
            {authMode === 'signin' ? 'Sign up free' : 'Sign In'}
          </button>
        </div>
      </div>
    );
  }

  // 2. LOCK SCREEN
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center px-6 animate-in fade-in duration-300 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#82F87A] opacity-15 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="mb-8 flex flex-col items-center z-10">
          <Lock className="w-12 h-12 text-[#82F87A] mb-4" />
          <h2 className="text-[22px] font-semibold">Enter Passcode</h2>
        </div>
        <div className="flex gap-4 mb-8 z-10">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-3.5 h-3.5 rounded-full transition-colors duration-200 ${enteredPin.length > i ? 'bg-[#82F87A]' : 'bg-[#2C2C2E]'}`} />
          ))}
        </div>
        <div className="z-10 w-full">
          <NumPad onKeyPress={handleUnlockPinPress} onDel={() => setEnteredPin(prev => prev.slice(0, -1))} showBio={biometricEnabled} onBio={triggerBiometricUnlock} />
        </div>
      </div>
    );
  }

  // 3. MAIN DASHBOARD
  return (
    <div className="w-full max-w-md md:max-w-[95%] xl:max-w-[1600px] mx-auto h-[100dvh] bg-black text-white flex flex-col relative font-sans select-none overflow-hidden">
      
      <style dangerouslySetInnerHTML={{__html: `
        body { overscroll-behavior-y: none; background-color: #000; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 0.5; }
      `}} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pt-12 pb-32 z-10 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
 
        {/* Header Section */}
        <div className="flex justify-between items-start mb-6 shrink-0 px-5">
          <div>
            <p className="text-[#EBEBF5]/60 text-[15px] font-medium tracking-tight">{getGreeting()}</p>
            <h1 className="text-[34px] font-bold tracking-tight text-white leading-tight mt-0.5">
              {session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'User'}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2 mt-1">
            <button onClick={() => setIsSecurityModalOpen(true)} className="w-10 h-10 rounded-full bg-[#1C1C1E] flex items-center justify-center overflow-hidden hover:bg-[#2C2C2E] transition-all">
               <Settings className="w-[22px] h-[22px] text-[#EBEBF5]/80" />
            </button>
            <div className="flex gap-2">
              {!isOnline && <span className="flex items-center gap-1 text-[11px] font-semibold text-[#FF3B30] bg-[#FF3B30]/10 px-2 py-0.5 rounded-full"><AlertCircle className="w-3 h-3" /> Offline</span>}
              {pendingSyncCount > 0 && <span className="flex items-center gap-1 text-[11px] font-semibold text-[#82F87A] bg-[#82F87A]/10 px-2 py-0.5 rounded-full"><RefreshCw className="w-3 h-3 animate-spin" /> {pendingSyncCount}</span>}
            </div>
          </div>
        </div>

        {/* SWIPEABLE WIDGETS SECTION */}
        <div className="z-10 relative mb-8 shrink-0">
          <div onScroll={handleScroll} className="flex px-5 md:grid md:grid-cols-2 lg:grid-cols-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none gap-4 pb-2 md:pb-0 [&::-webkit-scrollbar]:hidden" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
 
            {/* WIDGET 1: Balance Card */}
            <div className="min-w-[85vw] md:min-w-0 snap-center bg-gradient-to-br from-[#A2F896] to-[#60E85D] rounded-[32px] p-6 text-black shadow-[0_8px_30px_rgba(130,248,122,0.15)] relative overflow-hidden flex flex-col justify-between">
              <div>
                <p className="text-[15px] font-medium opacity-80 tracking-tight">{isCreditCardFilter ? 'Available Limit' : isDebitCardFilter ? 'Linked Bank Balance' : 'Total Balance'} ({filter})</p>
                <h2 className="text-[38px] font-bold tracking-tight mt-1 mb-6">₹{displayNetBalance.toFixed(2)}</h2>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 bg-black/10 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[#1A4B1A]"><TrendingDown className="w-4 h-4 stroke-[3]" /></div>
                  <div><p className="text-[11px] font-semibold opacity-70 uppercase tracking-wider">{leftStatLabel}</p><p className="text-[15px] font-bold tracking-tight">₹{displayTotalIncome.toFixed(0)}</p></div>
                </div>
                <div className="flex-1 bg-black/10 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-[#FF3B30]"><TrendingUp className="w-4 h-4 stroke-[3]" /></div>
                  <div><p className="text-[11px] font-semibold opacity-70 uppercase tracking-wider">{rightStatLabel}</p><p className="text-[15px] font-bold tracking-tight">₹{displayTotalSpend.toFixed(0)}</p></div>
                </div>
              </div>
            </div>

            {/* WIDGET 2: Spending by Category (Donut Chart) */}
            <div className="min-w-[85vw] md:min-w-0 snap-center bg-[#1C1C1E] rounded-[32px] p-6 relative overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[17px] font-semibold text-white tracking-tight">Spending by category</h3>
                <ArrowUpRight className="w-5 h-5 text-[#EBEBF5]/40" />
              </div>
              <div className="flex items-center gap-6 mt-2">
                {renderDonutChart()}
                <div className="flex-1 space-y-3.5">
                  {catArray.slice(0, 4).map(cat => (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCatColor(cat.name) }}></div>
                        <span className="text-[15px] text-[#EBEBF5] font-medium">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] tracking-tight font-medium text-white">₹{cat.amount.toFixed(0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* WIDGET 3: Cash Flow (Bar Chart) */}
            <div className="min-w-[85vw] md:min-w-0 snap-center bg-[#1C1C1E] rounded-[32px] p-6 relative flex flex-col" onClick={() => isCashFlowDropdownOpen && setIsCashFlowDropdownOpen(false)}>
              <div className={`flex justify-between items-start mb-2 relative ${isCashFlowDropdownOpen ? 'z-50' : 'z-20'}`}>
                <div>
                  <h3 className="text-[17px] font-semibold text-white tracking-tight mb-1">Cash flow</h3>
                  <div className="flex gap-4">
                    <span className="text-[11px] font-medium text-[#EBEBF5]/60 flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-[#34C759]" /> Income</span>
                    <span className="text-[11px] font-medium text-[#EBEBF5]/60 flex items-center gap-1"><ArrowDownRight className="w-3 h-3 text-[#FF3B30]" /> Expenses</span>
                  </div>
                </div>
 
                <div className="relative">
                  <button onClick={(e) => { e.stopPropagation(); setIsCashFlowDropdownOpen(!isCashFlowDropdownOpen); }} className="flex items-center gap-1.5 bg-[#2C2C2E] px-3 py-1.5 rounded-full text-[13px] font-semibold text-[#EBEBF5] hover:bg-[#3A3A3C] transition-colors">
                    {cashFlowView} <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </button>
                  {isCashFlowDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 bg-[#2C2C2E]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-28 z-50">
                      {['Week', 'Month', 'Year'].map((v, idx) => (
                        <div key={v} onClick={() => { setCashFlowView(v as any); setIsCashFlowDropdownOpen(false); setActiveChartTooltip(null); }} className={`px-4 py-3 text-[15px] font-medium text-[#EBEBF5] hover:bg-white/10 cursor-pointer ${idx !== 2 ? 'border-b border-white/5' : ''}`}>
                          {v}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {renderBarChart()}
            </div>

            {/* WIDGET 4: Quick Summary Card */}
            <div className="min-w-[85vw] md:min-w-0 snap-center bg-[#1C1C1E] rounded-[32px] p-6 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-1"><p className="text-[13px] font-semibold text-[#EBEBF5]/60 uppercase tracking-wider">{isCreditCardFilter ? 'Available Limit' : isDebitCardFilter ? 'Linked Bank Balance' : 'Net Cash Flow'} • {isCreditCardFilter || isDebitCardFilter ? filter : currentMonthYear.split(' ')[0]}</p></div>
              <h1 className="text-[34px] font-bold tracking-tight text-white mb-6 mt-1">₹{w4NetVal.toFixed(2)}</h1>
              <div className="flex gap-3">
                <div className="flex-1 bg-[#2C2C2E] rounded-2xl p-4"><p className="text-[11px] text-[#EBEBF5]/60 font-semibold mb-1 uppercase tracking-wider">{isCreditCardFilter ? 'Total Limit' : 'In'}</p><p className="text-[17px] font-bold text-[#34C759] tracking-tight">₹{w4LeftVal.toFixed(0)}</p></div>
                <div className="flex-1 bg-[#2C2C2E] rounded-2xl p-4"><p className="text-[11px] text-[#EBEBF5]/60 font-semibold mb-1 uppercase tracking-wider">{isCreditCardFilter ? 'Outstanding' : 'Out'}</p><p className="text-[17px] font-bold text-[#FF3B30] tracking-tight">₹{w4RightVal.toFixed(0)}</p></div>
              </div>
            </div>

          </div>
          <div className="flex justify-center gap-2 mt-4 md:hidden">
            {[0, 1, 2, 3].map((index: number) => (<div key={index} className={`h-1.5 rounded-full transition-all duration-300 w-1.5 bg-[#2C2C2E]`} />))}
          </div>
        </div>

        {/* Search Bar & Date Filter */}
        <div className="mb-6 shrink-0 px-5">
          <div className="flex gap-2 relative">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-[#EBEBF5]/40" />
              </div>
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1C1C1E] text-white rounded-[10px] py-2.5 pl-10 pr-4 outline-none placeholder-[#EBEBF5]/40 text-[17px]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#EBEBF5]/40 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button 
              onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
              className={`w-[44px] h-[44px] shrink-0 rounded-[10px] flex items-center justify-center transition-colors ${fromDate || toDate ? 'bg-[#82F87A] text-black' : 'bg-[#1C1C1E] text-[#EBEBF5]/60 hover:text-white'}`}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Date Range Dropdown */}
          {isDateFilterOpen && (
            <div className="mt-3 bg-[#1C1C1E] rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
              <div className="flex-1 min-w-0">
                <label className="text-[11px] font-semibold text-[#EBEBF5]/60 uppercase tracking-wider mb-1.5 block truncate">From</label>
                <input 
                  type="date" 
                  value={fromDate} 
                  onChange={e => setFromDate(e.target.value)} 
                  className="w-full bg-[#2C2C2E] text-white rounded-lg px-2 py-2 text-[14px] outline-none [color-scheme:dark] min-w-0 appearance-none" 
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-[11px] font-semibold text-[#EBEBF5]/60 uppercase tracking-wider mb-1.5 block truncate">To</label>
                <input 
                  type="date" 
                  value={toDate} 
                  onChange={e => setToDate(e.target.value)} 
                  className="w-full bg-[#2C2C2E] text-white rounded-lg px-2 py-2 text-[14px] outline-none [color-scheme:dark] min-w-0 appearance-none" 
                />
              </div>
              {(fromDate || toDate) && (
                <button onClick={() => { setFromDate(''); setToDate(''); }} className="mt-6 w-[38px] h-[38px] flex items-center justify-center shrink-0 rounded-lg bg-[#FF3B30]/10 text-[#FF3B30] hover:bg-[#FF3B30]/20 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Transactions Header & Filter Pills */}
        <div className="mb-4 shrink-0 px-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[22px] font-bold tracking-tight">Transactions</h3>
            <div className="flex items-center gap-4">
              {isSelectMode && selectedTxs.length > 0 && (
                <button onClick={deleteSelectedTransactions} className="text-[#FF3B30] text-[17px] font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity animate-in fade-in">
                   Delete ({selectedTxs.length})
                </button>
              )}
              <button onClick={() => { setIsSelectMode(!isSelectMode); setSelectedTxs([]); setSwipedTxId(null); }} className="text-[#82F87A] text-[17px] font-semibold hover:opacity-80 transition-opacity">
                {isSelectMode ? 'Cancel' : 'Select'}
              </button>
            </div>
          </div>
 
          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-5 px-5 [&::-webkit-scrollbar]:hidden" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            <button 
              onClick={() => setFilter('All')} 
              className={`px-4 py-2 rounded-full text-[15px] font-medium whitespace-nowrap transition-colors ${filter === 'All' ? 'bg-[#82F87A] text-black' : 'bg-[#1C1C1E] text-[#EBEBF5] hover:bg-[#2C2C2E]'}`}
            >
              All
            </button>
            {allSources.map(acc => {
              const isEditableBank = acc !== 'Cash' && !cards.includes(acc);

              const handlePressStart = () => {
                isLongPressTriggeredRef.current = false;
                if (isEditableBank) {
                  longPressTimerRef.current = setTimeout(() => {
                    isLongPressTriggeredRef.current = true;
                    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
                    openEditAccountModal(acc); 
                  }, 600);
                }
              };

              const handlePressEnd = () => {
                if (longPressTimerRef.current) {
                  clearTimeout(longPressTimerRef.current);
                  longPressTimerRef.current = null;
                }
              };

              return (
                <button 
                  key={acc}
                  onClick={(e) => {
                    if (isLongPressTriggeredRef.current) {
                      e.preventDefault();
                      return;
                    }
                    setFilter(acc);
                  }} 
                  onTouchStart={handlePressStart}
                  onTouchEnd={handlePressEnd}
                  onTouchMove={handlePressEnd}
                  onMouseDown={handlePressStart}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                  className={`px-4 py-2 rounded-full text-[15px] font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${filter === acc ? 'bg-[#82F87A] text-black' : 'bg-[#1C1C1E] text-[#EBEBF5] hover:bg-[#2C2C2E]'}`}
                >
                  {acc}
                </button>
              );
            })}
            <button
              onClick={() => setIsAddBankOpen(true)}
              className="px-4 py-2 rounded-full text-[15px] font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 bg-[#1C1C1E] text-[#82F87A] hover:bg-[#2C2C2E]"
            >
              <PlusCircle className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        {/* Transactions List (Inset Grouped Style) */}
        <div className="px-5">
          <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden relative">
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-[#EBEBF5]/60 text-[15px]">No transactions found.</div>
            ) : (
              filtered.map((item: Transaction, idx: number) => {
                const isSwiped = swipedTxId === item.id;
                const isSelected = selectedTxs.includes(item.id);
                const isLast = idx === filtered.length - 1;

                return (
                  <div key={item.id} className="relative w-full h-[76px] bg-[#1C1C1E]">
                    <button 
                      onClick={(e) => deleteTransaction(e, item.id)}
                      className="absolute right-0 top-0 bottom-0 w-[90px] bg-[#FF3B30] text-white flex flex-col items-center justify-center text-[15px] font-semibold z-0 hover:bg-[#e0352b]"
                    >
                      Delete
                    </button>

                    <div 
                      onTouchStart={(e) => handleDragStart(e.targetTouches[0].clientX)}
                      onTouchMove={(e) => handleDragMove(e.targetTouches[0].clientX)}
                      onTouchEnd={(e) => handleDragEnd(e.changedTouches[0].clientX, item.id)}
                      onMouseDown={(e) => handleDragStart(e.clientX)}
                      onMouseMove={(e) => handleDragMove(e.clientX)}
                      onMouseUp={(e) => handleDragEnd(e.clientX, item.id)}
                      onMouseLeave={(e) => { if (dragStartX > 0) handleDragEnd(e.clientX, item.id); }}
                      onClick={(e) => {
                        if (isSwiping) { e.preventDefault(); return; } 
                        startEdit(item);
                      }} 
                      className={`absolute inset-0 bg-[#1C1C1E] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] flex items-center justify-between p-4 cursor-pointer z-10 touch-pan-y ${!isLast ? 'border-b border-white/5' : ''}
                        ${isSwiped ? '-translate-x-[90px]' : 'translate-x-0'} 
                        ${isSelected ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`
                      }
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        {isSelectMode && (
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[#82F87A] border-[#82F87A]' : 'border-[#EBEBF5]/40'}`}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                          </div>
                        )}
                        {!isSelectMode && (
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#2C2C2E]">
                            {getIconComponent(item.category || getSmartCategory(item.title))}
                          </div>
                        )}

                        <div className="min-w-0 flex-1 pr-2">
                          <h3 className="text-[17px] font-medium text-white flex items-center gap-1.5 truncate tracking-tight">
                            <span className="truncate block">{item.title}</span>
                          </h3>
                          <p className="text-[13px] text-[#EBEBF5]/60 truncate mt-0.5">{item.source} • {item.date}</p>
                        </div>
                      </div>
                        
                      <div className="flex items-center shrink-0 pl-2">
                        <span className={`text-[17px] font-semibold tracking-tight ${item.type === 'income' ? 'text-[#34C759]' : 'text-white'}`}>
                          {item.type === 'income' ? '+' : '-'}{item.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modern Bottom Navigation (Dynamic Island Pill style) */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center z-40 pointer-events-none px-5">
        <div className="bg-[#2C2C2E]/80 backdrop-blur-3xl border border-white/10 rounded-full h-16 px-6 flex items-center gap-8 pointer-events-auto shadow-2xl">
          <button onClick={() => setFilter('All')} className="text-[#82F87A] hover:opacity-80 transition-opacity">
            <Home className="w-6 h-6 fill-[#82F87A]/20" />
          </button>
          
          <button onClick={() => setIsWalletOpen(true)} className="text-[#EBEBF5]/60 hover:text-white transition-colors">
            <CreditCard className="w-6 h-6" />
          </button>
          
          <button onClick={downloadReport} className="text-[#EBEBF5]/60 hover:text-white transition-colors">
            <Download className="w-6 h-6" />
          </button>
          
          {/* FIXED UPLOAD BUTTON */}
          <button onClick={() => statementInputRef.current?.click()} className="text-[#EBEBF5]/60 hover:text-white transition-colors flex items-center justify-center">
            <input type="file" accept=".csv" className="hidden" ref={statementInputRef} onChange={handleStatementUpload} />
            <Upload className="w-6 h-6" />
          </button>
          
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="w-10 h-10 bg-[#82F87A] text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md ml-2"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* WALLET STACK UI */}
      {isWalletOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl flex flex-col justify-end overflow-hidden animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] w-full h-[95vh] rounded-t-[32px] flex flex-col animate-in slide-in-from-bottom-full duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] pb-10">
            {/* Grabber Area for Swipe Down */}
            <div 
              className="w-full pt-4 pb-4 flex flex-col items-center justify-center border-b border-white/10 shrink-0 relative touch-none"
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              onTouchEnd={(e) => handleSheetTouchEnd(e, () => setIsWalletOpen(false))}
            >
              <div className="absolute right-5 top-4 flex gap-3"><button onClick={(e) => { e.stopPropagation(); setIsWalletOpen(false); setIsAddCardOpen(true); }} className="w-8 h-8 rounded-full flex items-center justify-center text-[#34C759] bg-[#2C2C2E] hover:bg-[#3A3A3C] transition-colors"><Plus className="w-5 h-5" /></button></div>
              <div className="w-10 h-1.5 bg-white/20 rounded-full mb-3 shrink-0"></div>
              <h2 className="text-[17px] font-semibold text-white tracking-tight">Your Cards</h2>
            </div>

            <div className="relative flex-1 w-full max-w-md mx-auto flex flex-col px-5 pt-8">
              <div 
                className="relative h-[240px] w-full shrink-0"
                onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientY)}
                onTouchEnd={(e) => {
                  const touchEnd = e.changedTouches[0].clientY;
                  const diff = touchStart - touchEnd;
                  if (diff > 20 && activeWalletIdx < cards.length - 1) setActiveWalletIdx(prev => prev + 1); 
                  else if (diff < -20 && activeWalletIdx > 0) setActiveWalletIdx(prev => prev - 1); 
                }}
              >
                {cards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-50 text-center">
                    <CreditCard className="w-16 h-16 text-[#EBEBF5] mb-4" />
                    <p className="text-[17px] font-medium">No cards in your wallet.</p>
                  </div>
                ) : (
                  cards.map((acc: string, index: number) => {
                    const isActive = index === activeWalletIdx;
                    const diff = index - activeWalletIdx;
   
                    const topOffset = diff * 25; 
                    const scale = 1 - Math.abs(diff) * 0.05;
                    const opacity = isActive ? 1 : Math.max(0, 1 - Math.abs(diff) * 0.4);
                    const zIndex = 50 - Math.abs(diff);
                    const isHidden = diff < -1 || diff > 3;

                    if (isHidden) return null;

                    const bgClass = cardGradients[index % cardGradients.length];
                    const meta = cardMeta[acc] || {};
                    const isDebit = !!meta.linkedBank;
   
                    const accBalance = isDebit ? getAccountBalance(meta.linkedBank!) : getAccountBalance(acc);

                    let displayName = acc;
                    let displayDigits = "•••• •••• •••• ••••";
                    if (acc.includes('••••')) {
                      const parts = acc.split('••••');
                      displayName = parts[0].trim();
                      displayDigits = `•••• •••• •••• ${parts[1].trim()}`;
                    } else if (acc.includes(' x')) {
                      const parts = acc.split(' x');
                      if(parts.length > 1) {
                        displayName = parts[0].trim();
                        displayDigits = `•••• •••• •••• ${parts[1].trim()}`;
                      }
                    }

                    return (
                      <div 
                        key={acc} 
                        onClick={() => setActiveWalletIdx(index)}
                        className="absolute w-full h-[220px] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer" 
                        style={{ top: `${topOffset}px`, zIndex, transform: `scale(${scale}) translateY(${diff > 0 ? diff * 10 : 0}px)`, opacity }}
                      >
                        <div className={`relative w-full h-full rounded-[24px] p-6 shadow-xl flex flex-col justify-between z-10 ${bgClass}`}>
                          <div className="flex justify-between items-start">
                            <h3 className="text-[20px] font-bold tracking-tight text-white drop-shadow-md truncate pr-2">{displayName}</h3>
                            {meta.dueDate && meta.dueDate > 0 && (
                              <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full shrink-0">
                                <Calendar className="w-3.5 h-3.5 text-white" />
                                <span className="text-[11px] font-bold text-white uppercase tracking-wider">Due {meta.dueDate}th</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 mb-2">
                            <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wider mb-1">
                              {isDebit ? 'Linked Bank Balance' : 'Current Spend'}
                            </p>
                            <div className="flex justify-between items-end">
                              <p className="text-[34px] font-bold tracking-tight text-white drop-shadow-md leading-none">₹{accBalance.toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="flex justify-between items-end mt-auto pt-4">
                            <p className="text-[15px] font-mono tracking-[0.15em] text-white/90 drop-shadow-sm">{displayDigits}</p>
                            <div className="w-10 h-6 rounded-md bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                              <div className="w-4 h-4 rounded-full bg-white/70 mix-blend-overlay -mr-2"></div>
                              <div className="w-4 h-4 rounded-full bg-white/70 mix-blend-overlay"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {cards.length > 0 && (
                <div className="mt-12 bg-[#2C2C2E] rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500 delay-100">
                  <button 
                    onClick={() => { setFilter(cards[activeWalletIdx]); setIsWalletOpen(false); }} 
                    className="w-full flex items-center justify-between p-4 border-b border-white/5 hover:bg-[#3A3A3C] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#3A3A3C] flex items-center justify-center"><Search className="w-4 h-4 text-white" /></div>
                      <span className="text-[17px] text-white">Transaction history</span>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-[#EBEBF5]/30 rotate-180" />
                  </button>
                      
                  {cards[activeWalletIdx]?.includes('Debit') || (cardMeta[cards[activeWalletIdx]]?.limit || 0) === 0 ? (
                    <button 
                      onClick={() => handleAddFunds(cards[activeWalletIdx])} 
                      className="w-full flex items-center justify-between p-4 hover:bg-[#3A3A3C] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#3A3A3C] flex items-center justify-center"><PlusCircle className="w-4 h-4 text-[#34C759]" /></div>
                        <span className="text-[17px] text-white">Add funds</span>
                      </div>
                      <ChevronLeft className="w-5 h-5 text-[#EBEBF5]/30 rotate-180" />
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => handlePayBill(cards[activeWalletIdx])} 
                        className="w-full flex items-center justify-between p-4 border-b border-white/5 hover:bg-[#3A3A3C] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#3A3A3C] flex items-center justify-center"><CheckSquare className="w-4 h-4 text-[#34C759]" /></div>
                          <span className="text-[17px] text-white">Pay the bill</span>
                        </div>
                        <ChevronLeft className="w-5 h-5 text-[#EBEBF5]/30 rotate-180" />
                      </button>
                      <button 
                        onClick={() => openEditCardSettings(cards[activeWalletIdx])} 
                        className="w-full flex items-center justify-between p-4 hover:bg-[#3A3A3C] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#3A3A3C] flex items-center justify-center"><Settings className="w-4 h-4 text-white" /></div>
                          <span className="text-[17px] text-white">Card settings</span>
                        </div>
                        <ChevronLeft className="w-5 h-5 text-[#EBEBF5]/30 rotate-180" />
                      </button>
                    </>
                  )}
                </div>
              )}
              
              {cards.length > 0 && (
                <div className="mt-6 bg-[#2C2C2E] rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500 delay-200">
                  <button 
                    onClick={(e) => handleDeleteCard(e, cards[activeWalletIdx])} 
                    className="w-full flex items-center justify-between p-4 hover:bg-[#3A3A3C] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FF3B30]/10 flex items-center justify-center"><Trash2 className="w-4 h-4 text-[#FF3B30]" /></div>
                      <span className="text-[17px] text-[#FF3B30]">Remove Card</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT ACCOUNT / BANK MODAL (Bottom Sheet) */}
      {isEditAccountModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px] flex flex-col justify-end animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] w-full max-h-[95vh] rounded-t-[32px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-full duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]">
            {/* Grabber Area for Swipe Down */}
            <div 
              className="w-full pt-4 pb-4 flex flex-col items-center justify-center border-b border-white/10 shrink-0 relative touch-none"
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              onTouchEnd={(e) => handleSheetTouchEnd(e, () => setIsEditAccountModalOpen(false))}
            >
              <div className="w-10 h-1.5 bg-white/20 rounded-full mb-3 shrink-0"></div>
              <h2 className="text-[17px] font-semibold text-white tracking-tight">Edit Bank</h2>
            </div>

            <div className="overflow-y-auto px-5 py-6">
              <form id="editBankForm" onSubmit={handleUpdateAccountSettings}>
                <div className="bg-[#2C2C2E] rounded-[10px] overflow-hidden mb-6">
                  <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <label className="text-[17px] text-white">Bank Name</label>
                    <input type="text" value={editAccountNameInput} onChange={(e) => setEditAccountNameInput(e.target.value)} className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[60%]" required autoFocus />
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <label className="text-[17px] text-white">Last 4 Digits</label>
                    <input type="text" maxLength={4} inputMode="numeric" placeholder="Optional" value={editAccountDigitsInput} onChange={(e) => setEditAccountDigitsInput(e.target.value.replace(/\D/g, ''))} className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[50%]" />
                  </div>
                </div>
                <p className="text-[13px] text-[#EBEBF5]/60 text-center px-4 -mt-3 mb-6">Make sure digits match automated SMS parser rules.</p>
                <button type="submit" className="w-full bg-[#82F87A] text-black py-3.5 rounded-[14px] font-semibold text-[17px] mb-6 shadow-sm">
                  Update Account
                </button>
              </form>

              {accountToEdit && accountToEdit !== 'Cash' && (
                <div className="bg-[#2C2C2E] rounded-[10px] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteBankHelper(accountToEdit);
                      setIsEditAccountModalOpen(false);
                    }}
                    className="w-full bg-transparent text-[#FF3B30] p-4 text-[17px] font-medium text-center transition-colors hover:bg-white/5"
                  >
                    Delete Account
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT CARD SETTINGS MODAL (Bottom Sheet) */}
      {isEditCardModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px] flex flex-col justify-end animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] w-full max-h-[95vh] rounded-t-[32px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-full duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]">
            {/* Grabber Area for Swipe Down */}
            <div 
              className="w-full pt-4 pb-4 flex flex-col items-center justify-center border-b border-white/10 shrink-0 relative touch-none"
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              onTouchEnd={(e) => handleSheetTouchEnd(e, () => setIsEditCardModalOpen(false))}
            >
              <div className="w-10 h-1.5 bg-white/20 rounded-full mb-3 shrink-0"></div>
              <h2 className="text-[17px] font-semibold text-white tracking-tight">Card Settings</h2>
            </div>

            <div className="overflow-y-auto px-5 py-6">
              <form id="editCardForm" onSubmit={handleUpdateCardSettings}>
                <div className="bg-[#2C2C2E] rounded-[10px] overflow-hidden mb-6">
                  <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <label className="text-[17px] text-white">Card Name</label>
                    <span className="text-right text-[17px] text-[#EBEBF5]/40">{editCardName}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <label className="text-[17px] text-white">Limit (₹)</label>
                    <input type="text" inputMode="decimal" placeholder="0" value={editCardLimitInput} onChange={(e) => setEditCardLimitInput(e.target.value.replace(/\D/g, ''))} className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[50%]" />
                  </div>
                  <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <label className="text-[17px] text-white">Due Date</label>
                    <select value={editCardDueDateInput} onChange={(e) => setEditCardDueDateInput(e.target.value)} className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[50%]" dir="rtl">
                      <option value="">None</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => <option key={day} value={day}>{day}th</option>)}
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-5 h-5 text-white" />
                      <span className="text-[17px] text-white">Bill Reminder</span>
                    </div>
                    {/* iOS Style Switch mimic */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={editCardReminderInput} onChange={(e) => setEditCardReminderInput(e.target.checked)} />
                      <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#34C759]"></div>
                    </label>
                  </div>
                </div>
                <button type="submit" className="w-full bg-[#82F87A] text-black py-3.5 rounded-[14px] font-semibold text-[17px] shadow-sm">
                  Update Card
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN ADD TRANSACTION MODAL (Bottom Sheet) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-[2px] flex flex-col justify-end animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] w-full max-h-[95vh] rounded-t-[32px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-full duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]">
            {/* Grabber Area for Swipe Down */}
            <div 
              className="w-full pt-4 pb-4 flex flex-col items-center justify-center border-b border-white/10 shrink-0 relative touch-none"
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              onTouchEnd={(e) => handleSheetTouchEnd(e, () => { setIsModalOpen(false); setTitle(''); setAmount(''); setTxCategory('Auto'); setIsCategoryManuallyEdited(false); })}
            >
              <div className="w-10 h-1.5 bg-white/20 rounded-full mb-3 shrink-0"></div>
              <h2 className="text-[17px] font-semibold text-white tracking-tight">New Transaction</h2>
            </div>

            <div className="overflow-y-auto px-5 py-8">
              <form id="addTransactionForm" onSubmit={addTransaction}>
                <div className="flex justify-center items-center text-[54px] font-bold text-white mb-8 tracking-tight">
                  <span className="text-[#EBEBF5]/40 mr-1 text-[40px]">₹</span>
                  <input 
                    type="text" 
                    inputMode="decimal" 
                    placeholder="0" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    className="bg-transparent w-[70%] text-center outline-none placeholder-[#EBEBF5]/20" 
                    autoFocus 
                  />
                </div>

                {/* iOS Segmented Control */}
                <div className="bg-[#2C2C2E] p-[3px] rounded-lg flex mb-6">
                  <button type="button" onClick={() => setTxType('expense')} className={`flex-1 py-1.5 text-[14px] font-semibold rounded-[6px] transition-all ${txType === 'expense' ? 'bg-[#636366] text-white shadow-sm' : 'text-[#EBEBF5]/60'}`}>
                    Expense
                  </button>
                  <button type="button" onClick={() => setTxType('income')} className={`flex-1 py-1.5 text-[14px] font-semibold rounded-[6px] transition-all ${txType === 'income' ? 'bg-[#636366] text-white shadow-sm' : 'text-[#EBEBF5]/60'}`}>
                    Income
                  </button>
                </div>

                <div className="bg-[#2C2C2E] rounded-[10px] overflow-hidden mb-6">
                  <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <label className="text-[17px] text-white">Title</label>
                    <input type="text" placeholder="e.g. Coffee" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[60%]" />
                  </div>
                  
                  {/* CATEGORY SELECTOR */}
                  <div className="flex items-center justify-between p-4 border-b border-white/5 relative">
                    <label className="text-[17px] text-white">Category</label>
                    <select 
                      value={txCategory} 
                      onChange={(e) => { setTxCategory(e.target.value); setIsCategoryManuallyEdited(true); }} 
                      className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[60%] dir-rtl appearance-none cursor-pointer"
                      dir="rtl"
                    >
                      <option value="Auto">Auto-detect</option>
                      {getAllCategories().map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute right-4 flex items-center">
                       <ChevronDown className="w-4 h-4 text-[#EBEBF5]/30" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4">
                    <label className="text-[17px] text-white">Date</label>
                    <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[60%] [color-scheme:dark]" />
                  </div>
                </div>

                <div className="bg-[#2C2C2E] rounded-[10px] overflow-hidden p-4 mb-6">
                  <label className="text-[13px] font-semibold text-[#EBEBF5]/60 uppercase tracking-wider mb-3 block">Account</label>
                  <div className="flex flex-wrap gap-2">
                    {allSources.map(acc => (
                      <button 
                        key={acc} type="button" onClick={() => setSource(acc)}
                        className={`px-4 py-2 rounded-full text-[15px] font-medium transition-all ${source === acc ? 'bg-[#82F87A] text-black' : 'bg-[#1C1C1E] text-white'}`}
                      >
                        {acc}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="w-full bg-[#82F87A] text-black py-3.5 rounded-[14px] font-semibold text-[17px] shadow-sm">
                  Add Transaction
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN EDIT TRANSACTION MODAL (Bottom Sheet) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-[2px] flex flex-col justify-end animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] w-full max-h-[95vh] rounded-t-[32px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-full duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]">
            {/* Grabber Area for Swipe Down */}
            <div 
              className="w-full pt-4 pb-4 flex flex-col items-center justify-center border-b border-white/10 shrink-0 relative touch-none"
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              onTouchEnd={(e) => handleSheetTouchEnd(e, () => setIsEditModalOpen(false))}
            >
              <div className="w-10 h-1.5 bg-white/20 rounded-full mb-3 shrink-0"></div>
              <h2 className="text-[17px] font-semibold text-white tracking-tight">Edit Transaction</h2>
            </div>

            <div className="overflow-y-auto px-5 py-8">
              <form id="editTransactionForm" onSubmit={updateTransaction}>
                <div className="flex justify-center items-center text-[54px] font-bold text-white mb-8 tracking-tight">
                  <span className="text-[#EBEBF5]/40 mr-1 text-[40px]">₹</span>
                  <input type="text" inputMode="decimal" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="bg-transparent w-[70%] text-center outline-none" autoFocus />
                </div>

                {/* iOS Segmented Control */}
                <div className="bg-[#2C2C2E] p-[3px] rounded-lg flex mb-6">
                  <button type="button" onClick={() => setEditType('expense')} className={`flex-1 py-1.5 text-[14px] font-semibold rounded-[6px] transition-all ${editType === 'expense' ? 'bg-[#636366] text-white shadow-sm' : 'text-[#EBEBF5]/60'}`}>
                    Expense
                  </button>
                  <button type="button" onClick={() => setEditType('income')} className={`flex-1 py-1.5 text-[14px] font-semibold rounded-[6px] transition-all ${editType === 'income' ? 'bg-[#636366] text-white shadow-sm' : 'text-[#EBEBF5]/60'}`}>
                    Income
                  </button>
                </div>

                <div className="bg-[#2C2C2E] rounded-[10px] overflow-hidden mb-6">
                  <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <label className="text-[17px] text-white">Title</label>
                    <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[60%]" />
                  </div>
                  
                  {/* EDIT CATEGORY SELECTOR */}
                  <div className="flex items-center justify-between p-4 border-b border-white/5 relative">
                    <label className="text-[17px] text-white">Category</label>
                    <select 
                      value={editCategory} 
                      onChange={(e) => setEditCategory(e.target.value)} 
                      className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[60%] dir-rtl appearance-none cursor-pointer"
                      dir="rtl"
                    >
                      <option value="Auto">Auto-detect</option>
                      {getAllCategories().map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute right-4 flex items-center">
                       <ChevronDown className="w-4 h-4 text-[#EBEBF5]/30" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4">
                    <label className="text-[17px] text-white">Date</label>
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[60%] [color-scheme:dark]" />
                  </div>
                </div>

                <div className="bg-[#2C2C2E] rounded-[10px] overflow-hidden p-4 mb-6">
                  <label className="text-[13px] font-semibold text-[#EBEBF5]/60 uppercase tracking-wider mb-3 block">Account</label>
                  <div className="flex flex-wrap gap-2">
                    {!allSources.includes(editSource) && (
                      <button type="button" onClick={() => setEditSource(editSource)} className={`px-4 py-2 rounded-full text-[15px] font-medium transition-all ${editSource === editSource ? 'bg-[#82F87A] text-black' : 'bg-[#1C1C1E] text-white'}`}>{editSource}</button>
                    )}
                    {allSources.map(acc => (
                      <button 
                        key={acc} type="button" onClick={() => setEditSource(acc)}
                        className={`px-4 py-2 rounded-full text-[15px] font-medium transition-all ${editSource === acc ? 'bg-[#82F87A] text-black' : 'bg-[#1C1C1E] text-white'}`}
                      >
                        {acc}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="w-full bg-[#82F87A] text-black py-3.5 rounded-[14px] font-semibold text-[17px] shadow-sm">
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Bank Modal (Bottom Sheet) */}
      {isAddBankOpen && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-[2px] flex flex-col justify-end animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] w-full max-h-[90vh] rounded-t-[32px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-full duration-400">
            {/* Grabber Area for Swipe Down */}
            <div 
              className="w-full pt-4 pb-4 flex flex-col items-center justify-center border-b border-white/10 shrink-0 relative touch-none"
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              onTouchEnd={(e) => handleSheetTouchEnd(e, () => setIsAddBankOpen(false))}
            >
              <div className="w-10 h-1.5 bg-white/20 rounded-full mb-3 shrink-0"></div>
              <h2 className="text-[17px] font-semibold text-white tracking-tight">Add Account</h2>
            </div>
            <div className="overflow-y-auto px-5 py-6">
              <form id="addBankForm" onSubmit={handleAddBank}>
                <div className="bg-[#2C2C2E] rounded-[10px] overflow-hidden mb-6">
                  <div className="flex items-center justify-between p-4 border-b border-white/5"><label className="text-[17px] text-white">Bank Name</label><input type="text" placeholder="e.g. HDFC" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[60%]" autoFocus /></div>
                  <div className="flex items-center justify-between p-4"><label className="text-[17px] text-white">Last 4 Digits</label><input type="text" maxLength={4} inputMode="numeric" placeholder="Optional" value={newBankDigits} onChange={(e) => setNewBankDigits(e.target.value.replace(/\D/g,''))} className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[50%]" /></div>
                </div>
                <button type="submit" className="w-full bg-[#82F87A] text-black py-3.5 rounded-[14px] font-semibold text-[17px] shadow-sm">Add Bank</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Card Modal (Bottom Sheet) */}
      {isAddCardOpen && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-[2px] flex flex-col justify-end animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] w-full max-h-[90vh] rounded-t-[32px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-full duration-400">
            {/* Grabber Area for Swipe Down */}
            <div 
              className="w-full pt-4 pb-4 flex flex-col items-center justify-center border-b border-white/10 shrink-0 relative touch-none"
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              onTouchEnd={(e) => handleSheetTouchEnd(e, () => setIsAddCardOpen(false))}
            >
              <div className="w-10 h-1.5 bg-white/20 rounded-full mb-3 shrink-0"></div>
              <h2 className="text-[17px] font-semibold text-white tracking-tight">Add Card</h2>
            </div>
            <div className="overflow-y-auto px-5 py-6">
              <form id="addCardForm" onSubmit={handleAddCard}>
                <div className="bg-[#2C2C2E] p-[3px] rounded-lg flex mb-6"><button type="button" onClick={() => setCardType('credit')} className={`flex-1 py-1.5 text-[14px] font-semibold rounded-[6px] transition-all ${cardType === 'credit' ? 'bg-[#636366] text-white shadow-sm' : 'text-[#EBEBF5]/60'}`}>Credit Card</button><button type="button" onClick={() => setCardType('debit')} className={`flex-1 py-1.5 text-[14px] font-semibold rounded-[6px] transition-all ${cardType === 'debit' ? 'bg-[#636366] text-white shadow-sm' : 'text-[#EBEBF5]/60'}`}>Debit Card</button></div>
                {cardType === 'credit' ? (
                  <div className="bg-[#2C2C2E] rounded-[10px] overflow-hidden mb-6">
                    <div className="flex items-center justify-between p-4 border-b border-white/5"><label className="text-[17px] text-white">Card Label</label><input type="text" placeholder="e.g. Regalia" value={newCardBank} onChange={(e) => setNewCardBank(e.target.value)} className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[60%]" autoFocus={cardType === 'credit'} /></div>
                    <div className="flex items-center justify-between p-4 border-b border-white/5"><label className="text-[17px] text-white">Limit (₹)</label><input type="text" inputMode="decimal" placeholder="0" value={newCardLimit} onChange={(e) => setNewCardLimit(e.target.value.replace(/\D/g, ''))} className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[50%]" /></div>
                    <div className="flex items-center justify-between p-4 border-b border-white/5"><label className="text-[17px] text-white">Due Date</label><select value={newCardDueDate} onChange={(e) => setNewCardDueDate(e.target.value)} className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[50%]" dir="rtl"><option value="">None</option>{Array.from({ length: 31 }, (_, i) => i + 1).map(day => <option key={day} value={day}>{day}th</option>)}</select></div>
                    <div className="flex items-center justify-between p-4 border-b border-white/5"><div className="flex items-center gap-2"><BellRing className="w-5 h-5 text-white" /><span className="text-[17px] text-white">Reminder</span></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={newCardReminder} onChange={(e) => setNewCardReminder(e.target.checked)} /><div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#34C759]"></div></label></div>
                    <div className="flex items-center justify-between p-4"><label className="text-[17px] text-white">Last 4 Digits</label><input type="text" maxLength={4} inputMode="numeric" placeholder="1234" value={newCardDigits} onChange={(e) => setNewCardDigits(e.target.value.replace(/\D/g,''))} className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[50%]" /></div>
                  </div>
                ) : (
                  <div className="bg-[#2C2C2E] rounded-[10px] overflow-hidden mb-6">
                    <div className="flex items-center justify-between p-4 border-b border-white/5"><label className="text-[17px] text-white">Link Bank</label><select value={selectedLinkedBank} onChange={(e) => setSelectedLinkedBank(e.target.value)} className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[60%]" dir="rtl"><option value="" disabled>Select...</option>{banks.filter(b => b !== 'Cash').map((acc: string) => <option key={acc} value={acc}>{acc}</option>)}</select></div>
                    <div className="flex items-center justify-between p-4"><label className="text-[17px] text-white">Last 4 Digits</label><input type="text" maxLength={4} inputMode="numeric" placeholder="1234" value={newCardDigits} onChange={(e) => setNewCardDigits(e.target.value.replace(/\D/g,''))} className="bg-transparent text-right text-[17px] text-[#EBEBF5]/60 outline-none w-[50%]" /></div>
                  </div>
                )}
                <button type="submit" className="w-full bg-[#82F87A] text-black py-3.5 rounded-[14px] font-semibold text-[17px] shadow-sm">{cardType === 'credit' ? 'Add to Wallet' : 'Link Debit Card'}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Security Setup Modal (Bottom Sheet) */}
      {isSecurityModalOpen && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-[2px] flex flex-col justify-end animate-in fade-in duration-300">
          <div className="bg-[#1C1C1E] w-full max-h-[90vh] rounded-t-[32px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-full duration-400">
            {/* Grabber Area for Swipe Down */}
            <div 
              className="w-full pt-4 pb-4 flex flex-col items-center justify-center border-b border-white/10 shrink-0 relative touch-none"
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              onTouchEnd={(e) => handleSheetTouchEnd(e, () => { setIsSecurityModalOpen(false); setSetupStep(0); setTempPin(''); })}
            >
              <div className="w-10 h-1.5 bg-white/20 rounded-full mb-3 shrink-0"></div>
              <h2 className="text-[17px] font-semibold text-white tracking-tight">{setupStep === 3 ? 'Manage Categories' : 'Settings'}</h2>
            </div>
            
            <div className="overflow-y-auto px-5 py-6">
              
              {/* MENU SCREEN */}
              {setupStep === 0 && (
                <div className="space-y-6">
                  <div className="bg-[#2C2C2E] rounded-[10px] overflow-hidden">
                    <button onClick={() => setSetupStep(3)} className="w-full flex items-center justify-between p-4 text-[17px] text-white hover:bg-white/5 transition-colors border-b border-white/5">
                      <div className="flex items-center gap-3"><Tag className="w-5 h-5 text-[#EBEBF5]/80" /> Manage Categories</div>
                      <ChevronLeft className="w-5 h-5 text-[#EBEBF5]/30 rotate-180" />
                    </button>
                    {!appPin ? (
                      <button onClick={() => setSetupStep(1)} className="w-full flex items-center justify-between p-4 text-[17px] text-white hover:bg-white/5 transition-colors"><div className="flex items-center gap-3"><Lock className="w-5 h-5 text-[#EBEBF5]/80" /> Set Passcode</div><ChevronLeft className="w-5 h-5 text-[#EBEBF5]/30 rotate-180" /></button>
                    ) : (
                      <>
                        <button onClick={() => { localStorage.removeItem('mt_pin'); localStorage.removeItem('mt_bio'); setAppPin(null); setBiometricEnabled(false); setIsSecurityModalOpen(false); alert("Passcode disabled."); }} className="w-full flex items-center justify-between p-4 text-[17px] text-[#FF3B30] border-b border-white/5 hover:bg-white/5 transition-colors"><div className="flex items-center gap-3"><Unlock className="w-5 h-5" /> Turn Passcode Off</div></button>
                        {!biometricEnabled && window.PublicKeyCredential && (<button onClick={() => { setupBiometrics(); setIsSecurityModalOpen(false); }} className="w-full flex items-center justify-between p-4 text-[17px] text-white hover:bg-white/5 transition-colors"><div className="flex items-center gap-3"><Fingerprint className="w-5 h-5 text-[#EBEBF5]/80" /> Enable Face ID</div><ChevronLeft className="w-5 h-5 text-[#EBEBF5]/30 rotate-180" /></button>)}
                      </>
                    )}
                  </div>
                  <div className="bg-[#2C2C2E] rounded-[10px] overflow-hidden"><button onClick={handleSignOut} className="w-full flex items-center justify-center p-4 text-[17px] font-semibold text-[#FF3B30] hover:bg-white/5 transition-colors">Log Out</button></div>
                </div>
              )}

              {/* PIN SETUP SCREEN */}
              {(setupStep === 1 || setupStep === 2) && (
                <div className="flex flex-col items-center pt-4">
                  <p className="text-[#EBEBF5] mb-6 text-[17px] font-medium tracking-tight">{setupStep === 1 ? 'Enter a passcode' : 'Confirm passcode'}</p>
                  <div className="flex gap-4 mb-4">{[0, 1, 2, 3].map(i => (<div key={i} className={`w-3.5 h-3.5 rounded-full transition-colors duration-200 ${tempPin.length > i ? 'bg-[#82F87A]' : 'bg-[#2C2C2E]'}`} />))}</div>
                  <div className="grid grid-cols-3 gap-4 w-full max-w-[280px] mx-auto mt-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (<button key={n} onClick={() => handleSetupPinPress(n.toString())} className="h-16 rounded-full bg-[#2C2C2E] text-[28px] font-normal text-white hover:bg-[#3A3A3C] active:scale-95 transition-all">{n}</button>))}
                    <div></div>
                    <button onClick={() => handleSetupPinPress('0')} className="h-16 rounded-full bg-[#2C2C2E] text-[28px] font-normal text-white hover:bg-[#3A3A3C] active:scale-95 transition-all">0</button>
                    <button onClick={() => setTempPin(prev => prev.slice(0, -1))} className="h-16 rounded-full flex items-center justify-center text-[#EBEBF5]/60 hover:text-[#FF3B30] active:scale-95 transition-all"><Delete className="w-8 h-8" /></button>
                  </div>
                </div>
              )}

              {/* CATEGORY MANAGER SCREEN */}
              {setupStep === 3 && (
                <div>
                  <button onClick={() => setSetupStep(0)} className="mb-6 flex items-center gap-1.5 text-[#34C759] font-medium text-[15px]"><ChevronLeft className="w-4 h-4" /> Back to Settings</button>
                  
                  <div className="bg-[#2C2C2E] rounded-[10px] overflow-hidden mb-8">
                    {customCategories.length === 0 ? (
                      <div className="p-4 text-center text-[#EBEBF5]/60 text-[15px]">No custom categories added.</div>
                    ) : (
                      customCategories.map((cat, idx) => (
                        <div key={idx} className={`flex items-center justify-between p-4 ${idx !== customCategories.length - 1 ? 'border-b border-white/5' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: cat.color }}>
                              {getIconComponent(cat.name)}
                            </div>
                            <span className="text-[17px] text-white">{cat.name}</span>
                          </div>
                          <button onClick={() => handleDeleteCustomCategory(cat.name)} className="text-[#FF3B30] hover:opacity-80 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))
                    )}
                  </div>

                  <h3 className="text-[#EBEBF5]/60 text-[13px] uppercase tracking-wider font-semibold mb-3">Add New Category</h3>
                  <form onSubmit={handleAddCustomCategory}>
                    <div className="bg-[#2C2C2E] rounded-[10px] overflow-hidden mb-6">
                      <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <label className="text-[17px] text-white shrink-0 w-24">Name</label>
                        <input type="text" placeholder="e.g. Health" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="bg-transparent text-right text-[17px] text-white outline-none flex-1" required />
                      </div>
                      <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <label className="text-[17px] text-white shrink-0 w-24 flex items-center gap-2"><Palette className="w-5 h-5 text-[#EBEBF5]/80" /> Color</label>
                        <input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} className="w-10 h-10 rounded-full border-none outline-none bg-transparent cursor-pointer" />
                      </div>
                      <div className="p-4">
                        <label className="text-[17px] text-white mb-3 block">Select Icon</label>
                        <div className="flex gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                          {['Tag', 'Heart', 'Zap', 'Briefcase', 'Coffee', 'Car', 'Film', 'Home'].map(iconName => {
                             const IconComp = ICON_MAP[iconName];
                             const isSelected = newCatIcon === iconName;
                             return (
                               <button type="button" key={iconName} onClick={() => setNewCatIcon(iconName)} className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-[#34C759] text-black' : 'bg-[#1C1C1E] text-white hover:bg-white/10'}`}>
                                 <IconComp className="w-5 h-5" />
                               </button>
                             );
                          })}
                        </div>
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-[#82F87A] text-black py-3.5 rounded-[14px] font-semibold text-[17px] shadow-sm">
                      Create Category
                    </button>
                  </form>

                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}