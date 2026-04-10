import { useState } from 'react';
import { Teacher, Management, User, Mentor } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Shield, Key, Eye, EyeOff, Save, CheckCircle2 } from 'lucide-react';

interface Props {
    teacher?: Teacher;
    management?: Management;
    user?: User;
    mentor?: Mentor;
}

export default function PasscodeSettings({ teacher, management, user, mentor }: Props) {
    const [newPasscode, setNewPasscode] = useState('');
    const [confirmPasscode, setConfirmPasscode] = useState('');
    const [showPasscodes, setShowPasscodes] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentUser = teacher || management || user || mentor;
    if (!currentUser) return null;

    const handleUpdatePasscode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (newPasscode !== confirmPasscode) {
            setError('New passcodes do not match');
            return;
        }

        if (newPasscode.length < 4) {
            setError('Passcode must be at least 4 characters');
            return;
        }

        setLoading(true);
        try {
            let collectionName = '';
            if (teacher) collectionName = Collections.TEACHERS;
            else if (management) collectionName = 'management';
            else if (user) collectionName = Collections.USERS;
            else if (mentor) collectionName = Collections.MENTORS;

            if (!collectionName || !currentUser.id) {
                throw new Error('Invalid user context');
            }

            const updateData: any = {
                passcode: newPasscode,
                updated_at: new Date().toISOString()
            };

            // Also update plain_passcode for teachers and mentors as it's used for display
            if (teacher || mentor) {
                updateData.plain_passcode = newPasscode;
            }

            await db.updateById(collectionName, currentUser.id, updateData);

            setSuccess(true);
            setNewPasscode('');
            setConfirmPasscode('');
        } catch (err: any) {
            setError(err.message || 'Failed to update passcode');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-100 p-2 rounded-lg">
                    <Shield className="text-blue-600" size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Security Settings</h3>
                    <p className="text-sm text-gray-500">Update your access passcode</p>
                </div>
            </div>

            {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 text-green-700">
                    <CheckCircle2 size={20} />
                    <p className="text-sm font-medium">Passcode updated successfully!</p>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleUpdatePasscode} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">New Passcode</label>
                    <div className="relative">
                        <input
                            type={showPasscodes ? 'text' : 'password'}
                            value={newPasscode}
                            onChange={(e) => setNewPasscode(e.target.value)}
                            className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                            placeholder="Enter new passcode"
                            disabled={loading}
                        />
                        <Key className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                        <button
                            type="button"
                            onClick={() => setShowPasscodes(!showPasscodes)}
                            className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-600"
                        >
                            {showPasscodes ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Confirm New Passcode</label>
                    <div className="relative">
                        <input
                            type={showPasscodes ? 'text' : 'password'}
                            value={confirmPasscode}
                            onChange={(e) => setConfirmPasscode(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                            placeholder="Confirm new passcode"
                            disabled={loading}
                        />
                        <Key className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || !newPasscode || !confirmPasscode}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 mt-2"
                >
                    {loading ? 'Updating...' : (
                        <>
                            <Save size={18} />
                            Update Passcode
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
