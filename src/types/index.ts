import { Role, DomainStatus, DnsType, TicketStatus, Priority } from "@prisma/client";

export type { Role, DomainStatus, DnsType, TicketStatus, Priority };

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }
  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}
