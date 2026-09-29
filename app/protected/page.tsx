import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UploadImage from "./upload-image";
import CaptionFeed from "./caption-feed";

export default async function ProtectedPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/");
    }

    return (
        <main className="min-h-screen bg-black text-white">
            <div className="mx-auto max-w-2xl px-6 py-12">
                <h1 className="text-4xl font-bold">
                    Caption Battle
                </h1>

                <p className="mt-2 text-gray-400">
                    Logged in as {user.email}
                </p>

                <UploadImage userId={user.id} />

                <CaptionFeed userId={user.id} />
            </div>
        </main>
    );
}