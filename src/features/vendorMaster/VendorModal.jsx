// src/features/vendorMaster/VendorModal.jsx
import React from "react";
import ModalForm from "../../components/common/ModalForm";

const VendorModal = ({ open, onClose, onSave, initialData = {} }) => {
  const fields = [
    {
      name: "type",
      label: "Vendor Type",
      type: "select",
      required: true,
      options: [
        { value: "SC", label: "Subcontractor (SC)" },
        { value: "HS", label: "Hiring Service (HS)" },
      ],
      helperText: "Select SC for Subcontractor or HS for Hiring Service",
    },
    {
      name: "vendor_name",
      label: "Vendor Name",
      required: true,
      placeholder: "Enter vendor company name",
    },
    {
      name: "work_type",
      label: "Work Type",
      required: true,
      placeholder: "e.g., APP Membrane, Base Camp Office, Tractor-115",
    },
    {
      name: "pan_no",
      label: "PAN Number",
      placeholder: "e.g., XXXXX1234X",
      validate: (value) => {
        if (value && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) {
          return "Invalid PAN format (e.g., XXXXX1234X)";
        }
        return null;
      },
    },
    {
      name: "bank_ac_no",
      label: "Bank Account Number",
      placeholder: "Enter bank account number",
    },
    {
      name: "ifsc",
      label: "IFSC Code",
      placeholder: "e.g., SBIN0000123",
      validate: (value) => {
        if (value && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value)) {
          return "Invalid IFSC format (e.g., SBIN0000123)";
        }
        return null;
      },
    },
    {
      name: "contact_no",
      label: "Contact Number",
      type: "tel",
      placeholder: "+91 98765 43210",
      validate: (value) => {
        if (value && !/^[\+]?[0-9\s\-\(\)]{10,15}$/.test(value)) {
          return "Invalid phone number format";
        }
        return null;
      },
    },
    {
      name: "address",
      label: "Address",
      multiline: true,
      rows: 3,
      placeholder: "Enter complete address with city, state, pincode",
    },
    {
      name: "notes",
      label: "Notes",
      multiline: true,
      rows: 2,
      placeholder: "Optional notes or additional information",
    },
  ];

  const handleSubmit = async (values) => {
    await onSave?.(values);
  };

  return (
    <ModalForm
      open={open}
      onClose={onClose}
      title={initialData?.id ? "Edit Vendor" : "Add New Vendor"}
      fields={fields}
      initialValues={initialData}
      onSubmit={handleSubmit}
      submitText={initialData?.id ? "Update Vendor" : "Create Vendor"}
      maxWidth={700}
    />
  );
};

export default VendorModal;
