
import React from 'react';
import { CertificateTemplate, AssignmentWithDetails } from '../../lib/models';

interface RenderedTemplateProps {
    template: CertificateTemplate;
    data: {
        assignment: AssignmentWithDetails;
        role: 'teacher' | 'mentor';
    };
    scale?: number;
}

const RenderedTemplate: React.FC<RenderedTemplateProps> = ({ template, data, scale = 1 }) => {
    const { assignment, role } = data;
    const traineeName = role === 'teacher'
        ? `${assignment.teacher?.first_name} ${assignment.teacher?.last_name}`
        : `${assignment.mentor?.first_name} ${assignment.mentor?.last_name}`;

    const replaceVariables = (content: string) => {
        // Global fix for branding spelling to handle text stored in database templates
        const processedContent = content.replace(/Millat Center/gi, 'Millat Centre');

        return processedContent
            .replace('{{Trainee Name}}', traineeName)
            .replace('{{Program Name}}', assignment.training_program?.title || '')
            .replace('{{Completion Date}}', new Date(assignment.certificate_issue_date || new Date()).toLocaleDateString())
            .replace('{{Start Date}}', assignment.training_program?.start_date ? new Date(assignment.training_program.start_date).toLocaleDateString() : '')
            .replace('{{End Date}}', assignment.training_program?.end_date ? new Date(assignment.training_program.end_date).toLocaleDateString() : '')
            .replace('{{Score}}', assignment.score?.toString() || '')
            .replace('{{Grade}}', assignment.score && assignment.score >= 80 ? 'A' : assignment.score && assignment.score >= 60 ? 'B' : 'C');
    };

    return (
        <div
            style={{
                width: template.width * scale,
                height: template.height * scale,
                position: 'relative',
                backgroundImage: template.background_url ? `url(${template.background_url})` : 'none',
                backgroundColor: !template.background_url ? '#ffffff' : 'transparent',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                margin: '0 auto'
            }}
        >
            {template.elements.map((element) => {
                if (element.type === 'text' || element.type === 'variable') {
                    return (
                        <div
                            key={element.id}
                            style={{
                                position: 'absolute',
                                left: element.x * scale,
                                top: element.y * scale,
                                fontSize: element.style.fontSize * scale,
                                fontFamily: element.style.fontFamily,
                                fontWeight: element.style.fontWeight,
                                color: element.style.color,
                                textAlign: element.style.textAlign as any,
                                minWidth: element.width ? element.width * scale : 'auto',
                                whiteSpace: 'pre-wrap',
                                lineHeight: 1.2
                            }}
                        >
                            {replaceVariables(element.content)}
                        </div>
                    );
                } else if (element.type === 'table' && element.content === 'marks_table') {
                    return (
                        <div
                            key={element.id}
                            style={{
                                position: 'absolute',
                                left: element.x * scale,
                                top: element.y * scale,
                                width: element.width ? element.width * scale : '300px',
                            }}
                        >
                            <table className="w-full border-collapse border border-gray-800 text-xs" style={{ fontSize: element.style.fontSize * scale }}>
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-800 p-1 text-left">Subject</th>
                                        <th className="border border-gray-800 p-1 text-center w-16">Max</th>
                                        <th className="border border-gray-800 p-1 text-center w-16">Obt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assignment.training_program?.marks_configuration?.subjects.map((sub, idx) => (
                                        <tr key={idx}>
                                            <td className="border border-gray-800 p-1">{sub.name}</td>
                                            <td className="border border-gray-800 p-1 text-center">{sub.max_marks}</td>
                                            <td className="border border-gray-800 p-1 text-center font-bold">
                                                {assignment.marks_data?.[sub.name] ?? '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-50 font-bold">
                                        <td className="border border-gray-800 p-1 text-right">Total</td>
                                        <td className="border border-gray-800 p-1 text-center">
                                            {assignment.training_program?.marks_configuration?.subjects.reduce((a, b) => a + b.max_marks, 0)}
                                        </td>
                                        <td className="border border-gray-800 p-1 text-center font-bold">
                                            {Object.values(assignment.marks_data || {}).reduce((a, b) => a + b, 0)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    );
                } else if (element.type === 'image') {
                    return (
                        <div
                            key={element.id}
                            style={{
                                position: 'absolute',
                                left: element.x * scale,
                                top: element.y * scale,
                                width: element.width ? element.width * scale : '150px',
                                height: element.height ? element.height * scale : 'auto',
                            }}
                        >
                            <img
                                src={element.content}
                                alt=""
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain'
                                }}
                                crossOrigin="anonymous"
                            />
                        </div>
                    );
                }
                return null;
            })}
        </div>
    );
};

export default RenderedTemplate;
