"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/ui/DataTable';
import Button from '@components/ui/Button';
import apiClient from '@/lib/apiClient';

const normalizeList = (data) => data?.results || data?.items || data || [];

const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';

    const amount = Number(value);
    if (Number.isNaN(amount)) return value;

    return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getLeaseStart = (lease) => lease?.rent_start || lease?.start_date || 'N/A';
const getLeaseEnd = (lease) => lease?.rent_finish || lease?.end_date || 'N/A';

const getRenterLabel = (renter) => {
    if (!renter) return 'N/A';
    if (typeof renter === 'object') {
        const fullName = `${renter.first_name || ''} ${renter.last_name || ''}`.trim();
        const renterId = renter.client_no || renter.id || 'N/A';
        return `${fullName || 'Unknown Renter'} (${renterId})`;
    }
    return renter;
};

const getPropertyLabel = (property) => {
    if (!property) return 'N/A';
    if (typeof property === 'object') {
        const propertyNo = property.property_no || property.id || 'N/A';
        const location = [property.street, property.city].filter(Boolean).join(', ');
        return location ? `${propertyNo} - ${location}` : `${propertyNo}`;
    }
    return property;
};

const getViewingDate = (viewing) => viewing?.viewing_date || viewing?.view_date || '';

const initialStats = {
    propertiesAvailable: 0,
    activeLeases: 0,
    pendingViewings: 0,
    totalClients: 0
};

export default function AdminPage() {
    const router = useRouter();

    const [stats, setStats] = useState(initialStats);
    const [recentLeases, setRecentLeases] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const loadOverview = async () => {
        setIsLoading(true);
        setLoadError('');

        try {
            const [propertiesData, leasesData, clientsData, viewingsData] = await Promise.all([
                apiClient('/properties/').catch(err => {
                    console.error('Failed to load properties for dashboard:', err);
                    return [];
                }),
                apiClient('/leases/').catch(err => {
                    console.error('Failed to load leases for dashboard:', err);
                    return [];
                }),
                apiClient('/users/client/').catch(() => apiClient('/users/clients/')).catch(() => []),
                apiClient('/properties/viewings/').catch(() => [])
            ]);

            const properties = normalizeList(propertiesData);
            const leases = normalizeList(leasesData);
            const clients = normalizeList(clientsData);
            const viewings = normalizeList(viewingsData);
            const today = new Date().toISOString().split('T')[0];

            const propertiesAvailable = properties.filter(
                (property) => String(property.status || '').toLowerCase() === 'available'
            ).length;

            const activeLeases = leases.filter((lease) => {
                const leaseEnd = getLeaseEnd(lease);
                if (!leaseEnd || leaseEnd === 'N/A') return true;
                return leaseEnd >= today;
            }).length;

            const pendingViewings = viewings.filter((viewing) => {
                const viewDate = getViewingDate(viewing);
                if (!viewDate) return false;
                return viewDate >= today;
            }).length;

            setStats({
                propertiesAvailable,
                activeLeases,
                pendingViewings,
                totalClients: clients.length
            });

            const sortedLeases = [...leases]
                .sort((leaseA, leaseB) => {
                    const dateA = getLeaseStart(leaseA);
                    const dateB = getLeaseStart(leaseB);
                    return String(dateB).localeCompare(String(dateA));
                })
                .slice(0, 6);

            setRecentLeases(sortedLeases);
        } catch (error) {
            console.error('Failed to load admin dashboard overview:', error);
            setLoadError('Unable to load dashboard metrics right now.');
            setStats(initialStats);
            setRecentLeases([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadOverview();
    }, []);

    const statsCards = useMemo(() => ([
        {
            title: 'Properties Available',
            value: stats.propertiesAvailable,
            note: 'Ready for leasing',
            tone: 'text-green-700 bg-green-50',
            iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
        },
        {
            title: 'Active Leases',
            value: stats.activeLeases,
            note: 'Contracts currently live',
            tone: 'text-blue-700 bg-blue-50',
            iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
        },
        {
            title: 'Pending Viewings',
            value: stats.pendingViewings,
            note: 'Scheduled from today onward',
            tone: 'text-amber-700 bg-amber-50',
            iconPath: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-6 4h2a2 2 0 002-2V8a2 2 0 00-2-2H9a2 2 0 00-2 2v8a2 2 0 002 2z'
        },
        {
            title: 'Total Clients',
            value: stats.totalClients,
            note: 'Owners and renters combined',
            tone: 'text-indigo-700 bg-indigo-50',
            iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857'
        }
    ]), [stats]);

    const leaseColumns = [
        {
            key: 'lease_no',
            label: 'Lease No',
            render: (value) => (
                <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-xs">
                    {value || 'N/A'}
                </span>
            )
        },
        {
            key: 'renter_no',
            label: 'Renter',
            render: (value) => getRenterLabel(value)
        },
        {
            key: 'property_no',
            label: 'Property',
            render: (value) => getPropertyLabel(value)
        },
        {
            key: 'monthly_rent',
            label: 'Monthly Rent',
            render: (value) => formatCurrency(value)
        },
        {
            key: 'term',
            label: 'Term',
            render: (_, row) => `${getLeaseStart(row)} to ${getLeaseEnd(row)}`
        }
    ];

    const quickActions = [
        {
            label: 'Add New Property',
            description: 'Create a listing and assign it to a branch.',
            href: '/Pages/Admin/Properties/Add',
            variant: 'primary'
        },
        {
            label: 'Register Client',
            description: 'Add a new renter profile and preference details.',
            href: '/Pages/Admin/Clients/Dashboard',
            variant: 'secondary'
        },
        {
            label: 'Log Payment',
            description: 'Record a lease payment and refresh balances.',
            href: '/Pages/Admin/Leases/Payments',
            variant: 'secondary'
        },
        {
            label: 'Create Lease',
            description: 'Generate a new rental contract quickly.',
            href: '/Pages/Admin/Leases',
            variant: 'secondary'
        }
    ];

    return (
        <div className="space-y-8">

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#002147] tracking-tight">
                        Welcome back to DreamHome
                    </h1>
                    <p className="text-gray-600 mt-1 font-medium">
                        Here is your operations pulse for properties, leases, viewings, and clients.
                    </p>
                </div>

                <Button variant="secondary" onClick={loadOverview} isLoading={isLoading}>
                    Refresh Overview
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsCards.map((card) => (
                    <div
                        key={card.title}
                        className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{card.title}</p>
                                <h3 className="text-3xl font-bold text-[#002147] mt-2">{card.value}</h3>
                            </div>
                            <div className={`p-3 rounded-lg ${card.tone}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.iconPath} />
                                </svg>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 font-medium mt-4">{card.note}</p>
                    </div>
                ))}
            </div>

            {loadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                    {loadError}
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 xl:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-800">Recent Leases</h2>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/Pages/Admin/LeasesFinancials/LeaseAgreements')}>
                            Open Lease Agreements
                        </Button>
                    </div>

                    <DataTable
                        columns={leaseColumns}
                        data={recentLeases}
                        keyField="lease_no"
                        isLoading={isLoading}
                        emptyMessage="No lease agreements found for recent activity."
                    />
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-gray-800">Quick Actions</h2>
                        <p className="text-sm text-gray-500 mt-1">Jump directly into high-impact operations.</p>
                    </div>

                    <div className="space-y-3">
                        {quickActions.map((action) => (
                            <div key={action.label} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                                <p className="text-sm font-semibold text-gray-800">{action.label}</p>
                                <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                                <Button
                                    variant={action.variant}
                                    size="sm"
                                    className="mt-3 w-full"
                                    onClick={() => router.push(action.href)}
                                >
                                    {action.label}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

        </div>
    );
}