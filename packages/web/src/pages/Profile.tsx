import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const Profile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    fullName: 'Jane Nakamya',
    email: 'jane.nakamya@example.com',
    school: 'Kampala Primary School',
    subjects: ['Mathematics', 'Science'],
    gradeLevels: ['Primary 4-7'],
    yearsExperience: 8,
    location: 'Kampala, Uganda'
  });

  const handleSave = () => {
    setIsEditing(false);
    // Save profile logic would go here
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your teacher profile and credentials
          </p>
        </div>
        <Button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className="mt-4 sm:mt-0"
        >
          {isEditing ? 'Save Changes' : 'Edit Profile'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture and Basic Info */}
        <Card>
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900">{profile.fullName}</h3>
            <p className="text-sm text-gray-600">{profile.school}</p>
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Verified Teacher
              </span>
            </div>
            {isEditing && (
              <Button variant="outline" size="sm" className="mt-4">
                Change Photo
              </Button>
            )}
          </div>
        </Card>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={profile.fullName}
                onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                disabled={!isEditing}
              />
              <Input
                label="Email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({...profile, email: e.target.value})}
                disabled={!isEditing}
              />
              <Input
                label="School"
                value={profile.school}
                onChange={(e) => setProfile({...profile, school: e.target.value})}
                disabled={!isEditing}
              />
              <Input
                label="Location"
                value={profile.location}
                onChange={(e) => setProfile({...profile, location: e.target.value})}
                disabled={!isEditing}
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Teaching Information</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subjects Taught
                </label>
                <div className="flex flex-wrap gap-2">
                  {profile.subjects.map((subject, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {subject}
                      {isEditing && (
                        <button className="ml-2 text-blue-600 hover:text-blue-800">×</button>
                      )}
                    </span>
                  ))}
                  {isEditing && (
                    <button className="px-3 py-1 border border-dashed border-gray-300 text-gray-600 text-sm rounded-full hover:border-gray-400">
                      + Add Subject
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade Levels
                </label>
                <div className="flex flex-wrap gap-2">
                  {profile.gradeLevels.map((level, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                    >
                      {level}
                      {isEditing && (
                        <button className="ml-2 text-green-600 hover:text-green-800">×</button>
                      )}
                    </span>
                  ))}
                  {isEditing && (
                    <button className="px-3 py-1 border border-dashed border-gray-300 text-gray-600 text-sm rounded-full hover:border-gray-400">
                      + Add Grade Level
                    </button>
                  )}
                </div>
              </div>

              <Input
                label="Years of Experience"
                type="number"
                value={profile.yearsExperience}
                onChange={(e) => setProfile({...profile, yearsExperience: parseInt(e.target.value)})}
                disabled={!isEditing}
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Summary</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">24</p>
                <p className="text-sm text-gray-600">Resources Shared</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">156</p>
                <p className="text-sm text-gray-600">Downloads</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">3</p>
                <p className="text-sm text-gray-600">Communities</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">4.8</p>
                <p className="text-sm text-gray-600">Rating</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};