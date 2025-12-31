import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function DesignSystemPage() {
    return (
        <div className="min-h-screen bg-background p-10 space-y-10">
            <div className="space-y-4">
                <h1 className="text-3xl font-bold text-foreground">Design System Verification</h1>
                <p className="text-muted-foreground">Clean & Minimal BtoB SaaS Theme</p>
            </div>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Buttons</h2>
                <div className="flex flex-wrap gap-4">
                    <Button variant="default">Primary Action</Button>
                    <Button variant="secondary">Secondary Action</Button>
                    <Button variant="outline">Outline Action</Button>
                    <Button variant="ghost">Ghost Action</Button>
                    <Button variant="destructive">Destructive Action</Button>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Cards</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Standard Card (Shadow SM)</CardTitle>
                            <CardDescription>Default card style for lists and content.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p>This card uses the default shadow-sm token for a subtle depth effect.</p>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full">Action</Button>
                        </CardFooter>
                    </Card>

                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Elevated Card (Shadow MD)</CardTitle>
                            <CardDescription>For highlighted content or modals.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p>This card uses shadow-md for a more pronounced floating effect.</p>
                        </CardContent>
                        <CardFooter>
                            <Button variant="secondary" className="w-full">Secondary</Button>
                        </CardFooter>
                    </Card>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-foreground">Color Palette</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <div className="h-20 w-full rounded-md bg-primary shadow-sm flex items-center justify-center text-primary-foreground font-medium">Primary</div>
                        <p className="text-sm font-medium">Orange #F27134</p>
                    </div>
                    <div className="space-y-2">
                        <div className="h-20 w-full rounded-md bg-accent shadow-sm flex items-center justify-center text-accent-foreground font-medium">Accent</div>
                        <p className="text-sm font-medium">Yellow #E1B12C</p>
                    </div>
                    <div className="space-y-2">
                        <div className="h-20 w-full rounded-md bg-muted shadow-sm flex items-center justify-center text-muted-foreground font-medium">Muted</div>
                        <p className="text-sm font-medium">Light Gray</p>
                    </div>
                    <div className="space-y-2">
                        <div className="h-20 w-full rounded-md bg-card border shadow-sm flex items-center justify-center text-card-foreground font-medium">Card Surface</div>
                        <p className="text-sm font-medium">White</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
