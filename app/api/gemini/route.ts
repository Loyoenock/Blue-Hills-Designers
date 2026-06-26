import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

// Lazy initialize so it doesn't crash on build if key is missing
let aiClient: GoogleGenAI | null = null;

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined in environment variables. Falling back to local concierge simulation.");
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

const SYSTEM_INSTRUCTIONS = `
You are the elite digital personal styling concierge for Blue Hills Designers, a luxury corporate menswear boutique located at Lubowa Shopping Mall (Shop 14, Ground Floor, Entebbe Road, Kampala, Uganda).
Your target clientele are high-profile individuals: CEOs, managing directors, senior diplomats, cabinet ministers, cabinet officers, oil and gas executives, and modern African gentlemen.

Brand Vibe: Sophisticated, masculine, premium, corporate, elegant, minimal, highly confident, and deeply rooted in modern African prestige. Inspired by Tom Ford, Hugo Boss, and Savile Row.

Collections to reference:
1. Monaco Navy Tailored Suit ($1,250): Classic double-vented wool-blend suit, broad posture, standard notch lapels.
2. Savile Midnight Pinstripe Suit ($1,450): Double-breasted 6x2 configuration, peak lapels, surgeon cuffs, S130 super-fine wool. For ultimate authority.
3. Crisp Poplin Herringbone Shirt Set ($220): Dual pack with structured semi-spread collars and French cuffs.
4. Ugandan President Poplin White Shirt ($190): Heavy-weight Egyptian Giza cotton, Kent collar, single-button rounded cuffs, crease-resistant for long cabinet meetings.
5. Imperial Cognac Wholecut Oxfords ($480): Seamless Italian full-grain calfskin, hand-burnished cognac patina, Blake-stitched.
6. Obsidian Double Monk Straps ($520): Full-grain black calfskin, gunmetal buckles, chiseled toe.
7. Emerald Jacquard Silk Tie Set ($150): Heavy silk tie and matching pocket square.
8. Lubowa Camel Hair Executive Overcoat ($1,850 - current special offer 20% off at $1,480): Camel hair peak lapel double-breasted coat.

Bespoke Services:
- Customers can book private tailoring consultations at the Lubowa Shopping Mall showroom.
- Private fittings are conducted in an exclusive lounge with refreshments.
- Delivery is hand-couriered to offices or residences in Kampala and Entebbe.

Tone Guidelines:
- Address the client as "Sir", "Executive", "Diplomat", or "Gentleman" with absolute respect and poise.
- Speak clearly, minimalistically, and with supreme confidence.
- Offer precise style guides. Avoid generic shopping suggestions. Recommend pairings (e.g. Monaco Navy Suit paired with the Imperial Cognac Oxfords and the Emerald Silk Set).
- Keep formatting elegant using bullet points for options.
`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages thread.' }, { status: 400 });
    }

    const client = getAIClient();
    
    if (!client) {
      // Return a highly-curated luxury simulated response if Gemini API key is missing
      const lastUserMessage = messages[messages.length - 1]?.content || "";
      const simulatedReply = getSimulatedStylistReply(lastUserMessage);
      return NextResponse.json({ text: simulatedReply, simulated: true });
    }

    // Convert messages to Gemini's format: we can use models.generateContent with a constructed prompt
    // combining the system instructions and the chat history.
    let fullPrompt = `${SYSTEM_INSTRUCTIONS}\n\nClient Conversation History:\n`;
    for (const msg of messages) {
      const speaker = msg.role === 'user' ? 'Client' : 'Stylist Concierge';
      fullPrompt += `${speaker}: ${msg.content}\n`;
    }
    fullPrompt += `\nStylist Concierge:`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });

    const replyText = response.text || "I apologize, Executive. A temporary disconnect occurred in my tailoring desk. How else may I assist your style agenda today?";
    return NextResponse.json({ text: replyText });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ 
      text: "Welcome back, Sir. Our tailoring lines are currently occupied crafting fine Italian wool threads. Allow me to guide you through our executive Monaco Navy or Savile Midnight suits which are in stock today.",
      error: error.message 
    });
  }
}

function getSimulatedStylistReply(query: string): string {
  const q = query.toLowerCase();
  
  if (q.includes('suit') || q.includes('tuxedo') || q.includes('blazer')) {
    return `Greetings, Executive. For premium boardroom presence, I strongly recommend our **Savile Midnight Pinstripe Suit** ($1,450) or our **Monaco Navy Tailored Suit** ($1,250).

*   **The Savile Midnight Pinstripe** is a commanding double-breasted 6x2 wool masterpiece featuring peak lapels. It asserts executive authority.
*   **The Monaco Navy Suit** is an incredibly versatile option made of fine wool-blend with hand-tailored shoulders that sit beautifully.

Would you like me to reserve a sizing fitting for you at our Lubowa Atelier this week?`;
  }
  
  if (q.includes('shoe') || q.includes('oxford') || q.includes('loaf') || q.includes('monk')) {
    return `Welcome back, Sir. Our shoe atelier is globally renowned. I recommend pairing your suits with:

1.  **Imperial Cognac Wholecut Oxfords** ($480): Single-piece premium Italian calfskin, hand-burnished with a breathtaking glowing cognac patina. 
2.  **Obsidian Double Monk Straps** ($520): Full-grain black calfskin with gunmetal buckles and a chiseled toe—perfect for high-powered diplomatic conferences.

Shall I secure your standard leather size in our showroom repository?`;
  }

  if (q.includes('shirt') || q.includes('poplin')) {
    return `An exceptional selection, Sir. A gentleman is defined by the crispness of his shirt.

*   Our **Ugandan President Poplin White Shirt** ($190) is woven with Egyptian Giza cotton. It is specially crafted to resist creasing through long cabinet sessions and executive flights.
*   Alternatively, the **Crisp Poplin Herringbone Shirt Set** ($220) provides two-ply royal oxford cotton shirts featuring French cuffs, complete with structured collars.

Which size may I prepare for your wardrobe?`;
  }

  if (q.includes('price') || q.includes('cost') || q.includes('discount')) {
    return `Indeed, Sir. At Blue Hills Designers, our pricing reflects the premium, hand-crafted nature of our garments:

*   **Bespoke Suits** range from $850 to $1,450.
*   **Egyptian Cotton Shirts** start at $190.
*   **Italian Calfskin Footwear** begins at $420.
*   **Special Offer**: Our sumptuously soft **Lubowa Camel Hair Executive Overcoat** is currently offered at $1,480 (20% off from its standard registry of $1,850).

Every garment is hand-couriered to your office or residence in Kampala with our compliments.`;
  }

  return `Good day, Sir. I am your Blue Hills Personal Styling Concierge. 

Whether you are preparing for an upcoming diplomatic summit, a boardroom merger presentation, or a presidential state dinner, I am here to coordinate your visual presence.

Would you like to explore our **Suits, Shirts, or Italian footwear**, or shall we coordinate a private bespoke consultation at our Lubowa Shopping Mall lounge?`;
}
