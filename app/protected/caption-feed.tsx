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

export default function CaptionFeed({ userId }: { userId: string }) {
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
    }, []);

    const vote = async (
        captionId: string,
        value: 1 | -1
    ) => {
        const supabase = createClient();

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

        await loadFeed();
    };

    if (loading) {
        return <p className="mt-10 text-gray-400">Loading feed...</p>;
    }

    if (error) {
        return <p className="mt-10 text-red-400">{error}</p>;
    }

    return (
        <div className="mt-12 space-y-10">
            <h2 className="text-2xl font-bold">
                Caption Feed
            </h2>

            {items.map((item) => (
                <div
                    key={item.id}
                    className="rounded-2xl border border-gray-800 p-5"
                >
                    {item.signedUrl && (
                        <div className="mb-6 w-full">
                            <img
                                src={item.signedUrl}
                                alt="Uploaded image"
                                className="max-h-96 w-full object-contain"
                            />
                        </div>
                    )}

                    <div className="space-y-4">
                        {item.captions.map((caption) => {
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
                                    className="rounded-xl border border-gray-800 p-4"
                                >
                                    <p>{caption.text}</p>

                                    <div className="mt-4 flex items-center gap-4">
                                        <button
                                            onClick={() =>
                                                vote(caption.id, 1)
                                            }
                                            className={
                                                myVote === 1
                                                    ? "font-bold text-green-400"
                                                    : "text-gray-400"
                                            }
                                        >
                                            👍
                                        </button>

                                        <span>{score}</span>

                                        <button
                                            onClick={() =>
                                                vote(caption.id, -1)
                                            }
                                            className={
                                                myVote === -1
                                                    ? "font-bold text-red-400"
                                                    : "text-gray-400"
                                            }
                                        >
                                            👎
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}