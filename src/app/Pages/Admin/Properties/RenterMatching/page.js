'use client';

import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '@/lib/apiClient';
import DataTable from '@/components/ui/DataTable';
import FormField from '@/components/ui/FormField';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';

const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('en-PH', { style: 'decimal', minimumFractionDigits: 2 }).format(num);
};

export default function ClientAssignmentPage() {
    const [renters, setRenters] = useState([]);
    const [properties, setProperties] = useState([]);
    const [selectedRenterNo, setSelectedRenterNo] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Viewing Modal State
    const [isViewingModalOpen, setIsViewingModalOpen] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [viewDate, setViewDate] = useState('');
    const [comments, setComments] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionMessage, setActionMessage] = useState(null);

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            apiClient('/users/clients/').catch(err => {
                console.error("Failed to load clients:", err);
                return [];
            }),
            apiClient('/properties/').catch(err => {
                console.error("Failed to load properties:", err);
                return [];
            })
        ])
        .then(([clientsData, propertiesData]) => {
            const allClients = clientsData?.results || clientsData?.items || clientsData || [];
            const allProps = propertiesData?.results || propertiesData?.items || propertiesData || [];
            
            // We only want Renters for the matching engine
            setRenters(allClients.filter(c => c.role?.toLowerCase() === 'renter'));
            
            // We only match Available properties
            setProperties(allProps.filter(p => p.status?.toLowerCase() === 'available'));
        })
        .finally(() => setIsLoading(false));
    }, []);

    const selectedRenter = renters.find(r => r.client_no === selectedRenterNo);

    // 🌟 THE MATCHING ENGINE ALGORITHM
    const matchedProperties = useMemo(() => {
        if (!selectedRenter) return [];
        const req = selectedRenter.renter_requirements;
        
        // If the renter hasn't filled out their requirements yet, show all available properties
        if (!req) return properties; 

        return properties.filter(p => {
            // Check property type match (e.g. House vs Flat)
            if (req.pref_property_type && p.property_type && req.pref_property_type !== p.property_type) {
                return false;
            }
            
            // Check budget match (Property rent must be <= Renter max rent)
            if (req.max_monthly_rent && p.monthly_rent) {
                if (parseFloat(p.monthly_rent) > parseFloat(req.max_monthly_rent)) {
                    return false;
                }
            }
            
            return true;
        });
    }, [selectedRenter, properties]);

    const handleScheduleViewingClick = (property) => {
        setSelectedProperty(property);
        setViewDate('');
        setComments('');
        setActionMessage(null);
        setIsViewingModalOpen(true);
    };

    const submitViewing = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setActionMessage(null);

        try {
            await apiClient('/properties/viewings/', {
                method: 'POST',
                body: {
                    property_no: selectedProperty.property_no,
                    renter_no: selectedRenter.client_no,
                    view_date: viewDate,
                    comments: comments,
                    status: 'Requested'
                }
            });
            setActionMessage({ type: 'success', text: 'Viewing successfully scheduled!' });
            
            // Close modal after brief success message
            setTimeout(() => {
                setIsViewingModalOpen(false);
                setActionMessage(null);
            }, 2000);
        } catch (err) {
            console.error("Failed to schedule viewing:", err);
            setActionMessage({ type: 'error', text: err.message || 'Failed to schedule viewing. Check if they already have one on this date.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const tableColumns = [
        { 
            key: 'property_no', 
            label: 'Property ID',
            render: (val) => <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{val}</span>
        },
        { 
            key: 'address', 
            label: 'Location',
            render: (val, row) => (
                <div>
                    <p className="font-semibold text-gray-900">{row.street}</p>
                    <p className="text-xs text-gray-500">{row.city}, {row.postcode}</p>
                </div>
            )
        },
        { 
            key: 'property_type', 
            label: 'Type',
            render: (val) => <span className="text-gray-700">{val}</span>
        },
        { 
            key: 'no_of_rooms', 
            label: 'Rooms',
            render: (val) => <span className="text-gray-700">{val} rooms</span>
        },
        { 
            key: 'monthly_rent', 
            label: 'Monthly Rent',
            render: (val) => <span className="font-medium text-gray-900">₱{formatCurrency(val)}</span>
        },
        { 
            key: 'actions', 
            label: 'Actions',
            render: (val, row) => (
                <Button 
                    variant="primary" 
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleScheduleViewingClick(row); }}
                >
                    Schedule Viewing
                </Button>
            )
        }
    ];

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-3xl font-bold text-gray-900">Renter Matching Engine</h1>
                    <p className="text-sm text-gray-500 mt-1">Search for properties for rent that satisfy a prospective renter's requirements.</p>
                </div>
            </div>

            {/* Renter Selector & Profile Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="mb-6 w-full sm:w-1/2">
                    <FormField
                        label="Select Prospective Renter"
                        field="renterSelect"
                        type="select"
                        value={selectedRenterNo}
                        onChange={(field, val) => setSelectedRenterNo(val)}
                        required={false}
                    >
                        <option value="">-- Choose a Renter --</option>
                        {renters.map(r => (
                            <option key={r.client_no} value={r.client_no}>
                                {r.first_name} {r.last_name} ({r.client_no})
                            </option>
                        ))}
                    </FormField>
                </div>

                {selectedRenter ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                {selectedRenter.first_name} {selectedRenter.last_name}'s Requirements
                            </h3>
                            <p className="text-sm text-gray-600">
                                {selectedRenter.renter_requirements?.general_comments || 'No general comments provided.'}
                            </p>
                        </div>
                        <div className="flex gap-6 bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Property Type</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {selectedRenter.renter_requirements?.pref_property_type || 'Any'}
                                </p>
                            </div>
                            <div className="w-px bg-gray-200"></div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Max Budget</p>
                                <p className="text-lg font-medium text-gray-900">
                                    {selectedRenter.renter_requirements?.max_monthly_rent ? `₱${formatCurrency(selectedRenter.renter_requirements.max_monthly_rent)}` : 'No Limit'}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        Please select a renter from the dropdown above to run the matching engine.
                    </div>
                )}
            </div>

            {/* Matching Results Table */}
            {selectedRenter && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${matchedProperties.length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                            {matchedProperties.length > 0 ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Found {matchedProperties.length} Perfect Matches
                        </h2>
                    </div>
                    
                    <DataTable 
                        columns={tableColumns} 
                        data={matchedProperties} 
                        keyField="property_no" 
                        isLoading={isLoading} 
                        emptyMessage="No available properties currently match this renter's budget and requirements."
                    />
                </div>
            )}

            {/* Schedule Viewing Modal */}
            <Dialog 
                isOpen={isViewingModalOpen} 
                onClose={() => !isSubmitting && setIsViewingModalOpen(false)} 
                title={`Schedule Viewing: ${selectedProperty?.property_no}`}
            >
                {actionMessage && (
                    <div className={`mb-4 p-3 rounded-lg text-sm border ${
                        actionMessage.type === 'success' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                        {actionMessage.text}
                    </div>
                )}

                <form onSubmit={submitViewing} className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-100">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Renter: <span className="text-gray-900">{selectedRenter?.first_name} {selectedRenter?.last_name}</span></p>
                        <p className="text-sm font-semibold text-gray-700">Property: <span className="text-gray-900">{selectedProperty?.street}, {selectedProperty?.city}</span></p>
                    </div>

                    <FormField 
                        label="Viewing Date" 
                        field="viewDate" 
                        type="date" 
                        value={viewDate} 
                        onChange={(field, val) => setViewDate(val)} 
                        required={true} 
                    />

                    <FormField 
                        label="Internal Comments (Optional)" 
                        field="comments" 
                        type="textarea" 
                        value={comments} 
                        onChange={(field, val) => setComments(val)} 
                        required={false}
                        placeholder="e.g. Client requested a weekend viewing if possible."
                    />

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <Button variant="ghost" onClick={() => setIsViewingModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" variant="primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Scheduling...' : 'Confirm Viewing'}
                        </Button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
}