"use client";

import React, { useMemo, useState } from 'react';
import FormField from '@/components/ui/FormField';
import Button from '@components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import apiClient from '@/lib/apiClient';
import { useForm } from '@/hooks/useForm';
import { REGEX } from '@/components/functions/RegEx';

const trackingValidators = {
	email: {
		required: true,
		maxLength: 255,
		label: 'Email',
		pattern: REGEX.EMAIL,
		patternMessage: 'Enter a valid email address'
	},
	nin: {
		required: true,
		maxLength: 50,
		label: 'National Insurance Number',
		pattern: REGEX.ID_NUMBER,
		patternMessage: 'Only letters, numbers, and hyphens allowed'
	},
	dob: {
		required: true,
		label: 'Date of Birth',
		pattern: REGEX.DATE_YYYY_MM_DD,
		patternMessage: 'Date must be in YYYY-MM-DD format'
	}
};

const stageBadgeStyles = {
	Applied: 'bg-blue-50 text-blue-700',
	Screening: 'bg-indigo-50 text-indigo-700',
	Interview: 'bg-amber-50 text-amber-700',
	Offer: 'bg-purple-50 text-purple-700',
	Hired: 'bg-green-50 text-green-700',
	Rejected: 'bg-rose-50 text-rose-700'
};

const formatDate = (value) => {
	if (!value) return 'N/A';
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString();
};

export default function HiringTrackingPage() {
	const [results, setResults] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	const { formData, errors, handleChange, validate, reset } = useForm({
		email: '',
		nin: '',
		dob: ''
	}, trackingValidators);

	const handleSubmit = async (event) => {
		event.preventDefault();
		setError('');

		if (!validate()) return;

		setIsLoading(true);
		try {
			const data = await apiClient('/users/hiring-applications/track/', {
				method: 'POST',
				body: {
					email: formData.email,
					nin: formData.nin,
					dob: formData.dob
				},
				skipAuth: true
			});
			setResults(Array.isArray(data) ? data : []);
		} catch (err) {
			setResults([]);
			setError(err?.message || 'Unable to fetch your application status right now.');
		} finally {
			setIsLoading(false);
		}
	};

	const handleReset = () => {
		reset({ email: '', nin: '', dob: '' });
		setResults([]);
		setError('');
	};

	const tableColumns = useMemo(() => ([
		{
			key: 'id',
			label: 'Application ID',
			render: (value) => (
				<span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded text-xs">
					#{value}
				</span>
			)
		},
		{
			key: 'position',
			label: 'Role',
			render: (value) => (
				<span className="text-gray-900 font-medium">{value || 'N/A'}</span>
			)
		},
		{
			key: 'branch',
			label: 'Branch',
			render: (value) => (
				<span className="text-gray-700">{value || 'N/A'}</span>
			)
		},
		{
			key: 'stage',
			label: 'Status',
			render: (value) => (
				<span className={`px-2.5 py-1 rounded-full text-xs font-bold ${stageBadgeStyles[value] || 'bg-gray-100 text-gray-700'}`}>
					{value || 'Applied'}
				</span>
			)
		},
		{
			key: 'preferred_start_date',
			label: 'Preferred Start',
			render: (value) => formatDate(value)
		},
		{
			key: 'updated_at',
			label: 'Last Updated',
			render: (value) => formatDate(value)
		}
	]), []);

	return (
		<div className="w-full max-w-5xl mx-auto space-y-6">
			<div>
				<h1 className="text-3xl font-bold text-gray-900">Application Tracking</h1>
				<p className="text-sm text-gray-500 mt-1">
					Check the status of your DreamHome hiring application.
				</p>
			</div>

			<div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
				<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<FormField
						label="Email"
						field="email"
						type="email"
						value={formData.email}
						onChange={handleChange}
						error={errors.email}
					/>
					<FormField
						label="National Insurance No."
						field="nin"
						value={formData.nin}
						onChange={handleChange}
						error={errors.nin}
					/>
					<FormField
						label="Date of Birth"
						field="dob"
						type="date"
						value={formData.dob}
						onChange={handleChange}
						error={errors.dob}
					/>

					<div className="md:col-span-3 flex flex-wrap gap-3 justify-end">
						<Button type="button" variant="ghost" onClick={handleReset} disabled={isLoading}>
							Reset
						</Button>
						<Button type="submit" variant="primary" isLoading={isLoading}>
							Track Application
						</Button>
					</div>
				</form>

				{error && (
					<div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 whitespace-pre-line">
						{error}
					</div>
				)}
			</div>

			<DataTable
				columns={tableColumns}
				data={results}
				keyField="id"
				isLoading={isLoading}
				emptyMessage="No applications found for the details provided."
			/>
		</div>
	);
}
