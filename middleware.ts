import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Public paths that don't require authentication
    const publicPaths = ['/sign-in', '/sign-up'];
    const path = request.nextUrl.pathname;

    // Allow public paths
    if (publicPaths.some(publicPath => path.startsWith(publicPath))) {
        return NextResponse.next();
    }

    // For now, allow all other paths (auth check happens client-side in layout)
    // In production, you might want to add server-side session validation here
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
