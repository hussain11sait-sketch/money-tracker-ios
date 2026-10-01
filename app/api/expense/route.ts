import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Hardcoded safe URL so Vercel build never fails on missing env variables
const supabase = createClient(
  'https://bogwtbvmvzgbodlybgow.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// HELPER: Strips out hidden limits/due dates from the database names
function getCleanAccountName(rawName: string) {
  if (!rawName) return 'Cash';
  const main = rawName.includes('->') ? rawName.split('->')[0] : rawName;
  return main.split('|')[0].trim();
}

// HELPER: Generates a deterministic UUID based on exact details + 5-second time window.
// This prevents race conditions by forcing a Primary Key collision in Supabase if fired twice.
function generateDeterministicUUID(amount: number, source: string, userId: string) {
  const timeWindow = Math.floor(Date.now() / 5000); // 5-second window
  const rawStr = `${amount}-${source}-${userId}-${timeWindow}`;
  let hash1 = 5381, hash2 = 52711;
  for (let i = 0; i < rawStr.length; i++) {
    const char = rawStr.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) ^ char;
    hash2 = ((hash2 << 5) + hash2) ^ char;
  }
  const hex1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `${hex1}-${hex2.substring(0,4)}-4${hex2.substring(4,7)}-a${hex1.substring(0,3)}-${hex1}${hex2.substring(0,4)}`;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    // Fallback directly to the key so it cannot fail
    const secret = process.env.DOUBLE_TAP_SECRET || 'my_secret_key_123';
    
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized. Check Shortcut token.' }, { status: 401 });
    }

    const body = await request.json();
    const rawText = body.text || '';
    const targetUserId = body.user_id;

    if (!rawText) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const lowerText = rawText.toLowerCase();

    // 1. DYNAMIC ACCOUNT MATCHER
    let source = 'Cash';
    let matched = false;

    let accountQuery = supabase.from('accounts').select('name, type');
    if (targetUserId) {
      accountQuery = accountQuery.eq('user_id', targetUserId);
    }
    const { data: dbAccounts } = await accountQuery;
    
    if (dbAccounts && dbAccounts.length > 0) {
      // SMART DIGIT EXTRACTOR: Safely grabs 4 digits even if hidden behind XX, *, or text
      const digitMatch = rawText.match(/(?:[xX]{1,2}|\*{1,4}|ending in\s*|AC\s*|A\/C\s*|Card\s*)?(\d{4})(?!\d)/i);
      const extractedDigits = digitMatch ? digitMatch[1] : null;

      // Pass 1: Smart Match using Extracted Digits
      if (extractedDigits) {
        for (const row of dbAccounts) {
          const dbDigitsMatch = row.name.match(/\d{4}/);
          if (dbDigitsMatch && dbDigitsMatch[0] === extractedDigits) {
            source = row.name; // Logs to the exact Card/Account, not the parent bank!
            matched = true;
            
            // If the SMS says 'debit' and we found a linked debit card, lock it in immediately.
            if (lowerText.includes('debit') && row.name.includes('->')) break;
          }
        }
      }

      // Pass 2: Original Fallback Matcher (if regex missed it but text has it)
      if (!matched) {
        for (const row of dbAccounts) {
          const digitsMatch = row.name.match(/\d{4}/);
          if (digitsMatch && lowerText.includes(digitsMatch[0])) {
            source = row.name; 
            matched = true;
            break;
          }
        }
      }

      // Pass 3: Bank Name Keyword (Only if no digits matched)
      if (!matched) {
        for (const row of dbAccounts) {
          if (row.name.includes('->')) continue; // Skip cards for general name matches
          const accName = row.name;
          const cleanWords = accName.toLowerCase()
            .replace(/[^a-z]/g, ' ') 
            .split(' ')
            .filter((w: string) => w.length > 2 && !['bank', 'account', 'card', 'wallet', 'credit', 'debit'].includes(w));
          
          if (cleanWords.length > 0) {
            const mainKeyword = cleanWords[0]; 
            if (lowerText.includes(mainKeyword)) {
              source = accName;
              matched = true;
              break;
            }
          }
        }
      }
    }

    // 2. FALLBACK MATCHER
    if (!matched) {
      if (lowerText.includes('x3205') || lowerText.includes('3205') || lowerText.includes('south indian bank') || lowerText.includes('sib')) {
        source = 'South Indian Bank';
      } else if (lowerText.includes('kotak')) {
        source = 'Kotak Bank';
      } else if (lowerText.includes('hdfc')) {
        source = 'HDFC Account';
      } else if (lowerText.includes('sbi') || lowerText.includes('state bank of india')) {
        source = 'SBI Account';
      } else if (lowerText.includes('icici')) {
        source = 'ICICI Account';
      } else if (lowerText.includes('axis')) {
        source = 'Axis Bank';
      } else if (lowerText.includes('paytm')) {
        source = 'Paytm Wallet';
      } else if (lowerText.includes('cash')) {
        source = 'Cash'; 
      }
    }

    source = getCleanAccountName(source);

    // 3. Detect Transaction Type
    let txType: 'expense' | 'income' = 'expense';
    const textWithoutCC = lowerText.replace('credit card', 'c_card');

    if (
      textWithoutCC.includes('received') ||
      textWithoutCC.includes('credited') || 
      textWithoutCC.includes('deposited') || 
      textWithoutCC.includes('added') ||
      textWithoutCC.includes('salary') ||
      textWithoutCC.includes('refund') ||
      /\bcr\b/i.test(textWithoutCC) ||
      /\bcredit\b/i.test(textWithoutCC)
    ) {
      txType = 'income';
    }

    if (
      lowerText.includes('spent') ||
      lowerText.includes('debited') ||
      lowerText.includes('paid') ||
      lowerText.includes('sent') ||
      lowerText.includes('deducted') ||
      /\bdr\b/i.test(lowerText)
    ) {
      txType = 'expense';
    }

    // 4. Extract Amount
    let amount = 0;
    const amountRegex = /(?:rs\.?|inr)\s*([\d,]+\.?\d*)/i;
    const match = rawText.match(amountRegex);
    if (match && match[1]) {
      amount = parseFloat(match[1].replace(/,/g, ''));
    }

    if (!amount || isNaN(amount)) {
      return NextResponse.json({ error: 'Could not detect amount from text', raw: rawText }, { status: 400 });
    }

    // 5. Extract Clean Title
    let title = txType === 'income' ? 'Money Received' : 'Bank Transaction';

    const upiNameMatch = rawText.match(/\/([A-Z\s]+)\s+on\s+\d{2}-\d{2}-\d{2}/);
    if (upiNameMatch && upiNameMatch[1]) {
      title = upiNameMatch[1].trim();
    } else {
      const impsMatch = rawText.match(/(IMPS\s+Ref\s+no\s+\d+)/i);
      if (impsMatch && impsMatch[1]) {
        title = impsMatch[1];
      } else {
        const descKeywords = ['at ', 'to ', 'for ', 'info:'];
        for (const kw of descKeywords) {
          const idx = lowerText.indexOf(kw);
          if (idx !== -1) {
            let extracted = rawText.substring(idx + kw.length).trim();
            extracted = extracted.split(/[\.\n]/)[0].trim();
            if (extracted.length > 2 && extracted.length < 40) {
              title = extracted;
              break;
            }
          }
        }
      }
    }

    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    // 6. GENERATE DETERMINISTIC ID (The ultimate double-tap blocker)
    const txId = generateDeterministicUUID(amount, source, targetUserId || 'anon');

    // 7. Save to Supabase
    const { error: insertError } = await supabase.from('transactions').insert([{
      id: txId, // Using our race-condition-proof ID
      title: title,
      amount: amount,
      date: today,
      source: source,
      type: txType,
      user_id: targetUserId || null
    }]);

    if (insertError) {
      // Postgres Error 23505 is "unique_violation" (Primary Key collision)
      if (insertError.code === '23505') {
        return NextResponse.json({ success: true, message: 'Duplicate prevented', duplicate: true });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      parsed: { title, amount, source, txType } 
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}