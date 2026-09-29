"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

export default function Home() {
    const [callbackUrl, setCallbackUrl] = useState("");

    useEffect(() => {
        setCallbackUrl(`${window.location.origin}/auth/callback`);
    }, []);

    return (
        <main className="min-h-screen bg-black text-white">
            <Script
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
            />

            <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
                <h1 className="text-4xl font-bold">
                    Caption Battle
                </h1>

                <p className="mt-2 text-gray-400">
                    Sign in to upload images and generate funny captions.
                </p>

                {callbackUrl && (
                    <div className="mt-8">
                        <div
                            id="g_id_onload"
                            data-client_id={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
                            data-login_uri={callbackUrl}
                            data-ux_mode="redirect"
                            data-auto_prompt="false"
                        />

                        <div
                            className="g_id_signin"
                            data-type="standard"
                            data-size="large"
                            data-theme="outline"
                            data-text="sign_in_with"
                        />
                    </div>
                )}
            </div>
        </main>
    );
}