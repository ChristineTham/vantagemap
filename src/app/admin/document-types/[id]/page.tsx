/**
 * PLANV2 Phase 4 — Document type editor page.
 *
 * Server Component: awaits the async route params (Next.js 16) and hands the
 * id to the client-side DocumentTypeEditor, which loads the type + fields and
 * provides the metadata / fields editing UI.
 */

import { DocumentTypeEditor } from "@/components/admin/DocumentTypeEditor";

export default async function DocumentTypeEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentTypeEditor typeId={id} />;
}
