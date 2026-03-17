import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailService } from './email.service';
import { Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SafetyStatus } from 'src/modules/user/dto/send-email.dto';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'send-email': {
        const { to, subject, html } = job.data;
        try {
          this.logger.log(`Processing job ${job.id} for email ${to}`);
          await this.emailService.sendMailInternal(to, subject, html);
          this.logger.log(`Successfully sent email to ${to}`);
        } catch (error) {
          this.logger.error(`Failed to send email to ${to}: ${error.message}`);
          throw error;
        }
        break;
      }
      case 'emergency-broadcast': {
        const { userId, dto } = job.data;
        try {
          this.logger.log(`Processing emergency broadcast for user ${userId}`);
          
          const user = await this.prisma.user.findUnique({ where: { id: userId } });
          if (!user) {
            this.logger.error(`User ${userId} not found for emergency broadcast`);
            return;
          }

          const contacts = await this.prisma.emContact.findMany({
            where: { id: { in: dto.contactIds }, userId },
          });

          if (!contacts.length) {
            this.logger.warn(`No contacts found for user ${userId} emergency broadcast`);
            return;
          }

          const isSafe = dto.status === SafetyStatus.SAFE;
          const isDanger = dto.status === SafetyStatus.DANGER;
          const isOther = dto.status === SafetyStatus.OTHER;

          let finalMessage = dto.message;
          if (!finalMessage) {
              if (isSafe) finalMessage = `I’m safe and okay, but sadly, I've lost my mobile phone. Below is my current location. I'm in the process of getting a temporary phone & number, and I will call you once I have it. In the meantime, you can reach me via email. Thank you very much. I'll get in touch if anything changes.`;
              else if (isDanger) finalMessage = `I might not be able to access my mobile phone, and I really need your urgent help. Please call, text, or email me, my family, friends, or associates, and let them know I need assistance. Below is where I am currently located. Thank you very much. I will get in touch if things change, but right now, I need your help. Thank you!`;
              else finalMessage = `I am sharing my current status and location with you .`;
          }

          const mapUrl = (dto.lat && dto.lng)
              ? `https://www.google.com/maps?q=${dto.lat},${dto.lng}`
              : null;

          for (const contact of contacts) {
            let subject = dto.subject;
            if (!subject) {
                if (isSafe) subject = `✅ Safety Update: ${user.name} is SAFE`;
                else if (isDanger) subject = `🚨 EMERGENCY: ${user.name} needs help!`;
                else subject = `Status Update from ${user.name}`;
            }

            const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="background-color: ${isSafe ? '#28a745' : isDanger ? '#dc3545' : '#254D7F'}; padding: 25px; text-align: center; color: white;">
            <h2 style="margin: 0; letter-spacing: 1px;">${isSafe ? 'I AM SAFE' : isDanger ? 'I NEED HELP' : 'HERE I AM'}</h2>
        </div>
        
        <div style="padding: 30px; color: #333; line-height: 1.6;">
            <p style="font-size: 16px;">Hi <strong>${contact.name}</strong>,</p>
            <p>This is an email from <strong>${user.name}</strong>.</p>
            
            <div style="padding: 20px; margin: 20px 0; background: ${isSafe ? '#f0f9f4' : isDanger ? '#fff5f5' : '#f8fafc'}; border-left: 5px solid ${isSafe ? '#28a745' : isDanger ? '#dc3545' : '#254D7F'}; border-radius: 4px;">
                <p style="margin-top: 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase;">Message Content</p>
                <p style="font-size: 15px; color: #1e293b; margin-bottom: 0;">${finalMessage}</p>
            </div>

            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 14px;">
  
                <p style="margin: 5px 0;"><strong>User Phone:</strong> <a href="tel:${user.mobile}" style="color: #254D7F; text-decoration: none; font-weight: bold;">${user.mobile || 'N/A'}</a></p>
                ${dto.address ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${dto.address}</p>` : ''}
            </div>

            ${mapUrl ? `
            <div style="text-align: center; margin-top: 25px;">
                <a href="${mapUrl}" style="background: #254D7F; color: white; padding: 14px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Live Location on Map</a>
            </div>` : ''}

            <p style="font-size: 12px; color: #94a3b8; margin-top: 30px; text-align: center; border-top: 1px solid #f1f5f9; pt: 20px;">
                This alert was sent via RECOOP MOBILE Emergency System. ${isDanger ? '<strong>Please contact the user immediately.</strong>' : ''}
            </p>
        </div>
    </div>`;

            try {
              await this.emailService.sendMailInternal(contact.email, subject, html);
              this.logger.log(`Successfully sent emergency email to ${contact.email}`);
            } catch (error) {
              this.logger.error(`Failed to send emergency email to ${contact.email}: ${error.message}`);
                            // <p style="margin: 5px 0;"><strong>Status:</strong> ${dto.status}</p>
            }
          }
          this.logger.log(`Completed emergency broadcast for user ${userId}`);
        } catch (error) {
          this.logger.error(`Failed emergency broadcast for user ${userId}: ${error.message}`);
          throw error;
        }
        break;
      }
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
