'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import FormField from './FormField';
import Button from './Button';

export default function ResourceAllocationFormModal({ isOpen, onClose, onSuccess, allocationToEdit }) {
    const [staffList, setStaffList] = useState([]);
    const [branches, setBranches] = useState([]);
    
    const [formData, setFormData] = useState({
        staff_no: '',
        branch: '',
        position: 'Staff',
        supervisor: '',
        typing_speed: '',
        manager_start_date: '',
        bonus_payment: '',
        car_allowance: ''
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        // Load branches and staff
        Promise.all([
            apiClient('/branches/'),
            apiClient('/users/staff/')
        ]).then(([branchData, staffData]) => {
            setBranches(branchData.results || branchData.items || branchData || []);
            setStaffList(staffData.results || staffData.items || staffData || []);
        }).catch(err => {
            console.error("Failed to load reference data", err);
        });

        // Initialize form
        if (allocationToEdit) {
            setFormData({
                staff_no: allocationToEdit.staff_no || '',
                branch: (typeof allocationToEdit.branch === 'object' ? allocationToEdit.branch?.branch_no : allocationToEdit.branch) || '',
                position: allocationToEdit.position || 'Staff',
                supervisor: (typeof allocationToEdit.supervisor === 'object' ? allocationToEdit.supervisor?.staff_no : allocationToEdit.supervisor) || '',
                typing_speed: allocationToEdit.typing_speed || '',
                manager_start_date: allocationToEdit.manager_start_date || '',
                bonus_payment: allocationToEdit.bonus_payment || '',
                car_allowance: allocationToEdit.car_allowance || ''
            });
        } else {
            setFormData({
                staff_no: '',
                branch: '',
                position: 'Staff',
                supervisor: '',
                typing_speed: '',
                manager_start_date: '',
                bonus_payment: '',
                car_allowance: ''
            });
        }
    }, [isOpen, allocationToEdit]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.staff_no) {
            setError('Please select a staff member to allocate.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        const payload = {
            branch: formData.branch || null,
            position: formData.position || 'Staff',
            supervisor: formData.supervisor || null
        };

        // Add role-specific fields
        if (formData.position === 'Secretary' && formData.typing_speed) {
            payload.typing_speed = parseInt(formData.typing_speed);
        } else {
            payload.typing_speed = null;
        }

        if (formData.position === 'Manager') {
            if (formData.manager_start_date) payload.manager_start_date = formData.manager_start_date;
            if (formData.bonus_payment) payload.bonus_payment = parseFloat(formData.bonus_payment);
        } else {
            payload.manager_start_date = null;
            payload.bonus_payment = null;
        }

        if (['Manager', 'Supervisor'].includes(formData.position) && formData.car_allowance) {
            payload.car_allowance = parseFloat(formData.car_allowance);
        } else {
            payload.car_allowance = null;
        }

        try {
            await apiClient(`/users/staff/${formData.staff_no}/`, {
                method: 'PATCH',
                body: payload
            });
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Allocation update failed:", err);
            setError(err.message || 'Failed to update resource allocation.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const unassignedStaff = staffList.filter(s => !s.branch);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-8">
                <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex justify-between items-center sticky top-0 rounded-t-2xl z-10">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{allocationToEdit ? 'Edit Allocation' : 'Assign Staff'}</h2>
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
                        <FormField label="Staff Member" field="staff_no" type="select" value={formData.staff_no} onChange={handleChange} required={true} disabled={!!allocationToEdit}>
                            <option value="">— Select Staff —</option>
                            {allocationToEdit ? (
                                <option value={allocationToEdit.staff_no}>{allocationToEdit.first_name} {allocationToEdit.last_name}</option>
                            ) : (
                                unassignedStaff.map(s => (
                                    <option key={s.staff_no} value={s.staff_no}>
                                        {s.first_name} {s.last_name} ({s.staff_no})
                                    </option>
                                ))
                            )}
                        </FormField>

                        <FormField label="Branch" field="branch" type="select" value={formData.branch} onChange={handleChange} required={true}>
                            <option value="">— Select Branch —</option>
                            {branches.map(b => (
                                <option key={b.branch_no} value={b.branch_no}>{b.branch_no} - {b.area}</option>
                            ))}
                        </FormField>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Position" field="position" type="select" value={formData.position} onChange={handleChange} required={true}>
                                <option value="Staff">Staff</option>
                                <option value="Supervisor">Supervisor</option>
                                <option value="Secretary">Secretary</option>
                                <option value="Manager">Manager</option>
                            </FormField>

                            <FormField label="Supervisor" field="supervisor" type="select" value={formData.supervisor} onChange={handleChange}>
                                <option value="">— None —</option>
                                {staffList.map(s => (
                                    <option key={s.staff_no} value={s.staff_no}>{s.first_name} {s.last_name}</option>
                                ))}
                            </FormField>
                        </div>

                        {/* Conditional Fields based on Role */}
                        {formData.position === 'Secretary' && (
                            <FormField label="Typing Speed (WPM)" field="typing_speed" type="number" value={formData.typing_speed} onChange={handleChange} />
                        )}

                        {formData.position === 'Manager' && (
                            <>
                                <FormField label="Manager Start Date" field="manager_start_date" type="date" value={formData.manager_start_date} onChange={handleChange} />
                                <FormField label="Bonus Payment" field="bonus_payment" type="number" value={formData.bonus_payment} onChange={handleChange} placeholder="£" />
                            </>
                        )}

                        {['Manager', 'Supervisor'].includes(formData.position) && (
                            <FormField label="Car Allowance" field="car_allowance" type="number" value={formData.car_allowance} onChange={handleChange} placeholder="£" />
                        )}

                        <div className="pt-4 flex justify-end gap-2">
                            <Button variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button type="submit" variant="primary" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save Allocation'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
