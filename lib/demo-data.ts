export type ReceivingCategory =
  | "all"
  | "mexico"
  | "united_states"
  | "venezuela"
  | "international";

export type PaymentMethod = {
  id: string;
  receivingCategory: Exclude<ReceivingCategory, "all">;
  label: string;
  currency: string;
  accountHolder: string;
  instructions: string;
  notes?: string;
};

export type Campaign = {
  slug: string;
  creatorAccessCode: string;
  title: string;
  description: string;
  responsible: string;
  responsibleEmail: string;
  instagramHandle?: string;
  organization?: string;
  location: string;
  affectedArea: string;
  status: "active" | "paused" | "completed";
  receivingCategories: Exclude<ReceivingCategory, "all">[];
  totals: {
    donated: number;
    spent: number;
    balance: number;
  };
  paymentMethods: PaymentMethod[];
  donations: {
    code: string;
    donor: string;
    amount: string;
    message?: string;
    date: string;
  }[];
  purchases: {
    title: string;
    description?: string;
    amount: string;
    date: string;
    invoicePublic: boolean;
    photoUrl?: string;
  }[];
};

export const receivingFilters: { key: ReceivingCategory; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "mexico", label: "Dona desde México" },
  { key: "united_states", label: "Dona desde Estados Unidos" },
  { key: "venezuela", label: "Dona desde Venezuela" },
  { key: "international", label: "Dona desde otro país" },
];

export const campaigns: Campaign[] = [
  {
    slug: "medicinas-valencia",
    creatorAccessCode: "creador-med-valencia",
    title: "Medicinas para respuesta en Valencia",
    description:
      "Compra de tratamientos, analgesicos y material basico para personas atendidas por voluntarios en campo.",
    responsible: "Mariela Torres",
    responsibleEmail: "mariela@example.com",
    instagramHandle: "redvecinalvalencia",
    organization: "Red vecinal de apoyo",
    location: "Valencia, Carabobo",
    affectedArea: "Barrios del sur",
    status: "active",
    receivingCategories: ["mexico", "united_states", "venezuela"],
    totals: {
      donated: 1840,
      spent: 920,
      balance: 920,
    },
    paymentMethods: [
      {
        id: "spei-mariela",
        receivingCategory: "mexico",
        label: "SPEI",
        currency: "MXN",
        accountHolder: "Mariela Torres",
        instructions:
          "Transferir por SPEI a la cuenta indicada por la responsable. Confirmar el monto y referencia en el formulario.",
      },
      {
        id: "zelle-mariela",
        receivingCategory: "united_states",
        label: "Zelle",
        currency: "USD",
        accountHolder: "Mariela Torres",
        instructions:
          "Enviar por Zelle al contacto compartido por la responsable de la campana.",
      },
      {
        id: "pago-movil-mariela",
        receivingCategory: "venezuela",
        label: "Pago movil",
        currency: "VES",
        accountHolder: "Mariela Torres",
        instructions:
          "Usar los datos de Pago Movil publicados por la responsable y reportar el comprobante.",
      },
    ],
    donations: [
      {
        code: "DON-8F42K",
        donor: "Donante anonimo",
        amount: "USD 100",
        message: "Para medicinas urgentes.",
        date: "2026-06-24",
      },
      {
        code: "DON-91P2A",
        donor: "Carolina",
        amount: "USD 250",
        date: "2026-06-25",
      },
    ],
    purchases: [
      {
        title: "Analgésicos y suero oral",
        description: "Compra de medicamentos y sobres de rehidratacion entregados al equipo de voluntarios.",
        amount: "USD 420",
        date: "2026-06-25",
        invoicePublic: true,
        photoUrl:
          "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=900&q=80",
      },
      {
        title: "Material de curas",
        description: "Gasas, alcohol y material basico para curas de emergencia.",
        amount: "USD 500",
        date: "2026-06-26",
        invoicePublic: false,
        photoUrl:
          "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    slug: "alimentos-maracay",
    creatorAccessCode: "creador-ali-maracay",
    title: "Alimentos y agua para Maracay",
    description:
      "Apoyo directo para compras de comida, agua potable y articulos esenciales entregados por una red local.",
    responsible: "Daniel Rivas",
    responsibleEmail: "daniel@example.com",
    instagramHandle: "ayudamaracay",
    location: "Maracay, Aragua",
    affectedArea: "Zona norte",
    status: "active",
    receivingCategories: ["venezuela", "international"],
    totals: {
      donated: 1260,
      spent: 740,
      balance: 520,
    },
    paymentMethods: [
      {
        id: "pago-movil-daniel",
        receivingCategory: "venezuela",
        label: "Pago movil",
        currency: "VES",
        accountHolder: "Daniel Rivas",
        instructions:
          "Enviar por Pago Movil a los datos indicados por el responsable de la campana.",
      },
      {
        id: "wise-daniel",
        receivingCategory: "international",
        label: "Wise / transferencia internacional",
        currency: "USD",
        accountHolder: "Daniel Rivas",
        instructions:
          "Contactar al responsable para recibir instrucciones internacionales actualizadas.",
      },
    ],
    donations: [
      {
        code: "DON-3LC8Q",
        donor: "Ana",
        amount: "USD 80",
        date: "2026-06-24",
      },
    ],
    purchases: [
      {
        title: "Agua potable y harina",
        description: "Primera compra para familias priorizadas por la red local.",
        amount: "USD 310",
        date: "2026-06-25",
        invoicePublic: true,
        photoUrl:
          "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    slug: "traslados-caracas",
    creatorAccessCode: "creador-tra-caracas",
    title: "Traslados medicos en Caracas",
    description:
      "Fondo para gasolina, taxis y traslados de personas que necesitan atencion o entrega de insumos.",
    responsible: "Sofia Medina",
    responsibleEmail: "sofia@example.com",
    instagramHandle: "voluntariosdeleste",
    organization: "Voluntarios del este",
    location: "Caracas",
    affectedArea: "Municipios del este",
    status: "paused",
    receivingCategories: ["mexico", "international"],
    totals: {
      donated: 900,
      spent: 900,
      balance: 0,
    },
    paymentMethods: [
      {
        id: "spei-sofia",
        receivingCategory: "mexico",
        label: "SPEI",
        currency: "MXN",
        accountHolder: "Sofia Medina",
        instructions:
          "Campana pausada temporalmente. No enviar nuevos aportes hasta que vuelva a estar activa.",
      },
    ],
    donations: [
      {
        code: "DON-J7K2M",
        donor: "Donante anonimo",
        amount: "USD 120",
        date: "2026-06-23",
      },
    ],
    purchases: [
      {
        title: "Traslados a centro medico",
        description: "Apoyo para traslados de pacientes y entrega de insumos.",
        amount: "USD 180",
        date: "2026-06-24",
        invoicePublic: false,
        photoUrl:
          "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
];

export function getCampaign(slug: string) {
  return campaigns.find((campaign) => campaign.slug === slug);
}

export function getCampaignByCreatorAccessCode(accessCode: string) {
  return campaigns.find((campaign) => campaign.creatorAccessCode === accessCode);
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
