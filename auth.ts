import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { config as appConfig } from "@/app/lib/config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Usuário", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      authorize(credentials) {
        const username = credentials?.username;
        const password = credentials?.password;

        if (
          typeof username === "string" &&
          typeof password === "string" &&
          appConfig.ADMIN_USERNAME &&
          appConfig.ADMIN_PASSWORD &&
          username === appConfig.ADMIN_USERNAME &&
          password === appConfig.ADMIN_PASSWORD
        ) {
          return { id: "admin", name: appConfig.ADMIN_USERNAME };
        }

        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoginPage = pathname === "/admin/login";
      const isAdminArea = pathname.startsWith("/admin");

      if (isAdminArea && !isLoginPage) {
        return !!auth?.user;
      }
      return true;
    },
  },
});
