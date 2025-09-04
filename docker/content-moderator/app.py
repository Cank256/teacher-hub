#!/usr/bin/env python3
"""
Content Moderation Service
Provides file scanning and content moderation capabilities
"""

import os
import magic
import hashlib
import logging
from datetime import datetime
from flask import Flask, request, jsonify
from PIL import Image
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
ALLOWED_EXTENSIONS = {
    'image': {'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'},
    'video': {'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'},
    'document': {'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'}
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
CLAMAV_HOST = os.getenv('CLAMAV_HOST', 'clamav')
CLAMAV_PORT = int(os.getenv('CLAMAV_PORT', '3310'))

class ContentModerator:
    """Content moderation and security scanning service"""
    
    def __init__(self):
        self.mime = magic.Magic(mime=True)
    
    def validate_file_type(self, file_path):
        """Validate file type based on MIME type and extension"""
        try:
            # Get MIME type
            mime_type = self.mime.from_file(file_path)
            
            # Get file extension
            _, ext = os.path.splitext(file_path)
            ext = ext.lower().lstrip('.')
            
            # Check if file type is allowed
            for category, extensions in ALLOWED_EXTENSIONS.items():
                if ext in extensions:
                    # Verify MIME type matches extension
                    if self._mime_matches_extension(mime_type, category):
                        return True, category, mime_type
            
            return False, None, mime_type
            
        except Exception as e:
            logger.error(f"Error validating file type: {e}")
            return False, None, None
    
    def _mime_matches_extension(self, mime_type, category):
        """Check if MIME type matches the expected category"""
        mime_categories = {
            'image': ['image/'],
            'video': ['video/'],
            'document': ['application/pdf', 'application/msword', 'text/', 'application/vnd.']
        }
        
        for prefix in mime_categories.get(category, []):
            if mime_type.startswith(prefix):
                return True
        return False
    
    def validate_file_size(self, file_path, max_size=MAX_FILE_SIZE):
        """Validate file size"""
        try:
            size = os.path.getsize(file_path)
            return size <= max_size, size
        except Exception as e:
            logger.error(f"Error validating file size: {e}")
            return False, 0
    
    def scan_for_malware(self, file_path):
        """Scan file for malware using ClamAV"""
        try:
            import socket
            
            # Connect to ClamAV daemon
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(30)
            sock.connect((CLAMAV_HOST, CLAMAV_PORT))
            
            # Send scan command
            sock.send(f"SCAN {file_path}\n".encode())
            
            # Receive response
            response = sock.recv(1024).decode().strip()
            sock.close()
            
            # Parse response
            if "OK" in response:
                return True, "Clean"
            elif "FOUND" in response:
                virus_name = response.split(":")[1].strip()
                return False, virus_name
            else:
                return False, "Scan failed"
                
        except Exception as e:
            logger.error(f"Error scanning for malware: {e}")
            return False, f"Scan error: {e}"
    
    def analyze_image_content(self, file_path):
        """Analyze image content for inappropriate material"""
        try:
            # Basic image analysis
            with Image.open(file_path) as img:
                # Check image properties
                width, height = img.size
                
                # Basic checks
                if width < 10 or height < 10:
                    return False, "Image too small"
                
                if width > 10000 or height > 10000:
                    return False, "Image too large"
                
                # Check for transparency (potential for hidden content)
                if img.mode in ('RGBA', 'LA') or 'transparency' in img.info:
                    logger.info("Image contains transparency")
                
                return True, "Image appears safe"
                
        except Exception as e:
            logger.error(f"Error analyzing image content: {e}")
            return False, f"Analysis error: {e}"
    
    def generate_file_hash(self, file_path):
        """Generate SHA-256 hash of file"""
        try:
            hash_sha256 = hashlib.sha256()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            return hash_sha256.hexdigest()
        except Exception as e:
            logger.error(f"Error generating file hash: {e}")
            return None
    
    def comprehensive_scan(self, file_path):
        """Perform comprehensive security and content scan"""
        results = {
            'file_path': file_path,
            'timestamp': datetime.utcnow().isoformat(),
            'file_hash': None,
            'file_size': 0,
            'file_type_valid': False,
            'file_category': None,
            'mime_type': None,
            'size_valid': False,
            'malware_scan': {'clean': False, 'details': 'Not scanned'},
            'content_analysis': {'safe': False, 'details': 'Not analyzed'},
            'overall_safe': False,
            'errors': []
        }
        
        try:
            # Generate file hash
            results['file_hash'] = self.generate_file_hash(file_path)
            
            # Validate file type
            type_valid, category, mime_type = self.validate_file_type(file_path)
            results['file_type_valid'] = type_valid
            results['file_category'] = category
            results['mime_type'] = mime_type
            
            if not type_valid:
                results['errors'].append("Invalid file type")
                return results
            
            # Validate file size
            size_valid, file_size = self.validate_file_size(file_path)
            results['size_valid'] = size_valid
            results['file_size'] = file_size
            
            if not size_valid:
                results['errors'].append("File too large")
                return results
            
            # Malware scan
            malware_clean, malware_details = self.scan_for_malware(file_path)
            results['malware_scan'] = {
                'clean': malware_clean,
                'details': malware_details
            }
            
            if not malware_clean:
                results['errors'].append(f"Malware detected: {malware_details}")
                return results
            
            # Content analysis for images
            if category == 'image':
                content_safe, content_details = self.analyze_image_content(file_path)
                results['content_analysis'] = {
                    'safe': content_safe,
                    'details': content_details
                }
                
                if not content_safe:
                    results['errors'].append(f"Content issue: {content_details}")
                    return results
            else:
                results['content_analysis'] = {
                    'safe': True,
                    'details': 'Content analysis not applicable'
                }
            
            # Overall assessment
            results['overall_safe'] = (
                results['file_type_valid'] and
                results['size_valid'] and
                results['malware_scan']['clean'] and
                results['content_analysis']['safe']
            )
            
        except Exception as e:
            logger.error(f"Error in comprehensive scan: {e}")
            results['errors'].append(f"Scan error: {e}")
        
        return results

# Initialize content moderator
moderator = ContentModerator()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'content-moderator',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/scan', methods=['POST'])
def scan_file():
    """Scan uploaded file for security and content issues"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save file temporarily
        temp_path = f"/tmp/{file.filename}"
        file.save(temp_path)
        
        try:
            # Perform comprehensive scan
            results = moderator.comprehensive_scan(temp_path)
            
            # Clean up temporary file
            os.remove(temp_path)
            
            return jsonify(results)
            
        except Exception as e:
            # Clean up on error
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e
            
    except Exception as e:
        logger.error(f"Error in scan_file: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/scan-path', methods=['POST'])
def scan_file_path():
    """Scan file at specified path"""
    try:
        data = request.get_json()
        if not data or 'file_path' not in data:
            return jsonify({'error': 'No file path provided'}), 400
        
        file_path = data['file_path']
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404
        
        # Perform comprehensive scan
        results = moderator.comprehensive_scan(file_path)
        
        return jsonify(results)
        
    except Exception as e:
        logger.error(f"Error in scan_file_path: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/validate', methods=['POST'])
def validate_file():
    """Quick validation of file type and size"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save file temporarily
        temp_path = f"/tmp/{file.filename}"
        file.save(temp_path)
        
        try:
            # Quick validation
            type_valid, category, mime_type = moderator.validate_file_type(temp_path)
            size_valid, file_size = moderator.validate_file_size(temp_path)
            
            results = {
                'file_type_valid': type_valid,
                'file_category': category,
                'mime_type': mime_type,
                'size_valid': size_valid,
                'file_size': file_size,
                'valid': type_valid and size_valid
            }
            
            # Clean up temporary file
            os.remove(temp_path)
            
            return jsonify(results)
            
        except Exception as e:
            # Clean up on error
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e
            
    except Exception as e:
        logger.error(f"Error in validate_file: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)