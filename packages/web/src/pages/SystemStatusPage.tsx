import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  lastChecked: Date;
  uptime: number;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
}

export const SystemStatusPage: React.FC = () => {
  const { t } = useTranslation();
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [overallStatus, setOverallStatus] = useState<'operational' | 'degraded' | 'outage'>('operational');

  useEffect(() => {
    // Simulate fetching service status
    const mockServices: ServiceStatus[] = [
      {
        name: 'Web Application',
        status: 'operational',
        lastChecked: new Date(),
        uptime: 99.9
      },
      {
        name: 'API Services',
        status: 'operational',
        lastChecked: new Date(),
        uptime: 99.8
      },
      {
        name: 'File Storage',
        status: 'operational',
        lastChecked: new Date(),
        uptime: 99.7
      },
      {
        name: 'Database',
        status: 'operational',
        lastChecked: new Date(),
        uptime: 99.9
      },
      {
        name: 'Search Engine',
        status: 'operational',
        lastChecked: new Date(),
        uptime: 99.6
      },
      {
        name: 'Notification Service',
        status: 'operational',
        lastChecked: new Date(),
        uptime: 99.5
      }
    ];

    const mockIncidents: Incident[] = [
      {
        id: '1',
        title: 'Scheduled Maintenance - Database Optimization',
        description: 'We will be performing scheduled maintenance on our database servers to improve performance.',
        status: 'resolved',
        severity: 'low',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        updatedAt: new Date(Date.now() - 22 * 60 * 60 * 1000)  // 22 hours ago
      }
    ];

    setServices(mockServices);
    setIncidents(mockIncidents);
    
    // Determine overall status
    const hasOutage = mockServices.some(s => s.status === 'outage');
    const hasDegraded = mockServices.some(s => s.status === 'degraded');
    
    if (hasOutage) {
      setOverallStatus('outage');
    } else if (hasDegraded) {
      setOverallStatus('degraded');
    } else {
      setOverallStatus('operational');
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'outage':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'degraded':
        return (
          <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'outage':
        return (
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'text-blue-600 bg-blue-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('status.title')}
          </h1>
          <p className="text-xl text-gray-600">
            {t('status.subtitle')}
          </p>
        </div>

        {/* Overall Status */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-center">
            <div className={`flex items-center px-4 py-2 rounded-full ${getStatusColor(overallStatus)}`}>
              {getStatusIcon(overallStatus)}
              <span className="ml-2 font-semibold">
                {overallStatus === 'operational' && t('status.overall.operational')}
                {overallStatus === 'degraded' && t('status.overall.degraded')}
                {overallStatus === 'outage' && t('status.overall.outage')}
              </span>
            </div>
          </div>
          <p className="text-center text-gray-600 mt-4">
            {t('status.lastUpdated')}: {new Date().toLocaleString()}
          </p>
        </div>

        {/* Services Status */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {t('status.services.title')}
          </h2>
          <div className="space-y-4">
            {services.map((service, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  {getStatusIcon(service.status)}
                  <div className="ml-3">
                    <h3 className="font-medium text-gray-900">{service.name}</h3>
                    <p className="text-sm text-gray-500">
                      {t('status.services.uptime')}: {service.uptime}%
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(service.status)}`}>
                    {service.status === 'operational' && t('status.services.operational')}
                    {service.status === 'degraded' && t('status.services.degraded')}
                    {service.status === 'outage' && t('status.services.outage')}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('status.services.lastChecked')}: {service.lastChecked.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {t('status.incidents.title')}
          </h2>
          {incidents.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-600">{t('status.incidents.noIncidents')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div key={incident.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{incident.title}</h3>
                    <div className="flex space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(incident.severity)}`}>
                        {incident.severity.toUpperCase()}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        incident.status === 'resolved' ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100'
                      }`}>
                        {incident.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-2">{incident.description}</p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{t('status.incidents.created')}: {incident.createdAt.toLocaleString()}</span>
                    <span>{t('status.incidents.updated')}: {incident.updatedAt.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subscribe to Updates */}
        <div className="bg-primary-50 rounded-lg p-6 mt-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('status.subscribe.title')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t('status.subscribe.description')}
          </p>
          <a
            href="/contact"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {t('status.subscribe.button')}
          </a>
        </div>
      </div>
    </div>
  );
};