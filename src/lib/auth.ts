import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.active) {
          throw new Error("Invalid credentials");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as UserRole;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Permission helpers
const rolePermissions: Record<UserRole, string[]> = {
  ADMIN: ["*"],
  OFFICE: [
    "clients:read",
    "clients:write",
    "projects:read",
    "projects:write",
    "proposals:read",
    "proposals:write",
    "invoices:read",
    "invoices:write",
    "inventory:read",
    "calendar:read",
    "calendar:write",
    "reports:read",
  ],
  WAREHOUSE: [
    "inventory:read",
    "inventory:write",
    "calendar:read",
    "projects:read",
  ],
  CREW: [
    "calendar:read",
    "projects:read",
    "inventory:read",
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = rolePermissions[role];
  if (!perms) return false;
  if (perms.includes("*")) return true;
  return perms.includes(permission);
}
