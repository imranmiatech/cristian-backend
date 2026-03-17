import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class EmailService {
    private transporter;

    constructor(
        private config: ConfigService,
        @InjectQueue('email') private emailQueue: Queue,
    ) {
        const smtpConfig = this.config.get('smtp');

        this.transporter = nodemailer.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.port === 465,
            auth: {
                user: smtpConfig.user,
                pass: smtpConfig.pass,
            },
        });
    }

    async sendEmail(to: string, subject: string, html: string) {
        await this.emailQueue.add('send-email', {
            to,
            subject,
            html,
        });
    }

    async queueEmergencyBroadcast(data: any) {
        await this.emailQueue.add('emergency-broadcast', data);
    }

    async sendMailInternal(to: string, subject: string, html: string) {
        const smtpConfig = this.config.get('smtp');

        return this.transporter.sendMail({
            from: smtpConfig.from,
            to,
            subject,
            html,
        });
    }
}
