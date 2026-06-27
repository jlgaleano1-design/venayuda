import { createHmac, timingSafeEqual } from "crypto";

type ReviewTokenPayload = {
  campaignId: string;
  exp: number;
};

type ResourceReviewTokenPayload = {
  exp: number;
  id: string;
  type: "campaign" | "donation" | "purchase";
};

const tokenTtlMs = 1000 * 60 * 60 * 24 * 14;

export function createCampaignReviewToken(campaignId: string) {
  const payload: ResourceReviewTokenPayload = {
    id: campaignId,
    type: "campaign",
    exp: Date.now() + tokenTtlMs,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function createDonationReviewToken(donationId: string) {
  return createResourceReviewToken("donation", donationId);
}

export function createPurchaseReviewToken(purchaseId: string) {
  return createResourceReviewToken("purchase", purchaseId);
}

export function verifyCampaignReviewToken(
  token: string,
  campaignId: string,
) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = sign(encodedPayload);

  if (!safeCompare(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as
      | ReviewTokenPayload
      | ResourceReviewTokenPayload;
    return (
      isFresh(payload) &&
      (("type" in payload &&
        payload.type === "campaign" &&
        payload.id === campaignId) ||
        ("campaignId" in payload && payload.campaignId === campaignId))
    );
  } catch {
    return false;
  }
}

export function verifyDonationReviewToken(token: string, donationId: string) {
  return verifyResourceReviewToken(token, "donation", donationId);
}

export function verifyPurchaseReviewToken(token: string, purchaseId: string) {
  return verifyResourceReviewToken(token, "purchase", purchaseId);
}

function createResourceReviewToken(
  type: ResourceReviewTokenPayload["type"],
  id: string,
) {
  const payload: ResourceReviewTokenPayload = {
    exp: Date.now() + tokenTtlMs,
    id,
    type,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function verifyResourceReviewToken(
  token: string,
  type: ResourceReviewTokenPayload["type"],
  id: string,
) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = sign(encodedPayload);

  if (!safeCompare(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      fromBase64Url(encodedPayload),
    ) as ResourceReviewTokenPayload;
    return payload.type === type && payload.id === id && isFresh(payload);
  } catch {
    return false;
  }
}

function isFresh(payload: { exp: number }) {
  return payload.exp > Date.now();
}

function sign(value: string) {
  const secret = process.env.CAMPAIGN_REVIEW_SECRET;

  if (!secret) {
    throw new Error("Missing CAMPAIGN_REVIEW_SECRET");
  }

  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeCompare(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(valueBuffer, expectedBuffer);
}

function toBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}
