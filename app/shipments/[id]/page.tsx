import ClientPage from "./ClientPage";

export const instant = false;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  // Await the params locally in the Server Component 
  // (Next.js 15 recommendation)
  const resolvedParams = await params;

  return <ClientPage id={resolvedParams.id} />;
}
