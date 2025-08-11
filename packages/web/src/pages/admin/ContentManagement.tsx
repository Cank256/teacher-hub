import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminService, Content } from '../../services/adminService';



interface ContentFormData {
  title: string;
  type: 'article' | 'video' | 'document' | 'quiz' | 'course';
  author: string;
  status: 'published' | 'draft' | 'pending';
  category: string;
}

export const ContentManagement: React.FC = () => {
  const { t } = useTranslation();
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalContent, setTotalContent] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    fetchContent();
  }, [currentPage, searchTerm, filterType, filterStatus, filterCategory]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getContent({
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
        type: filterType !== 'all' ? filterType : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        category: filterCategory !== 'all' ? filterCategory : undefined,
      });
      
      setContent(response.content);
      setTotalContent(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch content');
      console.error('Failed to fetch content:', err);
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState<ContentFormData>({
    title: '',
    type: 'article',
    author: '',
    status: 'draft',
    category: ''
  });

  const categories = ['Programming', 'Web Design', 'Database', 'Mobile Development', 'Data Science'];

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    
    return matchesSearch && matchesType && matchesStatus && matchesCategory;
  });

  const handleAddContent = async () => {
    try {
      setError(null);
      await adminService.createContent({
        title: formData.title,
        type: formData.type,
        author: formData.author,
        status: formData.status,
        category: formData.category,
        subjects: [],
        gradeLevels: [],
      });
      
      setShowAddModal(false);
      setFormData({ title: '', type: 'article', author: '', status: 'draft', category: '' });
      await fetchContent(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create content');
    }
  };

  const handleEditContent = async () => {
    if (!selectedContent) return;
    
    try {
      setError(null);
      await adminService.updateContent(selectedContent.id, {
        title: formData.title,
        type: formData.type,
        author: formData.author,
        status: formData.status,
        category: formData.category,
      });
      
      setShowEditModal(false);
      setSelectedContent(null);
      setFormData({ title: '', type: 'article', author: '', status: 'draft', category: '' });
      await fetchContent(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update content');
    }
  };

  const handleArchiveContent = async (contentId: string) => {
    try {
      setError(null);
      await adminService.archiveContent(contentId);
      await fetchContent(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive content');
    }
  };

  const handlePublishContent = async (contentId: string) => {
    try {
      setError(null);
      await adminService.publishContent(contentId);
      await fetchContent(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish content');
    }
  };

  const openEditModal = (item: Content) => {
    setSelectedContent(item);
    setFormData({
      title: item.title,
      type: item.type,
      author: item.author,
      status: item.status === 'archived' ? 'draft' : item.status,
      category: item.category
    });
    setShowEditModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'article':
        return 'bg-blue-100 text-blue-800';
      case 'video':
        return 'bg-purple-100 text-purple-800';
      case 'document':
        return 'bg-green-100 text-green-800';
      case 'quiz':
        return 'bg-yellow-100 text-yellow-800';
      case 'course':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'article':
        return '📄';
      case 'video':
        return '🎥';
      case 'document':
        return '📋';
      case 'quiz':
        return '❓';
      case 'course':
        return '📚';
      default:
        return '📄';
    }
  };

  const publishedContent = content.filter(c => c.status === 'published').length;
  const pendingContent = content.filter(c => c.status === 'pending').length;
  const draftContent = content.filter(c => c.status === 'draft').length;
  const archivedContent = content.filter(c => c.status === 'archived').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.content.title', 'Content Management')}</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Content
        </button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Total Content</h3>
              <p className="text-2xl font-bold text-purple-600">{totalContent}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <span className="text-2xl">📚</span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Published</h3>
              <p className="text-2xl font-bold text-green-600">{publishedContent}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Pending Review</h3>
              <p className="text-2xl font-bold text-yellow-600">{pendingContent}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Drafts</h3>
              <p className="text-2xl font-bold text-gray-600">{draftContent}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <span className="text-2xl">📝</span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Archived</h3>
              <p className="text-2xl font-bold text-red-600">{archivedContent}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <span className="text-2xl">🗄️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="article">Article</option>
            <option value="video">Video</option>
            <option value="document">Document</option>
            <option value="quiz">Quiz</option>
            <option value="course">Course</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Content Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Engagement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Modified
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContent.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <span className="text-lg">{getTypeIcon(item.type)}</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{item.title}</div>
                        <div className="text-sm text-gray-500">Created: {new Date(item.createdDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(item.type)}`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.author}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        👁️ {item.views}
                      </span>
                      <span className="flex items-center">
                        ❤️ {item.likes}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(item.lastModified).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => openEditModal(item)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    {item.status === 'pending' && (
                      <button
                        onClick={() => handlePublishContent(item.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Publish
                      </button>
                    )}
                    {item.status !== 'archived' && (
                      <button
                        onClick={() => handleArchiveContent(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Archive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredContent.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No content found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Add Content Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Content</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="article">Article</option>
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                  <option value="quiz">Quiz</option>
                  <option value="course">Course</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Author</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending Review</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAddContent}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Content
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Content Modal */}
      {showEditModal && selectedContent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Content</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="article">Article</option>
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                  <option value="quiz">Quiz</option>
                  <option value="course">Course</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Author</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending Review</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleEditContent}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};