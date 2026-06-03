import { useState } from 'react';
import { User } from '../lib/models';
import { RefreshCw, Check, Clock } from 'lucide-react';

interface Props {
    currentUser: User;
}

const UPGRADES = [
    { id: '1', version: '2.5.0', title: 'Enhanced Dashboard Analytics', description: 'Improved charts and real-time KPI tracking for school performance.', date: '2025-11-15', status: 'completed' },
    { id: '2', version: '2.4.0', title: 'School Onboarding Module', description: 'New module for tracking school onboarding progress with conversion rates.', date: '2025-10-20', status: 'completed' },
    { id: '3', version: '2.3.0', title: 'Query Tracker System', description: 'Track and resolve school queries with department-wise categorization.', date: '2025-09-10', status: 'completed' },
    { id: '4', version: '2.2.0', title: 'Employee Task Management', description: 'Daily task tracking with categories, time logging, and productivity analytics.', date: '2025-08-15', status: 'completed' },
    { id: '5', version: '2.1.0', title: 'Theme Checklists & Assessments', description: 'Student skill assessment system with theme-based checklists.', date: '2025-07-20', status: 'completed' },
    { id: '6', version: '3.0.0', title: 'AI-Powered Insights', description: 'Cora CMS integration with AI-powered school performance insights and recommendations.', date: '2026-01-15', status: 'planned' },
];

export default function SystemUpgrades({ currentUser }: Props) {
    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <RefreshCw className="text-blue-600" size={28} />
                <h2 className="text-2xl font-bold text-gray-800">System Upgrades</h2>
            </div>

            <div className="space-y-4">
                {UPGRADES.map(upgrade => (
                    <div key={upgrade.id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-mono">v{upgrade.version}</span>
                                    <h3 className="font-bold text-gray-800">{upgrade.title}</h3>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{upgrade.description}</p>
                                <p className="text-xs text-gray-400">{new Date(upgrade.date).toLocaleDateString()}</p>
                            </div>
                            <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${upgrade.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {upgrade.status === 'completed' ? <Check size={12} /> : <Clock size={12} />}
                                {upgrade.status === 'completed' ? 'Completed' : 'Planned'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
