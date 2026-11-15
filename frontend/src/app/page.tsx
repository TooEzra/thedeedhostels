import { redirect } from "next/navigation";
import { getMe } from "@/lib/server-api";

export default async function Home() {
  const user = await getMe();
  if (!user) redirect("/login");
  redirect(user.role === "tenant" ? "/tenant" : "/admin");
}
