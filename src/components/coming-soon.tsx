import { PageHeader } from "@/components/ui/page-header";

export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <>
      <PageHeader title={title} />
      <p className="p-5 text-xs text-fg-subtle">Se construye en la fase {phase}.</p>
    </>
  );
}
