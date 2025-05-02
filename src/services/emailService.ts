import * as postmark from 'postmark';
import hbs from 'handlebars';
import fs from 'fs';
import path from 'path';

class EmailService {
    private client: postmark.ServerClient;

    constructor() {
        const apiToken = process.env.POSTMARK_API_TOKEN || 'dc0b5523-a9e2-48a1-8855-77c59fc65d3e';
        console.log(apiToken)
        if (!apiToken) {
            throw new Error('POSTMARK_API_TOKEN is not set');
        }
        this.client = new postmark.ServerClient(apiToken);
    }

    private async compileTemplate(templateName: string, data: any): Promise<string> {
        const filePath = path.join(__dirname, '..', 'templates', `${templateName}.hbs`);
        const templateSource = fs.readFileSync(filePath, 'utf8');
        const template = hbs.compile(templateSource);
        return template(data);
    }

    async sendEmail(to: string, subject: string, templateName: string, templateData: any) {
        const html = await this.compileTemplate(templateName, templateData);

        await this.client.sendEmail({
            From: process.env.EMAIL_FROM || 'support@fanect.com',
            To: to,
            Subject: subject,
            HtmlBody: html,
        });
    }
}

export default new EmailService();
