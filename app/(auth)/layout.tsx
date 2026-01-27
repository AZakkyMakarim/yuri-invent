export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-(--color-bg-primary) via-(--color-bg-secondary) to-(--color-bg-tertiary) p-4">
            <div className="w-full max-w-md">
                {children}
            </div>
        </div>
    );
}

