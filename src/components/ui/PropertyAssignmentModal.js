'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import FormField from './FormField';

export default function PropertyAssignmentModal({ isOpen, onClose, onSuccess, propertyToAssign }) {
    const [branches, setBranches] = useState([]);
    const [owners, setOwners] = useState([]);
    
    const [formData, setFormData] = useState({
        branch_no: '',
        owner_no: ''
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        // Reset form to property's current values
        setFormData({
            branch_no: typeof propertyToAssign?.branch_no === 'object' ? propertyToAssign.branch_no?.branch_no : propertyToAssign?.branch_no || '',
            owner_no: typeof propertyToAssign?.owner_no === 'object' ? propertyToAssign.owner_no?.client_no : propertyToAssign?.owner_no || ''
        });

        // Load branches and owners
        apiClient('/branches/')
            .then(data => setBranches(data.results || data.items || data || []))
            .catch(err => console.error("Failed to load branches", err));

        // Fetch owners (clients with role Owner)
        apiClient('/users/clients/?role=Owner')
            .then(data => setOwners(data.results || data.items || data || []))
            .catch(err => console.error("Failed to load owners", err));
            
    }, [isOpen, propertyToAssign]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            await apiClient(`/properties/${propertyToAssign.property_no}/`, {
                method: 'PATCH',
                body: {
                    branch_no: formData.branch_no || null,
                    owner_no: formData.owner_no || null
                }
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Assignment update failed:", err);
            setError(err.message || 'Failed to update property assignment.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !propertyToAssign) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Assign Property</h2>
                        <p className="text-sm text-gray-500 mt-1">Property {propertyToAssign.property_no}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <FormField label="Branch Assignment" field="branch_no" type="select" value={formData.branch_no} onChange={handleChange} required={true}>
                            <option value="">— Select a Branch —</option>
                            {branches.map(b => (
                                <option key={b.branch_no} value={b.branch_no}>
                                    {b.branch_no} - {b.area}
                                </option>
                            ))}
                        </FormField>

                        <FormField label="Owner Assignment" field="owner_no" type="select" value={formData.owner_no} onChange={handleChange} required={true}>
                            <option value="">— Select an Owner —</option>
                            {owners.map(o => (
                                <option key={o.client_no} value={o.client_no}>
                                    {o.first_name} {o.last_name} ({o.client_no})
                                </option>
                            ))}
                        </FormField>

                        <div className="pt-4 flex justify-end gap-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                {isSubmitting ? 'Saving...' : 'Save Assignment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
