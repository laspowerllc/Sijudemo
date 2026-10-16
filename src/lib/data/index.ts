import "server-only";
import { cookies } from "next/headers";
import type { ClientRow, Member, Organization, Role, Session } from "@/lib/types";
import { members, organization, type Seed } from "./mock/seed";
import { store } from "./mock/store";

/**
 * Capa de acceso a datos. Hoy lee datos de ejemplo; en la fase de backend
 * se reimplementa con Supabase manteniendo estas firmas.
 *
 * Las reglas de visibilidad se aplican aquí igual que las aplicará RLS:
 *  - propietario: todos los clientes de su organización
 *  - ayudante: solo clientes asignados
 *  - cliente: solo él mismo
 */

export const DEV_ROLE_COOKIE = "siju_dev_role";

function seed(): Seed {
  return store().seed;
}

const MOCK_SESSIONS: Record<Exclude<Role, "platform_admin">, Session> = {
  owner: { userId: "usr_laura", role: "owner", fullName: "Laura Méndez", orgId: "org_1", memberId: "mem_owner", clientId: null },
  assistant: { userId: "usr_diego", role: "assistant", fullName: "Diego Ramos", orgId: "org_1", memberId: "mem_diego", clientId: null },
  client: { userId: "usr_cli_002", role: "client", fullName: "Martín", orgId: "org_1", memberId: null, clientId: "cli_002" },
};

export async function getSession(): Promise<Session> {
  const role = (await cookies()).get(DEV_ROLE_COOKIE)?.value;
  const session = MOCK_SESSIONS[role as keyof typeof MOCK_SESSIONS] ?? MOCK_SESSIONS.owner;
  if (session.role === "client") {
    const c = seed().clients.find((x) => x.id === session.clientId);
    return { ...session, fullName: c?.fullName ?? session.fullName };
  }
  return session;
}

export async function getOrganization(session: Session): Promise<Organization | null> {
  return session.orgId === organization.id ? organization : null;
}

export async function listMembers(session: Session): Promise<Member[]> {
  if (session.role !== "owner" && session.role !== "assistant") return [];
  return members.filter((m) => m.orgId === session.orgId);
}

export function canSeeClient(session: Session, row: ClientRow): boolean {
  const { client } = row;
  if (client.orgId !== session.orgId) return false;
  switch (session.role) {
    case "owner":
      return true;
    case "assistant":
      return session.memberId !== null && client.assignedMemberIds.includes(session.memberId);
    case "client":
      return client.id === session.clientId;
    default:
      return false;
  }
}

function toRows(): ClientRow[] {
  const s = seed();
  return s.clients.map((client) => ({
    client,
    subscription: s.subscriptions.find((x) => x.clientId === client.id) ?? null,
    activity: s.activity.find((x) => x.clientId === client.id)!,
    assignedNames: members
      .filter((m) => client.assignedMemberIds.includes(m.id) && m.role === "assistant")
      .map((m) => m.fullName.split(" ")[0]),
  }));
}

export async function listClientRows(session: Session): Promise<ClientRow[]> {
  const rows = toRows().filter((r) => canSeeClient(session, r));
  // Los ayudantes no ven datos económicos.
  if (session.role !== "owner") return rows.map((r) => ({ ...r, subscription: null }));
  return rows;
}

export async function getClientRow(session: Session, clientId: string): Promise<ClientRow | null> {
  const rows = await listClientRows(session);
  return rows.find((r) => r.client.id === clientId) ?? null;
}
