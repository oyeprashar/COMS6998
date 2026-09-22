"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

export default function Home() {
    const [callbackUrl, setCallbackUrl] = useState("");

    useEffect(() => {
        setCallbackUrl(`${window.location.origin}/auth/callback`);
    }, []);

    return (
        <main>
            <h1>Hello World</h1>

            <Script
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
            />

            {callbackUrl && (
                <>
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
                </>
            )}
        </main>
    );
}