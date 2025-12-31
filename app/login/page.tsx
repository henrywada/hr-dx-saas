"use client";

import { login, signup } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    return (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>
                    Login or create a new account to get started.
                </CardDescription>
            </CardHeader>
            <form>
                <CardContent>
                    <div className="grid w-full items-center gap-4">
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                            />
                        </div>
                    </div>
                    {error && (
                        <p className="text-sm text-red-500 mt-4">{error}</p>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button formAction={login} variant="outline">
                        Login
                    </Button>
                    <Button formAction={signup}>Sign Up</Button>
                </CardFooter>
            </form>
        </Card>
    );
}

export default function LoginPage() {
    return (
        <div className="flex h-screen items-center justify-center">
            <Suspense>
                <LoginForm />
            </Suspense>
        </div>
    )
}
