import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  publishedAt: Date;
  category: string;
  readTime: number;
  featured: boolean;
}

export const BlogPage: React.FC = () => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Mock blog posts data
  const blogPosts: BlogPost[] = [
    {
      id: '1',
      title: t('blog.posts.digitalLiteracy.title'),
      excerpt: t('blog.posts.digitalLiteracy.excerpt'),
      content: t('blog.posts.digitalLiteracy.content'),
      author: 'Sarah Nakamya',
      publishedAt: new Date('2024-01-15'),
      category: 'education',
      readTime: 5,
      featured: true
    },
    {
      id: '2',
      title: t('blog.posts.communityBuilding.title'),
      excerpt: t('blog.posts.communityBuilding.excerpt'),
      content: t('blog.posts.communityBuilding.content'),
      author: 'James Okello',
      publishedAt: new Date('2024-01-10'),
      category: 'community',
      readTime: 7,
      featured: true
    },
    {
      id: '3',
      title: t('blog.posts.resourceSharing.title'),
      excerpt: t('blog.posts.resourceSharing.excerpt'),
      content: t('blog.posts.resourceSharing.content'),
      author: 'Mary Achieng',
      publishedAt: new Date('2024-01-05'),
      category: 'resources',
      readTime: 4,
      featured: false
    },
    {
      id: '4',
      title: t('blog.posts.offlineTeaching.title'),
      excerpt: t('blog.posts.offlineTeaching.excerpt'),
      content: t('blog.posts.offlineTeaching.content'),
      author: 'David Musoke',
      publishedAt: new Date('2023-12-28'),
      category: 'technology',
      readTime: 6,
      featured: false
    }
  ];

  const categories = [
    { id: 'all', name: t('blog.categories.all') },
    { id: 'education', name: t('blog.categories.education') },
    { id: 'community', name: t('blog.categories.community') },
    { id: 'resources', name: t('blog.categories.resources') },
    { id: 'technology', name: t('blog.categories.technology') }
  ];

  const filteredPosts = selectedCategory === 'all' 
    ? blogPosts 
    : blogPosts.filter(post => post.category === selectedCategory);

  const featuredPosts = blogPosts.filter(post => post.featured);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('blog.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('blog.subtitle')}
          </p>
        </div>

        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {t('blog.featured.title')}
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {featuredPosts.map((post) => (
                <article key={post.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-primary-100 text-primary-800">
                        {categories.find(cat => cat.id === post.category)?.name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {post.readTime} {t('blog.readTime')}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-primary-600 font-semibold text-sm">
                            {post.author.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{post.author}</p>
                          <p className="text-sm text-gray-500">
                            {post.publishedAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button className="text-primary-600 hover:text-primary-700 font-medium">
                        {t('blog.readMore')}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  selectedCategory === category.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* All Posts */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <article key={post.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    {categories.find(cat => cat.id === post.category)?.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {post.readTime} {t('blog.readTime')}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {post.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mr-2">
                      <span className="text-primary-600 font-semibold text-xs">
                        {post.author.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{post.author}</p>
                      <p className="text-xs text-gray-500">
                        {post.publishedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                    {t('blog.readMore')}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Newsletter Signup */}
        <div className="mt-16 bg-primary-600 rounded-lg p-8 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {t('blog.newsletter.title')}
          </h2>
          <p className="text-xl mb-6 text-primary-100">
            {t('blog.newsletter.subtitle')}
          </p>
          <div className="max-w-md mx-auto flex gap-4">
            <input
              type="email"
              placeholder={t('blog.newsletter.emailPlaceholder')}
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600"
            />
            <button className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600">
              {t('blog.newsletter.subscribe')}
            </button>
          </div>
          <p className="text-sm text-primary-200 mt-4">
            {t('blog.newsletter.privacy')}
          </p>
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            {t('blog.comingSoon.title')}
          </h3>
          <p className="text-yellow-700">
            {t('blog.comingSoon.description')}
          </p>
        </div>
      </div>
    </div>
  );
};