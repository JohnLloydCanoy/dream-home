'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

// Which roles can see each menu
// "ADMIN"      → superuser, full access
// "Manager"    → branch manager
// "Supervisor" → supervises staff
// "Staff"      → standard staff
// "Secretary"  → secretarial staff
const ALL_STAFF = ['ADMIN', 'Manager', 'Supervisor', 'Staff', 'Secretary'];
const MANAGER_UP = ['ADMIN', 'Manager', 'Supervisor'];
const ADMIN_ONLY = ['ADMIN'];

const ALL_MENUS = [
    {
        title: 'Staff Management',
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
        allowedRoles: ADMIN_ONLY,   // ✅ Only ADMIN sees staff management
        items: [
            { label: 'Staff Directory', href: '/Pages/Admin/Staff' },
            { label: 'Roles & Permissions', href: '/Pages/Admin/Staff/Roles' },
        ],
    },
    {
        title: 'Task Management',
        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
        allowedRoles: ALL_STAFF,    // ✅ All staff can see tasks
        items: [
            { label: 'Active Tasks', href: '/Pages/Admin/Tasks' },
            { label: 'Assign New Task', href: '/Pages/Admin/Tasks/Create', allowedRoles: MANAGER_UP },
            { label: 'Team Performance', href: '/Pages/Admin/Tasks/Performance', allowedRoles: MANAGER_UP },
        ],
    },
    {
        title: 'Branch Operations',
        icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
        allowedRoles: MANAGER_UP,   // ✅ Manager+ only
        items: [
            { label: 'Branch Overview', href: '/Pages/Admin/Branches' },
            { label: 'Resource Allocation', href: '/Pages/Admin/Branches/Resources' },
        ],
    },
    {
        title: 'System Audits',
        icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
        allowedRoles: ADMIN_ONLY,   // ✅ Only ADMIN can see audits
        items: [
            { label: 'Activity Logs', href: '/Pages/Admin/Audits/Logs' },
            { label: 'Security Settings', href: '/Pages/Admin/Audits/Security' },
        ],
    },
    {
        title: 'Property Management',
        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
        allowedRoles: ALL_STAFF,    // ✅ All staff can view properties
        items: [
            { label: 'Property Listings', href: '/Pages/Admin/Properties' },
            { label: 'Property Assignments', href: '/Pages/Admin/Properties/Assignments', allowedRoles: MANAGER_UP },
            { label: 'Add New Property', href: '/Pages/Admin/Properties/Add', allowedRoles: MANAGER_UP },
            { label: 'Renter Matching', href: '/Pages/Admin/Properties/RenterMatching', allowedRoles: MANAGER_UP },
            { label: 'Property Viewings', href: '/Pages/Admin/Properties/Viewings' },
            { label: 'Maintenance', href: '/Pages/Admin/Maintenance' },
            { label: 'Advertisements', href: '/Pages/Admin/Properties/Advertisement' },
        ],
    },
    {
        title: 'Client Relations',
        icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
        allowedRoles: ALL_STAFF,    // ✅ All staff can view clients
        items: [
            { label: 'Users Dashboard', href: '/Pages/Admin/Clients/Dashboard' },
            { label: 'Branch Registrations', href: '/Pages/Admin/Clients/Registrations', allowedRoles: MANAGER_UP },
        ],
    },
    {
        title: 'Leases & Financials',
        icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        allowedRoles: MANAGER_UP,   // ✅ Manager+ only
        items: [
            { label: 'Lease Agreements', href: '/Pages/Admin/Leases' },
            { label: 'Rental Status Tracking', href: '/Pages/Admin/Leases/Status' },
            { label: 'Payments & Balances', href: '/Pages/Admin/Leases/Payments' },
        ],
    },
    {
        title: 'Reports & Analytics',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
        allowedRoles: MANAGER_UP,   // ✅ Manager+ only
        items: [
            { label: 'Property Reports', href: '/Pages/Admin/Reports/Properties' },
            { label: 'Client Reports', href: '/Pages/Admin/Reports/Clients' },
            { label: 'Revenue Reports', href: '/Pages/Admin/Reports/Revenue' },
        ],
    },
];

// ─── Role badge colour ───────────────────────────────────────────────
function getRoleBadgeColor(role) {
    switch (role) {
        case 'ADMIN': return 'text-yellow-300';
        case 'Manager': return 'text-green-300';
        case 'Supervisor': return 'text-blue-300';
        case 'Secretary': return 'text-pink-300';
        default: return 'text-blue-300';   // Staff
    }
}

// ─── Component ──────────────────────────────────────────────────────
const ManagementSideBar = () => {
    const pathname = usePathname();
    const router = useRouter();
    const [activeMenu, setActiveMenu] = useState(null);
    const { user: adminUser, isLoading: isLoadingAdmin, role: userRole } = useAuth();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const isActive = (path) => pathname === path;

    const handleSignOut = () => {
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('adminRefreshToken');
        router.push('/');
    };

    const toggleMenu = (title) => {
        setActiveMenu(activeMenu === title ? null : title);
    };

    // Filter menus based on the user's role
    const visibleMenus = ALL_MENUS.filter(
        (menu) => !menu.allowedRoles || menu.allowedRoles.includes(userRole)
    );

    if (!mounted) return <aside className="w-64 h-screen fixed top-0 left-0 bg-[#002147] border-r border-blue-900 z-50" />;

    return (
        <aside className="w-64 h-screen fixed top-0 left-0 bg-[#002147] text-white border-r border-blue-900 shadow-xl flex flex-col font-sans z-50">

            {/* LOGO */}
            <div className="p-6 border-b border-blue-900 flex items-center gap-3 shrink-0">
                <div className="p-1 bg-white/5 rounded-md">
                    <img src="/logo.png" alt="DH" className="h-10 w-auto object-contain" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xl font-bold leading-tight tracking-tight">DreamHome</span>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-blue-300 font-semibold">Admin Portal</span>
                </div>
            </div>

            {/* NAVIGATION */}
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">

                <Link
                    href="/Pages/Admin"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('/Pages/Admin') ? 'bg-blue-600/20 text-blue-300' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Dashboard Overview
                </Link>

                <div className="pt-4 pb-2">
                    <p className="px-3 text-xs font-semibold text-blue-400/60 uppercase tracking-wider">Management</p>
                </div>

                {visibleMenus.map((menu) => {
                    // Filter sub-items by role too
                    const visibleItems = menu.items.filter(
                        (item) => !item.allowedRoles || item.allowedRoles.includes(userRole)
                    );

                    return (
                        <div key={menu.title} className="mb-1">
                            <button
                                onClick={() => toggleMenu(menu.title)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeMenu === menu.title ? 'bg-white/5 text-white' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menu.icon} />
                                    </svg>
                                    {menu.title}
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-200 ${activeMenu === menu.title ? 'rotate-180 text-blue-300' : 'opacity-50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${activeMenu === menu.title ? 'max-h-48 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                                <div className="pl-11 pr-3 py-1 space-y-1 border-l border-blue-800 ml-5 my-1">
                                    {visibleItems.map((item) => (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            className={`block px-2 py-1.5 text-xs font-medium rounded transition-colors ${isActive(item.href) ? 'text-blue-300 bg-blue-900/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {item.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* BOTTOM PROFILE */}
            <div className="p-4 border-t border-blue-900 bg-[#001833] shrink-0">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0 border border-blue-400">
                            {isLoadingAdmin ? '...' : (adminUser?.fullName?.charAt(0) || 'A')}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-bold text-white truncate">
                                {isLoadingAdmin ? 'Loading...' : (adminUser?.fullName || 'Admin User')}
                            </span>
                            {/* ✅ Now shows actual role + branch */}
                            <span className={`text-[10px] uppercase font-semibold truncate ${getRoleBadgeColor(userRole)}`}>
                                {userRole || 'Staff'} {adminUser?.branchCode ? `• ${adminUser.branchCode}` : ''}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white text-xs font-bold py-2 rounded-lg transition-colors border border-red-600/20 hover:border-red-600"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </div>

        </aside>
    );
};

export default ManagementSideBar;