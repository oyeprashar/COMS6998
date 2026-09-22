import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/");
    }

    return (
        <main>
            <h1>Protected Page</h1>

            <p>You are authenticated.</p>
            <p>{user.email}</p>
        </main>
    );
}