import { requirePageUser } from "@/lib/access";
import { listColors } from "@/lib/colors";
import { ColorProvider } from "@/components/ColorField";
import { AppShell } from "@/components/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePageUser();

  return <ColorProvider colors={await listColors()}><AppShell user={user}>{children}</AppShell></ColorProvider>;
}
