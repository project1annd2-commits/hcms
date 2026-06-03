import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { SchoolFollowup, School, User } from '../lib/models';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line
} from 'recharts';
import { 
  BarChart3, MessageSquare, TrendingUp, AlertTriangle, 
  CheckCircle2, Info, Search, Filter, Calendar 
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  currentUser: User;
}

export default function SchoolFollowupAnalytics({ currentUser }: Props) {
  const [loading, setLoading] = useState(true);
  const [allFollowups, setAllFollowups] = useState<SchoolFollowup[]>([]);
  const [schools, setSchools] = useState<Record<string, string>>({});
  const [sentimentData, setSentimentData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [keywordData, setKeywordData] = useState<any[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Filter by employee if not admin
      const filter = isAdmin ? {} : { employee_id: currentUser.id };
      const followups = await db.find<SchoolFollowup>(Collections.SCHOOL_FOLLOWUPS, filter);
      
      // Load schools and employees for mapping
      const schoolList = await db.find<School>(Collections.SCHOOLS, {});
      const employeeList = await db.find<User>(Collections.USERS, { role: 'employee' });
      
      const schoolMap: Record<string, string> = {};
      schoolList.forEach(s => { schoolMap[s.id!] = s.name; });
      
      const empMap: Record<string, string> = {};
      employeeList.forEach(e => { empMap[e.id!] = e.full_name; });
      
      setSchools(schoolMap);
      setAllFollowups(followups);
      
      analyzeFollowups(followups);
      
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeFollowups = (followups: SchoolFollowup[]) => {
    const categories = {
      'App & Technical': ['app', 'login', 'sync', 'loading', 'error', 'tablet', 'device', 'crash', 'system', 'tech'],
      'Teacher Performance': ['teacher', 'sir', 'madam', 'teaching', 'explanation', 'instruction'],
      'Student Progress': ['student', 'child', 'assessment', 'result', 'learning', 'grade'],
      'Administrative': ['principal', 'office', 'fees', 'enrollment', 'management', 'planning'],
      'Infrastructure': ['building', 'classroom', 'electricity', 'water', 'boards', 'furniture']
    };

    const sentiments = {
      positive: ['good', 'excellent', 'great', 'success', 'happy', 'satisfied', 'satisfied', 'resolved', 'improved', 'perfect', 'working well'],
      negative: ['issue', 'problem', 'slow', 'poor', 'struggling', 'difficult', 'bug', 'failing', 'complaint', 'not working', 'error'],
    };

    let pos = 0, neg = 0, neu = 0;
    const catCounts: Record<string, number> = {};
    const words: Record<string, number> = {};
    const timeMap: Record<string, { pos: number; neg: number; total: number }> = {};

    followups.forEach(f => {
      const comment = (f.comments || '').toLowerCase();
      
      // Sentiment Analysis
      let isPos = sentiments.positive.some(word => comment.includes(word));
      let isNeg = sentiments.negative.some(word => comment.includes(word));
      
      if (isPos && !isNeg) pos++;
      else if (isNeg) neg++;
      else neu++;

      // Category Analysis
      Object.entries(categories).forEach(([cat, keywords]) => {
        if (keywords.some(word => comment.includes(word))) {
          catCounts[cat] = (catCounts[cat] || 0) + 1;
        }
      });

      // Simple Keyword Extraction (words > 4 chars)
      const tokens = comment.replace(/[.,!]/g, '').split(/\s+/);
      tokens.forEach(token => {
        if (token.length > 4) {
          words[token] = (words[token] || 0) + 1;
        }
      });

      // Time Series
      const date = f.followup_date.substring(0, 7); // YYYY-MM
      if (!timeMap[date]) timeMap[date] = { pos: 0, neg: 0, total: 0 };
      timeMap[date].total++;
      if (isPos && !isNeg) timeMap[date].pos++;
      if (isNeg) timeMap[date].neg++;
    });

    setSentimentData([
      { name: 'Positive', value: pos, color: '#10B981' },
      { name: 'Negative', value: neg, color: '#EF4444' },
      { name: 'Neutral', value: neu, color: '#6B7280' }
    ].filter(d => d.value > 0));

    setCategoryData(Object.entries(catCounts).map(([category, count]) => ({
      category,
      count
    })).sort((a, b) => b.count - a.count));

    setKeywordData(Object.entries(words)
      .filter(([, count]) => count > 1)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20)
    );

    setTimeSeriesData(Object.entries(timeMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date,
        sentiment: Math.round(((stats.pos - stats.neg) / stats.total) * 100),
        volume: stats.total
      }))
    );
  };

  if (loading) return <LoadingSpinner label="Analyzing Followups..." />;

  const filteredFollowups = allFollowups.filter(f => {
    const matchesSearch = (f.comments || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (schools[f.school_id] || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!selectedCategory) return matchesSearch;
    
    // Check if category keywords match
    const categories: Record<string, string[]> = {
        'App & Technical': ['app', 'login', 'sync', 'loading', 'error', 'tablet', 'device', 'crash', 'system', 'tech'],
        'Teacher Performance': ['teacher', 'sir', 'madam', 'teaching', 'explanation', 'instruction'],
        'Student Progress': ['student', 'child', 'assessment', 'result', 'learning', 'grade'],
        'Administrative': ['principal', 'office', 'fees', 'enrollment', 'management', 'planning'],
        'Infrastructure': ['building', 'classroom', 'electricity', 'water', 'boards', 'furniture']
      };
    return matchesSearch && categories[selectedCategory]?.some(word => f.comments.toLowerCase().includes(word));
  });

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <BarChart3 className="text-blue-600" size={28} />
            Followup Analytics
          </h1>
          <p className="text-gray-500 font-medium">Insights derived from visit comments and feedback</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-4">
          <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Followups</p>
            <p className="text-xl font-black text-blue-900">{allFollowups.length}</p>
          </div>
          <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Schools Captured</p>
            <p className="text-xl font-black text-indigo-900">{Object.keys(schools).length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sentiment Score */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-green-500" />
            Comment Sentiment
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Filter size={16} className="text-indigo-500" />
            Topic Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="category" 
                  type="category" 
                  width={140} 
                  tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
                />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar 
                  dataKey="count" 
                  radius={[0, 4, 4, 0]} 
                  onClick={(data: any) => {
                    if (data && data.category) {
                      setSelectedCategory(selectedCategory === data.category ? null : data.category);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {categoryData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={selectedCategory === _entry.category ? '#3b82f6' : '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment Timeline */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-blue-500" />
            Performance Trend (Monthly Sentiment)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Net Score %', angle: -90, position: 'insideLeft', style: {fontSize: 10} }} />
                <Tooltip />
                <Line 
                    type="monotone" 
                    dataKey="sentiment" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Keywords */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <MessageSquare size={16} className="text-purple-500" />
            Top Mentions
          </h3>
          <div className="flex flex-wrap gap-2 items-center">
            {keywordData.map((kw, i) => (
              <span 
                key={i} 
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all border
                  ${i < 5 ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'}
                `}
                style={{ fontSize: `${Math.min(24, 11 + (kw.value / 4))}px` }}
              >
                {kw.text} ({kw.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Deep Dive Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-8">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Search size={20} className="text-gray-400" />
                Feedback Deep Dive
            </h3>
            <p className="text-sm text-gray-500 font-medium">Search more specifically through employee observations</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Filter by school or content..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium h-10 shadow-sm"
            />
          </div>
        </div>

        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date / School</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee Observation</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Next Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredFollowups.slice(0, 50).map((f) => {
                const isNeg = ['issue', 'problem', 'difficult', 'slow'].some(w => f.comments.toLowerCase().includes(w));
                const isPos = ['good', 'great', 'excellent'].some(w => f.comments.toLowerCase().includes(w));
                
                return (
                  <tr key={f.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-xs font-bold text-gray-900">{f.followup_date}</p>
                      <p className="text-xs text-blue-600 font-black truncate max-w-[150px]">{schools[f.school_id] || '---'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        {isNeg ? <AlertTriangle className="text-red-500 shrink-0" size={16} /> : 
                         isPos ? <CheckCircle2 className="text-green-500 shrink-0" size={16} /> : 
                         <Info className="text-blue-500 shrink-0" size={16} />}
                        <p className="text-sm text-gray-600 leading-relaxed font-medium">
                          {f.comments}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        {f.next_followup_date ? (
                            <span className="text-[10px] font-black bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                                NEXT: {f.next_followup_date}
                            </span>
                        ) : (
                            <span className="text-[10px] font-black text-gray-400">NO DATE SET</span>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredFollowups.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-gray-400 font-bold italic">No observations matching your criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
