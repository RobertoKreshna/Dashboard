import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { StaffShell } from "@/components/layout/staff-shell";

export const metadata = { robots: { index: false, follow: false } };

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <StaffShell email={user.email ?? ""} signOutAction={signOut}>
      {children}
    </StaffShell>
  );
}
