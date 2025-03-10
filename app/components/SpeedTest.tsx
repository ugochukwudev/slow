"use client";

import { toast } from "sonner";
import { Button } from "./ui";
import { useState, useEffect, useRef } from "react";
import { TestProgress, TestResult } from "./ui";
import { useSpeedTest, useNetworkInfo } from "@/app/lib/hooks";

export default function SpeedTest() {
  const [averageSpeedData, setAverageSpeedData] =
    useState<AverageSpeedData | null>(null);

  // Use a ref to track if component is mounted to avoid state updates after unmount
  const isMounted = useRef(false);

  const {
    testing,
    testProgress,
    testPhase,
    result: { downloadSpeed, uploadSpeed, ping },
    startTest,
    updateAverageSpeedData,
  } = useSpeedTest();

  const { networkInfo, loading: networkInfoLoading } = useNetworkInfo();

  // Set mounted state on component mount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch average speeds when network info is available
  useEffect(() => {
    if (networkInfo && isMounted.current) {
      const locationKey = `${networkInfo.location?.city || "unknown"}-${networkInfo.location?.region || "unknown"
        }-${networkInfo.location?.country || "unknown"}`;

      // Only fetch if we have a valid location key
      if (locationKey && networkInfo.provider) {
        fetchAverageSpeedData(locationKey, networkInfo.provider);
      }
    }
  }, [networkInfo]); // Only depends on networkInfo

  const fetchAverageSpeedData = async (
    locationKey: string,
    provider: string
  ) => {
    if (!isMounted.current) return;

    try {
      const response = await fetch(
        `/api/average-speeds?locationKey=${encodeURIComponent(locationKey)}&provider=${encodeURIComponent(provider)}`
      );

      if (response.ok && isMounted.current) {
        const data = await response.json();
        // Use setTimeout to ensure state updates happen outside render cycle
        setTimeout(() => {
          if (isMounted.current) {
            setAverageSpeedData(data);
          }
        }, 0);
      }
    } catch (error) {
      console.error("Error fetching average speed data:", error);
    }
  };

  const handleStartTest = async () => {
    if (!networkInfo) {
      toast.error("Network information not available. Please try again.");
      return;
    }

    try {
      const result = await startTest();

      // Only process results if still mounted
      if (!isMounted.current) return;

      // After test completes, update average speed data
      if (result.downloadSpeed && result.uploadSpeed && result.ping) {
        const locationKey = `${networkInfo.location?.city || "unknown"}-${networkInfo.location?.region || "unknown"
          }-${networkInfo.location?.country || "unknown"}`;

        await updateAverageSpeedData(locationKey, networkInfo.provider, result);

        // Only refresh data if still mounted
        if (isMounted.current) {
          // Refresh average speed data
          await fetchAverageSpeedData(locationKey, networkInfo.provider);
          toast.success("Speed test completed successfully!");
        }
      }
    } catch (error) {
      console.error("Error during speed test:", error);
      if (isMounted.current) {
        toast.error("Failed to complete speed test. Please try again.");
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
          Pulse: Your Internet Speed
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Measure your connection's download speed, upload speed, and ping with
          our accurate pulse monitoring tool.
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <Button
          onClick={handleStartTest}
          disabled={testing || networkInfoLoading}
          className="px-8 py-3 text-lg"
          variant="primary"
        >
          {testing ? "Testing..." : "Start Pulse Test"}
        </Button>
      </div>

      {/* Test Progress */}
      {testing && <TestProgress progress={testProgress} phase={testPhase} />}

      {/* Test Results */}
      {!testing &&
        downloadSpeed !== null &&
        uploadSpeed !== null &&
        ping !== null && (
          <TestResult
            downloadSpeed={downloadSpeed}
            uploadSpeed={uploadSpeed}
            ping={ping}
            averageDownload={averageSpeedData?.averageDownload}
            averageUpload={averageSpeedData?.averageUpload}
            averagePing={averageSpeedData?.averagePing}
          />
        )}

      {/* Information about the test */}
      <div className="mt-12 p-6 rounded-xl bg-black/20 backdrop-blur-sm border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-4">
          About Pulse
        </h3>
        <div className="space-y-3 text-gray-400 text-sm">
          <p>
            This test measures three key metrics of your internet connection:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="text-blue-400 font-medium">Download Speed</span>{" "}
              - How quickly your connection can retrieve data from the internet
              (measured in Mbps).
            </li>
            <li>
              <span className="text-purple-400 font-medium">Upload Speed</span>{" "}
              - How quickly your connection can send data to the internet
              (measured in Mbps).
            </li>
            <li>
              <span className="text-green-400 font-medium">Ping</span> - The
              reaction time of your connection, how quickly your device gets a
              response after sending out a request (measured in ms).
            </li>
          </ul>
          <p>
            For the most accurate results, close other applications and browser
            tabs that may be using your internet connection during the test.
          </p>
        </div>
      </div>
    </div>
  );
}
