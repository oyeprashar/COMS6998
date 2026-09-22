import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    const formData = await request.formData();

    const credential = formData.get("credential");
    const csrfTokenFromBody = formData.get("g_csrf_token");
    const csrfTokenFromCookie =
        request.cookies.get("g_csrf_token")?.value;

    if (
        !credential ||
        !csrfTokenFromBody ||
        !csrfTokenFromCookie ||
        csrfTokenFromBody !== csrfTokenFromCookie
    ) {
        return new NextResponse("Invalid authentication request", {
            status: 400,
        });
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: credential.toString(),
    });

    if (error) {
        console.error(error);

        return new NextResponse("Authentication failed", {
            status: 401,
        });
    }

    return NextResponse.redirect(
        new URL("/protected", request.url),
        303
    );
}