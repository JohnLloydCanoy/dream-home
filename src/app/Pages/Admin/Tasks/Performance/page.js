"use client";
import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';

export default function PerformancePage() {
    const { user } = useAuth();
    const [performanceData, setPerformanceData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPerformanceData = async () => {
            try {
                const data = await apiClient('/users/staff/performance-report/');
                setPerformanceData(data);
            } catch (err) {
                console.error("Error fetching performance report:", err);
                setError("Failed to load performance metrics.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchPerformanceData();
    }, []);

    // Calculate overall aggregates for the top cards
    const totalProperties = performanceData.reduce((acc, row) => acc + parseInt(row.properties_managed || 0), 0);
    const totalLeases = performanceData.reduce((acc, row) => acc + parseInt(row.leases_arranged || 0), 0);
    const totalPayments = performanceData.reduce((acc, row) => acc + parseInt(row.payments_processed || 0), 0);
    const totalClients = performanceData.reduce((acc, row) => acc + parseInt(row.clients_registered || 0), 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-extrabold text-[#002147]">Staff Performance Report</h1>
                <p className="text-gray-600">Cross-module analytics tracking staff productivity and actions.</p>
            </div>

            {/* OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Properties Managed</p>
                        <h2 className="text-3xl font-black text-blue-900 mt-1">{totalProperties}</h2>
                    </div>
                    <div className="h-10 w-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Leases Closed</p>
                        <h2 className="text-3xl font-black text-emerald-600 mt-1">{totalLeases}</h2>
                    </div>
                    <div className="h-10 w-10 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payments Processed</p>
                        <h2 className="text-3xl font-black text-violet-600 mt-1">{totalPayments}</h2>
                    </div>
                    <div className="h-10 w-10 bg-violet-50 text-violet-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clients Registered</p>
                        <h2 className="text-3xl font-black text-amber-500 mt-1">{totalClients}</h2>
                    </div>
                    <div className="h-10 w-10 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* PERFORMANCE TABLE */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-[#002147]">Staff Leaderboard</h3>
                </div>
                
                {isLoading ? (
                    <div className="p-10 text-center text-gray-400">Loading performance data...</div>
                ) : error ? (
                    <div className="p-10 text-center text-red-500">{error}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Staff Member</th>
                                    <th className="px-6 py-4 font-semibold text-center">Properties</th>
                                    <th className="px-6 py-4 font-semibold text-center">Leases</th>
                                    <th className="px-6 py-4 font-semibold text-center">Payments</th>
                                    <th className="px-6 py-4 font-semibold text-center">Clients</th>
                                    <th className="px-6 py-4 font-semibold text-center">Total Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {performanceData.length > 0 ? (
                                    performanceData.map((staff, idx) => {
                                        // Simple arbitrary score weighting for visual sorting
                                        const score = (parseInt(staff.leases_arranged) * 10) + 
                                                      (parseInt(staff.properties_managed) * 5) + 
                                                      (parseInt(staff.payments_processed) * 2) + 
                                                      (parseInt(staff.clients_registered) * 3);
                                        return (
                                            <tr key={staff.staff_no} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                                            {staff.full_name?.charAt(0) || '?'}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-900">{staff.full_name}</div>
                                                            <div className="text-xs text-gray-500">{staff.staff_position} • {staff.staff_no}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-medium text-gray-700">{staff.properties_managed}</td>
                                                <td className="px-6 py-4 text-center font-medium text-emerald-600">{staff.leases_arranged}</td>
                                                <td className="px-6 py-4 text-center font-medium text-violet-600">{staff.payments_processed}</td>
                                                <td className="px-6 py-4 text-center font-medium text-amber-600">{staff.clients_registered}</td>
                                                <td className="px-6 py-4 text-center font-bold text-[#002147]">{score}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                                            No performance data found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}