import { Resend } from 'resend';
import { logger } from './apiUtils';
import { getSupabaseAdmin } from './supabase';

let resendInstance: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  orderNumber?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

/**
 * Sends a transactional order confirmation or notification email via Resend.
 * Fallback to development mode logging if RESEND_API_KEY is not configured.
 * Never throws an error — fails gracefully and logs errors for audit tracking.
 */
export async function sendTransactionalEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, html, orderNumber } = params;
  const from = params.from || process.env.EMAIL_FROM || 'Blue Hills Designers <orders@bluehillsdesigners.com>';

  const resend = getResendClient();

  if (!resend) {
    logger.info(`[Email Dev Mode] RESEND_API_KEY is not set. Simulated transactional email delivery to ${to} (Subject: "${subject}"${orderNumber ? `, Order: ${orderNumber}` : ''})`);
    return {
      success: true,
      messageId: 'simulated-dev-mode',
      simulated: true,
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
    });

    if (error) {
      logger.error(`[Email Delivery Failed] Resend API returned error for ${to}:`, error);

      try {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          await supabase.from('audit_logs').insert([
            {
              id: `log-email-err-${Date.now()}`,
              action: 'Email Delivery Failed',
              details: `Failed to deliver email '${subject}' to ${to}: ${error.message}${orderNumber ? ` (Order: ${orderNumber})` : ''}`,
              user_id: null,
              created_at: new Date().toISOString(),
            }
          ]);
        }
      } catch (logDbErr) {
        logger.error('[Email Delivery] Could not log failure to audit_logs:', logDbErr);
      }

      return {
        success: false,
        error: error.message,
      };
    }

    const messageId = data?.id;
    logger.info(`[Email Delivered] Transactional email successfully sent to ${to} (Message ID: ${messageId})`);

    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase.from('audit_logs').insert([
          {
            id: `log-email-ok-${Date.now()}`,
            action: 'Email Dispatched',
            details: `Successfully dispatched email '${subject}' to ${to} (ID: ${messageId})${orderNumber ? ` for Order ${orderNumber}` : ''}`,
            user_id: null,
            created_at: new Date().toISOString(),
          }
        ]);
      }
    } catch (logDbErr) {
      // ignore db logging failure
    }

    return {
      success: true,
      messageId,
    };
  } catch (err: any) {
    const errorMsg = err?.message || 'Unknown email transmission exception';
    logger.error(`[Email Exception] Error delivering email to ${to}:`, err);

    try {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase.from('audit_logs').insert([
          {
            id: `log-email-exc-${Date.now()}`,
            action: 'Email Delivery Exception',
            details: `Exception delivering email '${subject}' to ${to}: ${errorMsg}${orderNumber ? ` (Order: ${orderNumber})` : ''}`,
            user_id: null,
            created_at: new Date().toISOString(),
          }
        ]);
      }
    } catch (logDbErr) {
      // ignore db logging failure
    }

    return {
      success: false,
      error: errorMsg,
    };
  }
}
