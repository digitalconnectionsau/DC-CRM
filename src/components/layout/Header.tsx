import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface HeaderProps {
  title: string;
}

export async function Header({ title }: HeaderProps) {
  const session = await getServerSession(authOptions);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      {session?.user && (
        <span className="text-sm text-gray-500">
          {session.user.name ?? session.user.email ?? "User"} &middot; {session.user.role ?? "STAFF"}
        </span>
      )}
    </header>
  );
}
