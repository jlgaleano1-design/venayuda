import nodemailer from "nodemailer";

type DonationReportEmail = {
  campaignTitle: string;
  recipientEmail: string;
  donorName?: string;
  donorEmail?: string;
  amount: string;
  currency: string;
  transferDate?: string;
  paymentMethod?: string;
  transferReference?: string;
  proofFileName?: string;
  publicMessage?: string;
};

type DonationConfirmationEmail = {
  campaignTitle: string;
  campaignUrl: string;
  recipientEmail: string;
};

function createMailer() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !from) {
    return null;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  return { from, transporter };
}

export async function sendDonationReportEmail(report: DonationReportEmail) {
  const mailer = createMailer();

  if (!mailer) {
    return { sent: false, reason: "SMTP no configurado" };
  }

  const donorName = report.donorName || "Donante anonimo";
  const lines = [
    `Campaña: ${report.campaignTitle}`,
    `Donante: ${donorName}`,
    report.donorEmail ? `Correo electrónico privado: ${report.donorEmail}` : null,
    `Monto reportado: ${report.amount} ${report.currency}`,
    report.transferDate ? `Fecha: ${report.transferDate}` : null,
    report.paymentMethod ? `Método usado: ${report.paymentMethod}` : null,
    report.transferReference
      ? `Referencia / tracking: ${report.transferReference}`
      : null,
    report.proofFileName ? `Comprobante adjunto en formulario: ${report.proofFileName}` : null,
    report.publicMessage ? `Mensaje público: ${report.publicMessage}` : null,
  ].filter(Boolean);

  await mailer.transporter.sendMail({
    from: mailer.from,
    to: report.recipientEmail,
    subject: `Nuevo aviso de donación: ${report.campaignTitle}`,
    text: [
      "Hola,",
      "",
      "Alguien avisó que donó a tu campaña en Vendonar.",
      "",
      ...lines,
      "",
      "Este correo es solo una notificación. La donación se hizo por fuera de Vendonar y debe revisarse manualmente.",
    ].join("\n"),
  });

  return { sent: true };
}

export async function sendDonationConfirmationEmail(
  email: DonationConfirmationEmail,
) {
  const mailer = createMailer();

  if (!mailer) {
    return { sent: false, reason: "SMTP no configurado" };
  }

  await mailer.transporter.sendMail({
    from: mailer.from,
    to: email.recipientEmail,
    subject: "Recibimos tu reporte de aporte",
    text: [
      "Hola,",
      "",
      `Tu reporte de aporte para ${email.campaignTitle} fue enviado correctamente.`,
      "",
      "Más adelante podrás seguir los updates de lo que se está realizando con tu dinero en el link de la campaña:",
      email.campaignUrl,
      "",
      "También puedes compartir Vendonar en tus redes:",
      "https://vendonar.com",
      "",
      "Gracias por ayudar directo.",
    ].join("\n"),
  });

  return { sent: true };
}
