import { NextResponse } from 'next/server';
import { decodeJwt } from 'jose';

// ─── Role hierarchy ────────────────────────────────────────────────────
const ALL_STAFF = ['ADMIN', 'Manager', 'Supervisor', 'Staff', 'Secretary'];
const MANAGER_UP = ['ADMIN', 'Manager', 'Supervisor'];
const ADMIN_ONLY = ['ADMIN'];

// ─── Route → allowed roles map ─────────────────────────────────────────
// Routes are matched by prefix: '/Pages/Admin/Staff' matches
// '/Pages/Admin/Staff', '/Pages/Admin/Staff/Roles', etc.
// Order matters — more specific routes must come first.
const ROUTE_ROLES = [
    // ADMIN-only routes
    { path: '/Pages/Admin/Staff',                 roles: ADMIN_ONLY },
    { path: '/Pages/Admin/Audits',                roles: ADMIN_ONLY },

    // Manager+ routes
    { path: '/Pages/Admin/Branches',              roles: MANAGER_UP },
    { path: '/Pages/Admin/Reports',               roles: MANAGER_UP },
    { path: '/Pages/Admin/Leases',                roles: MANAGER_UP },
    { path: '/Pages/Admin/Tasks/Create',          roles: MANAGER_UP },
    { path: '/Pages/Admin/Tasks/Performance',     roles: MANAGER_UP },
    { path: '/Pages/Admin/Properties/Assignments',roles: MANAGER_UP },
    { path: '/Pages/Admin/Properties/Add',        roles: MANAGER_UP },
    { path: '/Pages/Admin/Properties/RenterMatching', roles: MANAGER_UP },
    { path: '/Pages/Admin/Clients/Registrations', roles: MANAGER_UP },

    // All authenticated staff
    { path: '/Pages/Admin',                       roles: ALL_STAFF },
];

/**
 * Find the allowed roles for a given pathname.
 * Uses prefix matching — the first matching entry wins.
 */
function getAllowedRoles(pathname) {
    for (const route of ROUTE_ROLES) {
        if (pathname === route.path || pathname.startsWith(route.path + '/')) {
            return route.roles;
        }
    }
    // No matching route — let it pass (static files, API routes, etc.)
    return null;
}

/**
 * Decode the JWT from the cookie and extract the role.
 * Uses jose's decodeJwt which works in Edge runtime (no Node.js crypto needed).
 */
function extractRole(token) {
    try {
        const payload = decodeJwt(token);
        return payload.role || null;
    } catch {
        return null;
    }
}

// ─── Proxy ──────────────────────────────────────────────────────────────
export function proxy(request) {
    const { pathname } = request.nextUrl;

    // Only guard /Pages/Admin routes
    if (!pathname.startsWith('/Pages/Admin')) {
        return NextResponse.next();
    }

    // ── 1. Authentication check ─────────────────────────────────────────
    const token = request.cookies.get('adminAccessToken')?.value;

    if (!token) {
        // No token → redirect to login
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/';
        loginUrl.searchParams.set('reason', 'unauthenticated');
        return NextResponse.redirect(loginUrl);
    }

    // ── 2. Extract role from JWT ────────────────────────────────────────
    const role = extractRole(token);

    if (!role) {
        // Invalid/malformed token → redirect to login
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/';
        loginUrl.searchParams.set('reason', 'invalid_token');
        return NextResponse.redirect(loginUrl);
    }

    // ── 3. Authorization check ──────────────────────────────────────────
    const allowedRoles = getAllowedRoles(pathname);

    // If no route rule matched, allow access
    if (allowedRoles && !allowedRoles.includes(role)) {
        // Unauthorized → redirect to dashboard with message
        const dashboardUrl = request.nextUrl.clone();
        dashboardUrl.pathname = '/Pages/Admin';
        dashboardUrl.searchParams.set('unauthorized', 'true');
        return NextResponse.redirect(dashboardUrl);
    }

    // ── 4. Authorized — proceed ─────────────────────────────────────────
    return NextResponse.next();
}

// ─── Matcher — only run proxy on page routes ─────────────────────────────
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
};
