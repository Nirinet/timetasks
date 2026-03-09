import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

/**
 * Email service using Nodemailer.
 * Reads SMTP config from environment variables.
 * If SMTP_ENABLED is not 'true', logs the intent instead of sending.
 */
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private enabled: boolean;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.enabled = process.env.SMTP_ENABLED === 'true';
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@timetask.com';
    this.fromName = process.env.FROM_NAME || 'TimeTask System';

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      logger.info('📧 Email service initialized (SMTP enabled)');
    } else {
      logger.info('📧 Email service initialized (SMTP disabled - logging only)');
    }
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.enabled || !this.transporter) {
      logger.info('📧 [Email would be sent]', { to, subject });
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html,
      });
      logger.info('📧 Email sent successfully', { to, subject });
    } catch (error) {
      logger.error('📧 Failed to send email:', { to, subject, error });
      // Don't throw - email failures should not crash the app
    }
  }

  /**
   * Send a password reset email with a reset link.
   */
  async sendPasswordResetEmail(to: string, resetUrl: string, firstName: string): Promise<void> {
    const subject = 'איפוס סיסמה - TimeTask';
    const html = `
      <div dir="rtl" style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2196F3; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0;">TimeTask</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333;">שלום ${firstName},</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            קיבלנו בקשה לאיפוס הסיסמה שלך.
            לחץ על הכפתור למטה כדי לבחור סיסמה חדשה:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="background: #2196F3; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
              איפוס סיסמה
            </a>
          </div>
          <p style="color: #999; font-size: 14px;">
            הקישור תקף לשעה אחת בלבד.<br>
            אם לא ביקשת לאפס את הסיסמה, ניתן להתעלם מהודעה זו.
          </p>
        </div>
      </div>
    `;
    await this.send(to, subject, html);
  }

  /**
   * Send a forgotten timer alert email.
   */
  async sendTimerAlertEmail(to: string, taskTitle: string, durationMinutes: number, firstName: string): Promise<void> {
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    const durationStr = hours > 0 ? `${hours} שעות ו-${mins} דקות` : `${mins} דקות`;

    const subject = `התראת טיימר פעיל - ${taskTitle}`;
    const html = `
      <div dir="rtl" style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #ff9800; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0;">⏱️ טיימר פעיל</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333;">שלום ${firstName},</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            יש לך טיימר פעיל כבר <strong>${durationStr}</strong> במשימה:
          </p>
          <div style="background: #fff3e0; padding: 15px; border-radius: 6px; border-right: 4px solid #ff9800; margin: 20px 0;">
            <strong style="color: #e65100;">${taskTitle}</strong>
          </div>
          <p style="color: #666; font-size: 14px;">
            אם סיימת לעבוד, אנא עצור את הטיימר במערכת.
          </p>
        </div>
      </div>
    `;
    await this.send(to, subject, html);
  }

  /**
   * Send a deadline alert email (approaching or exceeded).
   */
  async sendDeadlineAlertEmail(
    to: string,
    taskTitle: string,
    deadline: Date,
    firstName: string,
    isOverdue: boolean
  ): Promise<void> {
    const deadlineStr = deadline.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const subject = isOverdue
      ? `⚠️ חריגה מדדליין - ${taskTitle}`
      : `📅 דדליין מתקרב - ${taskTitle}`;

    const headerColor = isOverdue ? '#f44336' : '#ff9800';
    const headerText = isOverdue ? '⚠️ חריגה מדדליין' : '📅 דדליין מתקרב';

    const html = `
      <div dir="rtl" style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${headerColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0;">${headerText}</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333;">שלום ${firstName},</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            ${isOverdue
              ? `המשימה הבאה חרגה מהדדליין (${deadlineStr}):`
              : `למשימה הבאה דדליין ב-${deadlineStr}:`
            }
          </p>
          <div style="background: ${isOverdue ? '#ffebee' : '#fff3e0'}; padding: 15px; border-radius: 6px; border-right: 4px solid ${headerColor}; margin: 20px 0;">
            <strong style="color: ${isOverdue ? '#c62828' : '#e65100'};">${taskTitle}</strong>
          </div>
        </div>
      </div>
    `;
    await this.send(to, subject, html);
  }
}
