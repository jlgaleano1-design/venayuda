import { DocumentLanguage } from "@/components/document-language";

export default function EnglishLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <DocumentLanguage locale="en" />
      {children}
    </>
  );
}
