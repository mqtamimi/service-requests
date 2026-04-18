import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "~/server/auth";
import { NewRequestForm } from "~/components/portal/NewRequestForm";

export default async function NewRequestPage(): Promise<React.ReactElement> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div>
        <Link href="/portal/requests" className="text-sm text-blue-600 hover:underline">
          ← My Requests
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">New Service Request</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Describe your issue and we&apos;ll get back to you.
        </p>
      </div>
      <div className="mt-6">
        <NewRequestForm />
      </div>
    </main>
  );
}
