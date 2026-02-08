export interface EmailService {
  sendStaffInvite(input: {
    email: string;
    name: string;
    inviteToken: string;
    salonName: string;
  }): Promise<void>;
  
  sendCustomerInvite(input: {
    email: string;
    salonName: string;
    inviteToken: string;
  }): Promise<void>;
}

// Console logging implementation (for development)
class ConsoleEmailService implements EmailService {
  async sendStaffInvite(input: {
    email: string;
    name: string;
    inviteToken: string;
    salonName: string;
  }): Promise<void> {
    const setupUrl = `${this.getBaseUrl()}/staff/setup-pin?token=${input.inviteToken}`;
    
    console.log('📧 STAFF INVITE EMAIL');
    console.log('To:', input.email);
    console.log('Subject:', `Invitation til ${input.salonName}`);
    console.log('Body:');
    console.log(`Hej ${input.name},

Du er blevet inviteret til at deltage i ${input.salonName}.

Klik på linket for at aktivere din konto og vælge din pinkode:
${setupUrl}

Linket udløber om 7 dage.

Med venlig hilsen,
${input.salonName}`);
    console.log('---');
  }
  
  async sendCustomerInvite(input: {
    email: string;
    salonName: string;
    inviteToken: string;
  }): Promise<void> {
    const registerUrl = `${this.getBaseUrl()}/register?token=${input.inviteToken}`;
    
    console.log('📧 CUSTOMER INVITE EMAIL');
    console.log('To:', input.email);
    console.log('Subject:', `Invitation fra ${input.salonName}`);
    console.log('Body:');
    console.log(`Hej,

${input.salonName} har inviteret dig til at oprette en kundekonto.

Klik på linket for at registrere dig:
${registerUrl}

Linket udløber om 7 dage.

Med venlig hilsen,
${input.salonName}`);
    console.log('---');
  }
  
  private getBaseUrl(): string {
    return process.env.WEB_URL || 'http://localhost:5173';
  }
}

// TODO: Implement with actual email provider (SendGrid, AWS SES, etc.)
export const emailService: EmailService = new ConsoleEmailService();
