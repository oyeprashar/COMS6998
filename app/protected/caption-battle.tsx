"use client";

import { useState } from "react";
import UploadImage from "./upload-image";
import CaptionFeed from "./caption-feed";

export default function CaptionBattle({ userId }: { userId: string }) {
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <>
            <UploadImage
                userId={userId}
                onUploaded={() => setRefreshKey((current) => current + 1)}
            />

            <CaptionFeed
                userId={userId}
                refreshKey={refreshKey}
            />
        </>
    );
}