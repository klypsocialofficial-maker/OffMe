import { Request, Response } from 'express';
import admin from 'firebase-admin';
import axios from 'axios';

export default async function sendAuthEmail(req: Request, res: Response) {
  try {
    const { email, type } = req.body; 
    
    if (!email || !type) {
      return res.status(400).json({ error: "Missing email or type" });
    }
    
    const actionCodeSettings = {
      url: `https://offme.fun/auth/action`,
      handleCodeInApp: false,
    };
    
    let link = "";
    let subject = "";
    let content = "";
    
    if (type === 'reset') {
      const generatedLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
      const urlParams = new URL(generatedLink).searchParams;
      link = `https://offme.fun/auth/action?mode=resetPassword&oobCode=${urlParams.get('oobCode')}`;
      
      subject = "Redefinição de Senha";
      content = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
          <h2>Redefinição de Senha</h2>
          <p>Olá,</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
          <p>Clique no link abaixo para criar uma nova senha:</p>
          <p><a href="${link}" style="display:inline-block; padding: 10px 20px; background-color: #3b82f6; color: #fff; text-decoration: none; border-radius: 5px;">Redefinir Senha</a></p>
          <p>Ou copie e cole o link no seu navegador:</p>
          <p style="word-break: break-all; color: #666;">${link}</p>
          <p>Se você não solicitou, por favor ignore este e-mail.</p>
        </div>
        <style>
          /* Tenta ocultar a tag padrao do mailersend se for injetada via classe genérica */
          div[style*="text-align: center;"] { display: none !important; }
        </style>
      `;
    } else if (type === 'verify') {
      const generatedLink = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);
      const urlParams = new URL(generatedLink).searchParams;
      link = `https://offme.fun/auth/action?mode=verifyEmail&oobCode=${urlParams.get('oobCode')}`;
      
      subject = "Verifique seu E-mail";
      content = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
          <h2>Verifique seu E-mail</h2>
          <p>Olá,</p>
          <p>Obrigado por se juntar a nós! Para concluir seu registro, por favor verifique seu endereço de e-mail.</p>
          <p>Clique no link abaixo:</p>
          <p><a href="${link}" style="display:inline-block; padding: 10px 20px; background-color: #3b82f6; color: #fff; text-decoration: none; border-radius: 5px;">Verificar E-mail</a></p>
          <p>Ou copie e cole o link no seu navegador:</p>
          <p style="word-break: break-all; color: #666;">${link}</p>
        </div>
        <style>
          /* Tenta ocultar a tag padrao do mailersend se for injetada via classe genérica */
          div[style*="text-align: center;"] { display: none !important; }
        </style>
      `;
    } else {
      return res.status(400).json({ error: "Invalid type" });
    }
    
    const apiKey = process.env.MAILERSEND_API_KEY;
    if (!apiKey) {
      console.warn("MAILERSEND_API_KEY environment variable is not set. Simulating email send for dev.");
      console.log("Simulated Email:", { to: email, subject, link });
      // We still return success so the frontend doesn't break in dev if they didn't add the key yet.
      return res.json({ success: true, simulated: true, link });
    }
    
    await axios.post('https://api.mailersend.com/v1/email', {
      from: {
        email: "suporte@offme.fun", // Note: The domain offme.fun must be verified in MailerSend
        name: "Equipe Off Me"
      },
      to: [
        {
          email: email
        }
      ],
      subject: subject,
      html: content,
      settings: {
        track_clicks: false,
        track_opens: false,
        track_content: false
      }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error sending auth email via MailerSend:", error.response?.data || error.message || error);
    res.status(500).json({ error: error.message || "Failed to send email" });
  }
}
