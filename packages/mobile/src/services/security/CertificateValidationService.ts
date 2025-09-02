import { Platform } from 'react-native';
import { CertificateInfo, SecurityIncident, SecurityIncidentType, SecuritySeverity } from './types';
import { SecurityIncidentService } from './SecurityIncidentService';

// Note: This is a simplified implementation. In production, you would use
// react-native-ssl-pinning or similar libraries for proper SSL pinning

export class CertificateValidationService {
  private static instance: CertificateValidationService;
  private pinnedCertificates: Map<string, string[]> = new Map();
  private trustedCAs: string[] = [];

  public static getInstance(): CertificateValidationService {
    if (!CertificateValidationService.instance) {
      CertificateValidationService.instance = new CertificateValidationService();
    }
    return CertificateValidationService.instance;
  }

  /**
   * Initializes certificate validation with pinned certificates
   */
  public async initialize(): Promise<void> {
    try {
      await this.loadPinnedCertificates();
      await this.loadTrustedCAs();
    } catch (error) {
      console.error('Failed to initialize certificate validation:', error);
      throw error;
    }
  }

  /**
   * Validates SSL certificate for a given hostname
   */
  public async validateCertificate(
    hostname: string,
    certificate: CertificateInfo
  ): Promise<boolean> {
    try {
      // Check if certificate is pinned for this hostname
      const pinnedFingerprints = this.pinnedCertificates.get(hostname);
      if (pinnedFingerprints && pinnedFingerprints.length > 0) {
        const isValidPinned = pinnedFingerprints.includes(certificate.fingerprint);
        if (!isValidPinned) {
          await this.logCertificatePinningFailure(hostname, certificate);
          return false;
        }
      }

      // Validate certificate chain
      const isValidChain = await this.validateCertificateChain(certificate);
      if (!isValidChain) {
        await this.logCertificateValidationFailure(hostname, certificate, 'Invalid certificate chain');
        return false;
      }

      // Check certificate expiration
      const isNotExpired = this.checkCertificateExpiration(certificate);
      if (!isNotExpired) {
        await this.logCertificateValidationFailure(hostname, certificate, 'Certificate expired');
        return false;
      }

      // Validate hostname
      const isValidHostname = this.validateHostname(hostname, certificate);
      if (!isValidHostname) {
        await this.logCertificateValidationFailure(hostname, certificate, 'Hostname mismatch');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Certificate validation failed:', error);
      await this.logCertificateValidationFailure(hostname, certificate, error.message);
      return false;
    }
  }

  /**
   * Adds certificate pinning for a hostname
   */
  public addCertificatePin(hostname: string, fingerprints: string[]): void {
    this.pinnedCertificates.set(hostname, fingerprints);
  }

  /**
   * Removes certificate pinning for a hostname
   */
  public removeCertificatePin(hostname: string): void {
    this.pinnedCertificates.delete(hostname);
  }

  /**
   * Gets pinned certificates for a hostname
   */
  public getPinnedCertificates(hostname: string): string[] {
    return this.pinnedCertificates.get(hostname) || [];
  }

  /**
   * Validates certificate chain
   */
  private async validateCertificateChain(certificate: CertificateInfo): Promise<boolean> {
    try {
      // In a real implementation, you would validate the entire certificate chain
      // This is a simplified check
      
      // Check if issuer is in trusted CAs
      const isTrustedIssuer = this.trustedCAs.some(ca => 
        certificate.issuer.includes(ca)
      );

      // Check certificate format and basic validity
      const hasValidFormat = this.validateCertificateFormat(certificate);

      return isTrustedIssuer && hasValidFormat;
    } catch (error) {
      console.error('Certificate chain validation failed:', error);
      return false;
    }
  }

  /**
   * Checks if certificate is not expired
   */
  private checkCertificateExpiration(certificate: CertificateInfo): boolean {
    const now = new Date();
    return now >= certificate.validFrom && now <= certificate.validTo;
  }

  /**
   * Validates hostname against certificate
   */
  private validateHostname(hostname: string, certificate: CertificateInfo): boolean {
    try {
      // Extract Common Name (CN) from subject
      const cnMatch = certificate.subject.match(/CN=([^,]+)/);
      if (!cnMatch) {
        return false;
      }

      const certificateHostname = cnMatch[1].trim();

      // Exact match
      if (certificateHostname === hostname) {
        return true;
      }

      // Wildcard match
      if (certificateHostname.startsWith('*.')) {
        const wildcardDomain = certificateHostname.substring(2);
        const hostnameParts = hostname.split('.');
        const wildcardParts = wildcardDomain.split('.');

        if (hostnameParts.length === wildcardParts.length + 1) {
          const hostnameDomain = hostnameParts.slice(1).join('.');
          return hostnameDomain === wildcardDomain;
        }
      }

      return false;
    } catch (error) {
      console.error('Hostname validation failed:', error);
      return false;
    }
  }

  /**
   * Validates certificate format
   */
  private validateCertificateFormat(certificate: CertificateInfo): boolean {
    try {
      // Basic format validation
      return !!(
        certificate.subject &&
        certificate.issuer &&
        certificate.serialNumber &&
        certificate.fingerprint &&
        certificate.validFrom &&
        certificate.validTo
      );
    } catch (error) {
      console.error('Certificate format validation failed:', error);
      return false;
    }
  }

  /**
   * Loads pinned certificates from configuration
   */
  private async loadPinnedCertificates(): Promise<void> {
    try {
      // In a real app, these would be loaded from a secure configuration
      const pinnedCerts = {
        'api.teacherhub.ug': [
          // SHA-256 fingerprints of pinned certificates
          'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
          'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='
        ],
        'auth.teacherhub.ug': [
          'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=',
          'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD='
        ]
      };

      for (const [hostname, fingerprints] of Object.entries(pinnedCerts)) {
        this.pinnedCertificates.set(hostname, fingerprints);
      }
    } catch (error) {
      console.error('Failed to load pinned certificates:', error);
      throw error;
    }
  }

  /**
   * Loads trusted Certificate Authorities
   */
  private async loadTrustedCAs(): Promise<void> {
    try {
      // Common trusted CAs
      this.trustedCAs = [
        'DigiCert',
        'Let\'s Encrypt',
        'GlobalSign',
        'Comodo',
        'GeoTrust',
        'Thawte',
        'VeriSign',
        'Entrust',
        'Symantec'
      ];
    } catch (error) {
      console.error('Failed to load trusted CAs:', error);
      throw error;
    }
  }

  /**
   * Logs certificate pinning failure
   */
  private async logCertificatePinningFailure(
    hostname: string,
    certificate: CertificateInfo
  ): Promise<void> {
    try {
      const incidentService = SecurityIncidentService.getInstance();
      await incidentService.logIncident({
        type: SecurityIncidentType.CERTIFICATE_PINNING_FAILED,
        severity: SecuritySeverity.HIGH,
        description: `Certificate pinning failed for ${hostname}`,
        metadata: {
          hostname,
          certificateFingerprint: certificate.fingerprint,
          certificateSubject: certificate.subject,
          certificateIssuer: certificate.issuer
        }
      });
    } catch (error) {
      console.error('Failed to log certificate pinning failure:', error);
    }
  }

  /**
   * Logs certificate validation failure
   */
  private async logCertificateValidationFailure(
    hostname: string,
    certificate: CertificateInfo,
    reason: string
  ): Promise<void> {
    try {
      const incidentService = SecurityIncidentService.getInstance();
      await incidentService.logIncident({
        type: SecurityIncidentType.CERTIFICATE_PINNING_FAILED,
        severity: SecuritySeverity.MEDIUM,
        description: `Certificate validation failed for ${hostname}: ${reason}`,
        metadata: {
          hostname,
          reason,
          certificateFingerprint: certificate.fingerprint,
          certificateSubject: certificate.subject,
          certificateIssuer: certificate.issuer,
          validFrom: certificate.validFrom,
          validTo: certificate.validTo
        }
      });
    } catch (error) {
      console.error('Failed to log certificate validation failure:', error);
    }
  }

  /**
   * Gets certificate information from a certificate string
   */
  public parseCertificate(certificateString: string): CertificateInfo | null {
    try {
      // This is a simplified parser. In production, you would use a proper
      // certificate parsing library
      
      // Extract basic information using regex patterns
      const subjectMatch = certificateString.match(/Subject: (.+)/);
      const issuerMatch = certificateString.match(/Issuer: (.+)/);
      const serialMatch = certificateString.match(/Serial Number: (.+)/);
      const validFromMatch = certificateString.match(/Not Before: (.+)/);
      const validToMatch = certificateString.match(/Not After: (.+)/);

      if (!subjectMatch || !issuerMatch) {
        return null;
      }

      // Generate fingerprint (simplified)
      const fingerprint = this.generateFingerprint(certificateString);

      return {
        subject: subjectMatch[1].trim(),
        issuer: issuerMatch[1].trim(),
        serialNumber: serialMatch ? serialMatch[1].trim() : '',
        fingerprint,
        validFrom: validFromMatch ? new Date(validFromMatch[1].trim()) : new Date(),
        validTo: validToMatch ? new Date(validToMatch[1].trim()) : new Date()
      };
    } catch (error) {
      console.error('Certificate parsing failed:', error);
      return null;
    }
  }

  /**
   * Generates certificate fingerprint
   */
  private generateFingerprint(certificateString: string): string {
    // This is a simplified fingerprint generation
    // In production, you would use proper SHA-256 hashing of the certificate
    let hash = 0;
    for (let i = 0; i < certificateString.length; i++) {
      const char = certificateString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).toUpperCase();
  }

  /**
   * Validates SSL configuration for network requests
   */
  public getSSLConfig(hostname: string): any {
    const pinnedCerts = this.getPinnedCertificates(hostname);
    
    if (pinnedCerts.length === 0) {
      return null;
    }

    // Configuration for react-native-ssl-pinning or similar library
    return {
      hostname,
      certificateFilename: `${hostname}.cer`,
      includeSubdomains: true,
      pinnedCertificates: pinnedCerts
    };
  }

  /**
   * Clears all certificate pins (for testing or emergency)
   */
  public clearAllPins(): void {
    this.pinnedCertificates.clear();
  }

  /**
   * Gets all pinned hostnames
   */
  public getPinnedHostnames(): string[] {
    return Array.from(this.pinnedCertificates.keys());
  }
}