"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Dialog from '@components/ui/Dialog';
import Button from '@components/ui/Button';
import FormField from '@/components/ui/FormField';
import apiClient from '@/lib/apiClient';
import { useForm } from '@/hooks/useForm';
import { REGEX } from '@/components/functions/RegEx';

const positionOptions = [
	{ value: 'Staff', label: 'Standard Staff' },
	{ value: 'Supervisor', label: 'Supervisor' },
	{ value: 'Secretary', label: 'Secretary' },
	{ value: 'Manager', label: 'Manager' }
];

const genderOptions = [
	{ value: 'M', label: 'Male' },
	{ value: 'F', label: 'Female' },
	{ value: 'P', label: 'Prefer not to say' }
];

const normalizeList = (data) => data?.results || data?.items || data || [];

const applicationValidators = {
	first_name: {
		required: true,
		maxLength: 100,
		label: 'First Name',
		pattern: REGEX.NAME,
		patternMessage: 'Only letters, spaces, hyphens, and apostrophes allowed'
	},
	last_name: {
		required: true,
		maxLength: 100,
		label: 'Last Name',
		pattern: REGEX.NAME,
		patternMessage: 'Only letters, spaces, hyphens, and apostrophes allowed'
	},
	middle_name: {
		maxLength: 100,
		label: 'Middle Name',
		pattern: REGEX.NAME,
		patternMessage: 'Only letters, spaces, hyphens, and apostrophes allowed'
	},
	suffixes: { maxLength: 10, label: 'Suffix' },
	email: {
		required: true,
		maxLength: 255,
		label: 'Email',
		pattern: REGEX.EMAIL,
		patternMessage: 'Enter a valid email address'
	},
	telephone_no: {
		required: true,
		maxLength: 50,
		label: 'Telephone Number',
		pattern: REGEX.PH_PHONE_FAX,
		patternMessage: 'Enter a valid phone number'
	},
	address: {
		required: true,
		maxLength: 255,
		label: 'Address',
		pattern: REGEX.ADDRESS,
		patternMessage: 'Invalid characters in address'
	},
	sex: {
		required: true,
		maxLength: 10,
		label: 'Gender',
		pattern: REGEX.ALPHA_ONLY,
		patternMessage: 'Invalid gender format'
	},
	dob: {
		required: true,
		label: 'Date of Birth',
		pattern: REGEX.DATE_YYYY_MM_DD,
		patternMessage: 'Date must be in YYYY-MM-DD format'
	},
	nin: {
		required: true,
		maxLength: 50,
		label: 'National Insurance Number',
		pattern: REGEX.ID_NUMBER,
		patternMessage: 'Only letters, numbers, and hyphens allowed'
	},
	position: { required: true, maxLength: 50, label: 'Position' },
	preferred_start_date: {
		required: true,
		label: 'Preferred Start Date',
		pattern: REGEX.DATE_YYYY_MM_DD,
		patternMessage: 'Date must be in YYYY-MM-DD format'
	},
	branch: { required: true, label: 'Preferred Branch' },
	typing_speed: {
		label: 'Typing Speed',
		pattern: REGEX.WHOLE_NUMBER,
		patternMessage: 'Typing speed must be a whole number'
	},
	nok_first_name: {
		maxLength: 100,
		label: 'Next of Kin First Name',
		pattern: REGEX.NAME,
		patternMessage: 'Only letters, spaces, hyphens, and apostrophes allowed'
	},
	nok_last_name: {
		maxLength: 100,
		label: 'Next of Kin Last Name',
		pattern: REGEX.NAME,
		patternMessage: 'Only letters, spaces, hyphens, and apostrophes allowed'
	},
	nok_middle_name: {
		maxLength: 100,
		label: 'Next of Kin Middle Name',
		pattern: REGEX.NAME,
		patternMessage: 'Only letters, spaces, hyphens, and apostrophes allowed'
	},
	nok_suffixes: { maxLength: 10, label: 'Next of Kin Suffix' },
	nok_relationship: {
		maxLength: 100,
		label: 'Relationship',
		pattern: REGEX.ALPHA_ONLY,
		patternMessage: 'Relationship can only contain letters'
	},
	nok_address: {
		maxLength: 255,
		label: 'Next of Kin Address',
		pattern: REGEX.ADDRESS,
		patternMessage: 'Invalid characters in address'
	},
	nok_telephone_no: {
		maxLength: 50,
		label: 'Next of Kin Telephone',
		pattern: REGEX.PH_PHONE_FAX,
		patternMessage: 'Enter a valid phone number'
	}
};

const initialState = {
	first_name: '',
	last_name: '',
	middle_name: '',
	suffixes: '',
	email: '',
	telephone_no: '',
	address: '',
	sex: '',
	dob: '',
	nin: '',
	position: 'Staff',
	preferred_start_date: '',
	branch: '',
	typing_speed: '',
	notes: '',
	nok_first_name: '',
	nok_last_name: '',
	nok_middle_name: '',
	nok_suffixes: '',
	nok_relationship: '',
	nok_address: '',
	nok_telephone_no: ''
};

const buildBranchLabel = (branch) => {
	if (!branch) return '';
	if (typeof branch === 'object') {
		const branchNo = branch.branch_no || '';
		const area = branch.area || '';
		if (branchNo && area) return `${branchNo} - ${area}`;
		return branchNo || area || '';
	}
	return branch;
};

const cleanValue = (value) => {
	const trimmed = String(value || '').trim();
	return trimmed.length ? trimmed : null;
};

export default function HiringModal({ isOpen, onClose, onSubmitted }) {
	const [branches, setBranches] = useState([]);
	const [loadError, setLoadError] = useState('');
	const [submitError, setSubmitError] = useState('');
	const [conditionalErrors, setConditionalErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { formData, errors, handleChange, reset, validate } = useForm(initialState, applicationValidators);

	useEffect(() => {
		if (!isOpen) return;

		reset(initialState);
		setLoadError('');
		setSubmitError('');
		setConditionalErrors({});

		let isMounted = true;
		apiClient('/branches/')
			.then((data) => {
				if (!isMounted) return;
				setBranches(normalizeList(data));
			})
			.catch((error) => {
				console.error('Failed to load branches:', error);
				if (isMounted) setLoadError('Unable to load branches right now.');
			});

		return () => { isMounted = false; };
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen]);

	const branchOptions = useMemo(() => branches.map((branch) => ({
		value: branch.branch_no,
		label: buildBranchLabel(branch)
	})), [branches]);

	const handleFieldChange = (field, value) => {
		handleChange(field, value);
		if (conditionalErrors[field]) {
			setConditionalErrors((prev) => ({ ...prev, [field]: null }));
		}
	};

	const validateConditionals = () => {
		const nextErrors = {};

		if (formData.position === 'Secretary' && !cleanValue(formData.typing_speed)) {
			nextErrors.typing_speed = 'Typing speed is required for secretarial applicants.';
		}

		setConditionalErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setSubmitError('');

		const baseValid = validate();
		const conditionalValid = validateConditionals();

		if (!baseValid || !conditionalValid) return;

		setIsSubmitting(true);

		try {
			const payload = {
				first_name: cleanValue(formData.first_name),
				last_name: cleanValue(formData.last_name),
				middle_name: cleanValue(formData.middle_name),
				suffixes: cleanValue(formData.suffixes),
				email: cleanValue(formData.email),
				telephone_no: cleanValue(formData.telephone_no),
				address: cleanValue(formData.address),
				sex: cleanValue(formData.sex),
				dob: cleanValue(formData.dob),
				nin: cleanValue(formData.nin),
				position: cleanValue(formData.position),
				preferred_start_date: cleanValue(formData.preferred_start_date),
				branch: cleanValue(formData.branch),
				typing_speed: formData.position === 'Secretary' ? cleanValue(formData.typing_speed) : null,
				notes: cleanValue(formData.notes),
				nok_first_name: cleanValue(formData.nok_first_name),
				nok_last_name: cleanValue(formData.nok_last_name),
				nok_middle_name: cleanValue(formData.nok_middle_name),
				nok_suffixes: cleanValue(formData.nok_suffixes),
				nok_relationship: cleanValue(formData.nok_relationship),
				nok_address: cleanValue(formData.nok_address),
				nok_telephone_no: cleanValue(formData.nok_telephone_no)
			};

			const created = await apiClient('/users/hiring-applications/', {
				method: 'POST',
				body: payload
			});

			if (onSubmitted) {
				onSubmitted(created);
			}

			reset(initialState);
			onClose();
		} catch (error) {
			console.error('Failed to submit hiring application:', error);
			setSubmitError('Unable to submit your application right now. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	const personalFields = [
		{ label: 'First Name', field: 'first_name' },
		{ label: 'Last Name', field: 'last_name' },
		{ label: 'Middle Name', field: 'middle_name', required: false },
		{ label: 'Suffix', field: 'suffixes', required: false },
		{ label: 'Gender', field: 'sex', type: 'select', options: genderOptions },
		{ label: 'Date of Birth', field: 'dob', type: 'date' },
		{ label: 'National Insurance No.', field: 'nin' }
	];

	const contactFields = [
		{ label: 'Email', field: 'email', type: 'email' },
		{ label: 'Telephone', field: 'telephone_no' },
		{ label: 'Address', field: 'address', className: 'sm:col-span-2' }
	];

	const employmentFields = [
		{ label: 'Position Applied', field: 'position', type: 'select', options: positionOptions },
		{ label: 'Preferred Branch', field: 'branch', type: 'select', options: branchOptions },
		{ label: 'Preferred Start Date', field: 'preferred_start_date', type: 'date' }
	];

	const nextOfKinFields = [
		{ label: 'First Name', field: 'nok_first_name', required: false },
		{ label: 'Last Name', field: 'nok_last_name', required: false },
		{ label: 'Middle Name', field: 'nok_middle_name', required: false },
		{ label: 'Suffix', field: 'nok_suffixes', required: false },
		{ label: 'Relationship', field: 'nok_relationship', required: false },
		{ label: 'Address', field: 'nok_address', required: false },
		{ label: 'Telephone No.', field: 'nok_telephone_no', required: false }
	];

	const renderField = (config) => (
		<FormField
			key={config.field}
			label={config.label}
			field={config.field}
			type={config.type}
			value={formData[config.field]}
			onChange={handleFieldChange}
			error={errors[config.field] || conditionalErrors[config.field]}
			placeholder={config.placeholder}
			required={config.required !== undefined ? config.required : true}
			className={config.className}
		>
			{config.type === 'select' && (
				<>
					<option value="">-- Select --</option>
					{config.options?.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</>
			)}
		</FormField>
	);

	return (
		<Dialog isOpen={isOpen} onClose={onClose} title="Hiring Application">
			<form onSubmit={handleSubmit} className="space-y-6">
				{(loadError || submitError) && (
					<div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
						{loadError || submitError}
					</div>
				)}

				<section>
					<h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Personal Details</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{personalFields.map(renderField)}
					</div>
				</section>

				<section>
					<h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Contact Details</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{contactFields.map(renderField)}
					</div>
				</section>

				<section>
					<h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Employment Preferences</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{employmentFields.map(renderField)}
					</div>

					{formData.position === 'Secretary' && (
						<div className="mt-4 space-y-2">
							{renderField({
								label: 'Typing Speed (WPM)',
								field: 'typing_speed',
								type: 'number',
								required: true,
								placeholder: 'e.g., 60'
							})}
							<a
								href="https://monkeytype.com/"
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline"
							>
								Test your typing speed on Monkeytype
							</a>
						</div>
					)}
				</section>

				<section>
					<h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Additional Notes</h3>
					<FormField
						label="Cover Notes"
						field="notes"
						type="textarea"
						value={formData.notes}
						onChange={handleFieldChange}
						required={false}
						placeholder="Share any relevant experience, certifications, or preferred schedule."
					/>
				</section>

				<section>
					<h3 className="text-sm font-bold text-[#002147] border-b pb-2 mb-4">Next of Kin (Optional)</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{nextOfKinFields.map(renderField)}
					</div>
				</section>

				<div className="flex justify-end gap-3 pt-2">
					<Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button type="submit" variant="primary" isLoading={isSubmitting}>
						Submit Application
					</Button>
				</div>
			</form>
		</Dialog>
	);
}
