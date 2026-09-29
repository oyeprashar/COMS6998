"use client";

import Image from "next/image";
import { ChangeEvent, DragEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UploadImage({
                                        userId,
                                        onUploaded,
                                    }: {
    userId: string;
    onUploaded: () => void;
}) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    const [description, setDescription] = useState("");
    const [captions, setCaptions] = useState<string[]>([]);

    const handleFile = (file: File) => {
        setError("");
        setMessage("");
        setDescription("");
        setCaptions([]);

        if (!file.type.startsWith("image/")) {
            setError("Please select an image.");
            return;
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (file) {
            handleFile(file);
        }
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();

        const file = event.dataTransfer.files?.[0];

        if (file) {
            handleFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError("Select an image first.");
            return;
        }

        setIsUploading(true);
        setError("");
        setMessage("");

        const supabase = createClient();

        try {
            const extension = selectedFile.name.split(".").pop() || "jpg";
            const fileName = `${crypto.randomUUID()}.${extension}`;
            const storagePath = `${userId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("caption-images")
                .upload(storagePath, selectedFile);

            if (uploadError) {
                throw uploadError;
            }

            const { data: imageRow, error: databaseError } = await supabase
                .from("images")
                .insert({
                    user_id: userId,
                    storage_path: storagePath,
                })
                .select()
                .single();

            if (databaseError || !imageRow) {
                throw databaseError || new Error("Could not create image row.");
            }

            const response = await fetch("/api/generate-caption", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    storagePath,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Caption generation failed.");
            }

            setDescription(result.description);
            setCaptions(result.captions);

            const { error: updateError } = await supabase
                .from("images")
                .update({
                    description: result.description,
                })
                .eq("id", imageRow.id);

            if (updateError) {
                throw updateError;
            }

            const captionRows = result.captions.map((caption: string) => ({
                image_id: imageRow.id,
                text: caption,
            }));

            const { error: captionsError } = await supabase
                .from("captions")
                .insert(captionRows);

            if (captionsError) {
                throw captionsError;
            }

            setMessage("Image uploaded and captions generated successfully.");

            setSelectedFile(null);
            setPreviewUrl("");

            onUploaded();
        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong."
            );
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur">
            <div className="mb-6">
                <h2 className="text-2xl font-semibold">
                    Create a Caption Battle
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                    Upload an image and Gemini will generate three captions.
                </p>
            </div>

            <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="group rounded-2xl border border-dashed border-purple-500/40 bg-purple-500/[0.03] p-8 text-center transition hover:border-purple-400 hover:bg-purple-500/[0.06]"
            >
                {!previewUrl ? (
                    <>
                        <div className="mb-4 text-4xl">
                            ✨
                        </div>

                        <p className="mb-2 text-lg font-medium">
                            Drop your image here
                        </p>

                        <p className="mb-6 text-sm text-gray-500">
                            PNG, JPG, WEBP
                        </p>

                        <label className="cursor-pointer rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-gray-200">
                            Choose image

                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                    </>
                ) : (
                    <div>
                        <div className="relative h-96 w-full overflow-hidden rounded-xl bg-black">
                            <Image
                                src={previewUrl}
                                alt="Image preview"
                                fill
                                className="object-contain"
                            />
                        </div>

                        <button
                            onClick={() => {
                                setSelectedFile(null);
                                setPreviewUrl("");
                            }}
                            className="mt-4 text-sm text-gray-400 underline hover:text-white"
                        >
                            Choose another image
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            {message && (
                <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
                    {message}
                </div>
            )}

            <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            >
                {isUploading
                    ? "Generating your captions..."
                    : "Generate Captions"}
            </button>

            {description && (
                <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-purple-400">
                        AI Image Analysis
                    </p>

                    <p className="leading-7 text-gray-300">
                        {description}
                    </p>
                </div>
            )}

            {captions.length > 0 && (
                <div className="mt-6">
                    <h3 className="mb-4 text-xl font-semibold">
                        Generated Captions
                    </h3>

                    <div className="space-y-3">
                        {captions.map((caption, index) => (
                            <div
                                key={index}
                                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-purple-500/40"
                            >
                                <span className="mr-3 text-purple-400">
                                    #{index + 1}
                                </span>

                                {caption}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}