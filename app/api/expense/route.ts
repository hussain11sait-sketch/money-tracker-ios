import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Hardcoded safe URL so Vercel build never fails on missing env variables
const supabase = createClient(
  'https://bogwtbvmvzgbodlybgow.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// HELPER FUNCTION: Strips out hidden limits/due dates from the database names
function getCleanAccountName(rawName: string) {
  if (!rawName) return 'UPI / GPay';
  const main = rawName.includes('->') ? rawName.split('->')[0] : rawName;
  return main.split('|')[0].trim();
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const secret = process.env.DOUBLE_TAP_SECRET;
    
    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const rawText = body.text || '';

    if (!rawText) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const lowerText = rawText.toLowerCase();

    // 1. DYNAMIC ACCOUNT MATCHER
    let source = 'UPI / GPay';
    let matched = false;

    // Fetch live accounts from the database
    const { data: dbAccounts } = await supabase.from('accounts').select('name, type');
    
    if (dbAccounts && dbAccounts.length > 0) {
      // Pass 1: Check for Linked Debit Cards (e.g. "Kotak Debit •••• 9839->Kotak Bank")
      for (const row of dbAccounts) {
        if (row.type === 'card' && row.name.includes('->')) {
          const parts = row.name.split('->');
          const cardNamePart = parts[0]; 
          const targetBank = parts[1];   
          
          const digitsMatch = cardNamePart.match(/\d{4}/);
          if (digitsMatch && lowerText.includes(digitsMatch[0])) {
            source = targetBank; 
            matched = true;
            break;
          }
        }
      }

      // Pass 2: Exact 4 Digits (Standard Credit Cards & Regular Banks)
      if (!matched) {
        for (const row of dbAccounts) {
          if (row.name.includes('->')) continue;
          const accName = row.name;
          const digitsMatch = accName.match(/\d{4}/);
          if (digitsMatch && lowerText.includes(digitsMatch[0])) {
            source = accName;
            matched = true;
            break;
          }
        }
      }

      // Pass 3: Bank Name Keyword (e.g. 'icici', 'hdfc')
      if (!matched) {
        for (const row of dbAccounts) {
          if (row.name.includes('->')) continue;
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

    // NEW LOGIC: Clean the source account name before it hits the database
    source = getCleanAccountName(source);

    // 3. Detect Transaction Type (Income vs Expense)
    let txType: 'expense' | 'income' = 'expense';
    
    // Hide the phrase "credit card" from the logic so it doesn't trigger income by mistake
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

    // STRONG EXPENSE OVERRIDE (If it says spent, it's 100% an expense)
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

    // 6. Duplicate Protection Window
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: recentDupes } = await supabase
      .from('transactions')
      .select('id')
      .eq('amount', amount)
      .eq('source', source) // Now correctly matching the clean name!
      .gte('created_at', fiveSecondsAgo);

    if (recentDupes && recentDupes.length > 0) {
      return NextResponse.json({ success: true, message: 'Duplicate prevented', duplicate: true });
    }

    // 7. Save to Supabase Database
    const { error: insertError } = await supabase.from('transactions').insert([{
      title: title,
      amount: amount,
      date: today,
      source: source,
      type: txType
    }]);

    if (insertError) {
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