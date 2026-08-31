'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Download, 
  ShoppingBag, Coffee, Film, 
  Trash2, X, RefreshCw, Edit3, ChevronDown, PlusCircle,
  Building, CreditCard, User, Upload, CheckSquare, Check,
  BellRing, Calendar, AlertCircle, Lock, Unlock, Fingerprint, Delete,
  Home, PieChart, TrendingUp, TrendingDown, ChevronLeft, ArrowUpRight, ArrowDownRight, MoreHorizontal, Settings,
  Mail, Eye, EyeOff, Coins, LogOut
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// No-store cache to prevent ghost entries
const supabase = createClient(
  'https://bogwtbvmvzgbodlybgow.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    global: { 
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) 
    }
  }
);

interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  source: string;
  type: 'expense' | 'income';
  created_at?: string;
  user_id?: string;
}

interface CardMetadata {
  limit?: number;
  dueDate?: number;
  reminder?: boolean;
  linkedBank?: string;
}

const generateUUID = () => {
  try { return crypto.randomUUID(); } catch(e) {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
      });
  }
};

export default function App() {
  // --- AUTH STATES ---
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSubmitLoading, setAuthSubmitLoading] = useState(false);

  // --- APP STATES ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [activeWalletIdx, setActiveWalletIdx] = useState(0);
  
  const [isAddBankOpen, setIsAddBankOpen] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  
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

  const [banks, setBanks] = useState<string[]>(['UPI / GPay', 'Cash']);
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
  
  // --- OFFLINE STATES ---
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // --- WIDGET STATES ---
  const [cashFlowView, setCashFlowView] = useState<'Week' | 'Month' | 'Year'>('Month');
  const [activeChartTooltip, setActiveChartTooltip] = useState<number | null>(null);
  const [isCashFlowDropdownOpen, setIsCashFlowDropdownOpen] = useState(false);

  // --- SECURITY STATES ---
  const [isLocked, setIsLocked] = useState(false);
  const [appPin, setAppPin] = useState<string | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<0 | 1 | 2>(0); 
  const [tempPin, setTempPin] = useState('');
  const [newPinToConfirm, setNewPinToConfirm] = useState('');

  const statementInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('UPI / GPay');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editSource, setEditSource] = useState('UPI / GPay'); 
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<'expense' | 'income'>('expense');

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
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the confirmation link! (Or run the SQL command to bypass)');
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setTransactions([]);
    setBanks(['UPI / GPay', 'Cash']);
    setCards([]);
    setCardMeta({});
    setIsSecurityModalOpen(false);
  };

  const allSources = Array.from(new Set([...banks, ...cards]));

  const cleanSource = (rawSource: string) => {
    if (!rawSource) return 'UPI / GPay';
    const main = rawSource.includes('->') ? rawSource.split('->')[0] : rawSource;
    return main.split('|')[0].trim();
  };

  const getAccountBalance = (accName: string) => {
    const accTxs = transactions.filter((t: Transaction) => t.source === accName);
    const inc = accTxs.filter((t: Transaction) => t.type === 'income').reduce((a: number, b: Transaction) => a + b.amount, 0);
    const exp = accTxs.filter((t: Transaction) => t.type === 'expense').reduce((a: number, b: Transaction) => a + b.amount, 0);
    return inc - exp;
  };

  const processAccountsData = (data: any[]) => {
    let fetchedBanks: string[] = ['UPI / GPay', 'Cash'];
    let fetchedCards: string[] = [];
    const metadataMap: Record<string, CardMetadata> = {};

    const dbBanks = data.filter((a: any) => a.type === 'bank').map((a: any) => a.name);
    
    data.filter((a: any) => a.type === 'card').forEach((a: any) => {
      const rawName: string = a.name;
      let linkedBankStr = '';
      if (rawName.includes('->')) {
         linkedBankStr = rawName.split('->')[1].trim();
      }
      
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
    if (!navigator.onLine || !session) return;
    
    setIsRefreshing(true);
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));
      const fetchTask = Promise.all([
        supabase.from('transactions').select('*'),
        supabase.from('accounts').select('*')
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

    if (localTxs) {
      const cleanedLocal = JSON.parse(localTxs).map((tx: any) => ({ ...tx, source: cleanSource(tx.source) }));
      setTransactions(cleanedLocal);
    }
    
    if (localAccs) processAccountsData(JSON.parse(localAccs));
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
  }, [session]); // Add session to dependency so it refetches on login

  // AUTO REFRESH EVERY 10 SECONDS
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine && session) {
        fetchData();
      }
    }, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [session]);

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

  const openEditCardSettings = (cardName: string) => {
    const meta = cardMeta[cardName] || {};
    setEditCardName(cardName);
    setEditCardLimitInput(meta.limit ? meta.limit.toString() : '');
    setEditCardDueDateInput(meta.dueDate ? meta.dueDate.toString() : '');
    setEditCardReminderInput(!!meta.reminder);
    setIsEditCardModalOpen(true);
    setIsWalletOpen(false);
  };

  const handleUpdateCardSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLimit = parseFloat(editCardLimitInput) || 0;
    const cleanDue = parseInt(editCardDueDateInput) || 0;

    // Reconstruct the exact database string format
    const newDbName = `${editCardName}|${cleanLimit}|${cleanDue}|${editCardReminderInput}`;

    // Update local React state instantly
    setCardMeta(prev => ({
      ...prev,
      [editCardName]: { ...prev[editCardName], limit: cleanLimit, dueDate: cleanDue, reminder: editCardReminderInput }
    }));

    // Find and update the record in Supabase / LocalStorage
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
    alert('Card settings updated successfully!');
  };

  const addTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !title) return;
    
    const jsDate = new Date(txDate);
    const formattedDate = !isNaN(jsDate.getTime()) ? jsDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : txDate;
    
    const newTx = { 
      id: generateUUID(), 
      title: title.trim(), 
      amount: parseFloat(amount), 
      date: formattedDate, 
      source: cleanSource(source), 
      type: txType, 
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
    
    setTitle(''); setAmount(''); setTxType('expense'); setTxDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(false);
  };

  const deleteTransaction = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this record?')) return;
    
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

  const updateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editAmount || !editTitle || !editDate) return;
    
    const formattedDate = new Date(editDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const updatePayload = { 
      title: editTitle.trim(), 
      amount: parseFloat(editAmount), 
      source: cleanSource(editSource), 
      type: editType, 
      date: formattedDate 
    };

    const updatedTxs = transactions.map(t => t.id === editingId ? { ...t, ...updatePayload } : t);
    setTransactions(updatedTxs);
    localStorage.setItem('mt_txs', JSON.stringify(updatedTxs));

    if (isOnline) {
      await supabase.from('transactions').update(updatePayload).eq('id', editingId);
      fetchData();
    } else {
      addToQueue({ action: 'UPDATE', table: 'transactions', payload: updatePayload, id: editingId });
    }
    
    setIsEditModalOpen(false); setEditingId(null);
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleDeleteBank = async (e: React.MouseEvent, accToDelete: string) => {
    e.stopPropagation();
    if (accToDelete === 'UPI / GPay' || accToDelete === 'Cash') return alert('Default accounts cannot be deleted.');
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

  const handleDeleteCard = async (e: React.MouseEvent, cardToDelete: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${cardToDelete}"?`)) return;
    
    setCards(prev => prev.filter((c: string) => c !== cardToDelete));
    setSwipedCard(null); 
    if (filter === cardToDelete) setFilter('All');
    
    // reset wheel index if we deleted the last card
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
    
    if (swipeDistance > 35) {
      setSwipedTxId(txId); 
    } else if (swipeDistance < -35) {
      setSwipedTxId(null);
    }
    setTimeout(() => setIsSwiping(false), 50);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    e.currentTarget.scrollLeft;
  };

  const downloadReport = () => {
    if (transactions.length === 0) return alert("No data!");
    const csvContent = [['Date', 'Description', 'Amount', 'Type', 'Account'].join(','), ...transactions.map((t: Transaction) => `"${t.date}","${t.title}",${t.amount},${t.type},${t.source}`)].join('\n');
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

  // --- SMART CATEGORY LOGIC ---
  const getCategory = (title: string) => {
    const t = title.toLowerCase();
    if (t.match(/rent|housing|electricity|water|bill/)) return 'Housing';
    if (t.match(/zomato|blinkit|zepto|grocery|swiggy|food|coffee/)) return 'Food';
    if (t.match(/netflix|spotify|prime|subscription|internet|wifi/)) return 'Subscriptions';
    if (t.match(/uber|ola|petrol|fuel|transport|flight|train/)) return 'Transport';
    return 'Others';
  };

  const catColors: Record<string, string> = { 
    Housing: '#F95D2A', 
    Food: '#4A72FF', 
    Subscriptions: '#7E5BFF', 
    Transport: '#4B5563', 
    Others: '#9CA3AF' 
  };

  const getIcon = (itemTitle: string) => {
    const cat = getCategory(itemTitle);
    if (cat === 'Subscriptions') return <Film className="w-5 h-5 text-gray-300" />;
    if (cat === 'Food' || cat === 'Housing') return <ShoppingBag className="w-5 h-5 text-gray-300" />;
    return <Coffee className="w-5 h-5 text-gray-300" />;
  };

  // --- DYNAMIC DATA CALCULATIONS (WITH CREDIT LIMIT LOGIC) ---
  const filtered = transactions.filter((t: Transaction) => (filter === 'All' || t.source === filter) && t.title.toLowerCase().includes(searchQuery.toLowerCase()));
  
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
    const c = getCategory(curr.title);
    acc[c] = (acc[c] || 0) + curr.amount;
    return acc;
  }, {});

  const catArray = Object.keys(catTotals).map(k => ({ name: k, amount: catTotals[k] })).sort((a, b) => b.amount - a.amount);
  const renderDonutChart = () => {
    if (totalSpend === 0) return <div className="w-28 h-28 rounded-full border-8 border-[#1E2B1F] flex items-center justify-center"><p className="text-[10px] text-gray-500">No Data</p></div>;
    
    let cumulativeOffset = 0;
    const radius = 42;
    const circum = 2 * Math.PI * radius;

    return (
      <div className="relative w-28 h-28 shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {catArray.map((cat, i) => {
            const ratio = cat.amount / totalSpend;
            const dashLength = ratio * circum;
            const gap = dashLength > 3 ? 4 : 0; 
            const offset = cumulativeOffset;
            cumulativeOffset += dashLength;

            return (
              <circle
                key={cat.name} cx="50" cy="50" r={radius} fill="transparent"
                stroke={catColors[cat.name]} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${Math.max(0, dashLength - gap)} ${circum}`} strokeDashoffset={-offset}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] text-gray-400 font-medium">Spent</p>
          <p className="text-[13px] font-bold text-white leading-tight">₹{totalSpend > 9999 ? (totalSpend/1000).toFixed(1)+'k' : totalSpend.toFixed(0)}</p>
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
            <div key={v} className="w-full border-t border-[#1E2B1F] border-dashed h-0 flex items-center">
              <span className="text-[9px] text-gray-600 -translate-y-2 absolute right-0 bg-[#101A12] pl-1">
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
                <div className={`absolute -top-24 ${tooltipPos} bg-[#1A241C] border border-[#2A3B2D] rounded-xl p-3 shadow-2xl w-36 animate-in fade-in zoom-in-95`}>
                  <p className="text-[10px] text-gray-300 font-bold mb-2">{b.label} • {cashFlowView}</p>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-[#F95D2A] flex items-center gap-1"><div className="w-1 h-2 bg-[#F95D2A] rounded-full"></div> Income</span>
                    <span className="text-[11px] font-mono">₹{b.inc.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-[#7E5BFF] flex items-center gap-1"><div className="w-1 h-2 bg-[#7E5BFF] rounded-full"></div> Expense</span>
                    <span className="text-[11px] font-mono">₹{b.exp.toFixed(0)}</span>
                  </div>
                  <div className="border-t border-[#2A3B2D] pt-1.5 flex justify-between items-center">
                    <span className="text-[10px] text-gray-400">Net</span>
                    <span className={`text-[11px] font-bold ${b.inc - b.exp >= 0 ? 'text-[#82F87A]' : 'text-red-400'}`}>{b.inc - b.exp >= 0 ? '+' : ''}₹{(b.inc - b.exp).toFixed(0)}</span>
                  </div>
                </div>
              )}

              <div className="flex items-end gap-1.5 h-[120px]">
                <div className={`w-3.5 rounded-t-sm transition-all duration-500 ${isActive ? 'bg-[#F95D2A] shadow-[0_0_10px_rgba(249,93,42,0.6)] opacity-100' : 'bg-gradient-to-t from-[#F95D2A]/30 to-[#F95D2A]/80 opacity-60'}`} style={{ height: `${incH}px` }}></div>
                <div className={`w-3.5 rounded-t-sm transition-all duration-500 ${isActive ? 'bg-[#7E5BFF] shadow-[0_0_10px_rgba(126,91,255,0.6)] opacity-100' : 'bg-gradient-to-t from-[#7E5BFF]/30 to-[#7E5BFF]/80 opacity-60'}`} style={{ height: `${expH}px` }}></div>
              </div>
              <span className="text-[10px] text-gray-500 font-medium">{b.label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const cardGradients = [
    'bg-gradient-to-br from-purple-500/60 to-indigo-900/70',
    'bg-gradient-to-br from-emerald-500/60 to-teal-800/70',
    'bg-gradient-to-br from-blue-500/60 to-cyan-800/70',
    'bg-gradient-to-br from-orange-500/60 to-red-800/70',
    'bg-gradient-to-br from-gray-500/60 to-gray-800/70',
    'bg-gradient-to-br from-[#82F87A]/50 to-emerald-700/70',
  ];

  const NumPad = ({ onKeyPress, onDel, showBio, onBio }: any) => (
    <div className="grid grid-cols-3 gap-4 w-full max-w-[280px] mx-auto mt-6">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
        <button key={n} onClick={() => onKeyPress(n.toString())} className="h-16 rounded-full bg-[#1A241C] border border-[#223024] text-2xl font-bold text-white hover:bg-[#2A3B2D] active:scale-95 transition-all">{n}</button>
      ))}
      <button onClick={onBio} className="h-16 rounded-full flex items-center justify-center text-gray-400 hover:text-[#82F87A] active:scale-95 transition-all">
        {showBio ? <Fingerprint className="w-8 h-8" /> : null}
      </button>
      <button onClick={() => onKeyPress('0')} className="h-16 rounded-full bg-[#1A241C] border border-[#223024] text-2xl font-bold text-white hover:bg-[#2A3B2D] active:scale-95 transition-all">0</button>
      <button onClick={onDel} className="h-16 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 active:scale-95 transition-all">
        <Delete className="w-8 h-8" />
      </button>
    </div>
  );

  // --- RENDER SCREENS ---

  if (isAuthLoading) {
    return <div className="min-h-screen bg-[#070D08] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#82F87A] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  // 1. AUTH SCREEN
  if (!session) {
    return (
      <div className="min-h-[100dvh] bg-[#070D08] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-white">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#82F87A] opacity-[0.15] blur-[150px] rounded-full pointer-events-none"></div>

        <div className="relative w-full max-w-sm flex items-center justify-center h-40 mb-4 z-10">
          <div className="absolute left-4 w-16 h-16 bg-[#132014] rounded-2xl flex items-center justify-center -rotate-12 border border-[#82F87A]/20 shadow-[0_0_30px_rgba(130,248,122,0.1)]">
            <PieChart className="w-8 h-8 text-[#82F87A] opacity-80" />
          </div>
          <div className="absolute z-20 w-28 h-28 bg-gradient-to-b from-[#1E3820] to-[#0A120B] rounded-[2rem] flex items-center justify-center border border-[#82F87A]/30 shadow-[0_0_60px_rgba(130,248,122,0.25)] backdrop-blur-xl">
            <CreditCard className="w-12 h-12 text-[#82F87A] fill-[#82F87A]" />
          </div>
          <div className="absolute right-4 w-16 h-16 bg-[#132014] rounded-2xl flex items-center justify-center rotate-12 border border-[#82F87A]/20 shadow-[0_0_30px_rgba(130,248,122,0.1)]">
            <Coins className="w-8 h-8 text-[#82F87A] opacity-80" />
          </div>
        </div>

        <div className="text-center z-10 mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Spendly</h1>
          <p className="text-gray-400 text-[15px] font-medium tracking-wide">Smart money, smarter life</p>
        </div>

        <div className="w-full max-w-sm bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] p-6 rounded-[2rem] z-10 shadow-2xl">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="w-5 h-5 text-gray-500" />
              </div>
              <input 
                type="email" placeholder="Alex@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-black/40 border border-white/10 text-white rounded-[1rem] py-4 pl-12 pr-4 outline-none focus:border-[#82F87A]/50 transition-colors placeholder-gray-600 font-medium"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="w-5 h-5 text-gray-500" />
              </div>
              <input 
                type={showPassword ? "text" : "password"} placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full bg-black/40 border border-white/10 text-white rounded-[1rem] py-4 pl-12 pr-12 outline-none focus:border-[#82F87A]/50 transition-colors placeholder-gray-600 font-medium"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors">
                {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>

            {authError && <p className="text-red-400 text-xs text-center font-medium">{authError}</p>}

            {authMode === 'signin' && (
              <div className="text-right">
                <button type="button" className="text-[#82F87A] text-sm font-bold hover:underline">Forgot password?</button>
              </div>
            )}

            <button type="submit" disabled={authSubmitLoading} className="w-full bg-[#82F87A] text-black py-4 rounded-[1rem] font-bold text-[15px] hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(130,248,122,0.25)] disabled:opacity-50">
              {authSubmitLoading ? 'Loading...' : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-white/10"></div>
            <span className="text-xs text-gray-500 font-medium tracking-wide">or continue with</span>
            <div className="h-px flex-1 bg-white/10"></div>
          </div>

          {/* Google Auth Button */}
          <button 
            type="button"
            onClick={async () => {
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: `${window.location.origin}/`, 
                }
              });
              if (error) setAuthError(error.message);
            }}
            className="w-full bg-black/40 border border-white/10 text-white py-4 rounded-[1rem] font-bold text-[15px] hover:bg-black/60 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
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

        <div className="mt-8 z-10 text-sm font-medium text-gray-400">
          {authMode === 'signin' ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(''); }} className="text-[#82F87A] font-bold hover:underline">
            {authMode === 'signin' ? 'Sign up free' : 'Sign In'}
          </button>
        </div>
      </div>
    );
  }

  // 2. LOCK SCREEN
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#070D08] text-white flex flex-col items-center justify-center px-6 animate-in fade-in duration-300 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#82F87A] opacity-20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="mb-8 flex flex-col items-center z-10">
          <Lock className="w-12 h-12 text-[#82F87A] mb-4" />
          <h2 className="text-xl font-bold">App Locked</h2>
          <p className="text-gray-400 text-sm mt-2">Enter PIN to access your wallet</p>
        </div>
        <div className="flex gap-4 mb-8 z-10">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full transition-colors duration-200 ${enteredPin.length > i ? 'bg-[#82F87A]' : 'bg-[#1A241C]'}`} />
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
    <div className="w-full max-w-md md:max-w-[95%] xl:max-w-[1600px] mx-auto min-h-[100dvh] bg-[#070D08] text-white flex flex-col relative font-sans select-none overflow-x-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#82F87A] opacity-15 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#82F87A] opacity-10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pt-12 pb-28 px-5 z-10">
        
        {/* Header Section */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-gray-400 text-sm">{getGreeting()} 👋</p>
            <h1 className="text-2xl font-bold mt-1 text-white">{session?.user?.email?.split('@')[0] || 'User'}</h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button onClick={() => setIsSecurityModalOpen(true)} className="w-10 h-10 rounded-full bg-[#131B14] border border-[#1E2B1F] flex items-center justify-center overflow-hidden hover:border-[#82F87A]/50 transition-all">
               <Settings className="w-5 h-5 text-gray-300" />
            </button>
            <div className="flex gap-2">
              {!isOnline && <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full"><AlertCircle className="w-3 h-3" /> Offline</span>}
              {pendingSyncCount > 0 && <span className="flex items-center gap-1 text-[10px] font-bold text-[#82F87A] bg-[#82F87A]/10 px-2 py-0.5 rounded-full"><RefreshCw className="w-3 h-3 animate-spin" /> {pendingSyncCount}</span>}
            </div>
          </div>
        </div>

        {/* SWIPEABLE WIDGETS SECTION */}
        <div className="z-10 relative -mx-5 px-5 mb-8">
          <div onScroll={handleScroll} className="flex md:grid md:grid-cols-2 lg:grid-cols-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none gap-4 pb-4 md:pb-0 [&::-webkit-scrollbar]:hidden" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            
            {/* WIDGET 1: Balance Card */}
            <div className="min-w-full md:min-w-0 snap-center bg-gradient-to-br from-[#A2F896] to-[#60E85D] rounded-[32px] p-6 text-black shadow-[0_10px_40px_rgba(130,248,122,0.15)] relative overflow-hidden flex flex-col justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">{isCreditCardFilter ? 'Available Limit' : isDebitCardFilter ? 'Linked Bank Balance' : 'Total Balance'} ({filter})</p>
                <h2 className="text-4xl font-extrabold tracking-tight mt-1 mb-6">₹{displayNetBalance.toFixed(2)}</h2>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 bg-[#121A13] text-white rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-[#1A241C] flex items-center justify-center text-[#82F87A]"><TrendingDown className="w-4 h-4" /></div>
                  <div><p className="text-[10px] text-gray-400 font-medium">{leftStatLabel}</p><p className="text-sm font-bold tracking-wide">₹{displayTotalIncome.toFixed(0)}</p></div>
                </div>
                <div className="flex-1 bg-[#121A13] text-white rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-[#1A241C] flex items-center justify-center text-red-400"><TrendingUp className="w-4 h-4" /></div>
                  <div><p className="text-[10px] text-gray-400 font-medium">{rightStatLabel}</p><p className="text-sm font-bold tracking-wide">₹{displayTotalSpend.toFixed(0)}</p></div>
                </div>
              </div>
            </div>

            {/* WIDGET 2: Spending by Category (Donut Chart) */}
            <div className="min-w-full md:min-w-0 snap-center bg-[#101A12] border border-[#1E2B1F] rounded-[32px] p-6 relative overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[15px] font-bold text-gray-200">Spending by category</h3>
                <ArrowUpRight className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex items-center gap-6 mt-2">
                {renderDonutChart()}
                <div className="flex-1 space-y-3">
                  {catArray.slice(0, 4).map(cat => (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColors[cat.name] }}></div>
                        <span className="text-[11px] text-gray-300 font-medium">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-gray-200">₹{cat.amount.toFixed(0)}</span>
                        <span className="text-[10px] text-gray-500 w-6 text-right">{(cat.amount/totalSpend*100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* WIDGET 3: Cash Flow (Bar Chart) - Fixed Dynamic Z-Index */}
            <div className="min-w-full md:min-w-0 snap-center bg-[#101A12] border border-[#1E2B1F] rounded-[32px] p-6 relative flex flex-col" onClick={() => isCashFlowDropdownOpen && setIsCashFlowDropdownOpen(false)}>
              {/* Dynamic z-index for header so it drops behind tooltips but stays above chart normally */}
              <div className={`flex justify-between items-start mb-2 relative ${isCashFlowDropdownOpen ? 'z-50' : 'z-20'}`}>
                <div>
                  <h3 className="text-[15px] font-bold text-gray-200 mb-1">Cash flow</h3>
                  <div className="flex gap-4">
                    <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-[#F95D2A]" /> Income</span>
                    <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1"><ArrowDownRight className="w-3 h-3 text-[#7E5BFF]" /> Expenses</span>
                  </div>
                </div>
                
                <div className="relative">
                  <button onClick={(e) => { e.stopPropagation(); setIsCashFlowDropdownOpen(!isCashFlowDropdownOpen); }} className="flex items-center gap-1.5 bg-[#1A241C] border border-[#2A3B2D] px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-300 hover:text-white transition-colors">
                    <Calendar className="w-3 h-3" /> {cashFlowView} <ChevronDown className="w-3 h-3" />
                  </button>
                  {isCashFlowDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-[#1A241C] border border-[#2A3B2D] rounded-lg shadow-xl overflow-hidden w-24 z-50">
                      {['Week', 'Month', 'Year'].map(v => (
                        <div key={v} onClick={() => { setCashFlowView(v as any); setIsCashFlowDropdownOpen(false); setActiveChartTooltip(null); }} className="px-3 py-2 text-[11px] text-gray-300 hover:bg-[#2A3B2D] hover:text-white cursor-pointer">
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
            <div className="min-w-full md:min-w-0 snap-center bg-[#101A12] border border-[#1E2B1F] rounded-[32px] p-6 shadow-sm flex flex-col justify-center">
              <div className="flex justify-between items-center mb-1"><p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{isCreditCardFilter ? 'Available Limit' : isDebitCardFilter ? 'Linked Bank Balance' : 'Net Cash Flow'} • {isCreditCardFilter || isDebitCardFilter ? filter : currentMonthYear.split(' ')[0]}</p></div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white mb-4 mt-2">₹{w4NetVal.toFixed(2)}</h1>
              <div className="flex gap-3">
                <div className="flex-1 bg-[#131D15] rounded-xl p-3 border border-[#1E2B1F]"><p className="text-[10px] text-gray-500 font-bold mb-0.5 uppercase">{isCreditCardFilter ? 'Total Limit' : 'In'}</p><p className="text-sm font-bold text-[#82F87A]">₹{w4LeftVal.toFixed(0)}</p></div>
                <div className="flex-1 bg-[#131D15] rounded-xl p-3 border border-[#1E2B1F]"><p className="text-[10px] text-gray-500 font-bold mb-0.5 uppercase">{isCreditCardFilter ? 'Outstanding' : 'Out'}</p><p className="text-sm font-bold text-red-400">₹{w4RightVal.toFixed(0)}</p></div>
              </div>
            </div>

          </div>
          <div className="flex justify-center gap-1.5 mt-2 md:hidden">
            {[0, 1, 2, 3].map((index: number) => (<div key={index} className={`h-1.5 rounded-full transition-all duration-300 w-1.5 bg-[#1E2B1F]`} />))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#101A12] border border-[#1E2B1F] text-white rounded-2xl py-3 pl-11 pr-4 outline-none focus:border-[#82F87A]/50 transition-colors placeholder-gray-600"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Transactions Header & Filter Pills */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Transactions</h3>
            <div className="flex items-center gap-4">
              {isSelectMode && selectedTxs.length > 0 && (
                <button onClick={deleteSelectedTransactions} className="text-red-400 text-sm font-bold flex items-center gap-1 hover:opacity-80 transition-opacity animate-in fade-in">
                  <Trash2 className="w-4 h-4" /> Delete ({selectedTxs.length})
                </button>
              )}
              <button onClick={() => { setIsSelectMode(!isSelectMode); setSelectedTxs([]); setSwipedTxId(null); }} className="text-[#82F87A] text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity">
                {isSelectMode ? 'Cancel' : 'Select'} <ChevronDown className={`w-4 h-4 transition-transform ${isSelectMode ? 'rotate-180' : '-rotate-90'}`} />
              </button>
            </div>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            <button 
              onClick={() => setFilter('All')} 
              className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${filter === 'All' ? 'bg-[#82F87A] text-black shadow-lg shadow-[#82F87A]/20' : 'bg-[#121A13] text-gray-300 border border-[#1E2B1F] hover:border-[#82F87A]/30'}`}
            >
              All
            </button>
            {allSources.map(acc => (
              <button 
                key={acc}
                onClick={() => setFilter(acc)} 
                className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 ${filter === acc ? 'bg-[#82F87A] text-black shadow-lg shadow-[#82F87A]/20' : 'bg-[#121A13] text-gray-300 border border-[#1E2B1F] hover:border-[#82F87A]/30'}`}
              >
                {acc}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex-1 -mx-5 bg-gradient-to-b from-[#0F1A11] to-[#070D08] rounded-t-[40px] border-t border-[#1E2E21] shadow-[0_-10px_40px_rgba(130,248,122,0.03)] pt-6 px-5 relative">
          <div className="w-12 h-1 bg-[#1E2E21] rounded-full mx-auto mb-6"></div>
          
          <div className="space-y-4 relative z-10 pb-10">
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">No transactions found.</div>
            ) : (
              filtered.map((item: Transaction) => {
                const isSwiped = swipedTxId === item.id;
                const isSelected = selectedTxs.includes(item.id);

                return (
                  <div key={item.id} className="relative w-full h-[76px] overflow-hidden rounded-2xl">
                    <button 
                      onClick={(e) => deleteTransaction(e, item.id)}
                      className="absolute right-0 top-0 bottom-0 w-24 bg-red-500 text-white flex flex-col items-center justify-center text-[10px] font-bold z-0 hover:bg-red-600 rounded-2xl"
                    >
                      <Trash2 className="w-5 h-5 mb-1" />
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
                      className={`absolute inset-0 bg-[#131D15] border transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] flex items-center justify-between p-4 cursor-pointer z-10 touch-pan-y rounded-2xl
                        ${isSwiped ? '-translate-x-24' : 'translate-x-0'} 
                        ${isSelected ? 'border-[#82F87A] bg-[#1a2e1c]' : 'border-[#1E2B1F] hover:border-[#82F87A]/40'}`
                      }
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {isSelectMode ? (
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[#82F87A] border-[#82F87A]' : 'border-gray-500'}`}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 bg-[#1A241C] border border-[#223024]">
                            {getIcon(item.title)}
                          </div>
                        )}

                        <div className="min-w-0 flex-1 pr-2">
                          <h3 className="text-[15px] font-bold text-gray-100 flex items-center gap-1.5 truncate">
                            <span className="truncate block">{item.title}</span>
                          </h3>
                          <p className="text-[11px] text-gray-500 truncate mt-0.5 font-medium">{item.source} • {item.date}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center shrink-0 pl-2">
                        <span className={`text-[15px] font-bold tracking-wide ${item.type === 'income' ? 'text-[#82F87A]' : 'text-red-400'}`}>
                          {item.type === 'income' ? '+₹' : '-₹'}{item.amount.toFixed(2)}
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

      {/* Modern Bottom Navigation */}
      <div className="fixed bottom-6 left-5 right-5 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md flex justify-between items-center z-40 pointer-events-none">
        <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full py-3.5 px-6 flex justify-around mr-4 pointer-events-auto shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <button onClick={() => setFilter('All')} className="text-[#82F87A] hover:opacity-80 transition-opacity">
            <Home className="w-[22px] h-[22px] fill-[#82F87A]/20" />
          </button>
          <button onClick={() => setIsWalletOpen(true)} className="text-gray-400 hover:text-[#82F87A] transition-colors">
            <CreditCard className="w-[22px] h-[22px]" />
          </button>
          <button onClick={downloadReport} className="text-gray-400 hover:text-[#82F87A] transition-colors">
            <Download className="w-[22px] h-[22px]" />
          </button>
          <div className="relative flex items-center justify-center">
            <input type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" ref={statementInputRef} onChange={handleStatementUpload} title="Upload CSV" />
            <Upload className="w-[22px] h-[22px] text-gray-400 hover:text-[#82F87A] transition-colors" />
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="w-14 h-14 bg-[#82F87A] text-black rounded-full shadow-[0_4px_25px_rgba(130,248,122,0.4)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all pointer-events-auto shrink-0"
        >
          <Plus className="w-[26px] h-[26px] stroke-[2.5]" />
        </button>
      </div>

      {/* WALLET STACK UI - WHEEL EFFECT */}
      {isWalletOpen && (
        <div className="fixed inset-0 z-[60] bg-[#070D08]/95 backdrop-blur-2xl flex flex-col pt-16 px-5 pb-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-8 shrink-0">
            <div>
              <h2 className="text-2xl font-bold text-white">Your Cards</h2>
              <p className="text-gray-400 text-sm">Swipe or tap to browse</p>
            </div>
            <div className="flex gap-3">
              <button onClick={(e) => { e.stopPropagation(); setIsWalletOpen(false); setIsAddCardOpen(true); }} className="w-10 h-10 bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center text-[#82F87A] border border-white/10 hover:bg-white/10 transition-colors">
                <Plus className="w-5 h-5" />
              </button>
              <button onClick={() => { setIsWalletOpen(false); setActiveWalletIdx(0); }} className="w-10 h-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative flex-1 w-full max-w-md mx-auto flex flex-col">
            {/* The Wheel Container */}
            <div 
              className="relative h-[240px] w-full shrink-0"
              onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientY)}
              onTouchEnd={(e) => {
                const touchEnd = e.changedTouches[0].clientY;
                const diff = touchStart - touchEnd;
                // Lowered threshold to 20px for highly responsive swiping
                if (diff > 20 && activeWalletIdx < cards.length - 1) setActiveWalletIdx(prev => prev + 1); 
                else if (diff < -20 && activeWalletIdx > 0) setActiveWalletIdx(prev => prev - 1); 
              }}
            >
              {cards.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50 text-center">
                  <CreditCard className="w-16 h-16 text-gray-600 mb-4" />
                  <p className="text-gray-400 font-medium">No cards in your wallet.</p>
                </div>
              ) : (
                cards.map((acc: string, index: number) => {
                  const isActive = index === activeWalletIdx;
                  const diff = index - activeWalletIdx;
                  
                  // Wheel Math
                  const topOffset = diff * 25; 
                  const scale = 1 - Math.abs(diff) * 0.06;
                  const opacity = isActive ? 1 : Math.max(0, 1 - Math.abs(diff) * 0.4);
                  const zIndex = 50 - Math.abs(diff);
                  const isHidden = diff < -1 || diff > 3; // Hide cards too far out of stack

                  if (isHidden) return null;

                  const bgClass = cardGradients[index % cardGradients.length];
                  const meta = cardMeta[acc] || {};
                  const isDebit = !!meta.linkedBank;
                  
                  // If debit card, pull balance from linked bank. Otherwise pull standard card balance
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
                      onClick={() => setActiveWalletIdx(index)} // Allows instantly bringing a card to the front by tapping it
                      className="absolute w-full h-[220px] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] cursor-pointer" 
                      style={{ top: `${topOffset}px`, zIndex, transform: `scale(${scale}) translateY(${diff > 0 ? diff * 10 : 0}px)`, opacity }}
                    >
                      <div className={`relative w-full h-full rounded-[1.8rem] p-6 shadow-2xl backdrop-blur-2xl border border-white/20 flex flex-col justify-between z-10 bg-white/5 ${bgClass}`}>
                        <div className="flex justify-between items-start">
                          <h3 className="text-xl font-bold tracking-wide text-white drop-shadow-md truncate pr-2">{displayName}</h3>
                          {meta.dueDate && meta.dueDate > 0 && (
                            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shrink-0">
                              <Calendar className="w-3 h-3 text-white" />
                              <span className="text-[10px] font-bold text-white">Due: {meta.dueDate}th</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 mb-2">
                          <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1 drop-shadow-sm">
                            {isDebit ? 'Linked Bank Balance' : 'Current Spend'}
                          </p>
                          <div className="flex justify-between items-end">
                            <p className="text-3xl font-black tracking-tight text-white drop-shadow-md">₹{accBalance.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-end mt-auto pt-4">
                          <p className="text-sm font-mono tracking-[0.2em] text-white/90 drop-shadow-sm">{displayDigits}</p>
                          <div className="w-10 h-6 rounded-md bg-white/20 border border-white/30 backdrop-blur-sm flex items-center justify-center shrink-0">
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

            {/* The Action Menu (Appears below active card) */}
            {cards.length > 0 && (
              <div className="mt-12 bg-[#101A12] border border-[#1E2B1F] rounded-3xl p-2 animate-in fade-in slide-in-from-bottom-8 duration-500 delay-100">
                <button 
                  onClick={() => { setFilter(cards[activeWalletIdx]); setIsWalletOpen(false); }} 
                  className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-[#1A241C] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1A241C] flex items-center justify-center border border-[#2A3B2D]"><Search className="w-5 h-5 text-gray-300" /></div>
                    <span className="text-sm font-bold text-gray-200">Transaction history</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-600 rotate-180" />
                </button>
                
                <div className="h-px w-full bg-[#1E2B1F] my-1"></div>
                
                {/* Dynamically swap action if it's a Debit card or 0-limit card */}
                {cards[activeWalletIdx]?.includes('Debit') || (cardMeta[cards[activeWalletIdx]]?.limit || 0) === 0 ? (
                  <button 
                    onClick={() => handleAddFunds(cards[activeWalletIdx])} 
                    className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-[#1A241C] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1A241C] flex items-center justify-center border border-[#2A3B2D]"><PlusCircle className="w-5 h-5 text-[#82F87A]" /></div>
                      <span className="text-sm font-bold text-gray-200">Add funds</span>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-gray-600 rotate-180" />
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => handlePayBill(cards[activeWalletIdx])} 
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-[#1A241C] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1A241C] flex items-center justify-center border border-[#2A3B2D]"><CheckSquare className="w-5 h-5 text-[#82F87A]" /></div>
                        <span className="text-sm font-bold text-gray-200">Paid the bill</span>
                      </div>
                      <ChevronLeft className="w-5 h-5 text-gray-600 rotate-180" />
                    </button>
                    <div className="h-px w-full bg-[#1E2B1F] my-1"></div>
                    <button 
                      onClick={() => openEditCardSettings(cards[activeWalletIdx])} 
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-[#1A241C] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1A241C] flex items-center justify-center border border-[#2A3B2D]"><Settings className="w-5 h-5 text-gray-300" /></div>
                        <span className="text-sm font-bold text-gray-200">Card settings</span>
                      </div>
                      <ChevronLeft className="w-5 h-5 text-gray-600 rotate-180" />
                    </button>
                  </>
                )}

                <div className="h-px w-full bg-[#1E2B1F] my-1"></div>

                <button 
                  onClick={(e) => handleDeleteCard(e, cards[activeWalletIdx])} 
                  className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-red-500/10 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:bg-red-500/20"><Trash2 className="w-5 h-5 text-red-400" /></div>
                    <span className="text-sm font-bold text-red-400">Cancel card</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-red-900/50 rotate-180" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT CARD SETTINGS MODAL */}
      {isEditCardModalOpen && (
        <div className="fixed inset-0 z-[100] bg-[#070D08] flex flex-col animate-in slide-in-from-bottom-5 duration-300 overflow-y-auto">
          <div className="flex items-center p-5 pt-12 md:max-w-md md:mx-auto md:w-full">
            <button onClick={() => setIsEditCardModalOpen(false)} className="w-10 h-10 bg-[#131D15] rounded-full flex items-center justify-center text-gray-300 border border-[#1E2B1F] hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="flex-1 text-center text-lg font-bold mr-10">Edit Card</h2>
          </div>

          <form onSubmit={handleUpdateCardSettings} className="px-5 pb-8 space-y-4 md:max-w-md md:mx-auto md:w-full">
            <div className="bg-[#131D15] rounded-2xl p-4 border border-[#1E2B1F] mb-4">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Card Name</label>
              <input type="text" value={editCardName} disabled className="w-full bg-transparent text-gray-400 outline-none font-bold text-[15px]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#131D15] rounded-2xl p-4 border border-[#1E2B1F]">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Total Limit (₹)</label>
                <input type="text" inputMode="decimal" placeholder="50000" value={editCardLimitInput} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditCardLimitInput(e.target.value.replace(/\D/g, ''))} className="w-full bg-transparent text-white outline-none font-mono text-[15px]" autoFocus />
              </div>
              <div className="bg-[#131D15] rounded-2xl p-4 border border-[#1E2B1F]">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Due Date (Day)</label>
                <select value={editCardDueDateInput} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditCardDueDateInput(e.target.value)} className="w-full bg-transparent text-white outline-none font-bold text-[15px]">
                  <option value="">Select Day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}th</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between bg-[#131D15] p-4 rounded-2xl border border-[#1E2B1F]">
              <div className="flex items-center gap-2.5">
                <BellRing className="w-4 h-4 text-[#82F87A]" />
                <span className="text-[13px] font-bold text-gray-200">Bill Reminder</span>
              </div>
              <input type="checkbox" checked={editCardReminderInput} onChange={(e) => setEditCardReminderInput(e.target.checked)} className="w-4 h-4 accent-[#82F87A] cursor-pointer" />
            </div>

            <button type="submit" className="w-full bg-[#82F87A] text-black py-4 rounded-full font-bold text-base hover:opacity-90 transition-opacity mt-4 shadow-[0_10px_30px_rgba(130,248,122,0.2)]">
              Update Card Settings
            </button>
          </form>
        </div>
      )}

      {/* FULLSCREEN ADD TRANSACTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[80] bg-[#070D08] flex flex-col animate-in slide-in-from-bottom-5 duration-300 overflow-y-auto">
          <div className="flex items-center p-5 pt-12 md:max-w-md md:mx-auto md:w-full">
            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-[#131D15] rounded-full flex items-center justify-center text-gray-300 border border-[#1E2B1F] hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="flex-1 text-center text-lg font-bold mr-10">Add Transaction</h2>
          </div>

          <form onSubmit={addTransaction} className="px-5 pb-8 space-y-4 md:max-w-md md:mx-auto md:w-full">
            
            {/* Amount & Type Card */}
            <div className="bg-[#101A12] border border-[#1E2B1F] rounded-[28px] p-6 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#82F87A] opacity-[0.08] blur-3xl rounded-full"></div>
              
              <p className="text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Total Amount</p>
              
              <div className="flex justify-center items-center text-5xl font-extrabold text-white mb-8">
                <span className="text-[#82F87A] mr-1">₹</span>
                <input 
                  type="text" 
                  inputMode="decimal" 
                  placeholder="0.00" 
                  value={amount} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)} 
                  className="bg-transparent w-[60%] text-center outline-none placeholder-gray-700" 
                  autoFocus 
                />
              </div>

              <div className="flex bg-[#0B120D] p-1.5 rounded-full border border-[#1E2B1F]">
                <button type="button" onClick={() => setTxType('income')} className={`flex-1 py-3 text-sm font-bold rounded-full flex items-center justify-center gap-2 transition-all ${txType === 'income' ? 'bg-[#82F87A] text-black shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>
                  <TrendingDown className="w-4 h-4" /> Income
                </button>
                <button type="button" onClick={() => setTxType('expense')} className={`flex-1 py-3 text-sm font-bold rounded-full flex items-center justify-center gap-2 transition-all ${txType === 'expense' ? 'bg-[#2A3B2D] text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>
                  <TrendingUp className="w-4 h-4" /> Expense
                </button>
              </div>
            </div>

            {/* Title Input */}
            <div className="bg-[#131D15] rounded-2xl p-4 border border-[#1E2B1F]">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Title</label>
              <input type="text" placeholder="e.g. Netflix subscription" value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} className="w-full bg-transparent text-white placeholder-gray-600 outline-none font-bold text-[15px]" />
            </div>

            {/* Date Input */}
            <div className="bg-[#131D15] rounded-2xl p-4 border border-[#1E2B1F]">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Date</label>
              <input type="date" value={txDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTxDate(e.target.value)} className="w-full bg-transparent text-white outline-none font-bold text-[15px] [color-scheme:dark]" />
            </div>

            {/* Source/Account Selection (Styled as Pills) */}
            <div className="bg-[#131D15] rounded-2xl p-4 border border-[#1E2B1F]">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3 block">Account</label>
              <div className="flex flex-wrap gap-2">
                {allSources.map(acc => (
                  <button 
                    key={acc} type="button" onClick={() => setSource(acc)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${source === acc ? 'bg-[#82F87A] text-black shadow-md' : 'bg-[#0B120D] text-gray-400 border border-[#1E2B1F]'}`}
                  >
                    {acc}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="w-full bg-[#82F87A] text-black py-4 rounded-full font-bold text-base hover:opacity-90 transition-opacity mt-4 shadow-[0_10px_30px_rgba(130,248,122,0.2)]">
              Save Transaction
            </button>
          </form>
        </div>
      )}

      {/* FULLSCREEN EDIT TRANSACTION MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[80] bg-[#070D08] flex flex-col animate-in slide-in-from-bottom-5 duration-300 overflow-y-auto">
          <div className="flex items-center p-5 pt-12 md:max-w-md md:mx-auto md:w-full">
            <button onClick={() => setIsEditModalOpen(false)} className="w-10 h-10 bg-[#131D15] rounded-full flex items-center justify-center text-gray-300 border border-[#1E2B1F] hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="flex-1 text-center text-lg font-bold mr-10">Edit Transaction</h2>
          </div>

          <form onSubmit={updateTransaction} className="px-5 pb-8 space-y-4 md:max-w-md md:mx-auto md:w-full">
            
            <div className="bg-[#101A12] border border-[#1E2B1F] rounded-[28px] p-6 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#82F87A] opacity-[0.08] blur-3xl rounded-full"></div>
              <p className="text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Total Amount</p>
              
              <div className="flex justify-center items-center text-5xl font-extrabold text-white mb-8">
                <span className="text-[#82F87A] mr-1">₹</span>
                <input type="text" inputMode="decimal" value={editAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditAmount(e.target.value)} className="bg-transparent w-[60%] text-center outline-none" autoFocus />
              </div>

              <div className="flex bg-[#0B120D] p-1.5 rounded-full border border-[#1E2B1F]">
                <button type="button" onClick={() => setEditType('income')} className={`flex-1 py-3 text-sm font-bold rounded-full flex items-center justify-center gap-2 transition-all ${editType === 'income' ? 'bg-[#82F87A] text-black shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>
                  <TrendingDown className="w-4 h-4" /> Income
                </button>
                <button type="button" onClick={() => setEditType('expense')} className={`flex-1 py-3 text-sm font-bold rounded-full flex items-center justify-center gap-2 transition-all ${editType === 'expense' ? 'bg-[#2A3B2D] text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>
                  <TrendingUp className="w-4 h-4" /> Expense
                </button>
              </div>
            </div>

            <div className="bg-[#131D15] rounded-2xl p-4 border border-[#1E2B1F]">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Title</label>
              <input type="text" value={editTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)} className="w-full bg-transparent text-white placeholder-gray-600 outline-none font-bold text-[15px]" />
            </div>

            <div className="bg-[#131D15] rounded-2xl p-4 border border-[#1E2B1F]">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Date</label>
              <input type="date" value={editDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditDate(e.target.value)} className="w-full bg-transparent text-white outline-none font-bold text-[15px] [color-scheme:dark]" />
            </div>

            <div className="bg-[#131D15] rounded-2xl p-4 border border-[#1E2B1F]">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3 block">Account</label>
              <div className="flex flex-wrap gap-2">
                {!allSources.includes(editSource) && (
                  <button type="button" onClick={() => setEditSource(editSource)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${editSource === editSource ? 'bg-[#82F87A] text-black' : 'bg-[#0B120D] text-gray-400 border border-[#1E2B1F]'}`}>{editSource}</button>
                )}
                {allSources.map(acc => (
                  <button 
                    key={acc} type="button" onClick={() => setEditSource(acc)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${editSource === acc ? 'bg-[#82F87A] text-black shadow-md' : 'bg-[#0B120D] text-gray-400 border border-[#1E2B1F]'}`}
                  >
                    {acc}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="w-full bg-[#82F87A] text-black py-4 rounded-full font-bold text-base hover:opacity-90 transition-opacity mt-4 shadow-[0_10px_30px_rgba(130,248,122,0.2)]">
              Update Record
            </button>
          </form>
        </div>
      )}

      {/* Add Bank/Cash Modal */}
      {isAddBankOpen && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-[#101A12] rounded-t-[32px] w-full max-w-md mx-auto p-6 border-t border-[#1E2B1F] max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Add Bank or Cash</h3>
              <button onClick={() => setIsAddBankOpen(false)} className="w-8 h-8 rounded-full bg-[#1A241C] flex items-center justify-center text-gray-400 hover:text-white"><X className="w-4 h-4"/></button>
            </div>
            <form onSubmit={handleAddBank} className="space-y-4">
              <div className="bg-[#131D15] rounded-2xl p-4 border border-[#1E2B1F]">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Bank Name</label>
                <input type="text" placeholder="e.g. HDFC, Paytm, Cash" value={newBankName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBankName(e.target.value)} className="w-full bg-transparent text-white placeholder-gray-600 outline-none font-bold text-[15px]" autoFocus />
              </div>
              <div className="bg-[#131D15] rounded-2xl p-4 border border-[#1E2B1F]">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Last 4 Digits of A/C (Optional)</label>
                <input type="text" maxLength={4} inputMode="numeric" placeholder="e.g. 1245" value={newBankDigits} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBankDigits(e.target.value.replace(/\D/g,''))} className="w-full bg-transparent text-white placeholder-gray-600 outline-none font-mono text-[18px] tracking-widest" />
              </div>
              <button type="submit" className="w-full bg-[#82F87A] text-black py-4 rounded-full font-bold text-base hover:opacity-90 transition-opacity mt-4 shadow-[0_10px_30px_rgba(130,248,122,0.2)]">Add Bank</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {isAddCardOpen && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-[#101A12] rounded-t-[32px] w-full max-w-md mx-auto p-6 border-t border-[#1E2B1F] max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Add New Card</h3>
              <button onClick={() => setIsAddCardOpen(false)} className="w-8 h-8 rounded-full bg-[#1A241C] flex items-center justify-center text-gray-400 hover:text-white"><X className="w-4 h-4"/></button>
            </div>
            <form onSubmit={handleAddCard} className="space-y-4">
              
              <div className="flex bg-[#0B120D] p-1.5 rounded-full border border-[#1E2B1F] mb-2">
                <button type="button" onClick={() => setCardType('credit')} className={`flex-1 py-3 text-sm font-bold rounded-full transition-all ${cardType === 'credit' ? 'bg-[#82F87A] text-black shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>Credit Card</button>
                <button type="button" onClick={() => setCardType('debit')} className={`flex-1 py-3 text-sm font-bold rounded-full transition-all ${cardType === 'debit' ? 'bg-[#2A3B2D] text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>Debit Card</button>
              </div>

              {cardType === 'credit' ? (
                <>
                  <div className="bg-[#131D15] rounded-2xl p-4 border border-[#1E2B1F]">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Bank Name / Card Label</label>
                    <input type="text" placeholder="e.g. Kotak League, HDFC Regalia" value={newCardBank} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCardBank(e.target.value)} className="w-full bg-transparent text-white placeholder-gray-600 outline-none font-bold text-[15px]" autoFocus={cardType === 'credit'} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#131D15] rounded-2xl p-4 border border-[#1E2B1F]">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Total Limit (₹)</label>
                      <input type="text" inputMode="decimal" placeholder="50000" value={newCardLimit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCardLimit(e.target.value.replace(/\D/g, ''))} className="w-full bg-transparent text-white placeholder-gray-600 outline-none font-mono text-[15px]" />
                    </div>
                    <div className="bg-[#131D15] rounded-2xl p-4 border border-[#1E2B1F]">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Due Date (Day)</label>
                      <select value={newCardDueDate} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewCardDueDate(e.target.value)} className="w-full bg-transparent text-white outline-none font-bold text-[15px]">
                        <option value="">Select Day</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>{day}th</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-[#131D15] p-4 rounded-2xl border border-[#1E2B1F]">
                    <div className="flex items-center gap-2.5">
                      <BellRing className="w-4 h-4 text-[#82F87A]" />
                      <span className="text-[13px] font-bold text-gray-200">Bill Reminder</span>
                    </div>
                    <input type="checkbox" checked={newCardReminder} onChange={(e) => setNewCardReminder(e.target.checked)} className="w-4 h-4 accent-[#82F87A] cursor-pointer" />
                  </div>
                </>
              ) : (
                <div className="bg-[#131D15] rounded-2xl p-4 border border-[#1E2B1F]">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Link to Bank Account</label>
                  <select value={selectedLinkedBank} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedLinkedBank(e.target.value)} className="w-full bg-transparent text-white outline-none font-bold text-[15px]">
                    <option value="" disabled>Select Bank...</option>
                    {banks.filter(b => b !== 'UPI / GPay' && b !== 'Cash').map((acc: string) => <option key={acc} value={acc}>{acc}</option>)}
                  </select>
                </div>
              )}

              <div className="bg-[#131D15] rounded-2xl p-4 border border-[#1E2B1F]">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Last 4 Digits</label>
                <input type="text" maxLength={4} inputMode="numeric" placeholder="1234" value={newCardDigits} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCardDigits(e.target.value.replace(/\D/g,''))} className="w-full bg-transparent text-white placeholder-gray-600 outline-none font-mono text-[18px] tracking-widest" />
              </div>
              <button type="submit" className="w-full bg-[#82F87A] text-black py-4 rounded-full font-bold text-base hover:opacity-90 transition-opacity mt-4 shadow-[0_10px_30px_rgba(130,248,122,0.2)]">
                {cardType === 'credit' ? 'Add to Wallet' : 'Link Debit Card'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Security Setup Modal (WITH SIGNOUT) */}
      {isSecurityModalOpen && (
        <div className="fixed inset-0 z-[90] bg-[#070D08]/95 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-[#101A12] rounded-t-[32px] w-full max-w-md mx-auto p-6 border-t border-[#1E2B1F] max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Settings</h3>
              <button onClick={() => { setIsSecurityModalOpen(false); setSetupStep(0); setTempPin(''); }} className="w-8 h-8 rounded-full bg-[#1A241C] flex items-center justify-center text-gray-400 hover:text-white"><X className="w-4 h-4"/></button>
            </div>

            {setupStep === 0 && (
              <div className="space-y-3">
                {!appPin ? (
                  <button onClick={() => setSetupStep(1)} className="w-full bg-[#131D15] border border-[#1E2B1F] hover:border-[#82F87A]/50 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all">
                    <Lock className="w-5 h-5 text-[#82F87A]" /> Set up PIN Code
                  </button>
                ) : (
                  <>
                    <button onClick={() => { localStorage.removeItem('mt_pin'); localStorage.removeItem('mt_bio'); setAppPin(null); setBiometricEnabled(false); setIsSecurityModalOpen(false); alert("App lock disabled."); }} className="w-full bg-red-500/10 text-red-500 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all">
                      <Unlock className="w-5 h-5" /> Remove PIN Code
                    </button>
                    {!biometricEnabled && window.PublicKeyCredential && (
                      <button onClick={() => { setupBiometrics(); setIsSecurityModalOpen(false); }} className="w-full bg-[#131D15] border border-[#1E2B1F] hover:border-[#82F87A]/50 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all mt-3">
                        <Fingerprint className="w-5 h-5 text-[#82F87A]" /> Enable Face ID / Touch ID
                      </button>
                    )}
                  </>
                )}

                {/* SIGN OUT BUTTON */}
                <button onClick={handleSignOut} className="w-full bg-black/40 border border-white/10 hover:border-red-500/50 text-red-400 py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all mt-6">
                  <LogOut className="w-5 h-5" /> Sign Out
                </button>
              </div>
            )}

            {(setupStep === 1 || setupStep === 2) && (
              <div className="flex flex-col items-center">
                <p className="text-gray-400 mb-4 font-medium">{setupStep === 1 ? 'Enter a new 4-digit PIN' : 'Confirm your 4-digit PIN'}</p>
                <div className="flex gap-4 mb-4">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-4 h-4 rounded-full transition-colors duration-200 ${tempPin.length > i ? 'bg-[#82F87A]' : 'bg-[#1A241C]'}`} />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4 w-full max-w-[280px] mx-auto mt-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <button key={n} onClick={() => handleSetupPinPress(n.toString())} className="h-16 rounded-full bg-[#1A241C] border border-[#223024] text-2xl font-bold text-white hover:bg-[#2A3B2D] active:scale-95 transition-all">{n}</button>
                  ))}
                  <div></div>
                  <button onClick={() => handleSetupPinPress('0')} className="h-16 rounded-full bg-[#1A241C] border border-[#223024] text-2xl font-bold text-white hover:bg-[#2A3B2D] active:scale-95 transition-all">0</button>
                  <button onClick={() => setTempPin(prev => prev.slice(0, -1))} className="h-16 rounded-full flex items-center justify-center text-gray-400 hover:text-red-400 active:scale-95 transition-all"><Delete className="w-8 h-8" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}