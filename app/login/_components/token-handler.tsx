"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function TokenHandler() {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        // Run only on client side
        if (typeof window === "undefined") return;

        const hash = window.location.hash;

        // Check for hash accessing token
        if (hash && hash.includes("access_token")) {
            const handleHashToken = async () => {
                setIsProcessing(true);
                const supabase = createClient();

                try {
                    // Manual parsing of the hash
                    const params = new URLSearchParams(hash.substring(1)); // remove #
                    const access_token = params.get("access_token");
                    const refresh_token = params.get("refresh_token");

                    if (access_token && refresh_token) {
                        console.log("Tokens found in hash, setting session...");

                        // Manually set the session
                        const { data, error } = await supabase.auth.setSession({
                            access_token,
                            refresh_token,
                        });

                        if (error) {
                            console.error("Error setting session from hash:", error);
                        } else if (data.session) {
                            console.log("Session established securely, redirecting...");
                            router.push("/portal");
                            return;
                        }
                    }

                    // Fallback to auto-detection if manual parsing fails or is partial
                    const { data: { session }, error: getSessionError } = await supabase.auth.getSession();

                    if (session) {
                        console.log("Session found via getSession, redirecting...");
                        router.push("/portal");
                    } else if (getSessionError) {
                        console.error("Error in getSession fallback:", getSessionError);
                    }

                } catch (err) {
                    console.error("Unexpected error in token handler:", err);
                } finally {
                    setIsProcessing(false);
                }
            };

            handleHashToken();
        }
    }, [router]);

    if (isProcessing) {
        return (
            <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
                    <p className="text-sm font-medium text-gray-600">認証情報を処理中...</p>
                </div>
            </div>
        );
    }

    return null;
}
