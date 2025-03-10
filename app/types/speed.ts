export interface SpeedTestResult {
    downloadSpeed: number | null;
    uploadSpeed: null | number;
    ping: null | number;
    timestamp?: Date;
}

// For API responses
export interface AverageSpeedData {
    provider: string;
    averageDownload: number;
    averageUpload: number;
    averagePing: number;
    samples: number;
    lastUpdated?: Date;
}

// Network location type
export interface NetworkLocation {
    city: string | null;
    region: string | null;
    country: string | null;
    loc?: string;
}

// Network information interface
export interface NetworkInfo {
    ip: string;
    provider: string;
    location: NetworkLocation;
} 