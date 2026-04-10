// Base types
export type ObjectId = string;

export type User = {
    _id?: string;
    id?: string;
    username: string;
    password_hash: string;
    full_name: string;
    role: 'admin' | 'employee' | 'viewer';
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export type Permission = {
    _id?: string;
    id?: string;
    user_id: string;
    can_delete_schools: boolean;
    can_manage_users: boolean;
    can_assign_training: boolean;
    can_view_reports: boolean;
    can_manage_schools: boolean;
    can_manage_teachers: boolean;
    can_manage_mentors: boolean;
    can_manage_admin_personnel: boolean;
    can_manage_training_programs: boolean;
};

export type School = {
    _id?: string;
    id?: string;
    name: string;
    code: string;
    address: string;
    phone: string;
    email: string;
    h1_count: number;
    h2_count: number;
    h3_count: number;
    principal_name?: string;
    created_by?: string | null;
    state?: string;
    affiliation_date?: string; // Replaces affiliation_year
    affiliation_number?: string;
    affiliation_year?: string; // Deprecated
    created_at: string;
    updated_at: string;
    // Onboarding fields
    contact_name?: string;
    contact_number?: string;
    conversion_rate?: number; // 10-100
    marketing_person?: string; // Marketing person name (reference)
    status?: 'active' | 'onboarding' | 'dropped' | 'transferred' | 'alumni';
    dropped_reason?: string;

    // New Operational Fields (HCMS Enhancements)
    book_status?: 'Purchased' | 'Not Purchased';
    themes_status?: 'Fully Following' | 'Partially Following' | 'Not Following';
    onboarding_status?: 'Onboarded' | 'Not Onboarded';
    performance_category?: 'A' | 'B' | 'C';
    allocation_date?: string; // ISO Date string
    audit_status?: 'Completed' | 'Not Completed';
    onboarding_comments?: string;
    channel_partner?: string;
    village_area?: string;
    town_city?: string;
    district?: string;
    source?: string;
    lead_owner?: string;
    dropout_year?: string;
    alumni_year?: string;
    academic_year?: string; // For List 1: 2026-27 type filtering
};

export type EmergencyContact = {
    name?: string;
    relationship?: string;
    phone?: string;
};

export type Teacher = {
    _id?: string;
    id?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    school_id: string | null;
    subject_specialization: string;
    hire_date: string | null;
    status: 'active' | 'on_leave' | 'inactive';
    username: string | null;
    password_hash: string | null;
    is_active_login: boolean;
    qualification?: string;
    is_alumni?: boolean;
    years_of_experience?: number;
    date_of_birth?: string;
    profile_details?: TeacherProfileDetails;
    plain_passcode?: string;
    // New HR Fields
    photo_url?: string;
    employee_id?: string;
    gender?: 'male' | 'female' | 'other';
    blood_group?: string;
    address?: string;
    emergency_contact?: EmergencyContact;
    created_at: string;
    updated_at: string;
};

export type TeacherProfileDetails = {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    qualification?: string;
    college?: string;
    bio?: string;
    interests?: string[];
    area_of_excellency?: { self: string; principal: string };
    area_of_improvement?: { self: string; principal: string };
    induction_training?: { self: string; principal: string };
    refresher_training?: { self: string; principal: string };
    hauna_40_training?: { self: string; principal: string };
    phase_2_training?: { self: string; principal: string };
    phonics_2026?: { self: string; principal: string };
    phonics_program?: { self: string; principal: string };
    languages_known?: { self: string; principal: string };
    lsrw_ratings?: {
        listening: { self: string | number; principal: string | number };
        speaking: { self: string | number; principal: string | number };
        reading: { self: string | number; principal: string | number };
        writing: { self: string | number; principal: string | number };
    };
    competencies?: {
        patience?: { self: string | number; principal: string | number };
        communication?: { self: string | number; principal: string | number };
        discipline_management?: { self: string | number; principal: string | number };
        planning?: { self: string | number; principal: string | number };
        cooperative?: { self: string | number; principal: string | number };
        initiative?: { self: string | number; principal: string | number };
        psychology?: { self: string | number; principal: string | number };
        hygiene?: { self: string | number; principal: string | number };
    };
};

export type Mentor = {
    _id?: string;
    id?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    school_id: string | null;
    specialization: string;
    years_of_experience: number;
    date_of_birth?: string;
    status: 'active' | 'inactive';
    is_alumni?: boolean;
    plain_passcode?: string;
    profile_details?: TeacherProfileDetails;
    member_since?: string;
    // New HR Fields
    photo_url?: string;
    employee_id?: string;
    gender?: 'male' | 'female' | 'other';
    blood_group?: string;
    address?: string;
    emergency_contact?: EmergencyContact;
    created_at: string;
    updated_at: string;
};

export type MentorSchool = {
    _id?: string;
    id?: string;
    mentor_id: string;
    school_id: string;
    assigned_at: string;
};

export type AdminPersonnel = {
    _id?: string;
    id?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    hire_date: string | null;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
};

export type TrainingProgram = {
    _id?: string;
    id?: string;
    title: string;
    description: string;
    duration_hours: number;
    category: string;
    target_audience?: 'management' | 'teachers' | 'mentors' | 'all';
    status: 'active' | 'archived';
    start_date: string | null;
    end_date: string | null;
    meeting_link: string;
    created_at: string;
    updated_at: string;
    enable_marks_card?: boolean; // Deprecated, kept for backward compat or migration
    marks_configuration?: { // Kept for the subjects structure
        subjects: Array<{
            name: string;
            max_marks: number;
        }>;
    };
    enable_certificate?: boolean; // Deprecated
    certificate_template_id?: string;
    marks_card_template_id?: string;
    signature_url?: string;
};

export type EmployeeStat = {
    employee_id: string;
    employee_name: string;
    assignment_count: number;
};

export type CertificateTemplateElement = {
    id: string;
    type: 'text' | 'variable' | 'image' | 'table';
    content: string; // For text/variable types. For table it might denote the 'marks_table' key
    x: number;
    y: number;
    width?: number;
    height?: number;
    style: {
        fontSize: number;
        fontFamily: string;
        fontWeight: string;
        color: string;
        textAlign: 'left' | 'center' | 'right';
    };
};

export type CertificateTemplate = {
    _id?: string;
    id?: string;
    title: string;
    type: 'certificate' | 'marks_card';
    background_url?: string;
    width: number;
    height: number;
    elements: CertificateTemplateElement[];
    created_at: string;
    updated_at: string;
};

export type TrainingAssignment = {
    _id?: string;
    id?: string;
    training_program_id: string;
    teacher_id: string;
    assigned_date: string;
    due_date: string | null;
    completion_date: string | null;
    status: 'assigned' | 'in_progress' | 'completed' | 'overdue';
    progress_percentage: number;
    score: number | null;
    certificate_issued?: boolean;
    certificate_issue_date?: string | null;
    assigned_by?: string | null;
    marks_data?: Record<string, number>;
    marks_published?: boolean;
    marks_published_date?: string | null;
    marks_published_by?: string | null;
    is_self_enrolled?: boolean;
};

export type TrainingAttendance = {
    _id?: string;
    id?: string;
    assignment_id: string;
    teacher_id: string;
    training_program_id: string;
    attendance_date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    notes: string;
    joined_at?: string;
    leave_time?: string;
    duration_seconds?: number;
    recorded_by: string | null;
    created_at: string;
    updated_at: string;
};

export type SchoolFollowup = {
    _id?: string;
    id?: string;
    school_id: string;
    employee_id: string;
    followup_date: string;
    comments: string;
    next_followup_date: string | null;
    status: 'completed' | 'pending';
    created_at: string;
    updated_at: string;
};

export type EmployeeTask = {
    _id?: string;
    id?: string;
    employee_id: string;
    category: 'school_followup' | 'training' | 'queries' | 'audit' | 'master_data' | 'meetings' | 'adhoc_request' | 'mcrt_tasks' | 'others';
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    date?: string;
    start_time?: string;
    end_time?: string;
    due_date?: string | null;
    completed_at?: string | null;
    time_spent: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    employee?: {
        id: string;
        full_name: string;
        username: string;
    };
};

export type SchoolAssignment = {
    _id?: string;
    id?: string;
    school_id: string;
    employee_id: string;
    assigned_at: string;
};

export type UserDevice = {
    _id?: string;
    id?: string;
    user_id: string;
    device_id: string;
    browser: string;
    os: string;
    device_type: string;
    user_agent: string;
    ip_address: string | null;
    location: string | null;
    last_login: string;
    login_count: number;
    is_blocked: boolean;
    is_approved: boolean;
    created_at: string;
    updated_at: string;
};

export type ChatMessage = {
    _id?: string;
    id?: string;
    session_id: string;
    sender_id: string;
    sender_type: 'teacher' | 'employee';
    content: string;
    read_at: string | null;
    created_at: string;
};

export type ChatSession = {
    _id?: string;
    id?: string;
    teacher_id?: string;
    employee_id: string;
    school_id?: string;
    type?: 'teacher_employee' | 'employee_employee' | 'technical_support';
    target_employee_id?: string;
    last_message?: string;
    last_message_at?: string;
    unread_count_teacher: number;
    unread_count_employee: number;
    created_at: string;
    updated_at: string;
};

export type MentorTrainingAssignment = {
    _id?: string;
    id?: string;
    training_program_id: string;
    mentor_id: string;
    assigned_date: string;
    due_date: string | null;
    completion_date: string | null;
    status: 'assigned' | 'in_progress' | 'completed' | 'overdue';
    progress_percentage: number;
    score: number | null;
    certificate_issued?: boolean;
    certificate_issue_date?: string | null;
    assigned_by?: string | null;
    marks_data?: Record<string, number>;
    marks_published?: boolean;
    marks_published_date?: string | null;
    marks_published_by?: string | null;
    is_self_enrolled?: boolean;
};

export type MentorTrainingAttendance = {
    _id?: string;
    id?: string;
    assignment_id: string;
    mentor_id: string;
    training_program_id: string;
    attendance_date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    notes: string;
    joined_at?: string;
    leave_time?: string;
    duration_seconds?: number;
    recorded_by: string | null;
    created_at: string;
    updated_at: string;
};

// Helper function to convert MongoDB document to app format
export function toAppFormat<T extends { _id?: string; id?: string }>(doc: T | null): T | null {
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return {
        ...rest,
        id: _id?.toString() || rest.id,
    } as T;
}

// Helper function to convert app format to MongoDB document
export function toDbFormat<T extends { _id?: string; id?: string }>(obj: T): Omit<T, 'id'> & { _id?: string } {
    const { id, ...rest } = obj;
    if (id && !rest._id) {
        return { ...rest, _id: id };
    }
    return rest;
}
// ... existing types

export type AssignmentWithDetails = (TrainingAssignment | MentorTrainingAssignment) & {
    training_program?: TrainingProgram;
    teacher?: Teacher & { school?: any };
    mentor?: Mentor & { school?: any };
    teacher_id?: string;
    mentor_id?: string;
};

export type SchoolQuery = {
    _id?: string;
    id?: string;
    school_id: string;
    school_name: string;
    person_name: string;
    person_designation: string;
    received_date: string;
    resolved_by: string;
    resolved_date: string;
    source: 'whatsapp' | 'call' | 'email' | 'other';
    department: string;
    query: string;
    resolution: string;
    status: 'pending' | 'resolved' | 'in_progress';
    created_at: string;
    updated_at: string;
};
export type CalendarEvent = {
    _id?: string;
    id?: string;
    user_id: string;
    title: string;
    description?: string;
    type: 'event' | 'task' | 'note';
    start_date: string; // ISO string
    end_date?: string; // ISO string
    is_all_day: boolean;
    reminder_at?: string; // ISO string
    status: 'pending' | 'completed' | 'cancelled';
    created_at: string;
    updated_at: string;
};

export type Student = {
    _id?: string;
    id?: string;
    name: string;
    phone: string;
    school_id: string;
    teacher_id?: string;
    mentor_id?: string;
    grade: 'H1' | 'H2' | 'H3';
    roll_number?: string;
    parent_name?: string;
    parent_phone?: string;
    gender?: 'male' | 'female' | 'other';
    status?: 'active' | 'inactive' | 'dropped';
    section?: string;
    created_at: string;
    updated_at: string;
};

export type StudentAssessment = {
    _id?: string;
    id?: string;
    student_id: string;
    teacher_id?: string;
    mentor_id?: string;
    school_id: string;
    theme_number: number;
    theme_name: string;
    skills: Record<string, 'can' | 'trying' | 'help'>;
    created_at: string;
    updated_at: string;
};

export type Management = {
    _id?: string;
    id?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    school_id: string | null;
    hire_date: string | null;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
};

export type MomNote = {
    _id?: string;
    id?: string;
    title: string;
    date: string;
    agenda: string;
    discussion: string;
    decisions: string;
    action_items: string;
    meeting_number?: string;
    owner_id?: string;
    owner_name?: string;
    deadline_date?: string;
    status?: 'Draft' | 'In Progress' | 'Completed';
    created_by: string;
    created_at: string;
    updated_at: string;
};

export type TrainingSession = {
    _id?: string;
    id?: string;
    title: string;
    description?: string;
    start_date: string; // ISO string
    end_date?: string; // ISO string
    start_time?: string;
    end_time?: string;
    is_all_day: boolean;
    location?: string;
    meeting_link?: string;
    category?: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    
    // New fields for enhanced calendar
    grades?: string;
    mode?: 'Offline' | 'Online' | 'Hybrid';
    training_type?: string;
    sequence?: number;
    no_of_days?: number;
    owner_id?: string;
    owner_name?: string;
    comments?: string;
    gap_reason?: string;

    created_by: string;
    created_at: string;
    updated_at: string;
};
