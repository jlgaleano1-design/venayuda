import { NextResponse } from "next/server";
import { z } from "zod";
import { getCampaign } from "@/lib/demo-data";
import {
  sendDonationConfirmationEmail,
  sendDonationReportEmail,
} from "@/lib/mail";

const donationReportSchema = z.object({
  campaignSlug: z.string().min(1),
  donorName: z.string().optional(),
  donorEmail: z.string().email(),
  amount: z.string().min(1),
  currency: z.string().min(1),
  transferDate: z.string().optional(),
  paymentMethodUsed: z.string().optional(),
  transferReference: z.string().optional(),
  proofFileName: z.string().optional(),
  publicMessage: z.string().optional(),
});

export async function POST(request: Request) {
  const payload = donationReportSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      { error: "Datos incompletos para avisar la donación." },
      { status: 400 },
    );
  }

  const report = payload.data;
  const campaign = getCampaign(report.campaignSlug);

  if (!campaign) {
    return NextResponse.json(
      { error: "No encontramos la campaña." },
      { status: 404 },
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    request.headers.get("origin") ??
    "https://vendonar.com";
  const campaignUrl = new URL(`/campanas/${campaign.slug}`, siteUrl).toString();

  const [reportResult, confirmationResult] = await Promise.all([
    sendDonationReportEmail({
      campaignTitle: campaign.title,
      recipientEmail: campaign.responsibleEmail,
      donorName: report.donorName,
      donorEmail: report.donorEmail,
      amount: report.amount,
      currency: report.currency,
      transferDate: report.transferDate,
      paymentMethod: report.paymentMethodUsed,
      transferReference: report.transferReference,
      proofFileName: report.proofFileName,
      publicMessage: report.publicMessage,
    }),
    sendDonationConfirmationEmail({
      campaignTitle: campaign.title,
      campaignUrl,
      recipientEmail: report.donorEmail,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    emailSent: reportResult.sent,
    confirmationEmailSent: confirmationResult.sent,
    reason:
      "reason" in reportResult
        ? reportResult.reason
        : "reason" in confirmationResult
          ? confirmationResult.reason
          : undefined,
  });
}
