'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import DataTable from '@/components/ui/DataTable';
import ExportPDF from '@/components/ui/ExportPDF';
import FormField from '@/components/ui/FormField';

export default function BranchRegistrationsPage() {
    const [clients, setClients] = useState([]);
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            apiClient('/users/clients/'),
            apiClient('/branches/')
        ])
        .then(([clientsData, branchesData]) => {
            setClients(clientsData?.results || clientsData?.items || clientsData || []);
            setBranches(branchesData?.items || branchesData || []);
        })
        .catch(err => console.error("Error fetching data:", err))
        .finally(() => setIsLoading(false));
    }, []);

    // Helper to safely get the branch ID from the nested object
    const getBranchNo = (branchData) => {
        if (!branchData) return null;
        if (typeof branchData === 'object') return branchData.branch_no;
        return branchData;
    };

    // Helper to safely get the staff name
    const getStaffName = (staffData) => {
        if (!staffData) return 'Unassigned';
        if (typeof staffData === 'object') {
            return `${staffData.first_name || ''} ${staffData.last_name || ''}`.trim() || staffData.staff_no;
        }
        return staffData;
    };

    // Filter clients based on the selected branch
    const filteredClients = clients.filter(client => {
        // If "all" or empty string is selected, show all clients that ARE registered to SOME branch
        // (Since this is a branch report, we probably shouldn't show "Unregistered" clients here)
        const branchNo = getBranchNo(client.registered_branch || client.registration_branch);
        
        if (selectedBranch === 'all' || selectedBranch === '') {
            return branchNo !== null; // Only show registered clients
        }
        
        return branchNo === selectedBranch;
    });

    const tableColumns = [
        { 
            key: 'client_no', 
            label: 'Client ID',
            render: (val) => <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{val}</span>
        },
        { 
            key: 'name', 
            label: 'Client Name',
            render: (val, row) => <span className="font-semibold text-gray-900">{row.first_name} {row.last_name}</span>,
            exportValue: (row) => `${row.first_name} ${row.last_name}`
        },
        {
            key: 'telephone_no',
            label: 'Telephone No.',
            render: (val, row) => <span className="text-gray-700">{row.telephone_no || 'N/A'}</span>,
            exportValue: (row) => row.telephone_no || 'N/A'
        },
        { 
            key: 'role', 
            label: 'Role',
            render: (val) => (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    val?.toLowerCase() === 'renter' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                }`}>
                    {val || 'N/A'}
                </span>
            )
        },
        { 
            key: 'registered_staff', 
            label: 'Assigned Staff',
            render: (val, row) => <span className="text-gray-700">{getStaffName(row.registered_staff || row.registration_staff)}</span>,
            exportValue: (row) => getStaffName(row.registered_staff || row.registration_staff)
        },
        { 
            key: 'requirements', 
            label: 'Housing Requirements',
            render: (val, row) => {
                if (row.role?.toLowerCase() !== 'renter') return <span className="text-gray-400 italic">Owner (N/A)</span>;
                const req = row.renter_requirements;
                if (!req) return <span className="text-gray-400 italic">No requirements set</span>;
                
                return (
                    <div className="text-sm">
                        <span className="font-medium">{req.pref_property_type || 'Any type'}</span>
                        <br />
                        <span className="text-gray-500">Max Budget: ₱{req.max_monthly_rent || 'N/A'}</span>
                    </div>
                );
            },
            exportValue: (row) => {
                if (row.role?.toLowerCase() !== 'renter') return 'Owner (N/A)';
                const req = row.renter_requirements;
                if (!req) return 'No requirements set';
                return `${req.pref_property_type || 'Any type'} - Max Budget: ₱${req.max_monthly_rent || 'N/A'}`;
            }
        },
        { 
            key: 'date_registered', 
            label: 'Date Registered',
            render: (val, row) => <span className="text-gray-600">{row.date_registered ? new Date(row.date_registered).toLocaleDateString() : 'N/A'}</span>,
            exportValue: (row) => row.date_registered ? new Date(row.date_registered).toLocaleDateString() : 'N/A'
        }
    ];

    const branchDisplayStr = selectedBranch === 'all' || selectedBranch === '' 
        ? 'All Branches' 
        : `Branch ${selectedBranch}`;

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-3xl font-bold text-gray-900">Branch Registrations</h1>
                    <p className="text-sm text-gray-500 mt-1">Official reporting roster of clients registered at each branch office.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <ExportPDF
                        title={`Client Registration Roster: ${branchDisplayStr}`}
                        subtitle="Generated by DreamHome Admin Portal"
                        fileName={`branch_registrations_${selectedBranch || 'all'}`}
                        columns={tableColumns}
                        data={filteredClients}
                        buttonLabel="Export PDF Report"
                        buttonVariant="primary"
                        buttonSize="md"
                    />
                </div>
            </div>

            {/* Filter Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-full sm:w-96">
                    <FormField
                        label="Select Branch Office for Report"
                        field="branchSelect"
                        type="select"
                        value={selectedBranch}
                        onChange={(field, val) => setSelectedBranch(val)}
                        required={false}
                    >
                        <option value="all">-- All Registered Clients --</option>
                        {branches.map(b => (
                            <option key={b.branch_no} value={b.branch_no}>
                                {b.branch_no} - {b.city}
                            </option>
                        ))}
                    </FormField>
                </div>

                <div className="flex gap-8 mt-4 sm:mt-0 sm:ml-auto">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">Total Found</p>
                        <p className="text-2xl font-bold text-gray-900">{filteredClients.length}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">Renters</p>
                        <p className="text-2xl font-bold text-blue-600">
                            {filteredClients.filter(c => c.role?.toLowerCase() === 'renter').length}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">Owners</p>
                        <p className="text-2xl font-bold text-orange-500">
                            {filteredClients.filter(c => c.role?.toLowerCase() === 'owner').length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <DataTable 
                columns={tableColumns} 
                data={filteredClients} 
                keyField="client_no" 
                isLoading={isLoading} 
                emptyMessage={`No clients registered at ${branchDisplayStr}.`}
            />
        </div>
    );
}
