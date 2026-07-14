import { SessionProvider } from "next-auth/react";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <div className="max-w-5xl mx-auto p-6">{children}</div>
    </SessionProvider>
  );
}
