import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value);
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    await supabase.auth.getUser();

    // Public paths that don't require authentication
    const publicPaths = ['/sign-in', '/sign-up'];
    const path = request.nextUrl.pathname;

    // Allow public paths
    if (publicPaths.some(publicPath => path.startsWith(publicPath))) {
        return response;
    }

    // For now, allow all other paths (auth check happens client-side in layout)
    // In production, you might want to add server-side session validation here
    return response;
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
