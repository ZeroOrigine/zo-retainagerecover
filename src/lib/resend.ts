import { Resend } from 'resend';
import { SERVER_CONFIG } from '@/lib/config';

export const resend = new Resend(SERVER_CONFIG.resendApiKey);
