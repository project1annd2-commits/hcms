
import React, { useState, useRef, useEffect } from 'react';
import { CertificateTemplate, CertificateTemplateElement } from '../../lib/models';
import { Save, Type, Image as ImageIcon, Layout, Move, Trash2, Plus, ArrowLeft } from 'lucide-react';
import { db } from '../../lib/services/db';
import { Collections } from '../../lib/constants';

interface Props {
    onSave: () => void;
    onCancel: () => void;
    initialTemplate?: CertificateTemplate;
}

const A4_WIDTH_PX = 794; // 96 DPI
const A4_HEIGHT_PX = 1123; // 96 DPI

const VARIABLES = [
    '{{Trainee Name}}',
    '{{Program Name}}',
    '{{Completion Date}}',
    '{{Start Date}}',
    '{{End Date}}',
    '{{Score}}',
    '{{Grade}}'
];

export default function TemplateDesigner({ onSave, onCancel, initialTemplate }: Props) {
    const [template, setTemplate] = useState<CertificateTemplate>(initialTemplate || {
        title: 'New Template',
        type: 'certificate',
        width: A4_WIDTH_PX, // Default Portrait
        height: A4_HEIGHT_PX,
        elements: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });

    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLDivElement>(null);

    const selectedElement = template.elements.find(el => el.id === selectedElementId);

    const handleOrientationChange = (orientation: 'portrait' | 'landscape') => {
        if (orientation === 'landscape') {
            setTemplate(prev => ({ ...prev, width: A4_HEIGHT_PX, height: A4_WIDTH_PX }));
        } else {
            setTemplate(prev => ({ ...prev, width: A4_WIDTH_PX, height: A4_HEIGHT_PX }));
        }
    };

    const addElement = (type: 'text' | 'variable') => {
        const newElement: CertificateTemplateElement = {
            id: crypto.randomUUID(),
            type,
            content: type === 'text' ? 'New Text' : '{{Trainee Name}}',
            x: 50,
            y: 50,
            style: {
                fontSize: 16,
                fontFamily: 'Arial',
                fontWeight: 'normal',
                color: '#000000',
                textAlign: 'left'
            }
        };
        setTemplate(prev => ({ ...prev, elements: [...prev.elements, newElement] }));
        setSelectedElementId(newElement.id);
    };

    const addTable = () => {
        const newElement: CertificateTemplateElement = {
            id: crypto.randomUUID(),
            type: 'table',
            content: 'marks_table',
            x: 50,
            y: 150,
            width: 400,
            style: {
                fontSize: 12,
                fontFamily: 'Arial',
                fontWeight: 'normal',
                color: '#000000',
                textAlign: 'left'
            }
        };
        setTemplate(prev => ({ ...prev, elements: [...prev.elements, newElement] }));
        setSelectedElementId(newElement.id);
    };

    const updateElement = (id: string, updates: Partial<CertificateTemplateElement>) => {
        setTemplate(prev => ({
            ...prev,
            elements: prev.elements.map(el => el.id === id ? { ...el, ...updates } : el)
        }));
    };

    const updateElementStyle = (id: string, styleUpdates: Partial<CertificateTemplateElement['style']>) => {
        setTemplate(prev => ({
            ...prev,
            elements: prev.elements.map(el => el.id === id ? { ...el, style: { ...el.style, ...styleUpdates } } : el)
        }));
    };

    const deleteElement = (id: string) => {
        setTemplate(prev => ({
            ...prev,
            elements: prev.elements.filter(el => el.id !== id)
        }));
        setSelectedElementId(null);
    };

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedElementId(id);
        setIsDragging(true);

        // Calculate offset
        const element = template.elements.find(el => el.id === id);
        if (!element || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - element.x;
        const y = e.clientY - rect.top - element.y;
        setDragOffset({ x, y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !selectedElementId || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - dragOffset.x;
        const y = e.clientY - rect.top - dragOffset.y;

        // Constrain to canvas ? Not strictly necessary but good UX

        updateElement(selectedElementId, { x, y });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleSave = async () => {
        try {
            if (template.id || template._id) {
                await db.updateById(Collections.CERTIFICATE_TEMPLATES, template.id || template._id!, {
                    ...template,
                    updated_at: new Date().toISOString()
                });
            } else {
                await db.insertOne(Collections.CERTIFICATE_TEMPLATES, template);
            }
            onSave();
        } catch (error) {
            console.error("Failed to save template", error);
            alert("Failed to save template");
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
            {/* Sidebar Controls */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col z-10 shadow-lg">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <button onClick={onCancel} className="text-gray-600 hover:text-gray-900"><ArrowLeft size={20} /></button>
                    <h2 className="font-bold text-gray-800">Designer</h2>
                    <button onClick={handleSave} className="flex items-center gap-1 text-blue-600 font-medium hover:text-blue-700">
                        <Save size={18} /> Save
                    </button>
                </div>

                <div className="p-4 space-y-6 overflow-y-auto flex-1">
                    {/* Template Settings */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Settings</label>
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={template.title}
                                onChange={(e) => setTemplate({ ...template, title: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                                placeholder="Template Name"
                            />
                            <select
                                value={template.type}
                                onChange={(e) => setTemplate({ ...template, type: e.target.value as any })}
                                className="w-full p-2 border border-gray-300 rounded text-sm"
                            >
                                <option value="certificate">Certificate</option>
                                <option value="marks_card">Marks Card</option>
                            </select>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleOrientationChange('portrait')}
                                    className={`flex-1 py-1 text-xs border rounded ${template.width < template.height ? 'bg-blue-50 border-blue-500 text-blue-700' : 'text-gray-600'}`}
                                >Portrait</button>
                                <button
                                    onClick={() => handleOrientationChange('landscape')}
                                    className={`flex-1 py-1 text-xs border rounded ${template.width > template.height ? 'bg-blue-50 border-blue-500 text-blue-700' : 'text-gray-600'}`}
                                >Landscape</button>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Background URL</label>
                                <input
                                    type="text"
                                    value={template.background_url || ''}
                                    onChange={(e) => setTemplate({ ...template, background_url: e.target.value })}
                                    placeholder="https://..."
                                    className="w-full p-2 border border-gray-300 rounded text-sm mt-1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Toolbox */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Add Elements</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => addElement('text')} className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
                                <Type size={20} className="mb-1 text-gray-600" />
                                <span className="text-xs">Text</span>
                            </button>
                            <button onClick={() => addElement('variable')} className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
                                <Plus size={20} className="mb-1 text-gray-600" />
                                <span className="text-xs">Variable</span>
                            </button>
                            {template.type === 'marks_card' && (
                                <button onClick={addTable} className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors col-span-2">
                                    <Layout size={20} className="mb-1 text-gray-600" />
                                    <span className="text-xs">Marks Table</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Element Properties */}
                    {selectedElement && (
                        <div className="border-t border-gray-200 pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Properties</label>
                                <button onClick={() => deleteElement(selectedElement.id)} className="text-red-500 hover:text-red-700 p-1">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {selectedElement.type === 'text' && (
                                    <input
                                        type="text"
                                        value={selectedElement.content}
                                        onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                    />
                                )}

                                {selectedElement.type === 'variable' && (
                                    <select
                                        value={selectedElement.content}
                                        onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded text-sm"
                                    >
                                        {VARIABLES.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-500">Size</label>
                                        <input
                                            type="number"
                                            value={selectedElement.style.fontSize}
                                            onChange={(e) => updateElementStyle(selectedElement.id, { fontSize: parseInt(e.target.value) })}
                                            className="w-full p-1 border border-gray-300 rounded text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Color</label>
                                        <input
                                            type="color"
                                            value={selectedElement.style.color}
                                            onChange={(e) => updateElementStyle(selectedElement.id, { color: e.target.value })}
                                            className="w-full h-8 p-0 border-0 rounded"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500">Font Family</label>
                                    <select
                                        value={selectedElement.style.fontFamily}
                                        onChange={(e) => updateElementStyle(selectedElement.id, { fontFamily: e.target.value })}
                                        className="w-full p-1 border border-gray-300 rounded text-sm"
                                    >
                                        <option value="Arial">Arial</option>
                                        <option value="Times New Roman">Times New Roman</option>
                                        <option value="Courier New">Courier New</option>
                                        <option value="Georgia">Georgia</option>
                                        <option value="Verdana">Verdana</option>
                                        <option value="Brush Script MT">Brush Script (Cursive)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto bg-gray-200 p-8 flex items-center justify-center">
                <div
                    ref={canvasRef}
                    className="bg-white shadow-xl relative transition-all duration-300"
                    style={{
                        width: template.width,
                        height: template.height,
                        backgroundImage: template.background_url ? `url(${template.background_url})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        transformOrigin: 'center top',
                        transform: 'scale(0.8)' // Zoom out a bit to fit
                    }}
                    onClick={() => setSelectedElementId(null)}
                >
                    {template.elements.map(element => (
                        <div
                            key={element.id}
                            onMouseDown={(e) => handleMouseDown(e, element.id)}
                            className={`absolute cursor-move group hover:outline hover:outline-1 hover:outline-blue-400 ${selectedElementId === element.id ? 'outline outline-2 outline-blue-600' : ''}`}
                            style={{
                                left: element.x,
                                top: element.y,
                                fontSize: element.style.fontSize,
                                fontFamily: element.style.fontFamily,
                                fontWeight: element.style.fontWeight,
                                color: element.style.color,
                                textAlign: element.style.textAlign as any,
                                minWidth: element.type === 'table' ? (element.width || 300) : 'auto',
                                userSelect: 'none'
                            }}
                        >
                            {element.type === 'table' ? (
                                <div className="bg-gray-50 border border-dashed border-gray-400 p-2 text-center text-xs text-gray-500 w-full">
                                    Marks Table Placeholder
                                </div>
                            ) : (
                                element.content
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
