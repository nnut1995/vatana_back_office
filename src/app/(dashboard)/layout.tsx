import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user ?? {};

  return <AppShell user={user}>{children}</AppShell>;
}
