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

    // Function to measure ping
    const measurePing = async (): Promise<number> => {
        const pingTimes: number[] = [];

        for (let i = 0; i < PING_SAMPLES; i++) {
            try {
                const startTime = performance.now();
                await fetch(TEST_ENDPOINTS.ping, { cache: 'no-store' });
                const endTime = performance.now();
                pingTimes.push(endTime - startTime);

                // Update progress after each ping measurement
                const increment = (i + 1) / PING_SAMPLES * 20; // Ping is 20% of test
                updateProgress(Math.min(20, increment));

                // Small delay between ping tests
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error("Ping test failed:", error);
            }
        }

        return calculateAverage(pingTimes);
    };

    // Function to measure download speed
    const measureDownloadSpeed = async (): Promise<number> => {
        const downloadSpeeds: number[] = [];

        for (let i = 0; i < DOWNLOAD_SAMPLES; i++) {
            try {
                // Use different file sizes for more accurate measurement
                const endpoint = TEST_ENDPOINTS.download[i % TEST_ENDPOINTS.download.length];

                // Warm-up connection to reduce DNS and TCP handshake impact
                await fetch(endpoint, { method: 'HEAD', cache: 'no-store' });

                const startTime = performance.now();
                const response = await fetch(endpoint, { cache: 'no-store' });
                const blob = await response.blob();
                const endTime = performance.now();

                // Calculate speed in Mbps (Megabits per second)
                // Size in bytes * 8 to convert to bits, divided by time in seconds
                const fileSizeInBits = blob.size * 8;
                const durationInSeconds = (endTime - startTime) / 1000;
                const speedMbps = fileSizeInBits / durationInSeconds / 1_000_000;

                // If this is not a valid reading, skip it
                if (speedMbps > 0) {
                    downloadSpeeds.push(speedMbps);
                }

                // Update progress after each download test
                const baseProgress = 20; // After ping
                const increment = (i + 1) / DOWNLOAD_SAMPLES * 40; // Download is 40% of test
                updateProgress(Math.min(baseProgress + increment, 60));

                // Small delay between tests
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.error("Download test failed:", error);
            }
        }

        return calculateAverage(downloadSpeeds);
    };

    // Function to measure upload speed
    const measureUploadSpeed = async (): Promise<number> => {
        const uploadSpeeds: number[] = [];

        for (let i = 0; i < UPLOAD_SAMPLES; i++) {
            try {
                // Generate test data of varying sizes for more accurate measurement
                const dataSize = i === 0 ? TEST_FILE_SIZES.small :
                    (i === 1 ? TEST_FILE_SIZES.medium : TEST_FILE_SIZES.large);

                // Generate random data of specified size
                const testData = new Blob([new ArrayBuffer(dataSize)]);

                // Warm up connection to reduce TCP slow start impact
                await fetch(TEST_ENDPOINTS.upload[0], {
                    method: 'HEAD',
                    cache: 'no-store'
                });

                const startTime = performance.now();
                const response = await fetch(TEST_ENDPOINTS.upload[0], {
                    method: 'POST',
                    body: testData,
                    headers: {
                        'Content-Type': 'application/octet-stream'
                    },
                    cache: 'no-store'
                });
                const endTime = performance.now();

                if (response.ok) {
                    // Calculate speed in Mbps (Megabits per second)
                    const fileSizeInBits = testData.size * 8;
                    const durationInSeconds = (endTime - startTime) / 1000;
                    const speedMbps = fileSizeInBits / durationInSeconds / 1_000_000;

                    // Only add valid readings
                    if (speedMbps > 0) {
                        uploadSpeeds.push(speedMbps);
                    }
                }

                // Update progress after each upload test
                const baseProgress = 60; // After ping and download
                const increment = (i + 1) / UPLOAD_SAMPLES * 40; // Upload is 40% of test
                updateProgress(Math.min(baseProgress + increment, 100));

                // Small delay between tests
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.error("Upload test failed:", error);
            }
        }

        return calculateAverage(uploadSpeeds);
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
                downloadSpeed: Math.round(downloadResult * 10) / 10, // Round to 1 decimal place
                uploadSpeed: Math.round(uploadResult * 10) / 10, // Round to 1 decimal place
                ping: Math.round(pingResult),
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