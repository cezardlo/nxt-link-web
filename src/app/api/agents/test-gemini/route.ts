import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set', hasKey: false });
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'You are an analyst. Return only valid JSON.' }] },
        contents: [{ role: 'user', parts: [{ text: 'Extract: {"problem":"...","technology":"...","industry":"...","region":"..."} from: Title: Truck cargo theft increases in logistics sector' }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    const status = response.status;
    const body = await response.text();
    
    return NextResponse.json({ 
      hasKey: true, 
      keyPrefix: apiKey.slice(0, 8) + '...', 
      model,
      status,
      body: body.slice(0, 500)
    });
  } catch (err) {
    return NextResponse.json({ 
      hasKey: true, 
      error: err instanceof Error ? err.message : String(err) 
    });
  }
}
