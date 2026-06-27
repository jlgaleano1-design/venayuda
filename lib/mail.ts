import nodemailer from "nodemailer";
import {
  escapeHtml,
  renderBrandEmail,
  renderEmailButton,
  renderInfoList,
  renderPanel,
  renderSecondaryLink,
} from "@/lib/email-brand";

export type DonationReportEmail = {
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
  reviewUrl?: string;
  approvalUrl?: string;
  rejectionUrl?: string;
};

export type DonationConfirmationEmail = {
  campaignTitle: string;
  campaignUrl: string;
  recipientEmail: string;
};

export type CampaignReviewEmail = {
  approvalUrl: string;
  affectedArea: string;
  contactEmail: string;
  description: string;
  instagramHandle?: string;
  organization?: string;
  paymentMethods: {
    accountHolder: string;
    accountReference: string;
    bank: string;
    methodName: string;
    receivingCategory: string;
    transferInstructions?: string;
  }[];
  publicCampaignUrl: string;
  recipientEmail: string;
  reviewUrl: string;
  responsibleName: string;
  slug: string;
  title: string;
};

export type CampaignApprovedEmail = {
  campaignTitle: string;
  creatorAccessUrl: string;
  publicCampaignUrl: string;
  recipientEmail: string;
};

export type PurchaseReviewEmail = {
  approvalUrl: string;
  amount: string;
  campaignTitle: string;
  currency: string;
  description?: string;
  purchaseDate: string;
  recipientEmail: string;
  rejectionUrl: string;
  title: string;
  vendor?: string;
};

export type PurchaseImpactEmail = {
  amount: string;
  campaignTitle: string;
  campaignUrl: string;
  currency: string;
  description?: string;
  purchaseDate?: string | null;
  purchaseTitle: string;
  recipientEmail: string;
};

function createMailer() {
  const resendApiKey = process.env.RESEND_API_KEY;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM ?? process.env.SMTP_FROM;

  if (resendApiKey && from) {
    return {
      from,
      transporter: {
        async sendMail(message: {
          from: string;
          html?: string;
          subject: string;
          text?: string;
          to: string;
        }) {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
          });

          if (!response.ok) {
            throw new Error(`Resend error: ${await response.text()}`);
          }
        },
      },
    };
  }

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
    report.reviewUrl ? `Revisar: ${report.reviewUrl}` : null,
    report.approvalUrl ? `Aprobar donación: ${report.approvalUrl}` : null,
    report.rejectionUrl ? `Rechazar donación: ${report.rejectionUrl}` : null,
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
    html: renderBrandEmail({
      preview: `Nuevo aviso de donación para ${report.campaignTitle}`,
      title: "Nuevo aviso de donación",
      children: [
        `<p>Alguien avisó que donó a <strong>${escapeHtml(report.campaignTitle)}</strong>.</p>`,
        renderInfoList([
          { label: "Donante", value: donorName },
          { label: "Correo privado", value: report.donorEmail },
          { label: "Monto", value: `${report.amount} ${report.currency}` },
          { label: "Fecha", value: report.transferDate },
          { label: "Método", value: report.paymentMethod },
          { label: "Referencia", value: report.transferReference },
          { label: "Comprobante", value: report.proofFileName },
          { label: "Mensaje público", value: report.publicMessage },
        ]),
        "<p>La donación se hizo por fuera de Vendonar y debe revisarse manualmente.</p>",
        report.approvalUrl
          ? `<p style="margin-top:24px;">${renderEmailButton("Aprobar donación", report.approvalUrl)}</p>`
          : "",
        report.rejectionUrl
          ? `<p style="margin-top:14px;font-size:13px;">Si no la reconoces: ${renderSecondaryLink("rechazar donación", report.rejectionUrl)}</p>`
          : "",
      ].join(""),
    }),
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
    html: renderBrandEmail({
      preview: `Recibimos tu reporte de aporte para ${email.campaignTitle}`,
      title: "Recibimos tu reporte",
      children: [
        `<p>Tu reporte de aporte para <strong>${escapeHtml(email.campaignTitle)}</strong> fue enviado correctamente.</p>`,
        "<p>Más adelante podrás seguir los updates de lo que se está realizando con tu dinero en el link de la campaña.</p>",
        `<p>${renderEmailButton("Ver campaña", email.campaignUrl)}</p>`,
      ].join(""),
    }),
  });

  return { sent: true };
}

export async function sendCampaignReviewEmail(email: CampaignReviewEmail) {
  const mailer = createMailer();

  if (!mailer) {
    return { sent: false, reason: "Email no configurado" };
  }

  const paymentText = email.paymentMethods
    .map((method, index) =>
      [
        `Método ${index + 1}`,
        `Dona desde: ${method.receivingCategory}`,
        `Método: ${method.methodName}`,
        `Titular: ${method.accountHolder}`,
        `Banco: ${method.bank}`,
        `Cuenta / correo: ${method.accountReference}`,
        method.transferInstructions
          ? `Instrucciones: ${method.transferInstructions}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

  await mailer.transporter.sendMail({
    from: mailer.from,
    to: email.recipientEmail,
    subject: `Solicitud de campaña por aprobar: ${email.title}`,
    text: [
      "Nueva solicitud de campaña en Vendonar.",
      "",
      `Título: ${email.title}`,
      `Link solicitado: ${email.publicCampaignUrl}`,
      `Responsable: ${email.responsibleName}`,
      email.organization ? `Organización: ${email.organization}` : null,
      `Correo: ${email.contactEmail}`,
      email.instagramHandle ? `Instagram: @${email.instagramHandle}` : null,
      `Zona afectada: ${email.affectedArea}`,
      "",
      "Descripción:",
      email.description,
      "",
      "Métodos de pago:",
      paymentText,
      "",
      "Aprobar con un click:",
      email.approvalUrl,
      "",
      "Revisar detalles o rechazar:",
      email.reviewUrl,
    ]
      .filter(Boolean)
      .join("\n"),
    html: renderBrandEmail({
      preview: `Solicitud de campaña por aprobar: ${email.title}`,
      title: "Solicitud de campaña",
      children: [
        `<p>Hay una nueva solicitud lista para revisar. El botón principal aprueba la campaña directamente.</p>`,
        renderInfoList([
          { label: "Campaña", value: email.title },
          { label: "Link solicitado", value: email.publicCampaignUrl },
          { label: "Responsable", value: email.responsibleName },
          { label: "Organización", value: email.organization },
          { label: "Correo", value: email.contactEmail },
          {
            label: "Instagram",
            value: email.instagramHandle ? `@${email.instagramHandle}` : null,
          },
          { label: "Zona afectada", value: email.affectedArea },
        ]),
        `<h2 style="font-size:18px;margin:22px 0 8px;">Descripción</h2>`,
        `<p>${escapeHtml(email.description)}</p>`,
        `<h2 style="font-size:18px;margin:22px 0 8px;">Métodos de pago</h2>`,
        ...email.paymentMethods.map((method, index) =>
          renderPanel(
            [
              `<p style="margin:0 0 10px;font-weight:900;">Método ${index + 1}</p>`,
              renderInfoList([
                { label: "Dona desde", value: method.receivingCategory },
                { label: "Método", value: method.methodName },
                { label: "Titular", value: method.accountHolder },
                { label: "Banco", value: method.bank },
                { label: "Cuenta / correo", value: method.accountReference },
                { label: "Instrucciones", value: method.transferInstructions },
              ]),
            ].join(""),
          ),
        ),
        `<p style="margin-top:24px;">${renderEmailButton("Aprobar campaña", email.approvalUrl)}</p>`,
        `<p style="margin-top:14px;font-size:13px;">Para ver detalles completos o rechazar: ${renderSecondaryLink("abrir revisión", email.reviewUrl)}</p>`,
      ].join(""),
    }),
  });

  return { sent: true };
}

export async function sendCampaignApprovedEmail(email: CampaignApprovedEmail) {
  const mailer = createMailer();

  if (!mailer) {
    return { sent: false, reason: "Email no configurado" };
  }

  await mailer.transporter.sendMail({
    from: mailer.from,
    to: email.recipientEmail,
    subject: `Tu campaña fue aprobada: ${email.campaignTitle}`,
    text: [
      "Hola,",
      "",
      `Tu campaña "${email.campaignTitle}" fue aprobada y ya puede compartirse.`,
      "",
      "Link público:",
      email.publicCampaignUrl,
      "",
      "Link privado para subir novedades de compras:",
      email.creatorAccessUrl,
      "",
      "Guarda este link privado. No lo publiques.",
    ].join("\n"),
    html: renderBrandEmail({
      preview: `Tu campaña ${email.campaignTitle} fue aprobada`,
      title: "Campaña aprobada",
      children: [
        `<p>Tu campaña <strong>${escapeHtml(email.campaignTitle)}</strong> fue aprobada y ya puede compartirse.</p>`,
        `<p>${renderEmailButton("Ver campaña pública", email.publicCampaignUrl)}</p>`,
        renderPanel(
          [
            `<p style="margin:0 0 8px;font-weight:900;">Link privado del creador</p>`,
            `<p style="margin:0;">${renderSecondaryLink(email.creatorAccessUrl, email.creatorAccessUrl)}</p>`,
            `<p style="margin:12px 0 0;color:#626866;font-size:13px;">Guarda este link privado. No lo publiques.</p>`,
          ].join(""),
        ),
      ].join(""),
    }),
  });

  return { sent: true };
}

export async function sendPurchaseReviewEmail(email: PurchaseReviewEmail) {
  const mailer = createMailer();

  if (!mailer) {
    return { sent: false, reason: "Email no configurado" };
  }

  await mailer.transporter.sendMail({
    from: mailer.from,
    to: email.recipientEmail,
    subject: `Compra por aprobar: ${email.title}`,
    text: [
      "Nueva compra reportada en Vendonar.",
      "",
      `Campaña: ${email.campaignTitle}`,
      `Compra: ${email.title}`,
      `Monto: ${email.amount} ${email.currency}`,
      `Fecha: ${email.purchaseDate}`,
      email.vendor ? `Proveedor: ${email.vendor}` : null,
      email.description ? `Descripción: ${email.description}` : null,
      "",
      "Aprobar compra:",
      email.approvalUrl,
      "",
      "Rechazar compra:",
      email.rejectionUrl,
    ]
      .filter(Boolean)
      .join("\n"),
    html: renderBrandEmail({
      preview: `Compra por aprobar: ${email.title}`,
      title: "Compra por aprobar",
      children: [
        `<p>Hay una nueva compra reportada para <strong>${escapeHtml(email.campaignTitle)}</strong>.</p>`,
        renderInfoList([
          { label: "Compra", value: email.title },
          { label: "Monto", value: `${email.amount} ${email.currency}` },
          { label: "Fecha", value: email.purchaseDate },
          { label: "Proveedor", value: email.vendor },
          { label: "Descripción", value: email.description },
        ]),
        `<p style="margin-top:24px;">${renderEmailButton("Aprobar compra", email.approvalUrl)}</p>`,
        `<p style="margin-top:14px;font-size:13px;">Si algo no cuadra: ${renderSecondaryLink("rechazar compra", email.rejectionUrl)}</p>`,
      ].join(""),
    }),
  });

  return { sent: true };
}

export async function sendPurchaseImpactEmail(email: PurchaseImpactEmail) {
  const mailer = createMailer();

  if (!mailer) {
    return { sent: false, reason: "Email no configurado" };
  }

  await mailer.transporter.sendMail({
    from: mailer.from,
    to: email.recipientEmail,
    subject: `Tu donación ayudó a comprar: ${email.purchaseTitle}`,
    text: [
      "Hola,",
      "",
      `La campaña ${email.campaignTitle} registró una compra aprobada: ${email.purchaseTitle}.`,
      `Monto: ${email.amount} ${email.currency}`,
      email.purchaseDate ? `Fecha: ${email.purchaseDate}` : null,
      email.description ? `Detalle: ${email.description}` : null,
      "",
      "Puedes verla en la campaña:",
      email.campaignUrl,
      "",
      "Gracias por ayudar directo.",
    ]
      .filter(Boolean)
      .join("\n"),
    html: renderBrandEmail({
      preview: `Compra aprobada en ${email.campaignTitle}`,
      title: "Tu aporte ya tiene update",
      children: [
        `<p>La campaña <strong>${escapeHtml(email.campaignTitle)}</strong> registró una compra aprobada.</p>`,
        renderInfoList([
          { label: "Compra", value: email.purchaseTitle },
          { label: "Monto", value: `${email.amount} ${email.currency}` },
          { label: "Fecha", value: email.purchaseDate ?? undefined },
          { label: "Detalle", value: email.description },
        ]),
        `<p>${renderEmailButton("Ver campaña", email.campaignUrl)}</p>`,
      ].join(""),
    }),
  });

  return { sent: true };
}
