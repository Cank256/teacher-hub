import React from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const Communities: React.FC = () => {
  const communities = [
    {
      name: 'Mathematics Teachers Uganda',
      members: 1250,
      description: 'Connect with math teachers across Uganda to share resources and teaching strategies.',
      type: 'Subject'
    },
    {
      name: 'Kampala Region Teachers',
      members: 890,
      description: 'Local community for teachers in the Kampala region.',
      type: 'Regional'
    },
    {
      name: 'Primary School Educators',
      members: 2100,
      description: 'Community focused on primary education teaching methods and resources.',
      type: 'Grade Level'
    },
    {
      name: 'Science Teachers Network',
      members: 750,
      description: 'Share experiments, resources, and teaching techniques for science subjects.',
      type: 'Subject'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Communities</h1>
          <p className="mt-1 text-sm text-gray-600">
            Join teacher communities to collaborate and share knowledge
          </p>
        </div>
        <Button className="mt-4 sm:mt-0">Create Community</Button>
      </div>

      {/* Featured Communities */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Featured Communities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {communities.map((community, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{community.name}</CardTitle>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-gray-600">
                        {community.members.toLocaleString()} members
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {community.type}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <p className="text-gray-600 mb-4">{community.description}</p>
              <div className="flex space-x-2">
                <Button size="sm">Join Community</Button>
                <Button variant="outline" size="sm">View Details</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* My Communities */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">My Communities</h2>
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">You haven't joined any communities yet.</p>
            <Button>Browse Communities</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};