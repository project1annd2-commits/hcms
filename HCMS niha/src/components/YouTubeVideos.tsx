import { useState, useEffect } from 'react';
import { Play, Plus, X, ExternalLink, Trash2, Edit2 } from 'lucide-react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';

interface YouTubeVideo {
  id?: string;
  title: string;
  videoId: string;
  description?: string;
  category?: string;
  created_at?: string;
}

interface Props {
  currentUser: any;
}

export default function YouTubeVideos({ currentUser }: Props) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [editingVideo, setEditingVideo] = useState<YouTubeVideo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [newVideo, setNewVideo] = useState({
    title: '',
    videoId: '',
    description: '',
    category: ''
  });

  const loadVideos = async () => {
    setLoading(true);
    try {
      const data = await db.find<YouTubeVideo>(Collections.YOUTUBE_VIDEOS, {});
      setVideos(data);
    } catch (e) {
      console.error('Error loading videos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  // Seed default video if no videos exist
  useEffect(() => {
    if (videos.length === 0 && !loading && !isAddingVideo) {
      const seedVideo = {
        title: 'Welcome to HCMS',
        videoId: '7HUW_aukApo',
        description: 'Welcome video for Hauna Central Management System',
        category: 'Orientation',
        created_at: new Date().toISOString()
      };
      db.insertOne(Collections.YOUTUBE_VIDEOS, seedVideo).then(() => loadVideos());
    }
  }, [videos, loading, isAddingVideo]);

  const handleSaveVideo = async () => {
    if (!newVideo.title) {
      setError('Title is required');
      return;
    }
    if (!newVideo.videoId) {
      setError('YouTube URL or Video ID is required');
      return;
    }
    const validVideoId = /^[a-zA-Z0-9_-]{11}$/.test(newVideo.videoId);
    if (!validVideoId) {
      setError('Invalid YouTube video ID. Please check the URL.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (editingVideo?.id) {
        await db.updateById(Collections.YOUTUBE_VIDEOS, editingVideo.id, {
          ...newVideo,
          updated_at: new Date().toISOString()
        });
      } else {
        await db.insertOne(Collections.YOUTUBE_VIDEOS, {
          ...newVideo,
          created_at: new Date().toISOString()
        });
      }
      
      setNewVideo({ title: '', videoId: '', description: '', category: '' });
      setIsAddingVideo(false);
      setEditingVideo(null);
      loadVideos();
    } catch (e) {
      setError('Failed to save video');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (video: YouTubeVideo) => {
    if (!video.id) return;
    if (!confirm('Are you sure you want to delete this video?')) return;

    setLoading(true);
    try {
      await db.deleteById(Collections.YOUTUBE_VIDEOS, video.id);
      loadVideos();
    } catch (e) {
      setError('Failed to delete video');
    } finally {
      setLoading(false);
    }
  };

  const getEmbedUrl = (videoId: string) => {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  };

  const getWatchUrl = (videoId: string) => {
    return `https://www.youtube.com/watch?v=${videoId}`;
  };

  const isValidVideoId = (id: string): boolean => /^[a-zA-Z0-9_-]{11}$/.test(id);

  const extractVideoId = (input: string): string => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1];
    }
    return input;
  };

  const handleVideoIdChange = (value: string) => {
    const videoId = extractVideoId(value);
    setNewVideo({ ...newVideo, videoId });
  };

  const categories = [...new Set(videos.map(v => v.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">YouTube Videos</h1>
          <p className="text-gray-500 mt-1">Training videos and educational content</p>
        </div>
        <button
          onClick={() => {
            setIsAddingVideo(true);
            setEditingVideo(null);
            setNewVideo({ title: '', videoId: '', description: '', category: '' });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Plus size={18} />
          Add Video
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {isAddingVideo && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingVideo ? 'Edit Video' : 'Add New Video'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={newVideo.title}
                onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter video title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL or Video ID</label>
              <input
                type="text"
                value={newVideo.videoId}
                onChange={(e) => handleVideoIdChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Paste YouTube URL or enter video ID"
              />
              {isValidVideoId(newVideo.videoId) && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">Preview:</p>
                  <div className="aspect-video rounded-lg overflow-hidden bg-gray-900">
                    <iframe
                      width="100%"
                      height="100%"
                      src={getEmbedUrl(newVideo.videoId)}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Accepts: Full URL (youtube.com/watch?v=xxx) or just the video ID (xxx)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category (optional)</label>
              <input
                type="text"
                value={newVideo.category}
                onChange={(e) => setNewVideo({ ...newVideo, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Training, Orientation, Technical"
                list="categories"
              />
              <datalist id="categories">
                {categories.map((cat, i) => (
                  <option key={i} value={cat} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea
                value={newVideo.description}
                onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder="Enter video description"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveVideo}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Video'}
              </button>
              <button
                onClick={() => {
                  setIsAddingVideo(false);
                  setEditingVideo(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedVideo && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="relative">
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
            >
              <X size={20} />
            </button>
            <iframe
              width="100%"
              height="500"
              src={getEmbedUrl(selectedVideo.videoId)}
              title={selectedVideo.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full"
            />
          </div>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900">{selectedVideo.title}</h2>
            {selectedVideo.category && (
              <span className="inline-block mt-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                {selectedVideo.category}
              </span>
            )}
            {selectedVideo.description && (
              <p className="mt-3 text-gray-600">{selectedVideo.description}</p>
            )}
            <a
              href={getWatchUrl(selectedVideo.videoId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-indigo-600 hover:text-indigo-700"
            >
              <ExternalLink size={16} />
              Open in YouTube
            </a>
          </div>
        </div>
      )}

      {videos.length === 0 && !isAddingVideo && !selectedVideo ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Play size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No videos yet</h3>
          <p className="text-gray-500 mt-2">Add your first YouTube video to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div 
                className="relative aspect-video bg-gray-900 cursor-pointer group"
                onClick={() => setSelectedVideo(video)}
              >
                <img
                  src={`https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
                  }}
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 flex items-center justify-center transition-colors">
                  <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play size={24} className="text-white ml-1" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 line-clamp-2">{video.title}</h3>
                {video.category && (
                  <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                    {video.category}
                  </span>
                )}
                {video.description && (
                  <p className="mt-2 text-sm text-gray-500 line-clamp-2">{video.description}</p>
                )}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setEditingVideo(video);
                      setNewVideo({
                        title: video.title,
                        videoId: video.videoId,
                        description: video.description || '',
                        category: video.category || ''
                      });
                      setIsAddingVideo(true);
                    }}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-indigo-600"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteVideo(video)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}