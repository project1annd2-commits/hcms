import { useState } from 'react';
import { login, hashPassword, signInToFirebaseAuth, verifyPhone, participantLogin } from '../lib/auth';
import { User, Permission, Teacher, Mentor, Management } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Lock, Phone, Users, BookOpen } from 'lucide-react';

interface Props {
  onLogin: (user: User, permissions: Permission) => void;
  onTeacherLogin: (teacher: Teacher) => void;
  onMentorLogin: (mentor: Mentor) => void;
  onManagementLogin: (management: Management) => void;
  onParentAccess: () => void;
}

export default function Login({ onLogin, onTeacherLogin, onMentorLogin, onManagementLogin, onParentAccess }: Props) {
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginStep, setLoginStep] = useState<'phone' | 'password' | 'set_password'>('phone');
  const [identifiedUser, setIdentifiedUser] = useState<{
    type: 'teacher' | 'mentor' | 'management';
    data: any;
    hasPassword: boolean;
  } | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleAdminLogin = async () => {
    const adminResult = await login(username, password);
    if (adminResult) {
      if (adminResult.error) {
        setError(adminResult.error);
        return false;
      }
      console.log("Admin result user:", adminResult.user);
      // Silently sign into Firebase Auth for Firestore security rules
      const finalId = adminResult.user.id || (adminResult.user as any)._id;
      signInToFirebaseAuth(finalId!, adminResult.user.role || 'admin');
      onLogin(adminResult.user, adminResult.permissions);
      return true;
    }
    return false;
  };


  const checkTeacherAsMentor = async (teacher: Teacher) => {
    if (!teacher || !teacher.id) return null;

    // Check if this teacher has any mentor training assignments
    const mentorAssignments = await db.find(Collections.MENTOR_TRAINING_ASSIGNMENTS, { mentor_id: teacher.id });

    if (mentorAssignments && mentorAssignments.length > 0) {
      // Create a virtual mentor object from the teacher data
      return {
        id: teacher.id,
        _id: teacher._id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        email: teacher.email || '',
        phone: teacher.phone,
        school_id: teacher.school_id,
        specialization: teacher.subject_specialization || 'General',
        years_of_experience: 1,
        status: 'active' as const,
        created_at: teacher.created_at,
        updated_at: teacher.updated_at,
        plain_passcode: teacher.plain_passcode
      };
    } else {
      // Check for standard training assignments that might be mentor training
      const trainingAssignments = await db.find(Collections.TRAINING_ASSIGNMENTS, { teacher_id: teacher.id });

      if (trainingAssignments && trainingAssignments.length > 0) {
        // Check if any of these assignments are for mentor training programs
        const allPrograms = await db.find<any>(Collections.TRAINING_PROGRAMS, {});

        const hasMentorTraining = trainingAssignments.some((assignment: any) => {
          const program = allPrograms.find((p: any) => p.id === assignment.training_program_id);
          if (!program) return false;

          const title = (program.title || '').toLowerCase();
          return title.includes('mentor') || title.includes('b4') || title.includes('c10') || title.includes('c.10');
        });

        if (hasMentorTraining) {
          return {
            id: teacher.id,
            _id: teacher._id,
            first_name: teacher.first_name,
            last_name: teacher.last_name,
            email: teacher.email || '',
            phone: teacher.phone,
            school_id: teacher.school_id,
            specialization: teacher.subject_specialization || 'General',
            years_of_experience: 1,
            status: 'active' as const,
            created_at: teacher.created_at,
            updated_at: teacher.updated_at,
            plain_passcode: teacher.plain_passcode
          };
        }
      }
    }
    return null;
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginStep !== 'phone') return;

    setError('');
    setLoading(true);

    try {
      const result = await verifyPhone(phoneNumber);
      if (result && !result.error) {
        setIdentifiedUser({ 
          type: result.type as any, 
          data: result.data, 
          hasPassword: result.hasPassword 
        });
        setLoginStep(result.hasPassword ? 'password' : 'set_password');
      } else {
        setError(result?.error || 'Phone number not found. Please contact your administrator.');
      }
    } catch (err) {
      setError('An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifiedUser || loginStep !== 'password') return;

    setError('');
    setLoading(true);

    try {
      const { type, data } = identifiedUser;
      const result = await participantLogin(data.id, type, passcode);

      if (!result?.success) {
        setError(result?.error || 'Incorrect password');
        setLoading(false);
        return;
      }

      if (type === 'mentor') {
        localStorage.setItem('currentMentor', JSON.stringify(data));
        onMentorLogin(data);
      } else if (type === 'teacher') {
        const virtualMentor = await checkTeacherAsMentor(data);
        if (virtualMentor) {
          localStorage.setItem('currentMentor', JSON.stringify(virtualMentor));
          onMentorLogin(virtualMentor);
        } else {
          localStorage.setItem('currentTeacher', JSON.stringify(data));
          onTeacherLogin(data);
        }
      } else if (type === 'management') {
        localStorage.setItem('currentManagement', JSON.stringify(data));
        onManagementLogin(data);
      }
    } catch (err) {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifiedUser || loginStep !== 'set_password') return;

    if (passcode.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    if (passcode !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { type, data } = identifiedUser;
      const hashedPassword = await hashPassword(passcode);
      const collection = type === 'teacher' ? Collections.TEACHERS :
                         type === 'mentor' ? Collections.MENTORS :
                         Collections.MANAGEMENT;

      await db.updateById(collection, data.id, {
        password_hash: hashedPassword,
        plain_passcode: passcode, // Store for legacy compatibility if needed, though hash is better
        updated_at: new Date().toISOString()
      });

      // Update local data object for login
      const updatedData = { ...data, password_hash: hashedPassword, plain_passcode: passcode };

      // Get Firebase token and sign in
      const authResult = await participantLogin(updatedData.id, type, passcode);
      if (!authResult?.success) {
        setError('Password set but login failed. Please try logging in normally.');
        setLoading(false);
        return;
      }

      if (type === 'mentor') {
        localStorage.setItem('currentMentor', JSON.stringify(updatedData));
        onMentorLogin(updatedData);
      } else if (type === 'teacher') {
        const virtualMentor = await checkTeacherAsMentor(updatedData);
        if (virtualMentor) {
          localStorage.setItem('currentMentor', JSON.stringify(virtualMentor));
          onMentorLogin(virtualMentor);
        } else {
          localStorage.setItem('currentTeacher', JSON.stringify(updatedData));
          onTeacherLogin(updatedData);
        }
      } else if (type === 'management') {
        localStorage.setItem('currentManagement', JSON.stringify(updatedData));
        onManagementLogin(updatedData);
      }
    } catch (err) {
      setError('Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await handleAdminLogin();
      if (!success) {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  if (showStaffLogin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900 relative">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden w-full max-w-5xl flex flex-col md:flex-row min-h-[600px] z-10">
          {/* Left Side - Branding */}
          <div className="w-full md:w-5/12 bg-slate-900 p-12 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 z-0 opacity-20">
              <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full border-4 border-white/10 blur-md"></div>
              <div className="absolute bottom-10 -right-20 w-80 h-80 rounded-full border-4 border-white/10 blur-sm"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-16">
                <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg">
                  H
                </div>
                <span className="font-semibold text-lg tracking-wide uppercase text-slate-200">Hauna CMS</span>
              </div>
              
              <h2 className="text-4xl font-bold mb-6 leading-tight">System<br/>Administration</h2>
              <p className="text-slate-400 font-medium leading-relaxed text-sm mb-12 max-w-sm">
                Secure access for authorized personnel. Manage operations, oversee analytics, and maintain system integrity.
              </p>
            </div>
            
            <div className="relative z-10">
              <p className="text-slate-500 text-xs mb-4 uppercase tracking-widest font-semibold">Switch Access</p>
              <button
                type="button"
                onClick={() => {
                  setShowStaffLogin(false);
                  setError('');
                  setUsername('');
                  setPassword('');
                }}
                className="flex items-center gap-2 text-white border border-slate-700 bg-slate-800/50 rounded-xl px-6 py-3 text-sm font-medium hover:bg-slate-800 hover:border-slate-600 transition-all"
              >
                <Users size={16} className="text-indigo-400" />
                Participant Portal
              </button>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="w-full md:w-7/12 p-12 bg-white flex flex-col justify-center relative">
            <div className="max-w-md w-full mx-auto">
              <div className="mb-10 text-center">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Staff Portal Login</h1>
                <p className="text-slate-500 text-sm">Enter your credentials to access the control panel</p>
              </div>

              <form onSubmit={handleStaffSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Users size={18} className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="Enter your username"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Password</label>
                    <a href="#" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Forgot password?</a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock size={18} className="text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : null}
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
              </form>
            </div>
            

          </div>
        </div>

        <div className="absolute bottom-6 w-full text-center z-0">
          <p className="text-slate-400 text-xs font-medium tracking-wide">
            Powered by VeriSync Labs &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900 relative">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden w-full max-w-5xl flex flex-col md:flex-row min-h-[600px] z-10">

        {/* Left Side - Branding */}
        <div className="w-full md:w-5/12 bg-indigo-600 p-12 text-white flex flex-col justify-between relative overflow-hidden transition-colors duration-500">
          <div className="absolute inset-0 z-0 opacity-20">
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full border-4 border-white/10 blur-md"></div>
            <div className="absolute bottom-10 -right-20 w-80 h-80 rounded-full border-4 border-white/10 blur-sm"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-16">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-xl text-indigo-600 shadow-lg">
                H
              </div>
              <span className="font-semibold text-lg tracking-wide uppercase text-indigo-100">Hauna CMS</span>
            </div>
            
            <h2 className="text-4xl font-bold mb-6 leading-tight">Participant<br/>Gateway</h2>
            <p className="text-indigo-200 font-medium leading-relaxed text-sm mb-12 max-w-sm">
              Your central hub for learning and development. Enter your credentials to continue.
            </p>
          </div>
          
          <div className="relative z-10 flex flex-col gap-3">
            <p className="text-indigo-300 text-xs uppercase tracking-widest font-semibold">Other Portals</p>
            <button
              type="button"
              onClick={() => {
                setShowStaffLogin(true);
                setError('');
              }}
              className="flex items-center justify-center gap-2 text-white border border-indigo-500 bg-indigo-700/50 rounded-xl px-6 py-3 text-sm font-medium hover:bg-indigo-700 hover:border-indigo-400 transition-all w-full"
            >
              <Users size={16} className="text-indigo-300" />
              Staff / Admin Portal
            </button>
            <button
              type="button"
              onClick={onParentAccess}
              className="flex items-center justify-center gap-2 text-indigo-100 border border-transparent hover:bg-indigo-700/30 rounded-xl px-6 py-3 text-sm font-medium transition-all w-full"
            >
              <Users size={16} className="text-indigo-300 opacity-0" /> {/* Spacer */}
              Parent Portal Access
              <Users size={16} className="text-indigo-300 opacity-0" /> {/* Spacer */}
            </button>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-7/12 p-12 bg-white flex flex-col justify-center relative">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-10 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BookOpen size={28} className="text-indigo-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Participant Login</h1>
              <p className="text-slate-500 text-sm">Teachers, Mentors & Faculty</p>
            </div>

            <form 
              onSubmit={
                loginStep === 'phone' ? handlePhoneSubmit : 
                loginStep === 'password' ? handlePasswordSubmit : 
                handleSetPasswordSubmit
              } 
              className="space-y-5"
            >
              {loginStep === 'phone' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone size={18} className="text-slate-400" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      placeholder="Enter registered phone"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {loginStep === 'password' && (
                <>
                  <div className="flex items-center justify-between mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <div className="flex items-center gap-3">
                      <div className="flex bg-white w-10 h-10 rounded-full items-center justify-center shadow-sm text-indigo-600 font-bold text-sm uppercase">
                        {identifiedUser?.data.first_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {identifiedUser?.data.first_name} {identifiedUser?.data.last_name}
                        </p>
                        <p className="text-xs text-slate-500">{phoneNumber}</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setLoginStep('phone')}
                      className="text-xs font-bold text-indigo-600 bg-white px-3 py-1.5 rounded shadow-sm hover:bg-indigo-600 hover:text-white transition-colors"
                    >
                      Change
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Passcode / Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock size={18} className="text-slate-400" />
                      </div>
                      <input
                        type="password"
                        required
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="••••••••"
                        autoFocus
                      />
                    </div>
                  </div>
                </>
              )}

              {loginStep === 'set_password' && (
                <>
                  <div className="mb-6 bg-amber-50 rounded-xl p-4 border border-amber-100 flex gap-3">
                    <div className="mt-0.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900">
                        Account Activation
                      </p>
                      <p className="text-xs text-amber-700 mt-1">Hello {identifiedUser?.data.first_name}, please set a secure password to activate your account.</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">New Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock size={18} className="text-slate-400" />
                        </div>
                        <input
                          type="password"
                          required
                          value={passcode}
                          onChange={(e) => setPasscode(e.target.value)}
                          className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          placeholder="Create password"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Confirm Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock size={18} className="text-slate-400" />
                        </div>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          placeholder="Confirm password"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white rounded-xl py-3.5 text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : null}
                {loading ? 'Processing...' : 
                 loginStep === 'phone' ? 'Continue' : 
                 loginStep === 'password' ? 'Sign In' : 'Activate Account'}
              </button>
            </form>
          </div>
        </div>

        <div className="absolute bottom-6 w-full text-center z-0">
          <p className="text-slate-400 text-xs font-medium tracking-wide">
            Powered by VeriSync Labs &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
