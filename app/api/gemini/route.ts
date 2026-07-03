import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

// Lazy initialize so it doesn't crash on build if key is missing
let aiClient: GoogleGenAI | null = null;

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined in environment variables. Falling back to local support simulation.");
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

const SYSTEM_INSTRUCTIONS = `
You are the elite digital personal styling support for Blue Hills Designers, a luxury corporate ready-to-wear boutique located at Lubowa Shopping Mall (Shop 14, Ground Floor, Entebbe Road, Kampala, Uganda), dealing exclusively in premium already-made clothes imported from Turkey, Egypt, China, and the UK.
Your target clientele are corporate and working-class professionals, CEOs, managing directors, senior diplomats, cabinet officers, oil and gas executives, and modern gentlemen.

Important Guideline & Constraint Checklist:
1. Understand First: Always first analyze and understand the specific question or request asked by the client/customer before providing any answer.
2. Consistent Business Hours & Location: Ensure your answers are fully consistent with the web app's details:
   - Location: Lubowa Shopping Mall, Shop 14, Ground Floor, Entebbe Road, Kampala, Uganda.
   - Operating Hours: Sunday - Friday, 9:00 AM - 7:00 PM. We are closed on Saturdays.
   - If a customer asks to schedule a fitting, book an appointment, or check opening hours, you must reference this Sunday - Friday, 9:00 AM - 7:00 PM schedule.
3. No Tailoring: Blue Hills Designers does NOT do any custom tailoring, sewing, or custom bespoke fitting. All apparel is fully already-made and imported. We offer high-end ready-to-wear corporate wardrobe curation and styling guidance.
4. Currency & Prices: Always quote all prices only in Ugandan Shillings (Ugx), using the numeric value exactly as defined in our collections (e.g., Ugx 1,250). Never use US Dollars ($).

Collections to reference (All are ready-to-wear, imported):
1. Monaco Navy Ready-to-Wear Suit (Ugx 1,250): Classic double-vented wool-blend suit, imported from Turkey, perfect corporate structure.
2. Savile Midnight Pinstripe Suit (Ugx 1,450): Turkey-imported double-breasted 6x2 configuration, peak lapels, S130 super-fine wool. For ultimate corporate authority.
3. Crisp Poplin Herringbone Shirt Set (Ugx 220): Imported from the UK, dual pack with structured semi-spread collars.
4. Presidential Poplin White Shirt (Ugx 190): Sourced from Egypt with premium Giza cotton, Kent collar, crease-resistant for long cabinet meetings.
5. Imperial Cognac Wholecut Oxfords (Ugx 480): Imported from Turkey, seamless full-grain calfskin, Blake-stitched.
6. Obsidian Double Monk Straps (Ugx 520): Imported from Turkey, full-grain black calfskin, chiseled toe.
7. Emerald Jacquard Silk Tie Set (Ugx 150): Sourced from China, heavy silk tie and matching pocket square.
8. Lubowa Camel Hair Executive Overcoat (Ugx 1,850 - current special offer 20% off at Ugx 1,480): Imported from the UK, camel hair peak lapel coat.

Boutique Services:
- Customers can book private style and sizing consultations at the Lubowa Shopping Mall showroom.
- Private consultation sessions are conducted in our exclusive lounge with premium refreshments during our operating hours (Sunday - Friday: 9:00 AM - 7:00 PM, closed on Saturdays).
- Delivery is hand-couriered to offices or residences in Kampala and Entebbe.

Tone Guidelines:
- Address the client as "Sir", "Executive", "Diplomat", or "Gentleman" with absolute respect and poise.
- Speak clearly, minimalistically, and with supreme confidence.
- Offer precise style guides. Avoid generic shopping suggestions. Recommend pairings (e.g. Monaco Navy Suit paired with the Imperial Cognac Oxfords and the Emerald Silk Set).
- Keep formatting elegant using bullet points for options.
`;

export async function POST(req: NextRequest) {
  let messages: any[] = [];
  let userName: string | undefined = undefined;
  try {
    const body = await req.json();
    messages = body.messages || [];
    userName = body.userName;
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages thread.' }, { status: 400 });
    }
 
    const client = getAIClient();
    
    if (!client) {
      // Return a highly-curated luxury simulated response if Gemini API key is missing
      const lastUserMessage = messages[messages.length - 1]?.content || "";
      const simulatedReply = getSimulatedStylistReply(lastUserMessage, userName);
      return NextResponse.json({ text: simulatedReply, simulated: true });
    }

    // Convert messages to Gemini's format: we can use models.generateContent with a constructed prompt
    // combining the system instructions and the chat history.
    let fullPrompt = `${SYSTEM_INSTRUCTIONS}\n\n`;
    if (userName) {
      fullPrompt += `CRITICAL GUIDELINE: The customer you are speaking to is logged in. Their name is "${userName}". You MUST address them by their name (e.g. "Mr. ${userName}", "Sir ${userName}", or "Gentleman ${userName}") in your responses to show elite high-class personal recognition. Avoid generic greetings if you know their name.\n\n`;
    }
    fullPrompt += `Client Conversation History:\n`;
    for (const msg of messages) {
      const speaker = msg.role === 'user' ? 'Client' : 'Stylist Support';
      fullPrompt += `${speaker}: ${msg.content}\n`;
    }
    fullPrompt += `\nStylist Support:`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: fullPrompt,
    });

    const replyText = response.text || (userName ? `I apologize, Mr. ${userName}. A temporary disconnect occurred in my styling desk. How else may I assist your style agenda today?` : "I apologize, Executive. A temporary disconnect occurred in my styling desk. How else may I assist your style agenda today?");
    return NextResponse.json({ text: replyText });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const simulatedReply = getSimulatedStylistReply(lastUserMessage, userName);
    return NextResponse.json({ 
      text: simulatedReply,
      error: error.message,
      simulated: true
    });
  }
}

function getSimulatedStylistReply(query: string, userName?: string): string {
  const q = query.toLowerCase();
  const greetingName = userName ? `Mr. ${userName}` : "Sir";
  const directName = userName ? `${userName}` : "Sir";
  const executiveTitle = userName ? userName : "Executive";
  
  // First, address questions about opening days, hours, or schedule
  if (q.includes('hour') || q.includes('open') || q.includes('time') || q.includes('day') || q.includes('saturday') || q.includes('sunday') || q.includes('friday') || q.includes('schedule') || q.includes('when')) {
    return `Good day, ${greetingName}. To assist with your schedule, our Lubowa Shopping Mall showroom operating hours are:
    
*   **Sunday to Friday**: 9:00 AM to 7:00 PM
*   **Saturdays**: Closed

We would be delighted to host you for a styling consultation at any time during our active hours. Would you like us to prepare a sizing registry for you?`;
  }
  
  if (q.includes('suit') || q.includes('tuxedo') || q.includes('blazer')) {
    return `Greetings, ${executiveTitle}. For premium boardroom presence, I strongly recommend our Turkish-imported **Savile Midnight Pinstripe Suit** (Ugx 1,450) or our **Monaco Navy Ready-to-Wear Suit** (Ugx 1,250).


*   **The Savile Midnight Pinstripe** is a commanding double-breasted 6x2 wool masterpiece imported from Turkey, featuring peak lapels. It asserts executive authority.
*   **The Monaco Navy Suit** is an incredibly versatile option imported from Turkey, made of fine wool-blend with finely structured shoulders that sit beautifully.

Would you like me to reserve a sizing or styling consultation for you at our Lubowa showroom this week, ${greetingName}?`;
  }
  
  if (q.includes('shoe') || q.includes('oxford') || q.includes('loaf') || q.includes('monk')) {
    return `Welcome back, ${greetingName}. Our imported shoe collection is globally renowned. I recommend pairing your suits with:

1.  **Imperial Cognac Wholecut Oxfords** (Ugx 480): Imported from Turkey, single-piece premium calfskin, hand-burnished with a breathtaking glowing cognac patina. 
2.  **Obsidian Double Monk Straps** (Ugx 520): Imported from Turkey, full-grain black calfskin with gunmetal buckles and a chiseled toe—perfect for high-powered diplomatic conferences.

Shall I secure your size in our showroom repository, ${greetingName}?`;
  }

  if (q.includes('shirt') || q.includes('poplin')) {
    return `An exceptional selection, ${greetingName}. A gentleman is defined by the crispness of his shirt.

*   Our **Presidential Poplin White Shirt** (Ugx 190) is woven with Egyptian Giza cotton. It is imported and specially crafted to resist creasing through long cabinet sessions and executive flights.
*   Alternatively, the UK-imported **Crisp Poplin Herringbone Shirt Set** (Ugx 220) provides two-ply royal oxford cotton shirts featuring French cuffs, complete with structured collars.

Which size may I prepare for your wardrobe, ${directName}?`;
  }

  if (q.includes('price') || q.includes('cost') || q.includes('discount')) {
    return `Indeed, ${greetingName}. At Blue Hills Designers, our pricing reflects the premium, imported nature of our garments:
*   **Ready-to-Wear Suits** range from Ugx 1,250 to Ugx 1,450.
*   **Premium Egyptian Cotton Shirts** start at Ugx 190.
*   **Turkish Calfskin Footwear** begins at Ugx 480.
*   **Special Offer**: Our sumptuously soft **Lubowa Camel Hair Executive Overcoat** (imported from the UK) is currently offered at Ugx 1,480 (20% off from its standard registry of Ugx 1,850).

Every garment is hand-couriered to your office or residence in Kampala with our compliments.`;
  }

  return `Good day, ${greetingName}. I am your Blue Hills Personal Styling Support. 

Whether you are preparing for an upcoming diplomatic summit, a boardroom merger presentation, or an executive networking session, I am here to coordinate your visual presence.

Would you like to explore our imported **Suits, Shirts, or Italian-designed footwear**, or shall we coordinate a private styling consultation at our Lubowa Shopping Mall showroom?`;
}
