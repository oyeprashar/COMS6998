"use client";

import Image from "next/image";
import { ChangeEvent, DragEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UploadImage({ userId }: { userId: string }) {
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

            // Tell caption feed to refresh
            window.dispatchEvent(new Event("caption-uploaded"));
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
        <div className="mt-8">
            <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="rounded-2xl border-2 border-dashed border-gray-700 p-8 text-center"
            >
                {!previewUrl ? (
                    <>
                        <p className="mb-5 text-gray-300">
                            Drag and drop an image here
                        </p>

                        <label className="cursor-pointer rounded-lg bg-white px-5 py-3 font-medium text-black">
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
                        <div className="relative h-80 w-full">
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
                            className="mt-4 text-sm text-gray-400 underline"
                        >
                            Choose another image
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <p className="mt-4 text-red-400">
                    {error}
                </p>
            )}

            {message && (
                <p className="mt-4 text-green-400">
                    {message}
                </p>
            )}

            <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="mt-6 w-full rounded-xl bg-white px-6 py-3 font-semibold text-black disabled:opacity-40"
            >
                {isUploading
                    ? "Uploading and generating captions..."
                    : "Upload image"}
            </button>

            {description && (
                <div className="mt-8 rounded-xl border border-gray-800 p-5">
                    <h2 className="mb-2 text-lg font-semibold">
                        Image Description
                    </h2>

                    <p className="text-gray-300">
                        {description}
                    </p>
                </div>
            )}

            {captions.length > 0 && (
                <div className="mt-6 space-y-3">
                    <h2 className="text-lg font-semibold">
                        Generated Captions
                    </h2>

                    {captions.map((caption, index) => (
                        <div
                            key={index}
                            className="rounded-xl border border-gray-800 p-4"
                        >
                            {caption}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}