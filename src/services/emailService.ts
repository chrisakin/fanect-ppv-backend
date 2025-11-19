import * as postmark from 'postmark';
import hbs from 'handlebars';
import fs from 'fs';
import path from 'path';


/**
 * Service for sending transactional emails using Postmark and Handlebars templates.
 */
class EmailService {
    private client: postmark.ServerClient;

    /**
     * Initializes the Postmark client using the POSTMARK_API_TOKEN environment variable.
     * @throws {Error} If POSTMARK_API_TOKEN is not set.
     */
    constructor() {
        const apiToken = process.env.POSTMARK_API_TOKEN;
        console.log(apiToken)
        if (!apiToken) {
            throw new Error('POSTMARK_API_TOKEN is not set');
        }
        this.client = new postmark.ServerClient(apiToken);
    }

    /**
     * Compiles a Handlebars template with the provided data.
     * @param {string} templateName - The name of the template file (without extension).
     * @param {any} data - The data to inject into the template.
     * @returns {Promise<string>} The compiled HTML string.
     */
    private async compileTemplate(templateName: string, data: any): Promise<string> {
        const filePath = path.join(__dirname, '..', 'templates', `${templateName}.hbs`);
        const templateSource = fs.readFileSync(filePath, 'utf8');
        const template = hbs.compile(templateSource);
        return template(data);
    }

    /**
     * Sends an email using a compiled Handlebars template.
     * @param {string} to - Recipient email address.
     * @param {string} subject - Email subject line.
     * @param {string} templateName - Name of the template to use.
     * @param {any} templateData - Data to inject into the template.
     * @returns {Promise<void>} Resolves when the email is sent.
     */
    async sendEmail(to: string, subject: string, templateName: string, templateData: any): Promise<void> {
        const html = await this.compileTemplate(templateName, templateData);

        await this.client.sendEmail({
            From: process.env.EMAIL_FROM as string,
            To: to,
            Subject: subject,
            HtmlBody: html,
        });
    }
}

export default new EmailService();
