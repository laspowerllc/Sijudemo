import { redirect } from "next/navigation";
import { getSession } from "@/lib/data";

export default async function Home() {
  const session = await getSession();
  redirect(session.role === "client" ? "/app" : "/coach");
}
