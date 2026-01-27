'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormattedNumberInput } from '@/components/ui/FormattedNumberInput';
import { createItem, getCategories, getUOMs } from '@/app/actions/items';
import { Loader2, AlertCircle, Package, Ruler, Archive, Info } from 'lucide-react';
import SearchableDropdown from '@/components/ui/SearchableDropdown';
import { NumberInput } from '@/components/ui/NumberInput';

interface QuickItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (item: any) => void;
    vendorId?: string; // Optional, to create vendor price immediately
}

export default function QuickItemModal({ isOpen, onClose, onSuccess, vendorId }: QuickItemModalProps) {
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [uomId, setUomId] = useState('');
    const [sku, setSku] = useState('');
    const [description, setDescription] = useState('');
    const [barcode, setBarcode] = useState('');

    // Specifications
    const [brand, setBrand] = useState('');
    const [type, setType] = useState('');
    const [color, setColor] = useState('');
    const [movementType, setMovementType] = useState('');

    // Dimensions
    const [weight, setWeight] = useState(0);
    const [length, setLength] = useState(0);
    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);

    // Inventory
    const [minStockLevel, setMinStockLevel] = useState(0);
    const [maxStockLevel, setMaxStockLevel] = useState(0);

    const [price, setPrice] = useState(0);

    // Data sources
    const [categories, setCategories] = useState<any[]>([]);
    const [uoms, setUoms] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'general' | 'specs' | 'dims'>('general');

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        setIsLoadingData(true);
        try {
            const [catRes, uomRes] = await Promise.all([getCategories(), getUOMs()]);
            if (catRes.success) setCategories(catRes.data as any[]);
            if (uomRes.success) setUoms(uomRes.data as any[]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
            setError('Item Name is required');
            return;
        }
        if (!categoryId) {
            setError('Category is required');
            return;
        }
        if (!uomId) {
            setError('UOM is required');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createItem({
                name,
                categoryId,
                uomId,
                vendorId: vendorId || undefined,
                price: price > 0 ? price : undefined,
                sku: sku || undefined,
                description,
                barcode,
                brand,
                type,
                color,
                movementType,
                weight: weight || undefined,
                length: length || undefined,
                width: width || undefined,
                height: height || undefined,
                minStockLevel,
                maxStockLevel
            });

            if (result.success && result.data) {
                onSuccess(result.data);
                onClose();
                resetForm();
            } else {
                setError(result.error || 'Failed to create item');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setName('');
        setCategoryId('');
        setUomId('');
        setSku('');
        setDescription('');
        setBarcode('');
        setBrand('');
        setType('');
        setColor('');
        setMovementType('');
        setWeight(0);
        setLength(0);
        setWidth(0);
        setHeight(0);
        setMinStockLevel(0);
        setMaxStockLevel(0);
        setPrice(0);
        setActiveTab('general');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Item"
            size="2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                    <button
                        type="button"
                        onClick={() => setActiveTab('general')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general'
                            ? 'border-(--color-primary) text-(--color-primary)'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                    >
                        <Info size={16} />
                        General Info
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('specs')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'specs'
                            ? 'border-(--color-primary) text-(--color-primary)'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                    >
                        <Package size={16} />
                        Specs & Inventory
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('dims')}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'dims'
                            ? 'border-(--color-primary) text-(--color-primary)'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                    >
                        <Ruler size={16} />
                        Dimensions
                    </button>
                </div>

                <div className="h-[400px] overflow-y-auto pr-2">
                    {activeTab === 'general' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div>
                                <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                    Item Name <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. New Product X"
                                    disabled={isSubmitting}
                                    className="bg-(--color-bg-secondary)"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                        Category <span className="text-red-500">*</span>
                                    </label>
                                    <SearchableDropdown
                                        options={categories.map(c => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
                                        value={categoryId}
                                        onChange={(val) => setCategoryId(val as string)}
                                        placeholder="Select Category"
                                        disabled={isSubmitting || isLoadingData}
                                        className="bg-(--color-bg-secondary)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                        UOM <span className="text-red-500">*</span>
                                    </label>
                                    <SearchableDropdown
                                        options={uoms.map(u => ({ value: u.id, label: `${u.name} (${u.symbol})` }))}
                                        value={uomId}
                                        onChange={(val) => setUomId(val as string)}
                                        placeholder="Select UOM"
                                        disabled={isSubmitting || isLoadingData}
                                        className="bg-(--color-bg-secondary)"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                        SKU (Optional)
                                    </label>
                                    <Input
                                        value={sku}
                                        onChange={(e) => setSku(e.target.value)}
                                        placeholder="Auto-generated if empty"
                                        disabled={isSubmitting}
                                        className="bg-(--color-bg-secondary)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                        Barcode
                                    </label>
                                    <Input
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
                                        placeholder="Scan barcode..."
                                        disabled={isSubmitting}
                                        className="bg-(--color-bg-secondary)"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                    Description
                                </label>
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Item description..."
                                    disabled={isSubmitting}
                                    className="bg-(--color-bg-secondary)"
                                />
                            </div>

                            {vendorId && (
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                    <label className="block text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                                        Estimated Price (from this Vendor)
                                    </label>
                                    <FormattedNumberInput
                                        value={price}
                                        onChange={setPrice}
                                        decimals={2}
                                        className="bg-white dark:bg-(--color-bg-tertiary)"
                                        placeholder="0,00"
                                    />
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                        This will also register the item to the currently selected vendor.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'specs' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                        Brand
                                    </label>
                                    <Input
                                        value={brand}
                                        onChange={(e) => setBrand(e.target.value)}
                                        placeholder="e.g. Nike, Samsung"
                                        disabled={isSubmitting}
                                        className="bg-(--color-bg-secondary)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                        Type/Model
                                    </label>
                                    <Input
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        placeholder="e.g. Air Max, S24"
                                        disabled={isSubmitting}
                                        className="bg-(--color-bg-secondary)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                        Color
                                    </label>
                                    <Input
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        placeholder="e.g. Red, Black"
                                        disabled={isSubmitting}
                                        className="bg-(--color-bg-secondary)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-(--color-text-secondary) mb-1">
                                        Movement Type
                                    </label>
                                    <SearchableDropdown
                                        options={[
                                            { value: 'FAST', label: 'Fast Moving' },
                                            { value: 'MEDIUM', label: 'Medium Moving' },
                                            { value: 'SLOW', label: 'Slow Moving' },
                                        ]}
                                        value={movementType}
                                        onChange={(val) => setMovementType(val as string)}
                                        placeholder="Select Type"
                                        className="bg-(--color-bg-secondary)"
                                    />
                                </div>
                            </div>

                            <hr className="border-(--color-border)" />

                            <div className="grid grid-cols-2 gap-4">
                                <NumberInput
                                    label="Min Stock Level"
                                    value={minStockLevel}
                                    onChange={setMinStockLevel}
                                    min={0}
                                />
                                <NumberInput
                                    label="Max Stock Level"
                                    value={maxStockLevel}
                                    onChange={setMaxStockLevel}
                                    min={0}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'dims' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div>
                                <NumberInput
                                    label="Weight (g)"
                                    value={weight}
                                    onChange={setWeight}
                                    min={0}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4 border p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                                <div className="col-span-3 text-sm font-medium">Dimensions (cm)</div>
                                <NumberInput
                                    label="Length"
                                    value={length}
                                    onChange={setLength}
                                    min={0}
                                />
                                <NumberInput
                                    label="Width"
                                    value={width}
                                    onChange={setWidth}
                                    min={0}
                                />
                                <NumberInput
                                    label="Height"
                                    value={height}
                                    onChange={setHeight}
                                    min={0}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700 mt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-(--color-primary) text-white"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Item'
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
