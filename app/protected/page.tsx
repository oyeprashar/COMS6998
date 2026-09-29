import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CaptionBattle from "./caption-battle";

export default async function ProtectedPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/");
    }

    return (
        <main className="min-h-screen bg-[#070707] text-white">
            <div className="mx-auto max-w-5xl px-6 py-12">
                <header className="mb-12">
                    <p className="mb-3 text-sm font-medium uppercase tracking-[0.25em] text-purple-400">
                        AI Caption Arena
                    </p>

                    <h1 className="text-5xl font-bold tracking-tight">
                        Caption Battle
                    </h1>

                    <p className="mt-3 max-w-xl text-gray-400">
                        Upload an image, generate AI captions, and vote for the funniest one.
                    </p>

                    <p className="mt-4 text-sm text-gray-600">
                        Signed in as {user.email}
                    </p>
                </header>

                <CaptionBattle userId={user.id} />
            </div>
        </main>
    );
}