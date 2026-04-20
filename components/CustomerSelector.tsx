"use client";
import { useState, useRef } from "react";
import { Search, User, MapPin, Phone, Mail, Plus } from "lucide-react";
import { Customer, CustomerAddress } from "@/lib/db";
import { uiLogger } from "@/lib/logger";

interface CustomerSelectorProps {
  activeCustomer: Customer | null;
  customerAddresses: CustomerAddress[];
  onCustomerSelect: (customer: Customer | null) => void;
  onAddressSelect: (addressId: string | null) => void;
  onCustomerEdit: () => void;
  onLookupCustomer: (phone: string) => Promise<void>;
  selectedAddressId: string | null;
  isEditingCustomer: boolean;
  labels: { [key: string]: string };
}

export default function CustomerSelector({
  activeCustomer,
  customerAddresses,
  onCustomerSelect,
  onAddressSelect,
  onCustomerEdit,
  onLookupCustomer,
  selectedAddressId,
  isEditingCustomer,
  labels,
}: CustomerSelectorProps) {
  const [phoneSearch, setPhoneSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handlePhoneSearch = async () => {
    if (!phoneSearch.trim()) return;

    setIsSearching(true);
    try {
      await onLookupCustomer(phoneSearch.trim());
    } catch (error) {
      uiLogger.error("Customer lookup failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePhoneSearch();
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <User className="w-4 h-4 mr-2" />
          {labels.customer || 'Customer'}
        </h3>
        {activeCustomer && (
          <button
            onClick={onCustomerEdit}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {isEditingCustomer ? 'Cancel' : 'Edit'}
          </button>
        )}
      </div>

      {!activeCustomer ? (
        // Customer Search
        <div className="space-y-3">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                ref={searchInputRef}
                type="tel"
                placeholder="Enter phone number..."
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <button
              onClick={handlePhoneSearch}
              disabled={isSearching || !phoneSearch.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isSearching ? "..." : "Find"}
            </button>
          </div>

          <div className="text-xs text-gray-500">
            Search by phone number to load customer details and loyalty information
          </div>
        </div>
      ) : (
        // Customer Details
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{activeCustomer.name}</h4>
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <Phone className="w-3 h-3 mr-1" />
                  {activeCustomer.phone}
                </div>
                {activeCustomer.email && (
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <Mail className="w-3 h-3 mr-1" />
                    {activeCustomer.email}
                  </div>
                )}
              </div>
              <button
                onClick={() => onCustomerSelect(null)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Clear
              </button>
            </div>


          </div>

          {/* Address Selection */}
          {customerAddresses.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Address
              </label>
              <div className="space-y-2">
                {customerAddresses.map((address) => (
                  <div
                    key={address.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedAddressId === address.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() =>
                      onAddressSelect(
                        selectedAddressId === address.id ? null : address.id
                      )
                    }
                  >
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">
                          {address.label}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {address.address}
                        </div>
                        <div className="text-sm text-gray-600">
                          {address.city}, {address.state} {address.zip}
                        </div>
                        {address.phone && address.phone !== activeCustomer.phone && (
                          <div className="text-sm text-gray-600 mt-1">
                            📞 {address.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}