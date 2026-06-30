import { createHash } from "crypto";

export type CampaignSpamInput = {
  description: string;
  email: string;
  formStartedAt?: number;
  honeypot?: string;
  instagramHandle: string;
  organization?: string;
  responsibleName: string;
  slug: string;
  title: string;
};

export type CampaignSpamAssessment = {
  blockReasons: string[];
  riskFlags: string[];
};

const gibberishTokens = [
  "12345",
  "asdf",
  "asdfg",
  "asd",
  "fdsa",
  "hjkl",
  "jkl",
  "qwer",
  "qwerty",
  "test",
  "zxc",
  "zxcv",
];

const keyboardRuns = [
  "1234567890",
  "0987654321",
  "abcdefghijklmnopqrstuvwxyz",
  "zyxwvutsrqponmlkjihgfedcba",
  "qwertyuiop",
  "poiuytrewq",
  "asdfghjkl",
  "lkjhgfdsa",
  "zxcvbnm",
  "mnbvcxz",
];

const suspiciousMinFormMs = 6_000;
const blockMinFormMs = 1_500;

export function assessCampaignSpam(
  input: CampaignSpamInput,
): CampaignSpamAssessment {
  const blockReasons: string[] = [];
  const riskFlags: string[] = [];
  const fields = {
    description: input.description,
    emailDomain: getEmailDomainRoot(input.email),
    emailLocal: getEmailLocalPart(input.email),
    instagram: input.instagramHandle,
    organization: input.organization ?? "",
    responsibleName: input.responsibleName,
    slug: input.slug,
    title: input.title,
  };

  if (input.honeypot?.trim()) {
    blockReasons.push("honeypot_filled");
  }

  const formAgeMs =
    typeof input.formStartedAt === "number" ? Date.now() - input.formStartedAt : null;

  if (formAgeMs !== null && formAgeMs >= 0 && formAgeMs < blockMinFormMs) {
    blockReasons.push("form_submitted_too_fast");
  } else if (
    formAgeMs !== null &&
    formAgeMs >= 0 &&
    formAgeMs < suspiciousMinFormMs
  ) {
    riskFlags.push("fast_submission");
  }

  const gibberishFields: string[] = [];
  const lowInformationFields: string[] = [];
  const repeatedPatternFields: string[] = [];
  const sequenceFields: string[] = [];

  for (const [field, value] of Object.entries(fields)) {
    const normalized = normalizeForSpam(value);

    if (!normalized) {
      continue;
    }

    if (isGibberish(normalized)) {
      riskFlags.push(`${field}_looks_like_gibberish`);
      gibberishFields.push(field);
    }

    if (isSequenceLike(normalized)) {
      riskFlags.push(`${field}_looks_like_sequence`);
      sequenceFields.push(field);
    }

    if (hasRepeatedPattern(normalized)) {
      riskFlags.push(`${field}_repeated_pattern`);
      repeatedPatternFields.push(field);
    }

    if (hasLowInformationText(normalized)) {
      riskFlags.push(`${field}_low_information`);
      lowInformationFields.push(field);
    }
  }

  const criticalGibberishFields = gibberishFields.filter((field) =>
    [
      "emailDomain",
      "emailLocal",
      "instagram",
      "responsibleName",
      "slug",
      "title",
    ].includes(field),
  );
  const criticalLowInformationFields = lowInformationFields.filter((field) =>
    ["instagram", "responsibleName", "slug", "title"].includes(field),
  );

  if (criticalGibberishFields.length >= 2) {
    blockReasons.push("obvious_garbage_fields");
  }

  if (criticalLowInformationFields.length >= 3) {
    blockReasons.push("too_many_low_information_fields");
  }

  const criticalSequenceFields = sequenceFields.filter((field) =>
    ["emailLocal", "instagram", "responsibleName", "slug", "title"].includes(field),
  );
  const criticalRepeatedPatternFields = repeatedPatternFields.filter((field) =>
    ["emailLocal", "instagram", "responsibleName", "slug", "title"].includes(field),
  );

  if (criticalSequenceFields.length >= 2) {
    blockReasons.push("too_many_sequence_fields");
  }

  if (criticalRepeatedPatternFields.length >= 2) {
    blockReasons.push("too_many_repeated_pattern_fields");
  }

  const normalizedIdentityValues = [
    input.title,
    input.responsibleName,
    input.slug,
    input.instagramHandle,
    getEmailLocalPart(input.email),
  ]
    .map(normalizeForSpam)
    .filter(Boolean);
  const dominantIdentityCount = Math.max(
    0,
    ...Array.from(new Set(normalizedIdentityValues)).map(
      (value) =>
        normalizedIdentityValues.filter((candidate) => candidate === value).length,
    ),
  );

  if (
    dominantIdentityCount >= 3 &&
    normalizedIdentityValues.some(
      (value) =>
        isGibberish(value) ||
        isSequenceLike(value) ||
        hasLowInformationText(value),
    )
  ) {
    blockReasons.push("repeated_low_quality_identity");
  }

  const weightedRiskScore =
    criticalGibberishFields.length * 3 +
    criticalSequenceFields.length * 2 +
    criticalRepeatedPatternFields.length * 2 +
    criticalLowInformationFields.length;

  if (weightedRiskScore >= 6) {
    blockReasons.push("high_garbage_score");
  }

  if (
    normalizeForSpam(input.title) &&
    normalizeForSpam(input.title) === normalizeForSpam(input.responsibleName)
  ) {
    riskFlags.push("title_matches_responsible_name");

    if (
      isGibberish(normalizeForSpam(input.title)) ||
      hasLowInformationText(normalizeForSpam(input.title))
    ) {
      blockReasons.push("repeated_garbage_identity");
    }
  }

  if (
    normalizeForSpam(input.slug) &&
    normalizeForSpam(input.slug) === normalizeForSpam(input.instagramHandle)
  ) {
    riskFlags.push("slug_matches_instagram");
  }

  if (
    normalizeForSpam(input.title) &&
    normalizeForSpam(input.description) &&
    normalizeForSpam(input.description).startsWith(normalizeForSpam(input.title))
  ) {
    riskFlags.push("description_repeats_title");
  }

  return {
    blockReasons: unique(blockReasons),
    riskFlags: unique(riskFlags),
  };
}

export function createStableHash(value: string, salt: string) {
  return createHash("sha256").update(`${value}|${salt}`).digest("hex");
}

function normalizeForSpam(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^@/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getEmailLocalPart(email: string) {
  return email.split("@")[0] ?? "";
}

function getEmailDomainRoot(email: string) {
  const domain = email.split("@")[1] ?? "";

  return domain.split(".")[0] ?? "";
}

function isGibberish(value: string) {
  if (gibberishTokens.includes(value)) {
    return true;
  }

  if (value.length <= 8 && gibberishTokens.some((token) => value.includes(token))) {
    return true;
  }

  return /(.)\1{4,}/.test(value) || /^(abc|123|qwe|asd|zxc){2,}$/.test(value);
}

function isSequenceLike(value: string) {
  if (value.length < 4) {
    return false;
  }

  return keyboardRuns.some((run) => run.includes(value));
}

function hasRepeatedPattern(value: string) {
  if (value.length < 4) {
    return false;
  }

  return /^(.{1,3})\1{1,}$/.test(value) || /(.)\1{3,}/.test(value);
}

function hasLowInformationText(value: string) {
  if (value.length <= 2) {
    return true;
  }

  const uniqueCharacters = new Set(value.split(""));
  return value.length <= 6 && uniqueCharacters.size <= 3;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
