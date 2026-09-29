import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

async function generateWithFallback(contents: any) {
    const models = [
        "gemini-3.8-flash",
        "gemini-3.5-flash-lite",
    ];

    let lastError: unknown;

    for (const model of models) {
        try {
            return await ai.models.generateContent({
                model,
                contents,
            });
        } catch (error) {
            lastError = error;
            console.error(`Gemini model failed: ${model}`, error);
        }
    }

    throw lastError;
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { storagePath } = await request.json();

        if (!storagePath) {
            return NextResponse.json(
                { error: "storagePath is required" },
                { status: 400 }
            );
        }

        // Make sure user can only generate captions
        // for an image stored inside their own folder.
        if (!storagePath.startsWith(`${user.id}/`)) {
            return NextResponse.json(
                { error: "Invalid image path" },
                { status: 403 }
            );
        }

        // Download image from Supabase Storage
        const { data: imageBlob, error: downloadError } =
            await supabase.storage
                .from("caption-images")
                .download(storagePath);

        if (downloadError || !imageBlob) {
            throw new Error(
                downloadError?.message || "Could not download image"
            );
        }

        const arrayBuffer = await imageBlob.arrayBuffer();

        const base64Image =
            Buffer.from(arrayBuffer).toString("base64");

        // =====================================================
        // PROMPT 1: IMAGE -> DESCRIPTION
        // =====================================================

        const descriptionResponse = await generateWithFallback([
            {
                inlineData: {
                    mimeType: imageBlob.type || "image/jpeg",
                    data: base64Image,
                },
            },
            {
                text: `
Describe this image clearly and objectively.

Mention:
- the main people or objects
- what they are doing
- the setting
- any unusual or funny details

Keep the description under 120 words.
                `,
            },
        ]);

        const description =
            descriptionResponse.text?.trim();

        if (!description) {
            throw new Error(
                "Gemini did not generate an image description."
            );
        }

        // =====================================================
        // PROMPT 2: DESCRIPTION -> FUNNY CAPTIONS
        // =====================================================

        const captionResponse = await generateWithFallback(`
Here is a description of an image:

"${description}"

Generate exactly 3 funny captions for this image.

Rules:
- Each caption must be one sentence.
- Keep each caption under 20 words.
- Make them playful and internet-friendly.
- Do not number the captions.
- Return exactly one caption per line.
        `);

        const captions = captionResponse.text
            ?.split("\n")
            .map((caption) =>
                caption
                    .replace(/^[-*]\s*/, "")
                    .trim()
            )
            .filter(Boolean)
            .slice(0, 3);

        if (!captions || captions.length === 0) {
            throw new Error(
                "Gemini did not generate captions."
            );
        }

        return NextResponse.json({
            description,
            captions,
        });
    } catch (error) {
        console.error("Generate caption error:", error);

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Caption generation failed",
            },
            { status: 500 }
        );
    }
}