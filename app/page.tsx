"use client";

import Script from "next/script";

export default function Home() {
    return (
        <main>
            <h1>Hello World</h1>

            <Script
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
            />

            <div
                id="g_id_onload"
                data-client_id={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
                data-login_uri="http://localhost:3000/auth/callback"
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
        </main>
    );
}