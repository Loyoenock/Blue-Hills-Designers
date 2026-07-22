import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit, createErrorResponse, logger, validateFields, ApiError } from '@/lib/apiUtils';

// Lazy initialize so it doesn't crash on build if key is missing
let aiClient: GoogleGenAI | null = null;

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.warn("GEMINI_API_KEY is not defined in environment variables. Falling back to local support simulation.");
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

function buildSystemInstructions(userName?: string, products?: any[], settings?: any) {
  const showroomHours = settings?.showroomHours || 'Sunday to Friday: 9:00 AM to 7:00 PM (Saturdays Closed)';
  const supportPhone = settings?.supportPhone || '+256 772 123456';
  const currencySymbol = settings?.currencySymbol || 'Ugx';

  let productsText = "";
  if (products && Array.isArray(products) && products.length > 0) {
    productsText = products.map((p, idx) => {
      const inStock = typeof p.stock === 'number' ? `${p.stock} units available` : 'In stock';
      const sizesStr = Array.isArray(p.sizes) && p.sizes.length > 0 ? `Sizes: ${p.sizes.join(', ')}` : 'Sizes: Standard';
      const colorsStr = Array.isArray(p.colors) && p.colors.length > 0 ? `Colors: ${p.colors.join(', ')}` : '';
      const reviewsList = Array.isArray(p.reviews) && p.reviews.length > 0 
        ? p.reviews.slice(0, 2).map((r: any) => `"${r.comment}" - ${r.userName} (${r.userRole || 'Customer'})`).join('; ')
        : 'None yet';
      return `${idx + 1}. **${p.name}** (${currencySymbol} ${p.price}): ${p.description}. [Category: ${p.category || 'Apparel'}, ${sizesStr}, ${colorsStr}, Stock: ${inStock}. Reviews: ${reviewsList}]`;
    }).join('\n');
  } else {
    productsText = `1. **Monaco Navy Ready-to-Wear Suit** (${currencySymbol} 1,250): Classic double-vented wool-blend suit, imported from Turkey, perfect corporate structure.
2. **Savile Midnight Pinstripe Suit** (${currencySymbol} 1,450): Turkey-imported double-breasted 6x2 configuration, peak lapels, S130 super-fine wool. For ultimate corporate authority.
3. **Crisp Poplin Herringbone Shirt Set** (${currencySymbol} 220): Imported from the UK, dual pack with structured semi-spread collars.
4. **Presidential Poplin White Shirt** (${currencySymbol} 190): Sourced from Egypt with premium Giza cotton, Kent collar, crease-resistant for long cabinet meetings.
5. **Imperial Cognac Wholecut Oxfords** (${currencySymbol} 480): Imported from Turkey, seamless full-grain calfskin, Blake-stitched.
6. **Obsidian Double Monk Straps** (${currencySymbol} 520): Imported from Turkey, full-grain black calfskin, chiseled toe.
7. **Emerald Jacquard Silk Tie Set** (${currencySymbol} 150): Sourced from China, heavy silk tie and matching pocket square.
8. **Lubowa Camel Hair Executive Overcoat** (${currencySymbol} 1,850 - current special offer 20% off at ${currencySymbol} 1,480): Imported from the UK, camel hair peak lapel coat.`;
  }

  return `You are the elite digital personal styling support for Blue Hills Designers, a luxury corporate ready-to-wear boutique located at Lubowa Shopping Mall (Shop 14, Ground Floor, Entebbe Road, Kampala, Uganda), dealing exclusively in premium already-made clothes imported from Turkey, Egypt, China, and the UK.
Your target clientele are corporate and working-class professionals, CEOs, managing directors, senior diplomats, cabinet officers, oil and gas executives, and modern gentlemen.

Important Guideline & Constraint Checklist:
1. Understand First: Always first analyze and understand the specific question or request asked by the client/customer before providing any answer. Do not guess; if needed, politely ask clarifying questions about their styling preferences, fitting desires, or budget.
2. Consistent Business Hours & Location: Ensure your answers are fully consistent with the web app's details:
   - Location: Lubowa Shopping Mall, Shop 14, Ground Floor, Entebbe Road, Kampala, Uganda.
   - Operating Hours: ${showroomHours}.
   - If a customer asks to schedule a fitting, book an appointment, or check opening hours, you must reference this ${showroomHours} schedule.
3. No Tailoring: Blue Hills Designers does NOT do any custom tailoring, sewing, or custom bespoke fitting. All apparel is fully already-made and imported. We offer high-end ready-to-wear corporate wardrobe curation and styling guidance.
4. Currency & Prices: Always quote all prices only in Ugandan Shillings (${currencySymbol}), using the numeric value exactly as defined in our collections (e.g., ${currencySymbol} 1,250). Never use US Dollars ($).
5. Personalized Interaction: If the client's name is known ("${userName || ''}"), address them respectfully by name (e.g., "Mr. ${userName}", "Sir ${userName}", or "Gentleman ${userName}") in your responses to show elite high-class personal recognition.

Collections to reference (All are ready-to-wear, imported, retrieved dynamically from our live showroom):
${productsText}

Boutique Services:
- Customers can book private style and sizing consultations at the Lubowa Shopping Mall showroom.
- Private consultation sessions are conducted in our exclusive lounge with premium refreshments during our operating hours (${showroomHours}).
- Delivery is hand-couriered to offices or residences in Kampala and Entebbe.
- Hotline / Support Number: ${supportPhone}.

Tone Guidelines:
- Address the client as "Sir", "Executive", "Diplomat", or "Gentleman" with absolute respect and poise.
- Speak clearly, minimalistically, and with supreme confidence.
- Offer precise style guides. Avoid generic shopping suggestions. Recommend pairings (e.g. Monaco Navy Suit paired with the Imperial Cognac Oxfords and the Emerald Silk Set).
- Keep formatting elegant using bullet points for options. Focus on visual harmony, coordinate outfits by matching colors and fabrics beautifully.
`;
}

export async function POST(req: NextRequest) {
  let messages: any[] = [];
  let userName: string | undefined = undefined;
  
  try {
    // 1. Rate Limiting Check (Max 20 AI style chats per minute per IP to defend API key usage)
    await enforceRateLimit(req, 20, 60000);

    const body = await req.json().catch(() => ({}));
    
    // 2. Thread & Input Validation
    validateFields(body, {
      messages: 'array'
    });

    messages = body.messages || [];
    userName = body.userName;
    const products = body.products || [];
    const settings = body.settings || null;

    if (messages.length > 50) {
      throw new ApiError('Conversation thread limit exceeded. Please restart the styling consult.', 400);
    }

    // 3. Row-by-row Message Integrity check
    for (const msg of messages) {
      if (!msg || typeof msg !== 'object' || typeof msg.role !== 'string' || typeof msg.content !== 'string') {
        throw new ApiError('Malformed messages detected inside styling conversation thread.', 400);
      }
    }

    // 4. Sanitize Input
    const safeUserName = typeof userName === 'string' 
      ? userName.replace(/[^a-zA-Z0-9\s.\-_]/g, '').slice(0, 50).trim()
      : undefined;
 
    const client = getAIClient();
    
    if (!client) {
      // Return a highly-curated luxury simulated response if Gemini API key is missing
      const lastUserMessage = messages[messages.length - 1]?.content || "";
      const simulatedReply = getSimulatedStylistReply(lastUserMessage, safeUserName);
      logger.info('Gemini client offline, returning simulated luxury response', { userName: safeUserName });
      return NextResponse.json({ text: simulatedReply, simulated: true });
    }

    // Convert messages to Gemini's format: we can use models.generateContent with a constructed prompt
    const dynamicInstructions = buildSystemInstructions(safeUserName, products, settings);
    let fullPrompt = `${dynamicInstructions}\n\n`;
    
    fullPrompt += `Client Conversation History:\n`;
    for (const msg of messages) {
      const speaker = msg.role === 'user' ? 'Client' : 'Stylist Support';
      const cleanContent = msg.content.slice(0, 1000);
      fullPrompt += `${speaker}: ${cleanContent}\n`;
    }
    fullPrompt += `\nStylist Support:`;

    logger.info('Sending structured chat prompt to Gemini model', { userName: safeUserName });

    const response = await client.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: fullPrompt,
    });

    const replyText = response.text || (safeUserName ? `I apologize, Mr. ${safeUserName}. A temporary disconnect occurred in my styling desk. How else may I assist your style agenda today?` : "I apologize, Executive. A temporary disconnect occurred in my styling desk. How else may I assist your style agenda today?");
    
    logger.info('Received prompt response from Gemini model successfully');
    return NextResponse.json({ text: replyText });

  } catch (error: any) {
    // If it's an explicit validation or rate-limit ApiError, handle cleanly via standard centralized error responses
    if (error instanceof ApiError) {
      return createErrorResponse(req, error);
    }

    const errorMsg = error?.message || String(error);
    const statusCode = error?.status || error?.statusCode || error?.code;

    const isModelOrApiError = 
      (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) ||
      /404|400|model|not found|INVALID_ARGUMENT|PERMISSION_DENIED|UNAUTHENTICATED|RESOURCE_EXHAUSTED|API_KEY|invalid/i.test(errorMsg);

    const isNetworkError = 
      /ETIMEDOUT|ECONNREFUSED|ENOTFOUND|fetch failed|timeout|AbortError|network|socket|EHOSTUNREACH/i.test(errorMsg);

    if (isModelOrApiError) {
      logger.error("Gemini API model/API error detected: AI falling back because model name, API key, or payload is invalid", {
        errorCategory: "MODEL_OR_API_ERROR",
        message: errorMsg,
        status: statusCode
      });
    } else if (isNetworkError) {
      logger.error("Gemini API network error detected: AI falling back because Google's API is unreachable or timed out", {
        errorCategory: "NETWORK_UNREACHABLE",
        message: errorMsg
      });
    } else {
      logger.error("Gemini API call failed with generic error, falling back to simulated styling responses", {
        errorCategory: "GENERIC_GEMINI_ERROR",
        message: errorMsg,
        status: statusCode
      });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const safeUserName = typeof userName === 'string' 
      ? userName.replace(/[^a-zA-Z0-9\s.\-_]/g, '').slice(0, 50).trim()
      : undefined;
    const simulatedReply = getSimulatedStylistReply(lastUserMessage, safeUserName);
    return NextResponse.json({ 
      text: simulatedReply,
      error: errorMsg || 'Model call exception, fell back to local styling database simulation.',
      simulated: true
    });
  }
}

function getSimulatedStylistReply(query: string, userName?: string): string {
  const q = query.toLowerCase();
  const greetingName = userName ? `Mr. ${userName}` : "Sir";
  const directName = userName ? `${userName}` : "Sir";
  const executiveTitle = userName ? userName : "Executive";
  
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
