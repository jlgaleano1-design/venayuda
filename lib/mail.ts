import nodemailer, { type SendMailOptions } from "nodemailer";
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
  reviewUrl?: string;
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

export type CampaignSpamAlertEmail = {
  adminUrl: string;
  campaignId: string;
  contactEmail: string;
  publicCampaignUrl: string;
  recipientEmail: string;
  responsibleName: string;
  riskFlags: string[];
  slug: string;
  title: string;
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

const creatorAccessInstructions =
  "Guarda este link y utilízalo para dar updates sobre cómo utilizas tus donaciones. Cada vez que subas algo, se le avisará a las personas que te han donado.";

function createMailer() {
  const provider = (process.env.EMAIL_PROVIDER ?? "smtp").toLowerCase();
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;

  if (provider === "smtp" && host && from && user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    return { from, kind: "smtp" as const, transporter };
  }

  return null;
}

async function sendMail(
  mailer: NonNullable<ReturnType<typeof createMailer>>,
  options: SendMailOptions,
) {
  await mailer.transporter.sendMail(options);
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
    `Monto reportado: ${report.amount} ${report.currency}`,
    report.transferDate ? `Fecha: ${report.transferDate}` : null,
    report.paymentMethod ? `Método usado: ${report.paymentMethod}` : null,
    report.transferReference
      ? `Referencia / tracking: ${report.transferReference}`
      : null,
    report.proofFileName ? `Comprobante adjunto en formulario: ${report.proofFileName}` : null,
    report.publicMessage ? `Mensaje público: ${report.publicMessage}` : null,
    report.reviewUrl ? `Revisar: ${report.reviewUrl}` : null,
  ].filter(Boolean);
  const actionLines = [
    report.approvalUrl ? `Aprobar donación: ${report.approvalUrl}` : null,
    report.rejectionUrl ? `Rechazar donación: ${report.rejectionUrl}` : null,
  ].filter(Boolean);

  await sendMail(mailer, {
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
      "Este correo es solo una notificación. La donación se hizo por fuera de Vendonar y debe revisarse manualmente para que la apruebes.",
      "",
      ...actionLines,
    ].join("\n"),
    html: renderBrandEmail({
      preview: `Nuevo aviso de donación para ${report.campaignTitle}`,
      title: "Nuevo aviso de donación",
      children: [
        `<p>Alguien avisó que donó a <strong>${escapeHtml(report.campaignTitle)}</strong>.</p>`,
        renderInfoList([
          { label: "Donante", value: donorName },
          { label: "Monto", value: `${report.amount} ${report.currency}` },
          { label: "Fecha", value: report.transferDate },
          { label: "Método", value: report.paymentMethod },
          { label: "Referencia", value: report.transferReference },
          { label: "Comprobante", value: report.proofFileName },
          { label: "Mensaje público", value: report.publicMessage },
        ]),
        "<p>Este correo es solo una notificación. La donación se hizo por fuera de Vendonar y debe revisarse manualmente para que la apruebes.</p>",
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

  await sendMail(mailer, {
    from: mailer.from,
    to: email.recipientEmail,
    subject: "Tu ayuda ya está en camino",
    text: [
      "Hola,",
      "",
      `Recibimos tu reporte de aporte para ${email.campaignTitle}.`,
      "",
      "Gracias por ayudar a Venezuela de forma directa. En estos días, cada aporte puede significar comida, medicinas, refugio o apoyo urgente para alguien que lo necesita.",
      "",
      "Puedes seguir las actualizaciones de la campaña aquí:",
      email.campaignUrl,
      "",
      "También puedes compartir Vendonar para que más personas puedan ayudar:",
      "https://vendonar.org",
      "",
      "Gracias por estar cerca.",
      "Vendonar",
    ].join("\n"),
    html: renderBrandEmail({
      preview: `Tu ayuda ya está en camino para ${email.campaignTitle}`,
      title: "Tu ayuda ya está en camino",
      children: [
        `<p>Recibimos tu reporte de aporte para <strong>${escapeHtml(email.campaignTitle)}</strong>.</p>`,
        "<p>Gracias por ayudar a Venezuela de forma directa. En estos días, cada aporte puede significar comida, medicinas, refugio o apoyo urgente para alguien que lo necesita.</p>",
        "<p>Puedes seguir las actualizaciones de la campaña aquí:</p>",
        `<p>${renderEmailButton("Ver campaña", email.campaignUrl)}</p>`,
        `<p>También puedes compartir ${renderSecondaryLink("Vendonar", "https://vendonar.org")} para que más personas puedan ayudar.</p>`,
        "<p>Gracias por estar cerca.<br />Vendonar</p>",
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

  await sendMail(mailer, {
    from: mailer.from,
    to: email.recipientEmail,
    subject: `Confirma tu campaña en Vendonar: ${email.title}`,
    text: [
      "Hola,",
      "",
      `Creamos la campaña "${email.title}" en Vendonar.`,
      "",
      "Para publicarla, confirma este correo:",
      email.approvalUrl,
      "",
      "Link solicitado:",
      email.publicCampaignUrl,
      "",
      "Si tú no creaste esta campaña, puedes ignorar este correo.",
      "",
      "Vendonar no procesa pagos; solo ayuda a publicar instrucciones, reportar aportes y mantener seguimiento transparente.",
    ]
      .filter(Boolean)
      .join("\n"),
    html: renderBrandEmail({
      preview: `Confirma tu campaña ${email.title}`,
      title: "Confirma tu campaña",
      children: [
        `<p>Creamos la campaña <strong>${escapeHtml(email.title)}</strong> en Vendonar.</p>`,
        `<p>Para publicarla, confirma que este correo pertenece a la persona responsable.</p>`,
        `<p style="margin-top:24px;">${renderEmailButton("Confirmar y publicar", email.approvalUrl)}</p>`,
        renderInfoList([
          { label: "Campaña", value: email.title },
          { label: "Link solicitado", value: email.publicCampaignUrl },
          { label: "Responsable", value: email.responsibleName },
          { label: "Correo", value: email.contactEmail },
        ]),
        `<p style="color:#626866;font-size:13px;">Si tú no creaste esta campaña, puedes ignorar este correo.</p>`,
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

  await sendMail(mailer, {
    from: mailer.from,
    to: email.recipientEmail,
    subject: `Tu campaña ya está publicada: ${email.campaignTitle}`,
    text: [
      "Hola,",
      "",
      `Tu campaña "${email.campaignTitle}" ya está publicada y puede compartirse.`,
      "",
      "Link público:",
      email.publicCampaignUrl,
      "",
      "Link privado del creador - NO COMPARTIR:",
      email.creatorAccessUrl,
      "",
      creatorAccessInstructions,
    ].join("\n"),
    html: renderBrandEmail({
      preview: `Tu campaña ${email.campaignTitle} ya está publicada`,
      title: "Campaña publicada",
      children: [
        `<p>Tu campaña <strong>${escapeHtml(email.campaignTitle)}</strong> ya está publicada y puede compartirse.</p>`,
        `<p>${renderEmailButton("Ver campaña pública", email.publicCampaignUrl)}</p>`,
        renderPanel(
          [
            `<p style="margin:0 0 8px;font-weight:900;">Link privado del creador · <strong>NO COMPARTIR</strong></p>`,
            `<p style="margin:0;">${renderSecondaryLink(email.creatorAccessUrl, email.creatorAccessUrl)}</p>`,
            `<p style="margin:12px 0 0;color:#626866;font-size:13px;">${creatorAccessInstructions}</p>`,
          ].join(""),
        ),
      ].join(""),
    }),
  });

  return { sent: true };
}

export async function sendCampaignSpamAlertEmail(email: CampaignSpamAlertEmail) {
  const mailer = createMailer();

  if (!mailer) {
    return { sent: false, reason: "Email no configurado" };
  }

  await sendMail(mailer, {
    from: mailer.from,
    to: email.recipientEmail,
    subject: `Revisar campaña sospechosa: ${email.title}`,
    text: [
      "Nueva campaña marcada como sospechosa en Vendonar.",
      "",
      `Campaña: ${email.title}`,
      `Responsable: ${email.responsibleName}`,
      `Correo: ${email.contactEmail}`,
      `Slug: ${email.slug}`,
      `ID: ${email.campaignId}`,
      "",
      "Señales:",
      ...email.riskFlags.map((flag) => `- ${flag}`),
      "",
      "Ver campaña:",
      email.publicCampaignUrl,
      "",
      "Revisar en admin:",
      email.adminUrl,
    ].join("\n"),
    html: renderBrandEmail({
      preview: `Revisar campaña sospechosa: ${email.title}`,
      title: "Campaña sospechosa",
      children: [
        `<p>Vendonar publicó una campaña con señales de posible spam.</p>`,
        renderInfoList([
          { label: "Campaña", value: email.title },
          { label: "Responsable", value: email.responsibleName },
          { label: "Correo", value: email.contactEmail },
          { label: "Slug", value: email.slug },
          { label: "ID", value: email.campaignId },
          { label: "Señales", value: email.riskFlags.join(", ") },
        ]),
        `<p style="margin-top:24px;">${renderEmailButton("Abrir admin", email.adminUrl)}</p>`,
        `<p style="margin-top:14px;font-size:13px;">También puedes ${renderSecondaryLink("ver la campaña pública", email.publicCampaignUrl)}.</p>`,
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

  await sendMail(mailer, {
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

  const amountLine = formatPurchaseImpactAmount(email);
  const description = email.description?.trim();

  await sendMail(mailer, {
    from: mailer.from,
    to: email.recipientEmail,
    subject: `Tu donación ya se convirtió en ayuda: ${email.purchaseTitle}`,
    text: [
      "Hola,",
      "",
      `Queríamos contarte algo concreto sobre la campaña ${email.campaignTitle}: parte de las donaciones ya se usó para ${email.purchaseTitle}.`,
      amountLine,
      description,
      "",
      "Puedes ver la actualización completa, con las fotos y comprobantes disponibles, aquí:",
      email.campaignUrl,
      "",
      "Gracias por estar del otro lado de esta ayuda. Cada aporte suma y permite responder a necesidades reales, de forma directa.",
      "",
      "Vendonar",
    ]
      .filter(Boolean)
      .join("\n"),
    html: renderBrandEmail({
      preview: `Tu donación ya se convirtió en ayuda: ${email.purchaseTitle}`,
      title: "Tu donación ya se convirtió en ayuda",
      children: [
        `<p>Queríamos contarte algo concreto sobre la campaña <strong>${escapeHtml(email.campaignTitle)}</strong>: parte de las donaciones ya se usó para <strong>${escapeHtml(email.purchaseTitle)}</strong>.</p>`,
        amountLine
          ? `<p style="margin:22px 0 0;font-size:24px;font-weight:900;color:#2D5D5E;">${escapeHtml(amountLine)}</p>`
          : "",
        description
          ? `<p style="margin-top:14px;">${escapeHtml(description)}</p>`
          : "",
        "<p>Puedes ver la actualización completa, con las fotos y comprobantes disponibles, aquí:</p>",
        `<p>${renderEmailButton("Ver campaña", email.campaignUrl)}</p>`,
        "<p>Gracias por estar del otro lado de esta ayuda. Cada aporte suma y permite responder a necesidades reales, de forma directa.</p>",
        "<p>Vendonar</p>",
      ].join(""),
    }),
  });

  return { sent: true };
}

function formatPurchaseImpactAmount(email: PurchaseImpactEmail) {
  const amount = email.amount?.trim();
  const currency = email.currency?.trim();

  if (!amount || !currency) {
    return null;
  }

  return `${amount} ${currency}`;
}
