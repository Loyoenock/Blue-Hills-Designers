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
You are the elite digital personal styling concierge for Blue Hills Designers, a luxury corporate ready-to-wear boutique located at Lubowa Shopping Mall (Shop 14, Ground Floor, Entebbe Road, Kampala, Uganda), dealing exclusively in premium already-made clothes imported from Turkey, Egypt, China, and the UK.
Your target clientele are corporate and working-class professionals, CEOs, managing directors, senior diplomats, cabinet officers, oil and gas executives, and modern gentlemen.

Important Constraint: Blue Hills Designers does NOT do any custom tailoring, sewing, or custom bespoke fitting. All apparel is fully already-made and imported. We offer high-end ready-to-wear corporate wardrobe curation and styling guidance.

Brand Vibe: Sophisticated, professional, corporate-class, elegant, minimal, highly confident, premium quality.

Collections to reference (All are ready-to-wear, imported):
1. Monaco Navy Ready-to-Wear Suit ($1,250): Classic double-vented wool-blend suit, imported from Turkey, perfect corporate structure.
2. Savile Midnight Pinstripe Suit ($1,450): Turkey-imported double-breasted 6x2 configuration, peak lapels, S130 super-fine wool. For ultimate corporate authority.
3. Crisp Poplin Herringbone Shirt Set ($220): Imported from the UK, dual pack with structured semi-spread collars.
4. Presidential Poplin White Shirt ($190): Sourced from Egypt with premium Giza cotton, Kent collar, crease-resistant for long cabinet meetings.
5. Imperial Cognac Wholecut Oxfords ($480): Imported from Turkey, seamless full-grain calfskin, Blake-stitched.
6. Obsidian Double Monk Straps ($520): Imported from Turkey, full-grain black calfskin, chiseled toe.
7. Emerald Jacquard Silk Tie Set ($150): Sourced from China, heavy silk tie and matching pocket square.
8. Lubowa Camel Hair Executive Overcoat ($1,850 - current special offer 20% off at $1,480): Imported from the UK, camel hair peak lapel coat.

Boutique Services:
- Customers can book private style and sizing consultations at the Lubowa Shopping Mall showroom.
- Private consultation sessions are conducted in an exclusive lounge with premium refreshments.
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

    const replyText = response.text || "I apologize, Executive. A temporary disconnect occurred in my styling desk. How else may I assist your style agenda today?";
    return NextResponse.json({ text: replyText });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ 
      text: "Welcome back, Sir. Our boutique styling lines are currently occupied. Allow me to guide you through our executive imported Monaco Navy or Savile Midnight suits which are in stock today.",
      error: error.message 
    });
  }
}

function getSimulatedStylistReply(query: string): string {
  const q = query.toLowerCase();
  
  if (q.includes('suit') || q.includes('tuxedo') || q.includes('blazer')) {
    return `Greetings, Executive. For premium boardroom presence, I strongly recommend our Turkish-imported **Savile Midnight Pinstripe Suit** ($1,450) or our **Monaco Navy Ready-to-Wear Suit** ($1,250).


*   **The Savile Midnight Pinstripe** is a commanding double-breasted 6x2 wool masterpiece imported from Turkey, featuring peak lapels. It asserts executive authority.
*   **The Monaco Navy Suit** is an incredibly versatile option imported from Turkey, made of fine wool-blend with finely structured shoulders that sit beautifully.
2
Would you like me to reserve a sizing or styling consultation for you at our Lubowa showroom this week?`;
  }
  
  if (q.includes('shoe') || q.includes('oxford') || q.includes('loaf') || q.includes('monk')) {
    return `Welcome back, Sir. Our imported shoe collection is globally renowned. I recommend pairing your suits with:

1.  **Imperial Cognac Wholecut Oxfords** ($480): Imported from Turkey, single-piece premium calfskin, hand-burnished with a breathtaking glowing cognac patina. 
2.  **Obsidian Double Monk Straps** ($520): Imported from Turkey, full-grain black calfskin with gunmetal buckles and a chiseled toe—perfect for high-powered diplomatic conferences.

Shall I secure your size in our showroom repository?`;
  }

  if (q.includes('shirt') || q.includes('poplin')) {
    return `An exceptional selection, Sir. A gentleman is defined by the crispness of his shirt.

*   Our **Presidential Poplin White Shirt** ($190) is woven with Egyptian Giza cotton. It is imported and specially crafted to resist creasing through long cabinet sessions and executive flights.
*   Alternatively, the UK-imported **Crisp Poplin Herringbone Shirt Set** ($220) provides two-ply royal oxford cotton shirts featuring French cuffs, complete with structured collars.

Which size may I prepare for your wardrobe?`;
  }

  if (q.includes('price') || q.includes('cost') || q.includes('discount')) {
    return `Indeed, Sir. At Blue Hills Designers, our pricing reflects the premium, imported nature of our garments:
*   **Ready-to-Wear Suits** range from $1,250 to $1,450.
*   **Premium Egyptian Cotton Shirts** start at $190.
*   **Turkish Calfskin Footwear** begins at $480.
*   **Special Offer**: Our sumptuously soft **Lubowa Camel Hair Executive Overcoat** (imported from the UK) is currently offered at $1,480 (20% off from its standard registry of $1,850).

Every garment is hand-couriered to your office or residence in Kampala with our compliments.`;
  }

  return `Good day, Sir. I am your Blue Hills Personal Styling Concierge. 

Whether you are preparing for an upcoming diplomatic summit, a boardroom merger presentation, or an executive networking session, I am here to coordinate your visual presence.

Would you like to explore our imported **Suits, Shirts, or Italian-designed footwear**, or shall we coordinate a private styling consultation at our Lubowa Shopping Mall showroom?`;
}
