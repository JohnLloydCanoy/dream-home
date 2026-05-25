'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DataTable from '@/components/ui/DataTable';
import FormField from '@/components/ui/FormField';
import Button from '@components/ui/Button';
import PropertyAssignmentModal from '@/components/ui/PropertyAssignmentModal';
import apiClient from '@/lib/apiClient';
import { useForm } from '@/hooks/useForm';

const normalizeList = (data) => data?.results || data?.items || data || [];

const toId = (value, idField) => {
    if (!value) return '';
    if (typeof value === 'object') return value[idField] || '';
    return value;
};

const getOwnerLabel = (owner) => {
    if (!owner) return 'Unassigned';
    if (typeof owner === 'object') {
        const fullName = `${owner.first_name || ''} ${owner.last_name || ''}`.trim();
        return fullName || owner.client_no || 'Unassigned';
    }
    return owner;
};

const getBranchLabel = (branch) => {
    if (!branch) return 'Unassigned';
    if (typeof branch === 'object') {
        const branchNo = branch.branch_no || '';
        const area = branch.area || '';
        if (branchNo && area) return `${branchNo} - ${area}`;
        return branchNo || area || 'Unassigned';
    }
    return branch;
};

const getAddressLabel = (property) => {
    const lines = [property?.street, property?.area, property?.city, property?.postcode].filter(Boolean);
    return lines.join(', ') || 'N/A';
};

export default function PropertyAssignmentsPage() {
    const [properties, setProperties] = useState([]);
    const [branches, setBranches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const [selectedProperty, setSelectedProperty] = useState(null);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

    const { formData, handleChange, reset } = useForm({ branch_filter: 'all' }, {});

    const loadData = async () => {
        setIsLoading(true);
        setLoadError('');

        try {
            const [propertyData, branchData] = await Promise.all([
                apiClient('/properties/').catch(err => {
                    console.error('Failed to load properties:', err);
                    return [];
                }),
                apiClient('/branches/').catch(err => {
                    console.error('Failed to load branches:', err);
                    return [];
                })
            ]);

            setProperties(normalizeList(propertyData));
            setBranches(normalizeList(branchData));
        } catch (error) {
            console.error('Failed to load property assignments:', error);
            setLoadError('Unable to load property assignments right now.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredProperties = useMemo(() => {
        const selectedFilter = String(formData.branch_filter || 'all').toLowerCase();

        if (selectedFilter === 'all') return properties;
        if (selectedFilter === 'unassigned') {
            return properties.filter((property) => !toId(property.branch, 'branch_no'));
        }

        return properties.filter((property) => toId(property.branch, 'branch_no') === formData.branch_filter);
    }, [properties, formData.branch_filter]);

    const summary = useMemo(() => {
        const assignedBranch = properties.filter((property) => Boolean(toId(property.branch, 'branch_no'))).length;
        const assignedOwner = properties.filter((property) => Boolean(toId(property.owner, 'client_no'))).length;

        return {
            totalProperties: properties.length,
            totalBranches: branches.length,
            assignedBranch,
            assignedOwner
        };
    }, [properties, branches]);

    const openAssignmentModal = (property = selectedProperty) => {
        if (!property) return;
        setSelectedProperty(property);
        setIsAssignmentModalOpen(true);
    };

    const closeAssignmentModal = () => {
        setIsAssignmentModalOpen(false);
    };

    const tableColumns = [
        {
            key: 'property_no',
            label: 'Property ID',
            render: (value) => (
                <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-xs">
                    {value}
                </span>
            )
        },
        {
            key: 'address',
            label: 'Address',
            render: (_, row) => (
                <span className="text-gray-900 font-medium">{getAddressLabel(row)}</span>
            )
        },
        {
            key: 'owner_no',
            label: 'Owner',
            render: (value) => (
                <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400 italic'}>
                    {getOwnerLabel(value)}
                </span>
            )
        },
        {
            key: 'branch_no',
            label: 'Branch',
            render: (value) => (
                <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400 italic'}>
                    {getBranchLabel(value)}
                </span>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (value) => {
                const statusStyles = {
                    Available: 'bg-green-100 text-green-800',
                    Rented: 'bg-blue-100 text-blue-800',
                    Withdrawn: 'bg-orange-100 text-orange-800'
                };

                return (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusStyles[value] || 'bg-gray-100 text-gray-700'}`}>
                        {value || 'N/A'}
                    </span>
                );
            }
        }
    ];

    const renderActions = (row) => (
        <Button
            variant="secondary"
            size="sm"
            onClick={(event) => {
                event.stopPropagation();
                openAssignmentModal(row);
            }}
        >
            Edit Assignment
        </Button>
    );

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Property Assignments</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Link existing properties to owners and regional branches using secure allocation-only PATCH updates.
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button variant="secondary" onClick={loadData}>
                        Refresh
                    </Button>
                    <Button variant="primary" onClick={() => openAssignmentModal()} disabled={!selectedProperty}>
                        Edit Assignment
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Total Properties</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalProperties}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Branches</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{summary.totalBranches}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Assigned to Branch</p>
                    <p className="text-2xl font-bold text-green-700 mt-1">{summary.assignedBranch}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Assigned to Owner</p>
                    <p className="text-2xl font-bold text-amber-700 mt-1">{summary.assignedOwner}</p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="w-full sm:w-80">
                    <FormField
                        label="Branch Filter"
                        field="branch_filter"
                        type="select"
                        value={formData.branch_filter}
                        onChange={handleChange}
                        required={false}
                    >
                        <option value="all">All Branches</option>
                        <option value="unassigned">Unassigned Branch</option>
                        {branches.map((branch) => (
                            <option key={branch.branch_no} value={branch.branch_no}>
                                {branch.branch_no} - {branch.area}
                            </option>
                        ))}
                    </FormField>
                </div>

                <div className="mt-2 flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => reset({ branch_filter: 'all' })}
                        disabled={formData.branch_filter === 'all'}
                    >
                        Reset Filter
                    </Button>
                </div>
            </div>

            {selectedProperty && (
                <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-3 text-sm">
                    Selected Property: <strong>{selectedProperty.property_no}</strong> ({getAddressLabel(selectedProperty)})
                </div>
            )}

            {loadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                    {loadError}
                </div>
            )}

            <DataTable
                columns={tableColumns}
                data={filteredProperties}
                keyField="property_no"
                isLoading={isLoading}
                emptyMessage="No properties found for the selected branch filter."
                onRowClick={setSelectedProperty}
                actions={renderActions}
            />

            <PropertyAssignmentModal
                isOpen={isAssignmentModalOpen}
                onClose={closeAssignmentModal}
                onSuccess={loadData}
                propertyToAssign={selectedProperty}
            />
        </div>
    );
}
