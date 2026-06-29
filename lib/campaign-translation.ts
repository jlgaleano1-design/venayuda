type CampaignTranslationInput = {
  description: string;
  title: string;
};

type CampaignTranslation = {
  descriptionEn: string | null;
  titleEn: string | null;
};

type OpenAIResponse = {
  output?: {
    content?: {
      text?: string;
      type?: string;
    }[];
  }[];
  output_text?: string;
};

const openAiResponsesUrl = "https://api.openai.com/v1/responses";

export async function translateCampaignContent({
  description,
  title,
}: CampaignTranslationInput): Promise<CampaignTranslation> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { descriptionEn: null, titleEn: null };
  }

  try {
    const response = await fetch(openAiResponsesUrl, {
      body: JSON.stringify({
        input: [
          {
            role: "system",
            content:
              "Translate Venezuelan Spanish donation campaign copy into natural donor-facing English. Preserve names, places, handles, URLs, numbers, payment details, and facts. Do not add context or promises. Return only valid JSON.",
          },
          {
            role: "user",
            content: JSON.stringify({ title, description }),
          },
        ],
        model: process.env.OPENAI_TRANSLATION_MODEL ?? "gpt-4.1-mini",
        text: {
          format: {
            name: "campaign_translation",
            schema: {
              additionalProperties: false,
              properties: {
                description_en: {
                  type: "string",
                },
                title_en: {
                  type: "string",
                },
              },
              required: ["description_en", "title_en"],
              type: "object",
            },
            strict: true,
            type: "json_schema",
          },
        },
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      return { descriptionEn: null, titleEn: null };
    }

    const result = (await response.json()) as OpenAIResponse;
    const outputText = extractOutputText(result);
    const parsed = JSON.parse(outputText) as {
      description_en?: unknown;
      title_en?: unknown;
    };
    const titleEn =
      typeof parsed.title_en === "string" ? parsed.title_en.trim() : "";
    const descriptionEn =
      typeof parsed.description_en === "string"
        ? parsed.description_en.trim()
        : "";

    return {
      descriptionEn: descriptionEn || null,
      titleEn: titleEn || null,
    };
  } catch {
    return { descriptionEn: null, titleEn: null };
  }
}

function extractOutputText(response: OpenAIResponse) {
  if (response.output_text) {
    return response.output_text;
  }

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("")
      .trim() ?? ""
  );
}
