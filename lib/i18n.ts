import type { ReceivingCategory } from "@/lib/demo-data";

export const locales = ["es", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

type CampaignContentTranslations = Record<
  string,
  {
    description: string;
    title: string;
  }
>;

type Dictionary = {
  campaignContent: CampaignContentTranslations;
  campaignDetail: {
    accountHolder: string;
    accountReference: string;
    backToCampaigns: string;
    confirmedUseOfFunds: string;
    coverAlt: (title: string) => string;
    currency: string;
    donationMethods: string;
    emptyDonations: string;
    emptyPurchases: string;
    instructions: string;
    notFoundTitle: string;
    organization: string;
    privateInvoice: string;
    publicInvoice: string;
    reportedDonations: string;
    responsible: string;
    unconfirmedDonation: string;
    verifiedDonation: string;
    verifiedStatus: string;
    status: Record<"active" | "completed" | "paused", string>;
    vendonarConfirmed: string;
    verifiedDonations: string;
    whoResponds: string;
  };
  campaignList: {
    allMethods: string;
    createFirstCampaign: string;
    emptyBody: string;
    emptyFilterBody: string;
    emptyForFilter: (filter: string) => string;
    emptyTitle: string;
    fallbackFilter: string;
    filterLabel: string;
    responsible: string;
    viewCampaign: string;
  };
  donationReport: {
    amount: string;
    anonymous: string;
    button: string;
    close: string;
    closeReport: string;
    copied: string;
    donorEmail: string;
    donorName: string;
    manualReviewNote: string;
    modalDescription: string;
    modalTitle: (title: string) => string;
    paymentMethod: string;
    paymentMethodPlaceholder: string;
    proof: string;
    publicMessage: string;
    reviewNotice: string;
    selectFile: string;
    sending: string;
    sentPill: string;
    sentWithEmail: string;
    sentWithoutEmail: string;
    shareCampaign: string;
    shareText: (title: string) => string;
    submit: string;
    submitError: string;
    thankYouBody: string;
    thankYouTitle: (title: string) => string;
    transferReference: string;
    uploadDone: string;
    uploadError: string;
    uploadStatus: string;
  };
  errors: {
    campaigns: string;
    code: string;
    genericMessage: string;
    genericTitle: string;
    home: string;
    notFoundEyebrow: string;
    notFoundMessage: string;
    notFoundTitle: string;
    retry: string;
    system: string;
  };
  footer: {
    close: string;
    more: string;
    paragraphs: [string, string, string, string];
    summary: string;
    title: string;
  };
  home: {
    collectionCenters: string;
    createCampaign: string;
    donateNow: string;
    foundations: string;
    heroBody: string;
    heroLine1: string;
    heroLine2: string;
    publishedCampaigns: string;
  };
  language: {
    english: string;
    label: string;
    spanish: string;
  };
  metadata: {
    ogAlt: string;
    ogLocale: string;
    siteDescription: string;
    siteTitle: string;
  };
  receivingCategories: Record<ReceivingCategory, string>;
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getDictionary(locale: Locale = defaultLocale) {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export function getReceivingCategoryLabel(
  category: ReceivingCategory | string,
  locale: Locale = defaultLocale,
) {
  return (
    dictionaries[locale].receivingCategories[category as ReceivingCategory] ??
    dictionaries[defaultLocale].receivingCategories[
      category as ReceivingCategory
    ] ??
    category
  );
}

export function getCampaignText({
  description,
  descriptionEn,
  locale = defaultLocale,
  slug,
  title,
  titleEn,
}: {
  description: string;
  descriptionEn?: string | null;
  locale?: Locale;
  slug: string;
  title: string;
  titleEn?: string | null;
}) {
  const translatedCampaign =
    dictionaries[locale].campaignContent[slug] ??
    dictionaries[defaultLocale].campaignContent[slug];
  const translatedTitle =
    translatedCampaign?.title ?? getUsableTranslatedText(titleEn, title);
  const translatedDescription =
    translatedCampaign?.description ??
    getUsableTranslatedText(descriptionEn, description);

  return {
    description:
      locale === "en" ? translatedDescription ?? description : description,
    title: locale === "en" ? translatedTitle ?? title : title,
  };
}

function getUsableTranslatedText(
  translatedValue: string | null | undefined,
  originalValue: string,
) {
  const normalizedTranslation = translatedValue?.trim();

  if (
    !normalizedTranslation ||
    normalizedTranslation.toLocaleLowerCase("es-MX") ===
      originalValue.trim().toLocaleLowerCase("es-MX")
  ) {
    return undefined;
  }

  return normalizedTranslation;
}

export const dictionaries: Record<Locale, Dictionary> = {
  es: {
    metadata: {
      siteTitle: "Vendonar | Ayuda directa con transparencia",
      siteDescription:
        "Campañas de ayuda directa con transparencia manual, aportes externos y seguimiento público de compras.",
      ogAlt: "Vendonar - ayuda directa con transparencia",
      ogLocale: "es_MX",
    },
    language: {
      label: "Idioma",
      spanish: "ES",
      english: "EN",
    },
    home: {
      heroLine1: "Ayuda directa,",
      heroLine2: "sin intermediarios.",
      heroBody:
        "Campañas creadas por quienes están apoyando en las zonas afectadas de Venezuela. Cada una muestra métodos de pago directos, comprobantes y actualizaciones de gastos para que puedas seguir cómo se utiliza tu aporte. Ayuda persona a persona.",
      donateNow: "Donar ahora",
      createCampaign: "Crear campaña",
      collectionCenters: "Centros de acopio en el mundo",
      foundations: "Fundaciones",
      publishedCampaigns: "Campañas publicadas",
    },
    campaignList: {
      filterLabel: "Donar desde / con:",
      allMethods: "Todos los métodos disponibles",
      emptyForFilter: (filter: string) =>
        `Todavía no hay campañas para ${filter}`,
      emptyTitle: "Todavía no hay campañas publicadas",
      emptyFilterBody: "Prueba con otro origen de donación o vuelve más tarde.",
      emptyBody:
        "Las campañas aparecerán aquí cuando el equipo revise y publique las primeras solicitudes. Puedes crear la primera campaña para iniciar el flujo.",
      createFirstCampaign: "Crear primera campaña",
      fallbackFilter: "esta opción",
      viewCampaign: "Ver campaña",
      responsible: "Responsable:",
    },
    campaignDetail: {
      notFoundTitle: "Campaña no encontrada",
      backToCampaigns: "Campañas",
      status: {
        active: "Activa",
        paused: "Pausada",
        completed: "Completada",
      },
      coverAlt: (title: string) => `Foto de ${title}`,
      whoResponds: "Quién responde",
      responsible: "Responsable",
      organization: "Organización",
      verifiedDonations: "Donaciones verificadas",
      vendonarConfirmed: "Confirmada por Vendonar",
      verifiedStatus: "Verificada",
      reportedDonations: "Aportes reportados",
      verifiedDonation: "Confirmada",
      unconfirmedDonation: "Sin confirmar",
      emptyDonations:
        "Los aportes reportados aparecerán acá automáticamente.",
      confirmedUseOfFunds: "Uso de fondos confirmado",
      emptyPurchases:
        "Los gastos y avances se publicarán acá cuando haya comprobantes revisados.",
      publicInvoice: "Comprobante publico",
      privateInvoice: "Comprobante privado",
      donationMethods: "Métodos para recibir donaciones",
      accountHolder: "Titular",
      accountReference: "Cuenta, correo, wallet o ID",
      currency: "Moneda",
      instructions: "Otros datos o instrucciones",
    },
    donationReport: {
      button: "Avisar que doné",
      closeReport: "Cerrar reporte de aporte",
      close: "Cerrar",
      modalTitle: (title: string) => `Reporta tu aporte a ${title}`,
      modalDescription:
        "Este formulario no procesa pagos. Solo registra que donaste por un método externo para revisión manual.",
      shareText: (title: string) =>
        `Gracias por apoyar a ${title}. Tu aporte ayuda a reconstruir Venezuela.`,
      uploadStatus: "Subiendo comprobante...",
      uploadDone: "Comprobante subido.",
      uploadError: "No se pudo subir el comprobante.",
      submitError: "No se pudo enviar el aviso. Inténtalo de nuevo.",
      sentWithEmail: "Reporte enviado. Te mandamos un correo de confirmación.",
      sentWithoutEmail:
        "Reporte recibido. Tu aporte quedó registrado para revisión; no pudimos enviar el correo de confirmación.",
      sentPill: "Reporte enviado",
      thankYouTitle: (title: string) => `Gracias por apoyar a ${title}`,
      thankYouBody:
        "Tu aporte ayuda a que reconstruir Venezuela sea más posible. Será muy valioso que compartas esta campaña con tus amigos para que más personas puedan sumarse.",
      copied: "Link copiado",
      shareCampaign: "Compartir campaña",
      reviewNotice:
        "Revisaremos tu reporte antes de sumarlo al seguimiento público.",
      donorName: "Tu nombre (opcional)",
      donorEmail: "Correo electrónico (opcional)",
      anonymous: "Donar anónimamente en la vista pública",
      amount: "Monto en dólares",
      paymentMethod: "Método usado",
      paymentMethodPlaceholder:
        "Ej. Zelle, SPEI, Pago móvil, transferencia bancaria...",
      transferReference: "Referencia / tracking number (opcional)",
      proof: "Comprobante o screenshot",
      selectFile: "Seleccionar archivo",
      publicMessage: "Mensaje público (opcional)",
      sending: "Enviando...",
      submit: "Enviar reporte",
      manualReviewNote:
        "Mostraremos tus aportes después de una verificación manual. Recibirás un correo cuando el responsable de la campaña suba cualquier actualización.",
    },
    footer: {
      summary:
        "Vendonar facilita campañas de ayuda directa y seguimiento público. No recibimos, retenemos ni procesamos donaciones; cada aporte se realiza directamente con la persona responsable.",
      more: "Más sobre Vendonar",
      close: "Cerrar",
      title: "Sobre este proyecto",
      paragraphs: [
        "Vendonar es un proyecto independiente y no cobra comisiones ni procesa donaciones. Mantenerlo funcionando implica cubrir costos como hosting, dominio, base de datos, almacenamiento, autenticación y envío de correos transaccionales, usando herramientas como Supabase y proveedores de correo.",
        "También ha requerido costos de desarrollo y mantenimiento, incluyendo créditos de OpenAI/Codex para construir, revisar y mejorar la plataforma.",
        "Si quieres apoyar con costos operativos, ayudar a revisar campañas, proponer mejoras o involucrarte de alguna forma, estos son los contactos:",
        "Cualquier ayuda suma y se agradece muchísimo.",
      ],
    },
    errors: {
      code: "Código",
      notFoundTitle: "No encontramos esta página",
      notFoundEyebrow: "No encontrado",
      notFoundMessage:
        "Puede que el enlace haya cambiado, que la campaña todavía no esté publicada o que ya no esté disponible.",
      campaigns: "Ver campañas",
      home: "Inicio",
      system: "Sistema",
      genericTitle: "Algo no salió bien",
      genericMessage:
        "No pudimos completar la acción. Tus datos pueden no haberse guardado, así que intenta de nuevo en unos minutos.",
      retry: "Intentar de nuevo",
    },
    receivingCategories: {
      crypto: "Cripto",
      mexico: "México",
      united_states: "Estados Unidos",
      venezuela: "Venezuela",
      spain: "España",
      panama: "Panamá",
      colombia: "Colombia",
      chile: "Chile",
      argentina: "Argentina",
      international: "Otros países",
    },
    campaignContent: {},
  },
  en: {
    metadata: {
      siteTitle: "Vendonar | Direct aid with transparency",
      siteDescription:
        "Direct aid campaigns with manual transparency, external donations, and updates on how funds are used.",
      ogAlt: "Vendonar - direct aid with transparency",
      ogLocale: "en_US",
    },
    language: {
      label: "Language",
      spanish: "ES",
      english: "EN",
    },
    home: {
      heroLine1: "Direct aid for Venezuela,",
      heroLine2: "with no middlemen.",
      heroBody:
        "Campaigns created by people helping on the ground in Venezuela's affected areas. Each campaign includes direct payment methods, receipts, and updates on how funds are used, so you can follow where your donation goes. Person-to-person aid.",
      donateNow: "Donate now",
      createCampaign: "Crear campaña",
      collectionCenters: "Collection centers worldwide",
      foundations: "Foundations",
      publishedCampaigns: "Published campaigns",
    },
    campaignList: {
      filterLabel: "Donate from / with:",
      allMethods: "All available methods",
      emptyForFilter: (filter: string) =>
        `There are no campaigns for ${filter} yet`,
      emptyTitle: "No published campaigns yet",
      emptyFilterBody: "Try another donation origin or check back later.",
      emptyBody:
        "Campaigns will appear here after the team reviews and publishes the first requests. You can create the first campaign to start the flow.",
      createFirstCampaign: "Crear primera campaña",
      fallbackFilter: "this option",
      viewCampaign: "View campaign",
      responsible: "Organizer:",
    },
    campaignDetail: {
      notFoundTitle: "Campaign not found",
      backToCampaigns: "Campaigns",
      status: {
        active: "Active",
        paused: "Paused",
        completed: "Completed",
      },
      coverAlt: (title: string) => `Photo of ${title}`,
      whoResponds: "Who is responsible",
      responsible: "Organizer",
      organization: "Organization",
      verifiedDonations: "Verified donations",
      vendonarConfirmed: "Confirmed by Vendonar",
      verifiedStatus: "Verified",
      reportedDonations: "Reported donations",
      verifiedDonation: "Confirmed",
      unconfirmedDonation: "Unconfirmed",
      emptyDonations:
        "Reported donations will appear here automatically.",
      confirmedUseOfFunds: "Confirmed use of funds",
      emptyPurchases:
        "Expenses and progress updates will appear here after receipts are reviewed.",
      publicInvoice: "Public receipt",
      privateInvoice: "Private receipt",
      donationMethods: "Methods to receive donations",
      accountHolder: "Account holder",
      accountReference: "Account, email, wallet, or ID",
      currency: "Currency",
      instructions: "Other details or instructions",
    },
    donationReport: {
      button: "Report that I donated",
      closeReport: "Close donation report",
      close: "Close",
      modalTitle: (title: string) => `Report your donation to ${title}`,
      modalDescription:
        "This form does not process payments. It only records that you donated through an external method for manual review.",
      shareText: (title: string) =>
        `Thank you for supporting ${title}. Your donation helps rebuild Venezuela.`,
      uploadStatus: "Uploading receipt...",
      uploadDone: "Receipt uploaded.",
      uploadError: "We could not upload the receipt.",
      submitError: "We could not send the report. Please try again.",
      sentWithEmail: "Report sent. We sent you a confirmation email.",
      sentWithoutEmail:
        "Report received. Your donation was registered for review; we could not send the confirmation email.",
      sentPill: "Report sent",
      thankYouTitle: (title: string) => `Thank you for supporting ${title}`,
      thankYouBody:
        "Your donation helps make rebuilding Venezuela more possible. Sharing this campaign with friends is a valuable way to help more people join in.",
      copied: "Link copied",
      shareCampaign: "Share campaign",
      reviewNotice:
        "We will review your report before adding it to the public transparency record.",
      donorName: "Your name (optional)",
      donorEmail: "Email address (optional)",
      anonymous: "Donate anonymously in the public view",
      amount: "Amount in US dollars",
      paymentMethod: "Method used",
      paymentMethodPlaceholder:
        "E.g. Zelle, SPEI, Pago Movil, bank transfer...",
      transferReference: "Reference / tracking number (optional)",
      proof: "Receipt or screenshot",
      selectFile: "Select file",
      publicMessage: "Public message (optional)",
      sending: "Sending...",
      submit: "Send report",
      manualReviewNote:
        "We will show donations after manual verification. You will receive an email when the campaign organizer uploads an update.",
    },
    footer: {
      summary:
        "Vendonar helps publish direct aid campaigns with public follow-up. We do not receive, hold, or process donations; each donation happens directly with the person responsible.",
      more: "More about Vendonar",
      close: "Close",
      title: "About this project",
      paragraphs: [
        "Vendonar is an independent project and does not charge commissions or process donations. Keeping it running means covering costs such as hosting, domain, database, storage, authentication, and transactional email providers.",
        "It has also required development and maintenance costs, including OpenAI/Codex credits to build, review, and improve the platform.",
        "If you want to support operating costs, help review campaigns, suggest improvements, or get involved in some way, these are the contact options:",
        "Every bit of help matters and is deeply appreciated.",
      ],
    },
    errors: {
      code: "Code",
      notFoundTitle: "We could not find this page",
      notFoundEyebrow: "Not found",
      notFoundMessage:
        "The link may have changed, the campaign may not be published yet, or it may no longer be available.",
      campaigns: "View campaigns",
      home: "Home",
      system: "System",
      genericTitle: "Something went wrong",
      genericMessage:
        "We could not complete the action. Your data may not have been saved, so please try again in a few minutes.",
      retry: "Try again",
    },
    receivingCategories: {
      crypto: "Crypto",
      mexico: "Mexico",
      united_states: "United States",
      venezuela: "Venezuela",
      spain: "Spain",
      panama: "Panama",
      colombia: "Colombia",
      chile: "Chile",
      argentina: "Argentina",
      international: "Other countries",
    },
    campaignContent: {
      eliaslopezvzla: {
        title: "Tents for families affected by the earthquake",
        description:
          "We are raising funds to buy and deliver tents or tarps to people and families who are sleeping in plazas, parks, and other areas in and around Caracas. This effort is being led by Elias Lopez, a Venezuelan sports journalist, to support people who lost their shelter and need a safer place to spend the night.\n\nDonations will be used specifically to buy the tents that can be found, taking into account prices, available sizes, and the number of people in each family. Tent and tarp donations are also welcome. In his Instagram stories (@eliaslopezvzla), Elias has shown the first 7 tents already delivered, and the goal is to keep helping more families.",
      },
      equipostraumatologia: {
        title: "Trauma medical equipment",
        description:
          "This campaign is raising funds to buy and deliver specialized medical equipment and supplies to hospitals in Venezuela, especially for trauma units where many patients urgently need care.\n\nDonations will be used to purchase equipment such as anesthesia machines, cannulated drills, and surgical instruments needed to perform procedures, respond to emergencies, and save lives. Each purchase and delivery will be documented with photos, receipts, and updates so donors can follow how their contribution is used.\n\nThe support will be managed directly by Arianna, who is coordinating the purchase of the equipment and its delivery to hospitals with a confirmed need.",
      },
      ferozzve: {
        title: "Help us make blankets for affected families",
        description:
          "Ferozz is making its machinery and labor available to produce blankets for people affected by the emergency. They are raising funds exclusively to buy the fabric needed. Every contribution turns directly into warmth for those who need it most.",
      },
      gotasdeluz: {
        title: "Direct aid for Caraballeda, Macuto, and the Central Coast",
        description:
          "Jessica and Paul are organizing a collection drive from San Antonio de los Altos for water, food, clothing, blankets, medical supplies, and rescue tools to bring direct aid to the most affected areas of La Guaira.\n\nYou can support with monetary donations or by bringing in-kind donations to the collection point at Altos Detailing, Urb. La Morita, Ruta 3, past Colegio Mater Dei, on the left. To coordinate deliveries or ask questions, contact 0422-1582869, 0414-1248789, or Instagram: @gotasdeluz.ve.",
      },
      kuizz: {
        title: "Supplies and tools for aid in La Guaira",
        description:
          'We are transporting donated supplies, tents, sleeping pads, and tools to support people affected in La Guaira, including buildings such as Caraballeda, Los Corales, Rita Sol Palace, and Edificio Tahiti.\n\nThe campaign is also asking for machinery support, volunteers, and help spreading the word, noting that there may still be people alive in Edificio Tahiti. Zelle donations will be received by a friend and converted to bolivars so Luis can personally buy the needed items. Please include the reference "kuizz" and send a screenshot of the transaction.',
      },
      nelsonlaiton: {
        title: "Aid for Playa Grande Families Affected by the Emergency",
        description:
          "Nelson Leyton is from Playa Grande, La Guaira. During the emergency on June 24, he lost his home, but still decided to stay and help people affected near the landslide area, supporting aid distribution and helping those who need it most. I am publishing this campaign on his behalf because right now his priority is on the ground and his connectivity is very limited. The funds raised will be used to support both the relief work he is carrying out in Playa Grande and his own recovery, as well as his family's recovery, since they were also affected by the emergency. Any contribution, no matter how small, makes a difference.",
      },
      nutrilau: {
        title: "Urgent supplies for affected families in Playa Verde",
        description:
          "Laura is collecting and delivering supplies for affected families. Right now, they need tarps, awnings, sheets, mattresses or sleeping pads, medication for chronic conditions such as Losartan for hypertension, as well as crayons, paints, and notebooks for children. Your support will help buy and deliver these materials directly to the people who need them.",
      },
      serbymichelle: {
        title: "Support for families affected in Parque del Este",
        description:
          "This campaign supports people affected by the emergency who are staying in tents in Parque del Este. ser_by_michelle is going directly to the site to deliver in-kind aid, organize support groups, and accompany people going through this difficult moment, not only with supplies but also with listening, presence, and emotional support.\n\nDonations will help make this direct aid possible for people who need it, including basic support, accompaniment, and care for the animals that are also there. Beyond donating, anyone who wants to help or knows someone who needs support can write to her for information and to help organize the groups.",
      },
    },
  },
};
