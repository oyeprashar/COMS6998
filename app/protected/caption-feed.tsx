"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Caption = {
    id: string;
    text: string;
    votes: {
        vote: number;
        user_id: string;
    }[];
};

type ImageRow = {
    id: string;
    storage_path: string;
    description: string | null;
    captions: Caption[];
};

export default function CaptionFeed({
                                        userId,
                                        refreshKey,
                                    }: {
    userId: string;
    refreshKey: number;
}) {
    const [items, setItems] = useState<
        (ImageRow & { signedUrl: string })[]
    >([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadFeed = async () => {
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
            .from("images")
            .select(`
                id,
                storage_path,
                description,
                captions (
                    id,
                    text,
                    votes (
                        vote,
                        user_id
                    )
                )
            `)
            .order("created_at", { ascending: false });

        if (fetchError) {
            setError(fetchError.message);
            setLoading(false);
            return;
        }

        const rows = await Promise.all(
            (data || []).map(async (item: ImageRow) => {
                const { data: signed } = await supabase.storage
                    .from("caption-images")
                    .createSignedUrl(item.storage_path, 3600);

                return {
                    ...item,
                    signedUrl: signed?.signedUrl || "",
                };
            })
        );

        setItems(rows);
        setLoading(false);
    };

    useEffect(() => {
        loadFeed();
    }, [refreshKey]);

    const vote = async (
        captionId: string,
        value: 1 | -1,
        currentVote?: number
    ) => {
        const supabase = createClient();

        if (currentVote === value) {
            const { error: deleteError } = await supabase
                .from("votes")
                .delete()
                .eq("user_id", userId)
                .eq("caption_id", captionId);

            if (deleteError) {
                setError(deleteError.message);
                return;
            }
        } else {
            const { error: voteError } = await supabase
                .from("votes")
                .upsert(
                    {
                        user_id: userId,
                        caption_id: captionId,
                        vote: value,
                    },
                    {
                        onConflict: "user_id,caption_id",
                    }
                );

            if (voteError) {
                setError(voteError.message);
                return;
            }
        }

        await loadFeed();
    };

    if (loading) {
        return (
            <p className="mt-12 text-gray-400">
                Loading caption battles...
            </p>
        );
    }

    if (error) {
        return (
            <div className="mt-12 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
                {error}
            </div>
        );
    }

    return (
        <section className="mt-16">
            <div className="mb-8 flex items-end justify-between">
                <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-pink-400">
                        Community
                    </p>

                    <h2 className="mt-2 text-3xl font-bold">
                        Caption Feed
                    </h2>
                </div>

                <span className="text-sm text-gray-500">
                    {items.length} battles
                </span>
            </div>

            <div className="space-y-12">
                {items.map((item) => (
                    <article
                        key={item.id}
                        className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]"
                    >
                        {item.signedUrl && (
                            <div className="bg-black p-4">
                                <img
                                    src={item.signedUrl}
                                    alt="Uploaded image"
                                    className="mx-auto max-h-[520px] w-full rounded-2xl object-contain"
                                />
                            </div>
                        )}

                        <div className="space-y-4 p-6">
                            {item.captions.map((caption, index) => {
                                const score = caption.votes.reduce(
                                    (sum, current) =>
                                        sum + current.vote,
                                    0
                                );

                                const myVote = caption.votes.find(
                                    (current) =>
                                        current.user_id === userId
                                )?.vote;

                                return (
                                    <div
                                        key={caption.id}
                                        className="flex overflow-hidden rounded-2xl border border-white/10 bg-[#101010] transition hover:border-white/20"
                                    >
                                        <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-1 border-r border-white/10 bg-white/[0.025] py-4">
                                            <button
                                                onClick={() =>
                                                    vote(
                                                        caption.id,
                                                        1,
                                                        myVote
                                                    )
                                                }
                                                className={`text-2xl leading-none transition ${
                                                    myVote === 1
                                                        ? "text-orange-500"
                                                        : "text-gray-500 hover:text-orange-500"
                                                }`}
                                                aria-label="Upvote"
                                            >
                                                ▲
                                            </button>

                                            <span
                                                className={`text-sm font-bold ${
                                                    myVote === 1
                                                        ? "text-orange-500"
                                                        : myVote === -1
                                                            ? "text-blue-400"
                                                            : "text-gray-300"
                                                }`}
                                            >
                                                {score}
                                            </span>

                                            <button
                                                onClick={() =>
                                                    vote(
                                                        caption.id,
                                                        -1,
                                                        myVote
                                                    )
                                                }
                                                className={`text-2xl leading-none transition ${
                                                    myVote === -1
                                                        ? "text-blue-400"
                                                        : "text-gray-500 hover:text-blue-400"
                                                }`}
                                                aria-label="Downvote"
                                            >
                                                ▼
                                            </button>
                                        </div>

                                        <div className="flex flex-1 items-center p-5">
                                            <div className="flex gap-3">
                                                <span className="text-sm font-bold text-purple-400">
                                                    #{index + 1}
                                                </span>

                                                <p className="text-lg leading-7 text-gray-100">
                                                    {caption.text}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}