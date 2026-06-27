const brand = {
  background: "#FFFCF8",
  border: "#E6E0D8",
  card: "#FFFFFF",
  ink: "#2A3534",
  muted: "#626866",
  primary: "#2D5D5E",
  primaryText: "#FAE880",
};

export function renderBrandEmail({
  children,
  preview,
  title,
}: {
  children: string;
  preview: string;
  title: string;
}) {
  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.background};margin:0;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:${brand.ink};">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:${brand.card};border:1px solid ${brand.border};border-radius:28px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 12px;">
                <div style="font-size:14px;font-weight:900;color:${brand.primary};letter-spacing:0;">Vendonar</div>
                <h1 style="font-size:28px;line-height:1.15;margin:14px 0 0;color:${brand.ink};font-weight:900;letter-spacing:0;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px;font-size:15px;line-height:1.65;color:${brand.ink};">
                ${children}
              </td>
            </tr>
          </table>
          <p style="max-width:640px;margin:18px 0 0;font-size:12px;line-height:1.5;color:${brand.muted};text-align:left;">
            Vendonar no procesa pagos. Solo ayuda a revisar, publicar y dar seguimiento transparente a campañas.
          </p>
        </td>
      </tr>
    </table>
  `;
}

export function renderEmailButton(label: string, href: string) {
  return `<a href="${href}" style="display:inline-block;border-radius:999px;background:${brand.primary};color:${brand.primaryText};font-size:14px;font-weight:900;padding:13px 20px;text-decoration:none;">${escapeHtml(label)}</a>`;
}

export function renderSecondaryLink(label: string, href: string) {
  return `<a href="${href}" style="color:${brand.primary};font-weight:800;text-decoration:underline;text-underline-offset:3px;">${escapeHtml(label)}</a>`;
}

export function renderInfoList(items: { label: string; value?: string | null }[]) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:14px 0;">
      ${items
        .filter((item) => item.value)
        .map(
          (item) => `
            <tr>
              <td style="padding:7px 0;color:${brand.muted};font-size:13px;width:150px;vertical-align:top;">${escapeHtml(item.label)}</td>
              <td style="padding:7px 0;font-size:14px;font-weight:800;color:${brand.ink};vertical-align:top;">${escapeHtml(item.value ?? "")}</td>
            </tr>
          `,
        )
        .join("")}
    </table>
  `;
}

export function renderPanel(children: string) {
  return `<div style="border:1px solid ${brand.border};border-radius:20px;padding:16px;margin:14px 0;background:#fff;">${children}</div>`;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
