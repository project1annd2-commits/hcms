import { useState } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { User, Permission, School, Teacher, Mentor } from '../lib/models';
import { Upload, Download, AlertCircle, CheckCircle2, X } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  currentUser: User;
  currentPermissions: Permission;
}

type UploadType = 'schools' | 'teachers' | 'mentors';

interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
}

export default function BulkUpload({ currentUser, currentPermissions }: Props) {
  const [uploadType, setUploadType] = useState<UploadType>('schools');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const canManage = currentUser.role === 'admin';

  const downloadTemplate = (type: UploadType) => {
    let csvContent = '';
    let filename = '';

    switch (type) {
      case 'schools':
        csvContent = 'name,code,address,phone,email,h1_count,h2_count,h3_count,principal_name\n';
        csvContent += 'Example School,SCH001,"123 Main St, City",555-0100,school@example.com,100,200,300,John Doe\n';
        filename = 'schools_template.csv';
        break;
      case 'teachers':
        csvContent = 'first_name,last_name,email,phone,school_code,subject_specialization,qualification,hire_date,status\n';
        csvContent += 'Jane,Smith,jane@example.com,555-0101,SCH001,Mathematics,B.Ed,2020-01-15,active\n';
        filename = 'teachers_template.csv';
        break;
      case 'mentors':
        csvContent = 'first_name,last_name,email,phone,school_code,specialization,years_of_experience\n';
        csvContent += 'Bob,Johnson,bob@example.com,555-0102,SCH001,Educational Leadership,10\n';
        filename = 'mentors_template.csv';
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const headers = rows[0];
      const data = rows.slice(1);

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row.length === 0 || row.every(cell => !cell)) continue;

        try {
          if (uploadType === 'schools') {
            const schoolData = {
              name: row[0],
              code: row[1],
              address: row[2],
              phone: row[3],
              email: row[4],
              h1_count: parseInt(row[5]) || 0,
              h2_count: parseInt(row[6]) || 0,
              h3_count: parseInt(row[7]) || 0,
              principal_name: row[8],
              created_by: currentUser.id,
              created_at: new Date().toISOString(),
            };

            await db.insertOne(Collections.SCHOOLS, schoolData);
            success++;
          } else if (uploadType === 'teachers') {
            const schoolCode = row[4];
            const schools = await db.find<School>(Collections.SCHOOLS, { code: schoolCode });
            const school = schools[0];

            if (!school) {
              throw new Error(`School with code ${schoolCode} not found`);
            }

            const teacherData = {
              first_name: row[0],
              last_name: row[1],
              email: row[2] || '',
              phone: row[3] || '',
              school_id: school.id,
              subject_specialization: row[5] || null,
              qualification: row[6] || null,
              hire_date: row[7] || null,
              status: row[8] || 'active',
              created_at: new Date().toISOString(),
            };

            await db.insertOne(Collections.TEACHERS, teacherData);
            success++;
          } else if (uploadType === 'mentors') {
            const schoolCode = row[4];
            const schools = await db.find<School>(Collections.SCHOOLS, { code: schoolCode });
            const school = schools[0];

            if (!school) {
              throw new Error(`School with code ${schoolCode} not found`);
            }

            const mentorData = {
              first_name: row[0],
              last_name: row[1],
              email: row[2] || '',
              phone: row[3] || '',
              specialization: row[5] || '',
              school_id: school.id || null,
              years_of_experience: parseInt(row[6]) || 0,
              status: 'active' as 'active' | 'inactive',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            await db.insertOne<Mentor>(Collections.MENTORS, mentorData);
            success++;
          }
        } catch (error) {
          failed++;
          errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setResult({ success, failed, errors });
    } catch (error) {
      setResult({
        success: 0,
        failed: 0,
        errors: [`File parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (!canManage) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">You do not have permission to bulk upload data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bulk Upload</h2>
        <p className="text-gray-600 mt-1">Upload multiple records at once using CSV files</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Upload Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['schools', 'teachers', 'mentors'] as UploadType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setUploadType(type)}
                  className={`p-4 rounded-lg border-2 transition-all ${uploadType === type
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <p className="font-medium text-gray-900 capitalize">{type}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Instructions</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Download the CSV template for {uploadType}</li>
              <li>Fill in your data following the template format</li>
              <li>Save the file as CSV</li>
              <li>Upload the file using the button below</li>
            </ol>

            <button
              onClick={() => downloadTemplate(uploadType)}
              className="mt-4 flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={20} />
              Download {uploadType} Template
            </button>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload File</h3>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">CSV files only</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {uploading && (
            <div className="flex items-center justify-center py-4 bg-white/50 rounded-xl">
              <LoadingSpinner size="small" label="Uploading Records" />
            </div>
          )}

          {result && (
            <div className="border-t pt-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  {result.failed === 0 ? (
                    <CheckCircle2 className="text-green-600" size={24} />
                  ) : (
                    <AlertCircle className="text-yellow-600" size={24} />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">Upload Results</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">Successful</p>
                    <p className="text-2xl font-bold text-green-600">{result.success}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Errors:</p>
                    <div className="bg-white rounded border border-red-200 max-h-48 overflow-y-auto">
                      {result.errors.map((error, index) => (
                        <div key={index} className="p-2 text-sm text-red-600 border-b border-red-100 last:border-b-0">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setResult(null)}
                  className="mt-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <X size={16} />
                  Clear Results
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
