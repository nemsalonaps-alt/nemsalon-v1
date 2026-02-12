import { env } from '../../../config/env.js';
import { providers } from '../../../config/providers.js';

export interface EmailService {
  sendStaffInvite(input: {
    email: string;
    name: string;
    salonName: string;
    inviteUrl: string;
  }): Promise<void>;
  
  sendCustomerInvite(input: {
    email: string;
    salonName: string;
    inviteUrl: string;
  }): Promise<void>;
}

// Console logging implementation (for development)
class ConsoleEmailService implements EmailService {
  async sendStaffInvite(input: {
    email: string;
    name: string;
    salonName: string;
    inviteUrl: string;
  }): Promise<void> {
    console.log('📧 STAFF INVITE EMAIL');
    console.log('To:', input.email);
    console.log('Subject:', `Invitation til ${input.salonName}`);
    console.log('Body:');
    console.log(`Hej ${input.name},

Du er blevet inviteret til at deltage i ${input.salonName}.

Klik på linket for at aktivere din konto:
${input.inviteUrl}

Linket udløber om 7 dage.

Med venlig hilsen,
${input.salonName}`);
    console.log('---');
  }
  
  async sendCustomerInvite(input: {
    email: string;
    salonName: string;
    inviteUrl: string;
  }): Promise<void> {
    console.log('📧 CUSTOMER INVITE EMAIL');
    console.log('To:', input.email);
    console.log('Subject:', `Invitation fra ${input.salonName}`);
    console.log('Body:');
    console.log(`Hej,

${input.salonName} har inviteret dig til at oprette en kundekonto.

Klik på linket for at registrere dig:
${input.inviteUrl}

Linket udløber om 7 dage.

Med venlig hilsen,
${input.salonName}`);
    console.log('---');
  }
}

class PostmarkEmailService implements EmailService {
  private async sendEmail(input: { to: string; subject: string; text: string }) {
    if (!env.POSTMARK_SERVER_TOKEN || !env.POSTMARK_FROM) {
      throw new Error('POSTMARK_* env missing.');
    }
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': env.POSTMARK_SERVER_TOKEN
      },
      body: JSON.stringify({
        From: env.POSTMARK_FROM,
        To: input.to,
        Subject: input.subject,
        TextBody: input.text
      })
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Postmark failed: ${response.status} ${text.slice(0, 120)}`);
    }
  }

  async sendStaffInvite(input: {
    email: string;
    name: string;
    salonName: string;
    inviteUrl: string;
  }): Promise<void> {
    const subject = `Invitation til ${input.salonName}`;
    const text = `Hej ${input.name},

Du er blevet inviteret til at deltage i ${input.salonName}.

Klik på linket for at aktivere din konto:
${input.inviteUrl}

Linket udløber om 7 dage.

Med venlig hilsen,
${input.salonName}`;
    await this.sendEmail({ to: input.email, subject, text });
  }

  async sendCustomerInvite(input: {
    email: string;
    salonName: string;
    inviteUrl: string;
  }): Promise<void> {
    const subject = `Invitation fra ${input.salonName}`;
    const text = `Hej,

${input.salonName} har inviteret dig til at oprette en kundekonto.

Klik på linket for at registrere dig:
${input.inviteUrl}

Linket udløber om 7 dage.

Med venlig hilsen,
${input.salonName}`;
    await this.sendEmail({ to: input.email, subject, text });
  }
}

export const emailService: EmailService =
  providers.notifications.email.provider === 'postmark'
    ? new PostmarkEmailService()
    : new ConsoleEmailService();
