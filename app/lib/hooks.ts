import { useState, useEffect, useCallback, useRef } from "react";
import { SpeedTestResult, NetworkInfo as NetworkInfoType } from "../types/speed";

// Configuration constants
const TEST_FILE_SIZES = {
    tiny: 100 * 1024, // 100KB
    small: 1 * 1024 * 1024, // 1MB
    medium: 10 * 1024 * 1024, // 10MB
    large: 25 * 1024 * 1024, // 25MB
};

const TEST_ENDPOINTS = {
    ping: "/api/ping",
    download: [
        "/api/speedtest/download?size=small",
        "/api/speedtest/download?size=medium",
        "/api/speedtest/download?size=large",
    ],
    upload: [
        "/api/speedtest/upload",
    ]
};

const PING_SAMPLES = 10;
const DOWNLOAD_SAMPLES = 3;
const UPLOAD_SAMPLES = 3;
const DISCARD_HIGHEST_LOWEST = true; // Whether to discard the highest and lowest readings

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks for streaming
const MIN_TEST_DURATION = 5000; // Minimum 5 seconds per test
const MAX_TEST_DURATION = 30000; // Maximum 30 seconds per test

export function useSpeedTest() {
    const [testing, setTesting] = useState(false);
    const [testProgress, setTestProgress] = useState(0);
    const [testPhase, setTestPhase] = useState<'idle' | 'ping' | 'download' | 'upload'>('idle');
    const [result, setResult] = useState<SpeedTestResult>({
        downloadSpeed: null,
        uploadSpeed: null,
        ping: null,
    });

    // Use refs for tracking test progress to avoid state updates during render
    const progressRef = useRef(0);
    const isTestingRef = useRef(false);

    // Function to safely update progress state
    const updateProgress = useCallback((newProgress: number) => {
        progressRef.current = newProgress;
        // Use setTimeout to ensure state updates happen outside of render phase
        setTimeout(() => {
            setTestProgress(newProgress);
        }, 0);
    }, []);

    // Function to calculate average from an array, optionally discarding highest and lowest values
    const calculateAverage = (values: number[]) => {
        if (values.length === 0) return 0;
        if (values.length === 1) return values[0];

        let valuesToAverage = [...values];

        // Optionally discard highest and lowest values
        if (DISCARD_HIGHEST_LOWEST && values.length > 2) {
            valuesToAverage.sort((a, b) => a - b);
            valuesToAverage = valuesToAverage.slice(1, valuesToAverage.length - 1);
        }

        const sum = valuesToAverage.reduce((acc, val) => acc + val, 0);
        return sum / valuesToAverage.length;
    };

    // Helper to round speeds to whole numbers or at most 1 decimal place
    const formatSpeed = (speed: number): number => {
        if (speed >= 100) {
            return Math.round(speed);
        }
        return Math.round(speed * 10) / 10;
    };

    // Function to measure download speed
    const measureDownloadSpeed = async (): Promise<number> => {
        const downloadSpeeds: number[] = [];
        const startTime = performance.now();
        let totalBytes = 0;

        for (let i = 0; i < DOWNLOAD_SAMPLES; i++) {
            try {
                const endpoint = TEST_ENDPOINTS.download[i % TEST_ENDPOINTS.download.length];
                const response = await fetch(endpoint, { cache: 'no-store' });
                const reader = response.body?.getReader();

                if (!reader) continue;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    if (value) {
                        totalBytes += value.length;
                        const currentTime = performance.now();
                        const duration = (currentTime - startTime) / 1000; // seconds

                        // Calculate current speed
                        const currentSpeed = (totalBytes * 8) / (duration * 1_000_000); // Mbps
                        downloadSpeeds.push(currentSpeed);

                        // Update progress
                        const baseProgress = 20; // After ping
                        const progress = Math.min(baseProgress + (i + 1) / DOWNLOAD_SAMPLES * 40, 60);
                        updateProgress(progress);
                    }

                    // Check if we've tested long enough
                    if (performance.now() - startTime > MAX_TEST_DURATION) break;
                }

                // Small delay between tests
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.error("Download test failed:", error);
            }
        }

        // Take the median of the last few measurements for stability
        const recentSpeeds = downloadSpeeds.slice(-5);
        recentSpeeds.sort((a, b) => a - b);
        const medianSpeed = recentSpeeds[Math.floor(recentSpeeds.length / 2)];

        return formatSpeed(medianSpeed);
    };

    // Function to measure upload speed
    const measureUploadSpeed = async (): Promise<number> => {
        const uploadSpeeds: number[] = [];
        const startTime = performance.now();
        let totalBytes = 0;

        for (let i = 0; i < UPLOAD_SAMPLES; i++) {
            try {
                const chunkSize = TEST_FILE_SIZES.medium;
                const chunk = new Uint8Array(chunkSize);
                const blob = new Blob([chunk]);

                const uploadStart = performance.now();
                const response = await fetch(TEST_ENDPOINTS.upload[0], {
                    method: 'POST',
                    body: blob,
                    headers: {
                        'Content-Type': 'application/octet-stream'
                    },
                    cache: 'no-store'
                });

                if (response.ok) {
                    totalBytes += chunkSize;
                    const duration = (performance.now() - uploadStart) / 1000;
                    const speed = (chunkSize * 8) / (duration * 1_000_000); // Mbps
                    uploadSpeeds.push(speed);
                }

                // Update progress
                const baseProgress = 60;
                const progress = Math.min(baseProgress + (i + 1) / UPLOAD_SAMPLES * 40, 100);
                updateProgress(progress);

                // Check if we've tested long enough
                if (performance.now() - startTime > MAX_TEST_DURATION) break;

                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.error("Upload test failed:", error);
            }
        }

        // Take the median of the last few measurements
        const recentSpeeds = uploadSpeeds.slice(-5);
        recentSpeeds.sort((a, b) => a - b);
        const medianSpeed = recentSpeeds[Math.floor(recentSpeeds.length / 2)];

        return formatSpeed(medianSpeed);
    };

    // Function to measure ping
    const measurePing = async (): Promise<number> => {
        const pingTimes: number[] = [];

        for (let i = 0; i < PING_SAMPLES; i++) {
            try {
                const startTime = performance.now();
                await fetch(TEST_ENDPOINTS.ping, { cache: 'no-store' });
                const endTime = performance.now();
                pingTimes.push(endTime - startTime);

                updateProgress(Math.min(20, ((i + 1) / PING_SAMPLES) * 20));
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error("Ping test failed:", error);
            }
        }

        // Remove outliers and take the median
        const sortedPings = [...pingTimes].sort((a, b) => a - b);
        const medianPing = sortedPings[Math.floor(sortedPings.length / 2)];

        return Math.round(medianPing); // Round ping to whole number
    };

    // Main function to run the complete speed test
    const startTest = useCallback(async (): Promise<SpeedTestResult> => {
        if (isTestingRef.current) return result; // Prevent multiple simultaneous tests

        isTestingRef.current = true;
        setTesting(true);
        updateProgress(0);

        // Update phase in next tick to avoid render-phase state updates
        setTimeout(() => {
            setTestPhase('idle');
        }, 0);

        setResult({
            downloadSpeed: null,
            uploadSpeed: null,
            ping: null,
        });

        try {
            // Step 1: Measure ping
            setTimeout(() => {
                setTestPhase('ping');
            }, 0);

            const pingResult = await measurePing();

            // Step 2: Measure download speed
            setTimeout(() => {
                setTestPhase('download');
            }, 0);

            const downloadResult = await measureDownloadSpeed();

            // Step 3: Measure upload speed
            setTimeout(() => {
                setTestPhase('upload');
            }, 0);

            const uploadResult = await measureUploadSpeed();

            // Set final result
            const finalResult = {
                downloadSpeed: downloadResult,
                uploadSpeed: uploadResult,
                ping: pingResult,
            };

            setResult(finalResult);
            return finalResult;
        } catch (error) {
            console.error("Speed test failed:", error);
            return {
                downloadSpeed: null,
                uploadSpeed: null,
                ping: null,
            };
        } finally {
            isTestingRef.current = false;
            setTesting(false);

            // Update phase in next tick to avoid render-phase state updates
            setTimeout(() => {
                setTestPhase('idle');
            }, 0);

            updateProgress(100);
        }
    }, [result, updateProgress]);

    // Function to update average speed data
    const updateAverageSpeedData = async (
        locationKey: string,
        provider: string,
        result: SpeedTestResult
    ) => {
        try {
            if (!result.downloadSpeed || !result.uploadSpeed || !result.ping) {
                console.error("Invalid test result for updating average speeds");
                return;
            }

            await fetch('/api/average-speeds', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    locationKey,
                    provider,
                    downloadSpeed: result.downloadSpeed,
                    uploadSpeed: result.uploadSpeed,
                    pingTime: result.ping
                }),
            });
        } catch (error) {
            console.error('Error updating average speed data:', error);
        }
    };

    return {
        testing,
        testProgress,
        testPhase,
        result,
        startTest,
        updateAverageSpeedData,
    };
}

export function useNetworkInfo() {
    const [networkInfo, setNetworkInfo] = useState<NetworkInfoType | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const mounted = useRef(false);

    const fetchNetworkInfo = async () => {
        if (!mounted.current) return;

        try {
            const response = await fetch('/api/network-info');
            if (response.ok && mounted.current) {
                const data = await response.json() as NetworkInfoType;
                // Use setTimeout to avoid setState during render
                setTimeout(() => {
                    if (mounted.current) {
                        setNetworkInfo(data);
                        setLoading(false);
                        setRefreshing(false);
                    }
                }, 0);
            }
        } catch (error) {
            console.error('Error fetching network info:', error);
            if (mounted.current) {
                setTimeout(() => {
                    if (mounted.current) {
                        setLoading(false);
                        setRefreshing(false);
                    }
                }, 0);
            }
        }
    };

    // Function to refresh network info
    const refreshNetworkInfo = useCallback(() => {
        setRefreshing(true);
        fetchNetworkInfo();
    }, []);

    useEffect(() => {
        mounted.current = true;
        fetchNetworkInfo();

        return () => {
            mounted.current = false;
        };
    }, []);

    return { networkInfo, loading, refreshing, refreshNetworkInfo };
}

// ... any other hooks ... 