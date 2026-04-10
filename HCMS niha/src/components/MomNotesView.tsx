import { useState, useEffect, useRef, useCallback } from 'react';
import { User, MomNote, Permission } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import {
  Plus, Search, FileText, X, Save, Trash2, Calendar,
  User as UserIcon, Download, Filter, ChevronRight,
  CheckCircle2, Edit3, Clock, Hash
} from 'lucide-react';
import RichTextEditor from './common/RichTextEditor';

interface Props {
  currentUser: User;
  currentPermissions: Permission | null;
}

type MomStatus = 'Draft' | 'In Progress' | 'Completed';

function getMomStatus(note: MomNote): MomStatus {
  if (note.status) return note.status;
  const hasAgenda = !!(note.agenda && note.agenda.replace(/<[^>]*>/g, '').trim());
  const hasDiscussion = !!(note.discussion && note.discussion.replace(/<[^>]*>/g, '').trim());
  const hasDecisions = !!(note.decisions && note.decisions.replace(/<[^>]*>/g, '').trim());
  const hasActions = !!(note.action_items && note.action_items.replace(/<[^>]*>/g, '').trim());
  const filled = [hasAgenda, hasDiscussion, hasDecisions, hasActions].filter(Boolean).length;
  if (filled === 0) return 'Draft';
  if (filled < 3) return 'In Progress';
  return 'Completed';
}

const STATUS_STYLES: Record<MomStatus, string> = {
  'Draft': 'bg-gray-100 text-gray-600 border-gray-200',
  'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
  'Completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function MomNotesView({ currentUser }: Props) {
  const [notes, setNotes] = useState<MomNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Side panel state
  const [panelNote, setPanelNote] = useState<Partial<MomNote> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Inline edit state
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditField, setInlineEditField] = useState<'title' | 'date' | 'owner_id' | 'deadline_date' | 'meeting_number' | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // Selected row
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Employees for ownership dropdown
  const [employees, setEmployees] = useState<User[]>([]);

  useEffect(() => { loadNotes(); }, []);

  useEffect(() => {
    if (inlineInputRef.current) inlineInputRef.current.focus();
  }, [inlineEditId, inlineEditField]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const [dbNotes, dbUsers] = await Promise.all([
        db.find<MomNote>(Collections.MOM_NOTES, {}),
        db.find<User>(Collections.USERS, { is_active: true })
      ]);
      setNotes(dbNotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setEmployees(dbUsers.sort((a, b) => a.full_name.localeCompare(b.full_name)));
    } catch (error) {
      console.error('Error loading MoM notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setPanelNote({
      title: '',
      date: new Date().toISOString().split('T')[0],
      agenda: '',
      discussion: '',
      decisions: '',
      action_items: '',
      meeting_number: '',
      deadline_date: '',
      owner_id: '',
      owner_name: '',
      status: 'Draft',
      created_by: currentUser.full_name
    });
    setSelectedRowId(null);
  };

  const handleOpenPanel = (note: MomNote) => {
    setPanelNote({ ...note });
    setSelectedRowId(note.id || null);
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm('Delete this MoM record permanently?')) return;
    try {
      await db.delete(Collections.MOM_NOTES, noteId);
      if (panelNote && (panelNote as MomNote).id === noteId) setPanelNote(null);
      await loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note');
    }
  };

  const handleSave = async () => {
    if (!panelNote || !panelNote.title) {
      alert('Please enter a title for the MoM.');
      return;
    }
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const noteToSave = {
        ...panelNote,
        created_by: panelNote.created_by || currentUser.full_name,
        updated_at: now
      };
      if (panelNote.id) {
        await db.update(Collections.MOM_NOTES, panelNote.id, noteToSave);
      } else {
        noteToSave.created_at = now;
        await db.create(Collections.MOM_NOTES, noteToSave as MomNote);
      }
      setPanelNote(null);
      setSelectedRowId(null);
      await loadNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  // Inline editing
  const startInlineEdit = (noteId: string, field: 'title' | 'date' | 'owner_id' | 'deadline_date' | 'meeting_number', currentValue: string) => {
    setInlineEditId(noteId);
    setInlineEditField(field as 'title' | 'date' | 'owner_id' | 'deadline_date' | 'meeting_number');
    setInlineEditValue(currentValue);
  };

  const commitInlineEdit = useCallback(async () => {
    if (!inlineEditId || !inlineEditField) return;
    try {
      const updateData: Partial<MomNote> = {
        [inlineEditField]: inlineEditValue,
        updated_at: new Date().toISOString()
      };
      
      if (inlineEditField === 'owner_id') {
        const emp = employees.find(e => e.id === inlineEditValue);
        updateData.owner_name = emp ? emp.full_name : '';
      }

      await db.update(Collections.MOM_NOTES, inlineEditId, updateData);
      await loadNotes();
    } catch (error) {
      console.error('Inline edit error:', error);
    }
    setInlineEditId(null);
    setInlineEditField(null);
  }, [inlineEditId, inlineEditField, inlineEditValue]);

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitInlineEdit();
    if (e.key === 'Escape') { setInlineEditId(null); setInlineEditField(null); }
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ['#', 'Meeting #', 'Title', 'Date of Meeting', 'Deadline Date', 'Owned By', 'Created By', 'Status', 'Agenda', 'Discussion', 'Decisions', 'Action Items'];
    const strip = (html: string) => (html || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const rows = filteredNotes.map((n, i) => [
      i + 1,
      n.meeting_number || '',
      `"${(n.title || '').replace(/"/g, '""')}"`,
      n.date,
      n.deadline_date || '',
      `"${(n.owner_name || '').replace(/"/g, '""')}"`,
      n.created_by,
      getMomStatus(n),
      `"${strip(n.agenda).replace(/"/g, '""')}"`,
      `"${strip(n.discussion).replace(/"/g, '""')}"`,
      `"${strip(n.decisions).replace(/"/g, '""')}"`,
      `"${strip(n.action_items).replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MoM_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Filtering
  const filteredNotes = notes.filter(n => {
    const matchSearch = !searchTerm ||
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.agenda || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.owner_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.created_by || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchDate = !dateFilter || n.date === dateFilter;
    return matchSearch && matchDate;
  });

  const stripHtml = (html: string) => (html || '').replace(/<[^>]*>/g, '').trim();

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-100 overflow-hidden" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* ── Excel-Style Toolbar ── */}
      <div className="shrink-0 border-b border-gray-300 bg-white">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}>
          <div className="flex items-center gap-3">
            <FileText size={22} className="text-white/90" />
            <h1 className="text-lg font-bold text-white tracking-wide">Minutes of Meeting (MoM)</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-md transition-colors font-medium"
            >
              <Download size={14} />
              Export CSV
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white text-[#2563eb] rounded-md hover:bg-blue-50 transition-colors font-bold shadow-sm"
            >
              <Plus size={16} />
              New MoM
            </button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-3 px-5 py-2.5 bg-gray-50 border-b border-gray-200">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search title, agenda, author..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] bg-white"
            />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Filter size={14} />
            <input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb] bg-white"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="ml-1 text-xs text-red-500 hover:text-red-700 underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Spreadsheet Table ── */}
        <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${panelNote ? 'mr-0' : ''}`}>
          {loading ? (
            <div className="flex-1 flex justify-center items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563eb]" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center text-gray-400">
              <FileText size={48} className="mb-3 opacity-50" />
              <p className="text-lg font-medium text-gray-500">No MoM records found</p>
              <p className="text-sm text-gray-400 mt-1">Create your first meeting note above.</p>
              <button
                onClick={handleCreate}
                className="mt-5 flex items-center gap-2 px-4 py-2 bg-[#2563eb] text-white rounded-md hover:bg-[#1d4ed8] font-medium text-sm transition-colors"
              >
                <Plus size={16} /> Create MoM
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-sm" style={{ minWidth: 900 }}>
                  <thead className="sticky top-0 z-10">
                    <tr style={{ background: '#2563eb' }}>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-white/20 w-12">#</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-white/20 w-24">Meeting #</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-white/20 min-w-[200px]">Title</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-white/20 w-[110px]">Date of meeting</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-white/20 w-[110px]">Deadline date</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-white/20 w-[150px]">Ownership</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-white/20 w-[130px]">Created By</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider border-r border-white/20 min-w-[180px]">Agenda (Preview)</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider border-r border-white/20 w-[110px]">Status</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider w-[90px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNotes.map((note, idx) => {
                      const status = getMomStatus(note);
                      const isSelected = selectedRowId === note.id;
                      const isInlineEditing = inlineEditId === note.id;
                      return (
                        <tr
                          key={note.id}
                          onClick={() => handleOpenPanel(note)}
                          className={`cursor-pointer border-b border-gray-200 transition-colors group ${
                            isSelected
                              ? 'bg-[#dbeafe] ring-1 ring-inset ring-[#2563eb]/30'
                              : idx % 2 === 0
                                ? 'bg-white hover:bg-[#eff6ff]'
                                : 'bg-gray-50/70 hover:bg-[#eff6ff]'
                          }`}
                        >
                          {/* Row Number */}
                          <td className="px-3 py-2.5 text-gray-400 font-mono text-xs border-r border-gray-200 text-center bg-gray-50/50">
                            {idx + 1}
                          </td>

                          {/* Meeting Number */}
                          <td
                            className="px-3 py-2.5 border-r border-gray-200 text-gray-600 font-mono text-xs"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (note.id) startInlineEdit(note.id, 'meeting_number', note.meeting_number || '');
                            }}
                          >
                            {isInlineEditing && inlineEditField === 'meeting_number' ? (
                              <input
                                ref={inlineInputRef}
                                type="text"
                                value={inlineEditValue}
                                onChange={e => setInlineEditValue(e.target.value)}
                                onBlur={commitInlineEdit}
                                onKeyDown={handleInlineKeyDown}
                                onClick={e => e.stopPropagation()}
                                className="w-full px-1 py-0.5 border-2 border-[#2563eb] rounded text-xs outline-none bg-white"
                              />
                            ) : (
                              <span className={!note.meeting_number ? 'text-gray-300 italic' : ''}>
                                {note.meeting_number || 'No #'}
                              </span>
                            )}
                          </td>

                          {/* Title */}
                          <td
                            className="px-3 py-2.5 border-r border-gray-200 font-medium text-gray-900"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (note.id) startInlineEdit(note.id, 'title', note.title);
                            }}
                          >
                            {isInlineEditing && inlineEditField === 'title' ? (
                              <input
                                ref={inlineInputRef}
                                type="text"
                                value={inlineEditValue}
                                onChange={e => setInlineEditValue(e.target.value)}
                                onBlur={commitInlineEdit}
                                onKeyDown={handleInlineKeyDown}
                                onClick={e => e.stopPropagation()}
                                className="w-full px-1.5 py-0.5 border-2 border-[#2563eb] rounded text-sm font-medium outline-none bg-white"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="truncate">{note.title || <span className="text-gray-400 italic">Untitled</span>}</span>
                                <Edit3 size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </div>
                            )}
                          </td>

                          {/* Date of Meeting */}
                          <td
                            className="px-3 py-2.5 border-r border-gray-200 text-gray-600"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (note.id) startInlineEdit(note.id, 'date', note.date);
                            }}
                          >
                            {isInlineEditing && inlineEditField === 'date' ? (
                              <input
                                ref={inlineInputRef}
                                type="date"
                                value={inlineEditValue}
                                onChange={e => setInlineEditValue(e.target.value)}
                                onBlur={commitInlineEdit}
                                onKeyDown={handleInlineKeyDown}
                                onClick={e => e.stopPropagation()}
                                className="w-full px-1 py-0.5 border-2 border-[#2563eb] rounded text-sm outline-none bg-white"
                              />
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Calendar size={13} className="text-gray-400 shrink-0" />
                                <span className="font-mono text-xs">{new Date(note.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              </div>
                            )}
                          </td>

                          {/* Deadline Date */}
                          <td
                            className="px-3 py-2.5 border-r border-gray-200 text-gray-600"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (note.id) startInlineEdit(note.id, 'deadline_date', note.deadline_date || '');
                            }}
                          >
                            {isInlineEditing && inlineEditField === 'deadline_date' ? (
                              <input
                                ref={inlineInputRef}
                                type="date"
                                value={inlineEditValue}
                                onChange={e => setInlineEditValue(e.target.value)}
                                onBlur={commitInlineEdit}
                                onKeyDown={handleInlineKeyDown}
                                onClick={e => e.stopPropagation()}
                                className="w-full px-1 py-0.5 border-2 border-[#2563eb] rounded text-sm outline-none bg-white"
                              />
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Calendar size={13} className="text-red-400 shrink-0" />
                                <span className={`font-mono text-xs ${!note.deadline_date ? 'text-gray-300 italic' : 'text-gray-600'}`}>
                                  {note.deadline_date ? new Date(note.deadline_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Set Deadline'}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Ownership */}
                          <td
                            className="px-3 py-2.5 border-r border-gray-200"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (note.id) startInlineEdit(note.id, 'owner_id', note.owner_id || '');
                            }}
                          >
                            {isInlineEditing && inlineEditField === 'owner_id' ? (
                              <select
                                ref={inlineInputRef as unknown as React.RefObject<HTMLSelectElement>}
                                value={inlineEditValue}
                                onChange={e => setInlineEditValue(e.target.value)}
                                onBlur={commitInlineEdit}
                                onKeyDown={handleInlineKeyDown as React.KeyboardEventHandler<HTMLSelectElement>}
                                onClick={e => e.stopPropagation()}
                                className="w-full px-1 py-0.5 border-2 border-[#2563eb] rounded text-sm outline-none bg-white"
                              >
                                <option value="">Select Owner...</option>
                                {employees.map(emp => (
                                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <UserIcon size={13} className="text-[#2563eb] shrink-0" />
                                <span className={`truncate text-xs ${!note.owner_name ? 'text-gray-400 italic' : 'text-gray-700 font-medium'}`}>
                                  {note.owner_name || 'Unassigned'}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Created By */}
                          <td className="px-3 py-2.5 border-r border-gray-200 text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 bg-[#2563eb] text-white rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                                {(note.created_by || '?')[0].toUpperCase()}
                              </div>
                              <span className="truncate text-xs">{note.created_by}</span>
                            </div>
                          </td>

                          {/* Agenda Preview */}
                          <td className="px-3 py-2.5 border-r border-gray-200 text-gray-500 text-xs">
                            <span className="line-clamp-2">{stripHtml(note.agenda) || <span className="italic text-gray-300">No agenda</span>}</span>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-2.5 border-r border-gray-200 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[status]}`}>
                              {status === 'Completed' && <CheckCircle2 size={11} />}
                              {status === 'In Progress' && <Clock size={11} />}
                              {status === 'Draft' && <Edit3 size={11} />}
                              {status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenPanel(note); }}
                                className="p-1 text-[#2563eb] hover:bg-[#2563eb]/10 rounded transition-colors"
                                title="Open"
                              >
                                <ChevronRight size={16} />
                              </button>
                              {(currentUser.role === 'admin' || currentUser.full_name === note.created_by) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); if (note.id) handleDelete(note.id); }}
                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Status Bar (Excel-style) ── */}
              <div className="shrink-0 flex items-center justify-between px-4 py-1.5 bg-[#217346] text-white text-xs border-t border-[#1a5c38]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><Hash size={11} /> <strong>{filteredNotes.length}</strong> Records</span>
                  <span className="opacity-60">|</span>
                  <span className="flex items-center gap-1"><CheckCircle2 size={11} /> {filteredNotes.filter(n => getMomStatus(n) === 'Completed').length} Completed</span>
                  <span className="opacity-60">|</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {filteredNotes.filter(n => getMomStatus(n) === 'In Progress').length} In Progress</span>
                  <span className="opacity-60">|</span>
                  <span className="flex items-center gap-1"><Edit3 size={11} /> {filteredNotes.filter(n => getMomStatus(n) === 'Draft').length} Drafts</span>
                </div>
                <span className="opacity-75">Double-click a cell to edit inline</span>
              </div>
            </>
          )}
        </div>

        {/* ── Slide-out Detail Panel ── */}
        {panelNote && (
          <div
            className="w-[90%] xl:w-[85%] max-w-7xl shrink-0 border-l border-gray-300 bg-white flex flex-col shadow-2xl overflow-hidden"
            style={{ animation: 'slideInRight 0.25s ease-out' }}
          >
            {/* Panel Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-200" style={{ background: 'linear-gradient(135deg, #217346 0%, #1a5c38 100%)' }}>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={panelNote.title || ''}
                  onChange={e => setPanelNote(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Meeting Title..."
                  className="w-full bg-transparent text-white font-bold text-base outline-none placeholder-white/50 truncate"
                />
              </div>
              <button
                onClick={() => { setPanelNote(null); setSelectedRowId(null); }}
                className="ml-3 p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X size={18} className="text-white" />
              </button>
            </div>

            {/* Panel Meta */}
            <div className="shrink-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 px-6 py-4 bg-gray-50 border-b border-gray-200 text-sm">
              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#217346]" />
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Meeting Date</span>
                </div>
                <input
                  type="date"
                  value={panelNote.date || ''}
                  onChange={e => setPanelNote(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-[#217346] focus:border-[#217346] outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5 min-w-[100px]">
                <div className="flex items-center gap-1.5">
                  <Hash size={13} className="text-[#217346]" />
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Meeting #</span>
                </div>
                <input
                  type="text"
                  value={panelNote.meeting_number || ''}
                  onChange={e => setPanelNote(prev => ({ ...prev, meeting_number: e.target.value }))}
                  placeholder="e.g. M001"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-[#217346] focus:border-[#217346] outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-red-500" />
                  <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Deadline</span>
                </div>
                <input
                  type="date"
                  value={panelNote.deadline_date || ''}
                  onChange={e => setPanelNote(prev => ({ ...prev, deadline_date: e.target.value }))}
                  className="w-full px-2.5 py-1.5 border border-red-200 bg-red-50/10 rounded text-xs focus:ring-1 focus:ring-red-400 focus:border-red-400 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5 lg:col-span-1 min-w-[180px]">
                <div className="flex items-center gap-1.5">
                  <UserIcon size={13} className="text-[#217346]" />
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Owner</span>
                </div>
                <select
                  value={panelNote.owner_id || ''}
                  onChange={e => {
                    const emp = employees.find(emp => emp.id === e.target.value);
                    setPanelNote(prev => ({ ...prev, owner_id: e.target.value, owner_name: emp ? emp.full_name : '' }));
                  }}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-[#217346] focus:border-[#217346] outline-none transition-all shadow-sm cursor-pointer"
                >
                  <option value="">Select Owner...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 min-w-[120px]">
                <div className="flex items-center gap-1.5">
                  <Edit3 size={13} className="text-[#217346]" />
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Status</span>
                </div>
                <select
                  value={panelNote.status || ''}
                  onChange={e => setPanelNote(prev => ({ ...prev, status: e.target.value as MomStatus }))}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-[#217346] focus:border-[#217346] outline-none transition-all shadow-sm cursor-pointer"
                >
                  <option value="Draft">Draft</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Created By</span>
                <div className="flex items-center gap-2 px-2.5 py-1.5 text-gray-700 bg-gray-100 rounded-lg shadow-inner">
                  <div className="w-5 h-5 bg-[#217346] text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                    {(panelNote.created_by || currentUser.full_name)[0].toUpperCase()}
                  </div>
                  <span className="truncate font-medium">{panelNote.created_by || currentUser.full_name}</span>
                </div>
              </div>
            </div>

            {/* Panel Sections */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-[1600px] mx-auto">
                {[
                  { key: 'agenda', label: 'Agenda', placeholder: 'What is to be discussed...', icon: FileText },
                  { key: 'discussion', label: 'Discussion Points', placeholder: 'Summary of what was discussed...', icon: Edit3 },
                  { key: 'decisions', label: 'Decisions Taken', placeholder: 'Final decisions agreed upon...', icon: CheckCircle2 },
                  { key: 'action_items', label: 'Action Items', placeholder: 'Tasks, assignees, deadlines...', icon: Clock },
                ].map(section => (
                  <div key={section.key} className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 border-b border-gray-200 shrink-0">
                      <section.icon size={15} className="text-[#217346]" />
                      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">{section.label}</h3>
                    </div>
                    <div className="flex-1 p-2">
                      <RichTextEditor
                        value={(panelNote as Record<string, string>)[section.key] || ''}
                        onChange={v => setPanelNote(prev => ({ ...prev, [section.key]: v }))}
                        placeholder={section.placeholder}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel Footer */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => { setPanelNote(null); setSelectedRowId(null); }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#217346] text-white rounded-md hover:bg-[#1a5c38] disabled:opacity-50 font-bold transition-colors shadow-sm"
              >
                <Save size={15} />
                {isSaving ? 'Saving...' : 'Save & Close'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-in Animation Keyframe */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
